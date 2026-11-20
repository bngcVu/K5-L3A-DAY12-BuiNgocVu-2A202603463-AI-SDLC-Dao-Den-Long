// Kiểm định file inputs/scenario theo Test Contract v1.0 (mục C, D). Sai định dạng -> ném UsageError-like (headless đổi thành exit 2).
import { TUNING as T } from './config.js';

export class FormatError extends Error {}
const bad = (m) => { throw new FormatError(m); };
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);

export function validateInputs(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.frames)) bad('inputs: cần {"frames": [...]}');
  let last = -1;
  for (const [i, f] of doc.frames.entries()) {
    if (!f || typeof f !== 'object') bad(`inputs.frames[${i}] phải là object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) bad(`inputs.frames[${i}].tick phải là số nguyên ≥ 0`);
    if (f.tick <= last) bad(`inputs.frames[${i}].tick ${f.tick} phải tăng nghiêm ngặt (trước đó ${last})`);
    last = f.tick;
    if ('move' in f && !(isVec(f.move, 2) && f.move.every((x) => x >= -1 && x <= 1))) bad(`inputs.frames[${i}].move phải là [x,z] trong [-1,1]`);
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) bad(`inputs.frames[${i}].cam_yaw_deg phải là số`);
    for (const b of ['jump', 'interact', 'pulse', 'dash']) {
      if (b in f && typeof f[b] !== 'boolean') bad(`inputs.frames[${i}].${b} phải là boolean`);
    }
  }
  return doc.frames;
}

export function validateScenario(sc) {
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) bad('scenario phải là object');
  if (sc.player !== undefined) {
    const p = sc.player;
    if (typeof p !== 'object' || p === null) bad('scenario.player phải là object');
    if ('pos' in p && !isVec(p.pos, 3)) bad('scenario.player.pos phải là [x,y,z]');
    for (const k of ['carried', 'flames']) if (k in p && !(Number.isInteger(p[k]) && p[k] >= 0)) bad(`scenario.player.${k} phải là số nguyên ≥ 0`);
  }
  for (const k of ['random_motes', 'random_shades']) if (k in sc && typeof sc[k] !== 'boolean') bad(`scenario.${k} phải là boolean`);
  if ('motes' in sc) {
    if (!Array.isArray(sc.motes) || !sc.motes.every((m) => isVec(m, 3))) bad('scenario.motes phải là mảng [x,y,z]');
  }
  if ('shades' in sc) {
    if (!Array.isArray(sc.shades)) bad('scenario.shades phải là mảng');
    sc.shades.forEach((s, i) => {
      if (!s || !isVec(s.pos, 3)) bad(`scenario.shades[${i}].pos phải là [x,y,z]`);
      if ('id' in s && (typeof s.id !== 'string' || !s.id)) bad(`scenario.shades[${i}].id phải là chuỗi`);
    });
  }
  if ('lanterns' in sc) {
    if (!Array.isArray(sc.lanterns)) bad('scenario.lanterns phải là mảng');
    sc.lanterns.forEach((l, i) => {
      if (!l || typeof l.id !== 'string' || !/^L[1-9]\d*$/.test(l.id) || Number(l.id.slice(1)) > T.lantern_count_night1) bad(`scenario.lanterns[${i}].id phải là L1..L${T.lantern_count_night1}`);
      if ('pos' in l && !isVec(l.pos, 3)) bad(`scenario.lanterns[${i}].pos phải là [x,y,z]`);
      if ('deposited' in l && !(Number.isInteger(l.deposited) && l.deposited >= 0)) bad(`scenario.lanterns[${i}].deposited phải là số nguyên ≥ 0`);
      if ('lit' in l && typeof l.lit !== 'boolean') bad(`scenario.lanterns[${i}].lit phải là boolean`);
    });
  }
  if ('time_left_s' in sc && !(isNum(sc.time_left_s) && sc.time_left_s >= 0)) bad('scenario.time_left_s phải là số ≥ 0');
  return sc;
}
