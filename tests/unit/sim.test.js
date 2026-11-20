import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNING } from '../../src/sim/config.js';
import { Sim, moveDir } from '../../src/sim/sim.js';
import { makeRng } from '../../src/sim/rng.js';
import { buildMap } from '../../src/sim/maps.js';

const contract = JSON.parse(readFileSync(new URL('../../game.contract.json', import.meta.url)));
const OFF = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [] };
const run = (sim, n, input = {}) => { for (let i = 0; i < n; i++) sim.step(input); return sim; };
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test('config TUNING khớp tuning trong game.contract.json và contract_version là 1.3', () => {
  assert.deepEqual(TUNING, contract.tuning);
  assert.equal(contract.contract_version, '1.3');
});

test('rng cùng seed cùng chuỗi, khác seed khác chuỗi', () => {
  const a = makeRng(7), b = makeRng(7), c = makeRng(8);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notDeepEqual([makeRng(7)(), makeRng(7)()], [c(), c()]);
});

test('moveDir xoay theo cam_yaw_deg đúng công thức contract và chuẩn hóa vector dài', () => {
  const [x0, z0] = moveDir([0, 1], 0);
  near(x0, 0); near(z0, 1);
  const [x1, z1] = moveDir([0, 1], 90);
  near(x1, 1); near(z1, 0);
  near(Math.hypot(...moveDir([1, 1], 0)), 1);
});

test('bản đồ chuẩn: số đèn, số điểm sinh đom đóm / Bóng Mực mỗi Đêm', () => {
  const m = [1, 2, 3].map(buildMap);
  assert.deepEqual(m.map((x) => x.lanterns.length), [5, 6, 7]);
  assert.deepEqual(m.map((x) => x.moteSpawns.length), [24, 24, 30]);
  assert.deepEqual(m.map((x) => x.shadeSpawns.length), [12, 16, 16]);
  assert.deepEqual(m.map((x) => x.shadeMax), [6, 8, 10]);
  assert.deepEqual(m.map((x) => x.shadeEvery), [480, 420, 360]);
});

test('bản đồ Đêm 3: độ cao các tầng, dốc, tháp và hư không', () => {
  const { top } = buildMap(3);
  assert.equal(top(0, 20), 3); // tầng 1 (z>0, r 12..24)
  assert.equal(top(0, -20), 0); // nửa z<0 chỉ có tầng 0
  assert.equal(top(5, 0), 6); // tầng 2
  assert.equal(top(0, 0), 14); // tháp chuông
  assert.equal(top(46, 0), null); // ngoài đảo
  near(top(27 * Math.cos(Math.PI / 6), 27 * Math.sin(Math.PI / 6)), 1.5, 1e-9); // giữa dốc 30°
});

test('bản đồ Đêm 2: hai đảo, cầu tre và biển mây', () => {
  const { top } = buildMap(2);
  assert.equal(top(0, 0), 0); assert.equal(top(70, 0), 0); assert.equal(top(35, 0), 0); // cầu
  assert.equal(top(35, 5), null); assert.equal(top(35, -3), null);
});

test('chạy 6 m/s: 1 giây đi đúng 6 m (tăng tốc tức thời ≤ 0.1 s)', () => {
  const s = run(new Sim({ seed: 1, scenario: OFF }), 60, { move: [0, 1] });
  near(s.snapshot().player.pos[2], 6, 1e-3);
});

test('nhảy 7 m/s, trọng lực 20: đỉnh ≈ 1.2 m, chỉ nhảy khi chạm đất', () => {
  const s = new Sim({ seed: 1, scenario: OFF });
  let apex = 0;
  s.step({ jump: true });
  for (let i = 0; i < 70; i++) { s.step({ jump: i < 30 && i % 2 === 0 }); apex = Math.max(apex, s.snapshot().player.pos[1]); }
  assert.ok(apex > 1.1 && apex < 1.3, `đỉnh ${apex}`);
  assert.equal(s.snapshot().player.pos[1], 0);
});

test('tất định: cùng seed cùng kết quả ở cả 3 Đêm', () => {
  for (const night of [1, 2, 3]) {
    const go = () => JSON.stringify(run(new Sim({ seed: 42, night }), 1500, { move: [0.3, 1] }).snapshot());
    assert.equal(go(), go(), `night ${night}`);
  }
});

test('snapshot v1.1 có đủ trường bắt buộc', () => {
  const sn = new Sim({ seed: 1, night: 2 }).snapshot();
  for (const k of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(k in sn, k);
  for (const k of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(k in sn.player, k);
  assert.equal(sn.motes.length, 20);
  assert.deepEqual(Object.keys(sn.motes[0]).sort(), ['id', 'kind', 'pos', 'ttl_s']);
});

test('20 đom đóm ban đầu ở 20 điểm khác nhau; sinh thêm tick 240 (trần 30)', () => {
  const s = new Sim({ seed: 3, scenario: { random_shades: false } });
  const key = (m) => m.pos.join(',');
  assert.equal(new Set(s.snapshot().motes.map(key)).size, 20);
  run(s, 240);
  assert.equal(s.snapshot().motes_active, 21);
});

test('Bóng Mực đuổi theo, bị chạm lúc bất tử không làm gì (tối đa 1 lửa mỗi tick)', () => {
  const sc = { ...OFF, shades: [{ id: 'S1', pos: [0.5, 1, 0] }, { id: 'S2', pos: [-0.5, 1, 0] }] };
  const s = new Sim({ seed: 1, scenario: sc });
  const ev = s.step({});
  assert.equal(ev.filter((e) => e.name === 'player_hit').length, 1);
  assert.equal(s.snapshot().player.flames, 2);
});

test('Tỏa Sáng bị bỏ qua khi không đủ 3 đom đóm hoặc đang hồi chiêu', () => {
  const s = new Sim({ seed: 1, scenario: { ...OFF, player: { carried: 6 } } });
  assert.equal(s.step({ pulse: true }).filter((e) => e.name === 'pulse').length, 1);
  s.step({ pulse: false });
  assert.equal(s.step({ pulse: true }).filter((e) => e.name === 'pulse').length, 0); // hồi chiêu 3 s
  assert.equal(s.snapshot().player.carried, 3);
});

test('gió Đêm 3: đẩy 2 m/s trong 5 s (10 m)', () => {
  const s = new Sim({ seed: 5, night: 3, scenario: { ...OFF, wind_enabled: true } });
  run(s, 1799);
  const p0 = s.snapshot().player.pos;
  run(s, 301);
  const p1 = s.snapshot().player.pos;
  near(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), 10, 0.2);
});

test('v1.2: đèn có fuel/ever_lit/relit_count, player có capacity; Đêm dài 240/270/300 s', () => {
  const sn = new Sim({ seed: 1 }).snapshot();
  assert.deepEqual(Object.keys(sn.lanterns[0]).sort(), ['deposited', 'ever_lit', 'fuel', 'id', 'lit', 'pos', 'relit_count']);
  assert.equal(sn.player.capacity, 10);
  assert.deepEqual([1, 2, 3].map((n) => new Sim({ seed: 1, night: n }).snapshot().time_left_s), [240, 270, 300]);
});

test('v1.2: hao dầu chính xác 1/60 mỗi tick (không sai số) và hết dầu thì tắt đúng tick', () => {
  const s = new Sim({ seed: 1, scenario: { ...OFF, lanterns: [{ id: 'L1', lit: true, fuel: 1 }] } });
  run(s, 59);
  assert.equal(s.lanterns[0].lit, true);
  assert.equal(s.lanterns[0].fuel, 1);
  const ev = s.step({});
  assert.equal(ev.some((e) => e.name === 'lantern_out'), true);
  assert.equal(s.lanterns[0].lit, false);
  assert.equal(s.lanterns[0].everLit, true);
});

test('v1.2: sức chứa 10 + 2 × lần thắp, tối đa 20', () => {
  const cap = (n) => new Sim({ seed: 1, scenario: { ...OFF, player: { successful_lights: n } } }).snapshot().player.capacity;
  assert.deepEqual([0, 1, 5, 6, 12].map(cap), [10, 12, 20, 20, 20]);
});

test('v1.2: thắp lần đầu cần 10, thắp lại (ever_lit) chỉ 5; đèn đã sáng nhận dầu chứ không bị bỏ qua', () => {
  const s = new Sim({ seed: 1, scenario: { ...OFF, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], ever_lit: true, lit: false }, { id: 'L2', pos: [0, 0, -1.5] }] } });
  const ev = s.step({ interact: true });
  assert.ok(ev.some((e) => e.name === 'lantern_lit' && e.data.relight === true && e.data.lantern_id === 'L1'));
  s.step({ interact: false });
  const ev2 = s.step({ interact: true });
  assert.ok(ev2.some((e) => e.name === 'refuel' && e.data.lantern_id === 'L1'), 'đèn gần nhất đã sáng nhưng chưa đầy dầu vẫn nhận');
});

test('v1.2: thắng chỉ khi hết giờ và đủ ceil(0.6 × tổng) đèn: 3/5, 4/6, 5/7', () => {
  const need = (night) => Math.ceil(0.6 * buildMap(night).lanterns.length);
  assert.deepEqual([1, 2, 3].map(need), [3, 4, 5]);
});
