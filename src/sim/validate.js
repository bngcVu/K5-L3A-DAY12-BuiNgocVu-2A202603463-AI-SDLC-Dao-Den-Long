// Kiểm định file inputs/scenario theo Test Contract v1.0/v1.1 (mục C, D). Sai định dạng -> FormatError (headless đổi thành exit 2).
export class FormatError extends Error {}
const bad = (m) => { throw new FormatError(m); };
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);
const isInt0 = (x) => Number.isInteger(x) && x >= 0;
const LANTERNS = { 1: 5, 2: 6, 3: 7 };
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];

export function validateInputs(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.frames)) bad('inputs: cần {"frames": [...]}');
  let last = -1;
  for (const [i, f] of doc.frames.entries()) {
    if (!f || typeof f !== 'object') bad(`inputs.frames[${i}] phải là object`);
    if (!isInt0(f.tick)) bad(`inputs.frames[${i}].tick phải là số nguyên ≥ 0`);
    if (f.tick <= last) bad(`inputs.frames[${i}].tick ${f.tick} phải tăng nghiêm ngặt (trước đó ${last})`);
    last = f.tick;
    if ('move' in f && !(isVec(f.move, 2) && f.move.every((x) => x >= -1 && x <= 1))) bad(`inputs.frames[${i}].move phải là [x,z] trong [-1,1]`);
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) bad(`inputs.frames[${i}].cam_yaw_deg phải là số`);
    for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (b in f && typeof f[b] !== 'boolean') bad(`inputs.frames[${i}].${b} phải là boolean`);
    }
  }
  return doc.frames;
}

export function validateScenario(sc, night = 1) {
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) bad('scenario phải là object');
  if (sc.player !== undefined) {
    const p = sc.player;
    if (typeof p !== 'object' || p === null) bad('scenario.player phải là object');
    if ('pos' in p && !isVec(p.pos, 3)) bad('scenario.player.pos phải là [x,y,z]');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
      if (k in p && !isInt0(p[k])) bad(`scenario.player.${k} phải là số nguyên ≥ 0`);
    }
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (k in sc && typeof sc[k] !== 'boolean') bad(`scenario.${k} phải là boolean`);
  }
  if ('motes' in sc) {
    if (!Array.isArray(sc.motes) || !sc.motes.every((m) => isVec(m, 3) || (m && isVec(m.pos, 3)))) bad('scenario.motes phải là mảng [x,y,z] hoặc {pos:[x,y,z]}');
  }
  if ('shades' in sc) {
    if (!Array.isArray(sc.shades)) bad('scenario.shades phải là mảng');
    sc.shades.forEach((s, i) => {
      if (!s || !isVec(s.pos, 3)) bad(`scenario.shades[${i}].pos phải là [x,y,z]`);
      if ('id' in s && (typeof s.id !== 'string' || !s.id)) bad(`scenario.shades[${i}].id phải là chuỗi`);
      if ('state' in s && !SHADE_STATES.includes(s.state)) bad(`scenario.shades[${i}].state phải thuộc ${SHADE_STATES.join('/')}`);
      if ('target_lantern_id' in s && !/^L[1-9]\d*$/.test(s.target_lantern_id ?? '')) bad(`scenario.shades[${i}].target_lantern_id phải là id đèn (L1..)`);
      if ('state_ticks_left' in s && !isInt0(s.state_ticks_left)) bad(`scenario.shades[${i}].state_ticks_left phải là số nguyên ≥ 0`);
    });
  }
  if ('drifters' in sc) {
    if (!Array.isArray(sc.drifters)) bad('scenario.drifters phải là mảng');
    sc.drifters.forEach((d, i) => {
      if (!d || !isVec(d.pos, 3)) bad(`scenario.drifters[${i}].pos phải là [x,y,z]`);
      if ('state' in d && !DRIFTER_STATES.includes(d.state)) bad(`scenario.drifters[${i}].state phải thuộc ${DRIFTER_STATES.join('/')}`);
      if ('stolen' in d && !isInt0(d.stolen)) bad(`scenario.drifters[${i}].stolen phải là số nguyên ≥ 0`);
    });
  }
  if ('charms' in sc) {
    if (!Array.isArray(sc.charms)) bad('scenario.charms phải là mảng');
    sc.charms.forEach((c, i) => {
      if (!c || !isVec(c.pos, 3)) bad(`scenario.charms[${i}].pos phải là [x,y,z]`);
      if ('available' in c && typeof c.available !== 'boolean') bad(`scenario.charms[${i}].available phải là boolean`);
      if ('respawn_ticks' in c && !isInt0(c.respawn_ticks)) bad(`scenario.charms[${i}].respawn_ticks phải là số nguyên ≥ 0`);
    });
  }
  if ('lanterns' in sc) {
    if (!Array.isArray(sc.lanterns)) bad('scenario.lanterns phải là mảng');
    const n = LANTERNS[night];
    sc.lanterns.forEach((l, i) => {
      if (!l || typeof l.id !== 'string' || !/^L[1-9]\d*$/.test(l.id) || Number(l.id.slice(1)) > n) bad(`scenario.lanterns[${i}].id phải là L1..L${n} (Đêm ${night})`);
      if ('pos' in l && !isVec(l.pos, 3)) bad(`scenario.lanterns[${i}].pos phải là [x,y,z]`);
      if ('fuel' in l && !(isNum(l.fuel) && l.fuel >= 0 && l.fuel <= 100)) bad(`scenario.lanterns[${i}].fuel phải là số trong [0,100]`);
      if ('ever_lit' in l && typeof l.ever_lit !== 'boolean') bad(`scenario.lanterns[${i}].ever_lit phải là boolean`);
      if ('deposited' in l && !isInt0(l.deposited)) bad(`scenario.lanterns[${i}].deposited phải là số nguyên ≥ 0`);
      if ('lit' in l && typeof l.lit !== 'boolean') bad(`scenario.lanterns[${i}].lit phải là boolean`);
    });
  }
  if ('time_left_s' in sc && !(isNum(sc.time_left_s) && sc.time_left_s >= 0)) bad('scenario.time_left_s phải là số ≥ 0');
  return sc;
}
