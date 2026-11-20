// Logic game thuần, tất định (Contract v1.2). Không import render/DOM/âm thanh, không đồng hồ thật.
// Thứ tự một tick (Ticket-02 "Thứ tự xử lý trong một tick"):
//  1 input + pause   2 giảm bộ đếm   3 di chuyển Mây (nhảy, lướt, bục, gió) + rơi   4 nhặt đom đóm/bùa
//  5 tương tác đèn   6 vùng an toàn   7 Tỏa Sáng   8 di chuyển Bóng Mực + Gió Lạc   9 chạm (Gió Lạc trước, rồi Bóng Mực theo id)
//  10 sinh theo lịch   11 thắng/thua   (12 snapshot do bên gọi ghi)
// Ticket-03: bước 2 trừ dầu (hao + bị hút) rồi đèn fuel<=0 tắt; bước 11 thắng khi hết giờ + đủ đèn (không thắng sớm).
import { TUNING as T, WORLD as W } from './config.js';
import { makeRng } from './rng.js';
import { buildMap } from './maps.js';

const DT = 1 / W.tick_hz;
const TAU = 2 * Math.PI;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r1 = (x) => Math.round(x * 10) / 10;
const rp = (p) => [r3(p[0]), r3(p[1]), r3(p[2])];
const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const ticksOf = (s) => Math.round(s * W.tick_hz);
const idNum = (id) => parseInt(String(id).replace(/\D/g, ''), 10) || 0;
const rad = (d) => (d * Math.PI) / 180;

export function moveDir(move, yawDeg) {
  let [x, z] = move;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  const th = rad(yawDeg);
  return [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)];
}

export class Sim {
  // bench: cảnh benchmark (Ticket-04): tắt sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm; Bóng Mực chỉ wander ngẫu nhiên
  constructor({ seed = 1, night = 1, scenario = {}, bench = false } = {}) {
    this.bench = bench;
    this.rng = makeRng(seed);
    this.night = night;
    this.map = buildMap(night);
    this.tick = 0; // mọi bước (kể cả tạm dừng)
    this.simTick = 0; // bước gameplay
    this.state = 'playing';
    this.paused = false;
    this.score = 0;
    this.prev = { jump: false, interact: false, pulse: false, dash: false, pause: false };
    const M = this.map, sc = scenario, pl = sc.player || {};

    const pos = pl.pos ? [...pl.pos] : [...M.start];
    const top = M.top(pos[0], pos[2]);
    this.player = {
      pos, vy: 0, vel: [0, 0, 0], grounded: false, fx: 0, fz: 1, launch: null,
      carried: pl.carried ?? 0, flames: pl.flames ?? T.flames,
      invuln: pl.invuln_ticks ?? 0, dashCd: pl.dash_cd_ticks ?? 0, dashTicks: 0, dashDx: 0, dashDz: 1,
      pulseCd: pl.pulse_cd_ticks ?? 0, charm: pl.charm_ticks ?? 0, respawn: 0, lights: pl.successful_lights ?? 0,
    };
    if (top !== null && pos[1] <= top + 1e-9) { pos[1] = top; this.player.grounded = true; }

    this.lanterns = M.lanterns.map((p, i) => ({ id: `L${i + 1}`, pos: [...p], deposited: 0, lit: false, fuel: 0, everLit: false, relit: 0 }));
    for (const u of sc.lanterns || []) {
      const L = this.lanterns.find((l) => l.id === u.id);
      if (u.pos) L.pos = [...u.pos];
      if (u.deposited !== undefined) L.deposited = u.deposited;
      if (u.ever_lit !== undefined) L.everLit = u.ever_lit;
      if (u.relit_count !== undefined) L.relit = u.relit_count;
      const lit = u.lit ?? (u.fuel !== undefined ? u.fuel > 0 : L.deposited >= this.lightCost(L));
      if (lit) {
        L.lit = true; L.fuel = (u.fuel ?? T.fuel_max) * W.fuel_unit;
        if (u.ever_lit === undefined) L.everLit = true;
        if (u.deposited === undefined) L.deposited = this.lightCost(L);
      } else { L.lit = false; L.fuel = 0; }
    }
    this.leftTicks = ticksOf(sc.time_left_s ?? T[M.duration_key]);

    this.randomMotes = sc.random_motes !== false;
    this.randomShades = sc.random_shades !== false;
    this.randomDrifters = sc.random_drifters ?? M.drifters;
    this.windOn = sc.wind_enabled ?? M.wind;
    this.windActive = false; this.windDir = 0; this.windWarn = false;

    this.motes = []; this.moteN = 0;
    this.shades = []; this.shadeN = 0; this.usedShadeIds = new Set();
    this.drifters = []; this.driftN = 0;
    if (sc.motes) {
      for (const m of sc.motes) {
        const o = Array.isArray(m) ? { pos: m } : m;
        this.addMote(o.pos[0], o.pos[1] ?? M.top(o.pos[0], o.pos[2]) ?? 0, o.pos[2], o.kind ?? 'random', o.ttl_ticks ?? null);
      }
    } else if (this.randomMotes) {
      const pts = [...M.moteSpawns];
      for (let i = 0; i < W.mote_initial && pts.length; i++) {
        const [p] = pts.splice(Math.floor(this.rng() * pts.length), 1);
        this.addMote(p[0], p[1], p[2], 'random', null);
      }
    }
    if (sc.shades) {
      for (const s of sc.shades) this.addShade(s.pos, s.id, s.state ?? 'wander', s.state_ticks_left, s.target_lantern_id ?? null);
    }
    if (sc.drifters) {
      for (const d of sc.drifters) {
        this.drifters.push({
          id: d.id ?? `D${++this.driftN}`, pos: [d.pos[0], d.pos[1] ?? W.drifter_y, d.pos[2]], state: d.state ?? 'idle',
          stolen: d.stolen ?? 0, stole: (d.stolen ?? 0) > 0, fleeTicks: d.state_ticks_left ?? W.drifter_flee_ticks, wdx: 1, wdz: 0, wTimer: 0,
        });
        this.driftN = Math.max(this.driftN, idNum(this.drifters.at(-1).id));
      }
    }
    this.charms = (sc.charms ?? M.charms.map((p, i) => ({ id: `C${i + 1}`, pos: p }))).map((c, i) => ({
      id: c.id ?? `C${i + 1}`, pos: [c.pos[0], c.pos[1] ?? 0, c.pos[2]],
      available: c.available ?? true, respawn: c.respawn_ticks ?? 0,
    }));
    this.startEvents = [{ type: 'event', tick: 0, name: 'night_start', data: { night } }];
  }

  addMote(x, y, z, kind, ttl) { this.motes.push({ id: `M${++this.moteN}`, pos: [x, y, z], kind, ttl }); }

  addShade(pos, id, state = 'wander', ticksLeft, target = null) {
    id = id ?? this.newShadeId();
    this.usedShadeIds.add(id);
    const t = this.map.top(pos[0], pos[2]) ?? 0, y = pos[1] ?? W.shade_y;
    const s = { id, pos: [pos[0], y, pos[2]], yOff: y - t, state, ticks: 0, age: W.pulse_push_ticks, evict: 0, pdx: 1, pdz: 0, rdx: 1, rdz: 0, wdx: 1, wdz: 0, wTimer: 0, target, drainTicks: 0 };
    if (state === 'stunned') s.ticks = ticksLeft ?? W.shade_stun_ticks;
    if (state === 'recoil') s.ticks = ticksLeft ?? W.shade_recoil_ticks;
    this.shades.push(s);
    return s;
  }
  newShadeId() {
    let id;
    do { id = `S${++this.shadeN}`; } while (this.usedShadeIds.has(id));
    return id;
  }

  lightCost(L) { return L.everLit ? T.relight_cost : T.lantern_cost; }
  get capacity() { return Math.min(T.capacity_max, T.carry_capacity + W.capacity_step * this.player.lights); }
  // Vùng an toàn chỉ còn khi đèn sáng và fuel >= ngưỡng (đúng 30 vẫn còn)
  zoneActive(l) { return l.lit && l.fuel >= T.low_fuel_threshold * W.fuel_unit; }
  isWeak(l) { return l.lit && l.fuel < T.low_fuel_threshold * W.fuel_unit; }
  litZoneAt(x, z) { return this.lanterns.find((l) => this.zoneActive(l) && d2(x, z, l.pos[0], l.pos[2]) < T.safe_radius); }

  // Di chuyển ngang có trượt theo vật cản; ok(x,z) quyết định ô có đi vào được không
  slide(pos, dx, dz, ok) {
    const nx = pos[0] + dx, nz = pos[2] + dz;
    if (ok(nx, nz)) { pos[0] = nx; pos[2] = nz; return true; }
    if (dx !== 0 && ok(nx, pos[2])) { pos[0] = nx; return true; }
    if (dz !== 0 && ok(pos[0], nz)) { pos[2] = nz; return true; }
    return false;
  }

  stepShade(s, dx, dz) {
    const g = s.pos[1] - s.yOff;
    const ok = (x, z) => { const t = this.map.top(x, z); return t !== null && Math.abs(t - g) <= W.step_height; };
    const moved = this.slide(s.pos, dx, dz, ok);
    if (moved) s.pos[1] = (this.map.top(s.pos[0], s.pos[2]) ?? g) + s.yOff;
    for (const l of this.lanterns) { // vùng an toàn: chặn ở mép
      if (!this.zoneActive(l)) continue;
      const ex = s.pos[0] - l.pos[0], ez = s.pos[2] - l.pos[2], d = Math.hypot(ex, ez);
      if (d < T.safe_radius) {
        const ux = d > 1e-9 ? ex / d : 1, uz = d > 1e-9 ? ez / d : 0;
        s.pos[0] = l.pos[0] + ux * T.safe_radius; s.pos[2] = l.pos[2] + uz * T.safe_radius;
      }
    }
    return moved;
  }

  wanderTarget(s) {
    const near = (list) => list.reduce((b, l) => (!b || d2(s.pos[0], s.pos[2], l.pos[0], l.pos[2]) < d2(s.pos[0], s.pos[2], b.pos[0], b.pos[2]) ? l : b), null);
    if (this.bench) return null; // benchmark: lang thang ngẫu nhiên, rải đều trên đảo
    const forced = s.target && this.lanterns.find((l) => l.id === s.target);
    if (forced && this.isWeak(forced)) return forced;
    return near(this.lanterns.filter((l) => this.isWeak(l))) ?? near(this.lanterns.filter((l) => !l.lit));
  }

  shadeObj(id) { return this.shades.find((x) => x.id === id); }

  respawnPlayer() {
    const P = this.player;
    P.pos = [...this.map.start]; P.vy = 0; P.vel = [0, 0, 0]; P.grounded = true; P.launch = null; P.dashTicks = 0;
    P.invuln = W.respawn_invuln_ticks; P.fx = 0; P.fz = 1;
  }

  movePlayer(input, jump, dash, emit) {
    const P = this.player, M = this.map;
    const [dx, dz] = moveDir(input.move || [0, 0], input.cam_yaw_deg || 0);
    const mag = Math.hypot(dx, dz);
    if (mag > 1e-9) { P.fx = dx / mag; P.fz = dz / mag; }
    if (dash && P.dashTicks === 0 && (P.dashCd === 0 || P.charm > 0)) {
      P.dashTicks = ticksOf(T.dash_duration_s);
      [P.dashDx, P.dashDz] = mag > 1e-9 ? [dx / mag, dz / mag] : [P.fx, P.fz];
      P.dashCd = P.charm > 0 ? 0 : ticksOf(T.dash_cooldown_s);
      emit('dash', {});
    }
    if (jump && P.grounded) { P.vy = W.jump_speed; P.grounded = false; }

    const dashing = P.dashTicks > 0;
    let hx, hz;
    if (dashing) { hx = P.dashDx * T.dash_speed; hz = P.dashDz * T.dash_speed; P.dashTicks--; }
    else if (P.launch) { [hx, hz] = P.launch; }
    else { const sp = P.charm > 0 ? W.charm_speed : T.player_speed; hx = dx * sp; hz = dz * sp; }
    let wx = 0, wz = 0;
    if (this.windActive) { wx = Math.cos(rad(this.windDir)) * W.wind_push; wz = Math.sin(rad(this.windDir)) * W.wind_push; }
    this.slide(P.pos, (hx + wx) * DT, (hz + wz) * DT, (x, z) => { const t = M.top(x, z); return t === null || t <= P.pos[1] + W.step_height; });

    const top = () => M.top(P.pos[0], P.pos[2]);
    if (P.grounded) {
      const t = top();
      if (t !== null && t >= P.pos[1] - W.step_height) P.pos[1] = t; else P.grounded = false;
    }
    if (!P.grounded && !dashing) {
      P.vy -= W.gravity * DT; P.pos[1] += P.vy * DT;
      const t = top();
      if (t !== null && P.vy <= 0 && P.pos[1] <= t) { P.pos[1] = t; P.vy = 0; P.grounded = true; P.launch = null; }
    }
    if (P.grounded) {
      for (const pad of M.pads) {
        if (d2(P.pos[0], P.pos[2], pad.pos[0], pad.pos[2]) <= W.pad_radius && Math.abs(P.pos[1] - pad.pos[1]) <= 0.5) {
          let ux, uz;
          if (pad.dir) [ux, uz] = pad.dir;
          else { const ex = pad.target[0] - P.pos[0], ez = pad.target[1] - P.pos[2], l = Math.hypot(ex, ez); ux = ex / l; uz = ez / l; }
          P.vy = pad.vy; P.grounded = false; P.launch = [ux * pad.hspeed, uz * pad.hspeed];
        }
      }
    }
    P.vel = [hx + wx, P.vy, hz + wz];

    if (P.pos[1] < W.fall_y) { // rơi khỏi đảo: đúng 1 lần, bỏ qua bất tử
      const lost = P.carried;
      P.carried = 0; P.flames--; P.respawn = W.respawn_wait_ticks; P.launch = null; P.dashTicks = 0; P.vy = 0; P.vel = [0, 0, 0];
      emit('player_hit', { by: 'fall', flames: P.flames, dropped: 0, lost });
    }
  }

  step(input = {}) {
    const ev = [];
    if (this.state !== 'playing') return ev;
    const k = ++this.tick;
    const emit = (name, data) => ev.push({ type: 'event', tick: k, name, data });
    const edge = (n) => { const on = !!input[n], e = on && !this.prev[n]; this.prev[n] = on; return e; };
    const jump = edge('jump'), interact = edge('interact'), pulse = edge('pulse'), dash = edge('dash'), pause = edge('pause');

    // 1 pause
    if (pause) { this.paused = !this.paused; emit(this.paused ? 'paused' : 'resumed', {}); if (this.paused) return ev; }
    if (this.paused) return ev;
    const n = ++this.simTick;
    const P = this.player, M = this.map;

    // 2 bộ đếm
    if (P.invuln > 0) P.invuln--;
    if (P.dashCd > 0) P.dashCd--;
    if (P.pulseCd > 0) P.pulseCd--;
    if (P.charm > 0) P.charm--;
    for (const c of this.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
    this.motes = this.motes.filter((m) => m.ttl === null || --m.ttl > 0);
    for (const s of this.shades) if (s.state === 'stunned' && --s.ticks <= 0) s.state = 'wander';
    if (P.respawn > 0 && --P.respawn === 0) this.respawnPlayer();
    // Ticket-03: trừ dầu (hao 1/giây + bị hút), rồi đèn fuel <= 0 tắt
    for (const l of this.lanterns) if (l.lit && !this.bench) l.fuel -= T.fuel_decay_per_s;
    for (const sh of this.shades) {
      if (sh.state !== 'drain' || this.bench) continue;
      const L = this.lanterns.find((l) => l.id === sh.target);
      if (!L || !L.lit) continue;
      L.fuel -= T.drain_per_s;
      if (++sh.drainTicks % W.fuel_drain_log_ticks === 0) emit('fuel_drain', { lantern_id: L.id, shade_id: sh.id, fuel: r1(Math.max(0, L.fuel) / W.fuel_unit) });
    }
    for (const l of this.lanterns) {
      if (l.lit && l.fuel <= 0) { l.lit = false; l.fuel = 0; l.deposited = 0; emit('lantern_out', { lantern_id: l.id }); }
    }
    let alive = P.respawn === 0;
    if (this.windOn) {
      const m = n % W.wind_every;
      if (m === W.wind_every - W.wind_warn_ticks) this.windDir = r3(this.rng() * 360);
      this.windWarn = m >= W.wind_every - W.wind_warn_ticks;
      this.windActive = n >= W.wind_every && m < W.wind_ticks;
    }

    // 3 di chuyển Mây
    if (alive) { this.movePlayer(input, jump, dash, emit); alive = P.respawn === 0; }

    // 4 nhặt đom đóm, bùa
    if (alive && !this.bench) {
      const near = (p) => d2(p[0], p[2], P.pos[0], P.pos[2]) <= T.pickup_radius && Math.abs(P.pos[1] - p[1]) <= W.pickup_dy;
      for (let i = 0; i < this.motes.length && P.carried < this.capacity;) {
        if (near(this.motes[i].pos)) { this.motes.splice(i, 1); P.carried++; emit('mote_picked', { carried: P.carried }); } else i++;
      }
      for (const c of this.charms) {
        if (c.available && near(c.pos)) {
          P.charm = W.charm_ticks; c.available = false; c.respawn = W.charm_respawn_ticks;
          emit('charm_picked', { charm_id: c.id, charm_ticks: P.charm });
        }
      }
    }

    // 5 tương tác đèn: nạp đèn chưa sáng (10, thắp lại 5) hoặc châm dầu đèn đang sáng chưa đầy
    if (alive && interact && P.carried > 0) {
      let best = null;
      for (const l of this.lanterns) {
        const d = d2(l.pos[0], l.pos[2], P.pos[0], P.pos[2]);
        const receives = !l.lit || l.fuel < T.fuel_max * W.fuel_unit;
        if (receives && d <= T.interact_radius && (!best || d < best.d)) best = { l, d };
      }
      if (best) {
        const L = best.l;
        if (L.lit) {
          const used = Math.min(P.carried, Math.ceil((T.fuel_max * W.fuel_unit - L.fuel) / (T.fuel_per_mote * W.fuel_unit)));
          P.carried -= used;
          L.fuel = Math.min(T.fuel_max * W.fuel_unit, L.fuel + T.fuel_per_mote * W.fuel_unit * used);
          this.score += used * T.score.per_mote;
          emit('refuel', { lantern_id: L.id, amount: used, fuel: r1(L.fuel / W.fuel_unit) });
        } else {
          const cost = this.lightCost(L), amount = Math.min(P.carried, cost - L.deposited);
          P.carried -= amount; L.deposited += amount; this.score += amount * T.score.per_mote;
          emit('deposit', { lantern_id: L.id, amount, deposited: L.deposited });
          if (L.deposited >= cost) {
            const relight = L.everLit;
            L.lit = true; L.fuel = T.fuel_max * W.fuel_unit; L.everLit = true; P.lights++;
            if (relight) L.relit++;
            this.score += relight ? W.score_relight : T.score.per_lantern;
            emit('lantern_lit', { lantern_id: L.id, relight });
          }
        }
      }
    }

    // 6 vùng an toàn: đẩy Bóng Mực đang ở trong vùng của đèn sáng ra mép trong ≤ 30 tick (không gây sát thương)
    for (const s of this.shades) {
      const z = this.litZoneAt(s.pos[0], s.pos[2]);
      if (s.evict === 0 && z) s.evict = 30;
      if (s.evict > 0) {
        if (z) {
          const ex = s.pos[0] - z.pos[0], ez = s.pos[2] - z.pos[2], d = Math.hypot(ex, ez);
          const step = (T.safe_radius - d) / s.evict, ux = d > 1e-9 ? ex / d : 1, uz = d > 1e-9 ? ez / d : 0;
          s.pos[0] += ux * step; s.pos[2] += uz * step;
        }
        s.evict = z ? s.evict - 1 : 0;
      }
    }

    // 7 Tỏa Sáng
    if (alive && pulse && P.pulseCd === 0 && P.carried >= T.pulse_cost) {
      P.carried -= T.pulse_cost; P.pulseCd = ticksOf(T.pulse_cooldown_s);
      const cy = P.pos[1] + W.pulse_center_dy, ids = [];
      const dist3 = (p) => Math.hypot(p[0] - P.pos[0], p[1] - cy, p[2] - P.pos[2]);
      for (const s of this.shades) {
        if (dist3(s.pos) > T.pulse_radius) continue;
        const ex = s.pos[0] - P.pos[0], ez = s.pos[2] - P.pos[2], d = Math.hypot(ex, ez);
        s.pdx = d > 1e-9 ? ex / d : 1; s.pdz = d > 1e-9 ? ez / d : 0;
        this.score += T.score.per_stun + (s.state === 'drain' ? W.score_stun_drain_bonus : 0);
        s.state = 'stunned'; s.ticks = W.shade_stun_ticks; s.age = 0; s.target = null; s.drainTicks = 0;
        ids.push(s.id);
      }
      emit('pulse', { stunned_ids: ids });
      for (const d of this.drifters) {
        if (d.state === 'removed' || dist3(d.pos) > T.pulse_radius) continue;
        if (d.state === 'chase') { d.state = 'flee'; d.fleeTicks = W.drifter_flee_ticks; }
        else if (d.state === 'flee' && d.stolen > 0) {
          const y = M.top(d.pos[0], d.pos[2]) ?? 0;
          for (let i = 0; i < d.stolen; i++) this.addMote(d.pos[0], y, d.pos[2], 'dropped', W.drifter_drop_ttl);
          emit('drifter_drop', { drifter_id: d.id, amount: d.stolen });
          d.stolen = 0;
        }
      }
    }

    // 8 Bóng Mực, Gió Lạc di chuyển
    const px = P.pos[0], pz = P.pos[2];
    const speed = M.shadeSpeed;
    for (const s of this.shades) {
      if (s.state === 'drain') { // thoát drain: Mây vào 6 m → chase; đèn tắt / fuel ≥ 30 / cách > 2 m → wander
        const L = this.lanterns.find((l) => l.id === s.target);
        if (alive && d2(s.pos[0], s.pos[2], px, pz) <= W.drain_chase_range) { s.state = 'chase'; s.target = null; s.drainTicks = 0; }
        else if (!L || !this.isWeak(L) || d2(s.pos[0], s.pos[2], L.pos[0], L.pos[2]) > W.drain_range) { s.state = 'wander'; s.target = null; s.drainTicks = 0; }
        else continue;
      }
      if (s.evict > 0) continue;
      if (s.state === 'stunned') {
        if (s.age < W.pulse_push_ticks) { const m = T.pulse_push_m / W.pulse_push_ticks; this.stepShade(s, s.pdx * m, s.pdz * m); }
        s.age++;
        continue;
      }
      if (s.state === 'recoil') {
        this.stepShade(s, s.rdx * (W.shade_recoil_m / W.shade_recoil_ticks), s.rdz * (W.shade_recoil_m / W.shade_recoil_ticks));
        if (--s.ticks <= 0) s.state = 'wander';
        continue;
      }
      const d = alive ? d2(s.pos[0], s.pos[2], px, pz) : Infinity;
      if (s.state === 'spawning') s.state = 'wander';
      if (s.state === 'wander' && d <= W.shade_detect_m && !this.bench) { s.state = 'chase'; s.target = null; }
      else if (s.state === 'chase' && d > W.shade_lose_m) s.state = 'wander';
      if (s.state === 'chase') {
        const m = Math.min(speed * DT, d);
        if (d > 1e-9) this.stepShade(s, ((px - s.pos[0]) / d) * m, ((pz - s.pos[2]) / d) * m);
      } else {
        const L = this.wanderTarget(s);
        if (L) { // wander có mục tiêu: đèn yếu gần nhất, không có thì đèn tắt gần nhất
          const lx = L.pos[0], lz = L.pos[2];
          let dl = d2(s.pos[0], s.pos[2], lx, lz);
          if (dl > W.drain_range) {
            const m = Math.min(speed * DT, dl - W.drain_range + 1e-9);
            this.stepShade(s, ((lx - s.pos[0]) / dl) * m, ((lz - s.pos[2]) / dl) * m);
            dl = d2(s.pos[0], s.pos[2], lx, lz);
          }
          if (this.isWeak(L) && dl <= W.drain_range) { s.state = 'drain'; s.target = L.id; s.drainTicks = 0; }
        } else {
          if (--s.wTimer <= 0) { const a = this.rng() * TAU; s.wdx = Math.cos(a); s.wdz = Math.sin(a); s.wTimer = 120 + Math.floor(this.rng() * 120); }
          if (!this.stepShade(s, s.wdx * W.shade_wander_speed * DT, s.wdz * W.shade_wander_speed * DT)) s.wTimer = 0;
        }
      }
    }
    for (const dr of this.drifters) {
      if (dr.state === 'removed') continue;
      const d = alive ? d2(dr.pos[0], dr.pos[2], px, pz) : Infinity;
      const cond = alive && P.carried >= W.drifter_trigger_carry && d <= W.drifter_trigger_m;
      if (dr.state === 'idle' && cond) dr.state = 'chase';
      else if (dr.state === 'chase' && !cond) dr.state = 'idle';
      if (dr.state === 'chase') {
        const m = Math.min(W.drifter_speed * DT, d);
        if (d > 1e-9) { dr.pos[0] += ((px - dr.pos[0]) / d) * m; dr.pos[2] += ((pz - dr.pos[2]) / d) * m; }
      } else if (dr.state === 'flee') {
        const ex = dr.pos[0] - px, ez = dr.pos[2] - pz, l = Math.hypot(ex, ez);
        const ux = l > 1e-9 ? ex / l : 1, uz = l > 1e-9 ? ez / l : 0;
        dr.pos[0] += ux * W.drifter_speed * DT; dr.pos[2] += uz * W.drifter_speed * DT;
        if (--dr.fleeTicks <= 0) dr.state = 'removed';
      } else {
        if (--dr.wTimer <= 0) { const a = this.rng() * TAU; dr.wdx = Math.cos(a); dr.wdz = Math.sin(a); dr.wTimer = 180; }
        if (d2(dr.pos[0], dr.pos[2], M.center[0], M.center[1]) > M.bound) { // quay về giữa bản đồ
          const ex = M.center[0] - dr.pos[0], ez = M.center[1] - dr.pos[2], l = Math.hypot(ex, ez);
          dr.wdx = ex / l; dr.wdz = ez / l;
        }
        dr.pos[0] += dr.wdx * W.drifter_idle_speed * DT; dr.pos[2] += dr.wdz * W.drifter_idle_speed * DT;
      }
    }

    // 9 chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (id tăng dần)
    if (alive && !this.bench) {
      for (const dr of [...this.drifters].sort((a, b) => idNum(a.id) - idNum(b.id))) {
        if (dr.state === 'chase' && !dr.stole && P.carried > 0 && d2(dr.pos[0], dr.pos[2], px, pz) <= W.drifter_touch_m) {
          const amount = Math.min(W.drifter_steal, P.carried);
          P.carried -= amount; dr.stolen = amount; dr.stole = true; dr.state = 'flee'; dr.fleeTicks = W.drifter_flee_ticks;
          emit('drifter_steal', { drifter_id: dr.id, amount, carried: P.carried });
        }
      }
      for (const s of [...this.shades].sort((a, b) => idNum(a.id) - idNum(b.id))) {
        if (P.invuln > 0) break;
        if ((s.state !== 'chase' && s.state !== 'wander') || s.evict > 0) continue;
        if (d2(s.pos[0], s.pos[2], P.pos[0], P.pos[2]) > T.shade_hit_radius || Math.abs(s.pos[1] - P.pos[1]) > W.pickup_dy) continue;
        P.flames--; P.invuln = ticksOf(T.invuln_s);
        const drop = Math.floor(P.carried * T.hit_drop_ratio + 1e-9);
        P.carried -= drop;
        for (let i = 0; i < drop; i++) {
          let placed = false;
          for (let t = 0; t < 10 && !placed; t++) {
            const a = this.rng() * TAU, r = W.drop_ring_min + this.rng() * (W.drop_ring_max - W.drop_ring_min);
            const x = P.pos[0] + r * Math.cos(a), z = P.pos[2] + r * Math.sin(a), tp = M.top(x, z);
            if (tp !== null && Math.abs(tp - P.pos[1]) <= W.pickup_dy) { this.addMote(x, tp, z, 'dropped', W.mote_drop_ttl); placed = true; }
          }
          if (!placed) this.addMote(P.pos[0], P.pos[1], P.pos[2], 'dropped', W.mote_drop_ttl);
        }
        const ex = s.pos[0] - P.pos[0], ez = s.pos[2] - P.pos[2], d = Math.hypot(ex, ez);
        s.rdx = d > 1e-9 ? ex / d : 1; s.rdz = d > 1e-9 ? ez / d : 0;
        s.state = 'recoil'; s.ticks = W.shade_recoil_ticks;
        emit('player_hit', { by: 'shade', flames: P.flames, dropped: drop });
      }
    }

    // 10 sinh theo lịch
    if (this.randomMotes && n % W.mote_spawn_every === 0 && this.motes.length < W.mote_cap) {
      const free = M.moteSpawns.filter((p) => !this.motes.some((m) => Math.hypot(m.pos[0] - p[0], m.pos[2] - p[2]) < 0.5));
      if (free.length) { const p = free[Math.floor(this.rng() * free.length)]; this.addMote(p[0], p[1], p[2], 'random', null); }
    }
    if (this.randomShades) {
      const count = n === W.shade_first_spawn_tick ? W.shade_first_spawn_count
        : n > W.shade_first_spawn_tick && (n - W.shade_first_spawn_tick) % M.shadeEvery === 0 ? 1 : 0;
      for (let i = 0; i < count && this.shades.length < M.shadeMax; i++) {
        const cand = M.shadeSpawns.filter((p) => (!alive || d2(p[0], p[2], P.pos[0], P.pos[2]) >= W.shade_spawn_min_player_m)
          && !this.litZoneAt(p[0], p[2]) && !this.shades.some((s) => d2(s.pos[0], s.pos[2], p[0], p[2]) < 1));
        if (!cand.length) continue;
        const p = cand[Math.floor(this.rng() * cand.length)];
        const s = this.addShade([p[0], W.shade_y, p[2]], undefined, 'spawning');
        emit('shade_spawned', { id: s.id });
      }
    }
    if (this.randomDrifters && n % W.drifter_every === 0 && this.drifters.filter((d) => d.state !== 'removed').length < W.drifter_max) {
      const p = M.shadeSpawns[Math.floor(this.rng() * M.shadeSpawns.length)];
      this.drifters.push({ id: `D${++this.driftN}`, pos: [p[0], W.drifter_y, p[2]], state: 'idle', stolen: 0, stole: false, fleeTicks: W.drifter_flee_ticks, wdx: 1, wdz: 0, wTimer: 0 });
    }

    if (this.bench) return ev; // cảnh benchmark không có điều kiện kết thúc
    // 11 thắng / thua (Ticket-03): hết Ngọn Lửa luôn thua trước; thắng chỉ khi hết giờ + đủ đèn sáng
    if (P.flames <= 0) return this.finish(ev, k, 'lost', 'no_flames');
    if (this.leftTicks - n <= 0) {
      const lit = this.lanterns.filter((l) => l.lit);
      if (lit.length >= Math.ceil(T.win_ratio * this.lanterns.length - 1e-9)) {
        for (const l of lit) this.score += W.score_dawn_lantern + Math.floor(l.fuel / W.fuel_unit);
        this.score += P.flames * T.score.per_flame_left;
        return this.finish(ev, k, 'won', 'dawn_survived');
      }
      return this.finish(ev, k, 'lost', 'dawn');
    }
    return ev;
  }

  finish(ev, k, result, reason) {
    this.state = result;
    ev.push({ type: 'event', tick: k, name: 'game_over', data: { result, reason } });
    return ev;
  }

  snapshot() {
    const P = this.player;
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.simTick,
      state: this.paused ? 'paused' : this.state, night: this.night,
      time_left_s: r3((this.leftTicks - this.simTick) / W.tick_hz), score: this.score,
      wind: { active: this.windActive, dir_deg: this.windActive || this.windWarn ? this.windDir : 0 },
      player: {
        pos: rp(P.pos), vel: rp(P.vel), grounded: P.grounded, flames: P.flames, carried: P.carried, capacity: this.capacity, invuln: P.invuln > 0,
        dash_cd_s: r3(P.dashCd / W.tick_hz), pulse_cd_s: r3(P.pulseCd / W.tick_hz), charm_s: r3(P.charm / W.tick_hz),
      },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: rp(l.pos), lit: l.lit, fuel: r1(l.fuel / W.fuel_unit), ever_lit: l.everLit, relit_count: l.relit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: rp(s.pos), state: s.state })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: rp(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : r3(m.ttl / W.tick_hz) })),
      drifters: this.drifters.map((d) => ({ id: d.id, pos: rp(d.pos), state: d.state, stolen: d.stolen })),
      charms: this.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: r3(c.respawn / W.tick_hz) })),
    };
  }
}
