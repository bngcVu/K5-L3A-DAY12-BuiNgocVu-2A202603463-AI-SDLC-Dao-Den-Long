import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateName, makeEntry, addEntry } from '../../src/leaderboard.js';
import { runSoak } from '../../src/soak.js';
import { benchScenario } from '../../src/bench-scene.js';
import { Sim } from '../../src/sim/sim.js';
import { summarizeFrames } from '../../src/bench-stats.js';
import { createApp, readBoard } from '../../server.js';
import { mkdtempSync, writeFileSync as wf, readFileSync as rf } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const contract = JSON.parse(readFileSync(new URL('../../game.contract.json', import.meta.url)));

test('contract v1.3: có bench_cmd và soak_cmd', () => {
  assert.equal(contract.contract_version, '1.3');
  assert.match(contract.bench_cmd, /--seed 42 --duration 30|bench/);
  assert.match(contract.soak_cmd, /soak/);
});

test('tên bảng xếp hạng: 3–12 ký tự [A-Za-z0-9_]', () => {
  for (const ok of ['abc', 'Mây_1'.replace('â', 'a'), 'A'.repeat(12), 'a_1']) assert.equal(validateName(ok), true, ok);
  for (const bad of ['ab', 'A'.repeat(13), 'có dấu', 'a b c', 'a-b', '', 'ab!']) assert.equal(validateName(bad), false, bad);
});

test('bảng xếp hạng: giữ top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên', () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addEntry(list, makeEntry({ name: `p${i}x`, score: (i % 3) * 100, nights_won: i % 4, seed: i }, new Date(2026, 10, 20, 10, i)));
  assert.equal(list.length, 10);
  assert.ok(list.every((e, i) => i === 0 || list[i - 1].score >= e.score));
  const ties = list.filter((e) => e.score === list[0].score);
  assert.ok(ties.every((e, i) => i === 0 || ties[i - 1].achieved_at <= e.achieved_at), 'đồng điểm: đạt trước đứng trên');
});

test('mục bảng xếp hạng có đủ trường, achieved_at là ISO 8601 có múi giờ', () => {
  const e = makeEntry({ name: 'Lan_01', score: 450, nights_won: 2, seed: 7 }, new Date('2026-11-20T08:00:00Z'));
  assert.deepEqual(Object.keys(e).sort(), ['achieved_at', 'name', 'nights_won', 'score', 'seed']);
  assert.match(e.achieved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  assert.throws(() => makeEntry({ name: 'x', score: 1, nights_won: 0, seed: 1 }));
  assert.throws(() => makeEntry({ name: 'abc', score: 1, nights_won: 4, seed: 1 }));
});

test('cảnh benchmark: 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, không sát thương/nhặt/hao dầu/kết thúc', () => {
  const sc = benchScenario(42);
  assert.equal(sc.shades.length, 200);
  assert.equal(sc.motes.length, 100);
  assert.ok(sc.shades.every((s) => s.state === 'wander'));
  const sim = new Sim({ seed: 42, night: 1, scenario: sc, bench: true });
  for (let i = 0; i < 18000; i++) sim.step({}); // quá cả thời lượng Đêm
  const sn = sim.snapshot();
  assert.equal(sn.state, 'playing');
  assert.equal(sn.player.flames, 3);
  assert.equal(sn.player.carried, 0);
  assert.equal(sn.motes_active, 100);
  assert.deepEqual(sn.lanterns.slice(0, 3).map((l) => [l.lit, l.fuel]), [[true, 100], [true, 100], [true, 100]]);
  assert.equal(sn.shades.length, 200);
  assert.ok(sn.shades.every((s) => s.state === 'wander'));
  assert.ok(new Set(sn.shades.map((s) => s.pos.join())).size > 150, 'bóng vẫn di chuyển, không dồn một chỗ');
});

test('thống kê khung hình đúng định nghĩa ticket (avg_fps, p1_low_fps, p95)', () => {
  const dts = [10, 10, 10, 10, 10, 10, 10, 10, 10, 50]; // ms
  const s = summarizeFrames(dts);
  assert.equal(s.frames, 10);
  assert.equal(s.avg_fps, (1000 * 10) / 140); // 1000·N/Σdt, Σdt = 9×10 + 50 = 140
  assert.equal(s.p1_low_fps, 1000 / 50); // k = max(1, ceil(0.1)) = 1 → chỉ dt lớn nhất
  assert.equal(s.frame_ms_p95, 50);
  const big = Array.from({ length: 200 }, (_, i) => (i < 2 ? 40 : 10)); // k = ceil(2) = 2
  assert.equal(summarizeFrames(big).p1_low_fps, 1000 / 40);
});

test('soak: nhiều Đêm trong một tiến trình, không crash, kết quả tất định theo seed', () => {
  const a = runSoak({ seed: 7, nights: 4 }), b = runSoak({ seed: 7, nights: 4 });
  assert.equal(a.nights, 4);
  assert.equal(a.crashes, 0);
  assert.equal(a.results.length, 4);
  assert.ok(a.results.every((r) => r === 'won' || r === 'lost'));
  assert.deepEqual(a.results, b.results);
  for (const k of ['mem_start_mb', 'mem_end_mb', 'duration_s']) assert.equal(typeof a[k], 'number', k);
});

test('máy chủ: POST/GET bảng xếp hạng lưu trên đĩa, từ chối tên sai, sống qua lần mở lại; xuất bằng --export-leaderboard', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-lb-')), file = join(dir, 'lb.json');
  const post = (base, b) => fetch(`${base}/api/leaderboard`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const srv = createApp({ boardFile: file });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  assert.equal((await post(base, { name: 'Lan_01', score: 300, nights_won: 2, seed: 5 })).status, 200);
  assert.equal((await post(base, { name: 'Binh', score: 900, nights_won: 3, seed: 6 })).status, 200);
  assert.equal((await post(base, { name: 'x!', score: 1, nights_won: 0, seed: 1 })).status, 400);
  const got = (await (await fetch(`${base}/api/leaderboard`)).json()).entries;
  assert.deepEqual(got.map((e) => e.name), ['Binh', 'Lan_01']);
  await new Promise((ok) => srv.close(ok));
  assert.deepEqual(readBoard(file).map((e) => e.name), ['Binh', 'Lan_01'], 'còn sau khi tắt máy chủ');
  const out = join(dir, 'export.json');
  const r = spawnSync(process.execPath, [new URL('../../server.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--export-leaderboard', out], { env: { ...process.env, LEADERBOARD_FILE: file }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const exported = JSON.parse(rf(out, 'utf8'));
  assert.deepEqual(Object.keys(exported), ['entries']);
  assert.deepEqual(exported.entries.map((e) => e.score), [900, 300]);
});
