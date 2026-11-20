import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNING } from '../../src/sim/config.js';
import { Sim } from '../../src/sim/sim.js';
import { makeRng } from '../../src/sim/rng.js';
import { moveDir } from '../../src/sim/sim.js';

const contract = JSON.parse(readFileSync(new URL('../../game.contract.json', import.meta.url)));

test('config TUNING khớp tuning trong game.contract.json', () => {
  assert.deepEqual(TUNING, contract.tuning);
});

test('rng cùng seed cho cùng chuỗi, khác seed cho chuỗi khác', () => {
  const a = makeRng(7), b = makeRng(7), c = makeRng(8);
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
});

test('moveDir xoay theo cam_yaw_deg đúng công thức contract', () => {
  const [x0, z0] = moveDir([0, 1], 0);
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(z0 - 1) < 1e-9);
  const [x1, z1] = moveDir([0, 1], 90); // x' = sin90 = 1, z' = cos90 = 0
  assert.ok(Math.abs(x1 - 1) < 1e-9 && Math.abs(z1) < 1e-9);
});

test('moveDir chuẩn hóa vector dài hơn 1', () => {
  const [x, z] = moveDir([1, 1], 0);
  assert.ok(Math.abs(Math.hypot(x, z) - 1) < 1e-9);
});

test('sim 5 đèn ở bán kính 25, L1 tại (0,0,25); người chơi xuất phát (0,0,0)', () => {
  const s = new Sim({ seed: 1 });
  const snap = s.snapshot();
  assert.equal(snap.lanterns.length, 5);
  assert.deepEqual(snap.lanterns[0].pos, [0, 0, 25]);
  assert.deepEqual(snap.player.pos, [0, 0, 0]);
  assert.equal(snap.tick, 0);
});

test('sim tất định: cùng seed cùng kết quả', () => {
  const run = () => { const s = new Sim({ seed: 42 }); for (let i = 0; i < 600; i++) s.step({}); return JSON.stringify(s.snapshot()); };
  assert.equal(run(), run());
});

test('nhảy: rời mặt đất rồi quay lại Y=0', () => {
  const s = new Sim({ seed: 1, scenario: { random_motes: false, random_shades: false } });
  s.step({ jump: true });
  assert.ok(s.snapshot().player.pos[1] > 0);
  for (let i = 0; i < 120; i++) s.step({ jump: false });
  assert.equal(s.snapshot().player.pos[1], 0);
});

test('pulse bị bỏ qua khi không đủ ánh sáng (carried < pulse_cost)', () => {
  const s = new Sim({ seed: 1, scenario: { random_motes: false, random_shades: false, player: { carried: 1 } } });
  const ev = s.step({ pulse: true });
  assert.equal(ev.filter(e => e.name === 'pulse').length, 0);
});
