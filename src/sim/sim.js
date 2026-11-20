// Logic game thuần, tất định. Không import render/DOM/âm thanh, không đồng hồ thật.
// Thứ tự một bước (tick k -> k+1):
//  1 giảm bộ đếm (invuln, pulse cooldown)  2 di chuyển/nhảy  3 nhặt đom đóm  4 interact (nạp đèn) -> kiểm thắng
//  5 pulse  6 Bóng Mực di chuyển + va chạm -> kiểm thua (hết máu)  7 sinh đom đóm/Bóng Mực  8 hết giờ (dawn)
import { TUNING as T, WORLD as W } from './config.js';
import { makeRng } from './rng.js';

const DT = 1 / W.tick_hz;
const r3 = (x) => Math.round(x * 1000) / 1000;
const rp = (p) => [r3(p[0]), r3(p[1]), r3(p[2])];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const ticksOf = (s) => Math.round(s * W.tick_hz);

export function moveDir(move, yawDeg) {
  let [x, z] = move;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  const th = (yawDeg * Math.PI) / 180;
  return [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)];
}

export class Sim {
  constructor({ seed = 1, scenario = {} } = {}) {
    this.rng = makeRng(seed);
    this.tick = 0;
    this.steps = 0;
    this.state = 'playing';
    this.score = 0;
    this.prev = { jump: false, interact: false, pulse: false };
    const pl = scenario.player || {};
    this.player = {
      pos: pl.pos ? [...pl.pos] : [0, 0, 0], vy: 0,
      carried: pl.carried ?? 0, flames: pl.flames ?? T.flames, invuln: 0, pulseCd: 0,
    };
    this.lanterns = [];
    for (let i = 0; i < T.lantern_count_night1; i++) {
      const a = (i * 2 * Math.PI) / T.lantern_count_night1;
      this.lanterns.push({
        id: `L${i + 1}`, pos: [r3(W.lantern_ring * Math.sin(a)), 0, r3(W.lantern_ring * Math.cos(a))],
        deposited: 0, lit: false,
      });
    }
    for (const u of scenario.lanterns || []) {
      const L = this.lanterns.find((l) => l.id === u.id);
      if (u.pos) L.pos = [...u.pos];
      if (u.deposited !== undefined) L.deposited = u.deposited;
      if (u.lit !== undefined) {
        L.lit = u.lit;
        if (u.lit && u.deposited === undefined) L.deposited = T.lantern_cost;
      }
      if (L.deposited >= T.lantern_cost) L.lit = true;
    }
    this.randomMotes = scenario.random_motes !== false;
    this.randomShades = scenario.random_shades !== false;
    this.leftTicks = ticksOf(scenario.time_left_s ?? T.night1_duration_s);
    this.motes = []; this.moteN = 0;
    this.shades = []; this.shadeN = 0; this.usedShadeIds = new Set();
    if (scenario.motes) for (const m of scenario.motes) this.addMote(m[0], m[2]);
    else if (this.randomMotes) for (let i = 0; i < W.initial_motes; i++) this.spawnRandomMote();
    if (scenario.shades) for (const s of scenario.shades) this.addShade(s.pos, s.id);
    else if (this.randomShades) for (let i = 0; i < W.initial_shades; i++) this.addShade(this.shadeSpawnPos());
  }

  addMote(x, z) { this.motes.push({ id: `M${++this.moteN}`, pos: [x, 0, z] }); }
  spawnRandomMote() {
    const r = W.mote_spawn_radius * Math.sqrt(this.rng()), a = this.rng() * 2 * Math.PI;
    this.addMote(r * Math.sin(a), r * Math.cos(a));
  }
  newShadeId() {
    let id;
    do { id = `S${++this.shadeN}`; } while (this.usedShadeIds.has(id));
    return id;
  }
  addShade(pos, id) {
    id = id ?? this.newShadeId();
    this.usedShadeIds.add(id);
    const s = { id, pos: [pos[0], pos[1] ?? W.shade_y, pos[2]], state: 'chase', timer: 0 };
    this.shades.push(s);
    return s;
  }
  shadeSpawnPos() {
    let p;
    for (let i = 0; i < 10; i++) {
      const a = this.rng() * 2 * Math.PI;
      p = [W.shade_spawn_ring * Math.sin(a), W.shade_y, W.shade_spawn_ring * Math.cos(a)];
      if (dist(p, this.player.pos) >= W.shade_spawn_min_player_m
        && this.lanterns.every((l) => dist(p, l.pos) > T.safe_radius + 0.5)) break;
    }
    return p;
  }

  // Giữ Bóng Mực ngoài safe_radius của mọi đèn và trong đảo
  clampShade(s) {
    for (const l of this.lanterns) {
      const dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2], d = Math.hypot(dx, dz);
      if (d < T.safe_radius) {
        const ux = d > 1e-9 ? dx / d : 1, uz = d > 1e-9 ? dz / d : 0;
        s.pos[0] = l.pos[0] + ux * T.safe_radius;
        s.pos[2] = l.pos[2] + uz * T.safe_radius;
      }
    }
    const d0 = Math.hypot(s.pos[0], s.pos[2]);
    if (d0 > W.island_radius) { s.pos[0] *= W.island_radius / d0; s.pos[2] *= W.island_radius / d0; }
  }

  step(input = {}) {
    const ev = [];
    if (this.state !== 'playing') return ev;
    const k = this.tick + 1; // tick ghi cho sự kiện của bước này
    const emit = (name, data) => ev.push({ type: 'event', tick: k, name, data });
    const P = this.player;
    const edge = (n) => { const on = !!input[n], e = on && !this.prev[n]; this.prev[n] = on; return e; };
    const jump = edge('jump'), interact = edge('interact'), pulse = edge('pulse');

    if (P.invuln > 0) P.invuln--;
    if (P.pulseCd > 0) P.pulseCd--;

    // 2 di chuyển, nhảy
    const [dx, dz] = moveDir(input.move || [0, 0], input.cam_yaw_deg || 0);
    P.pos[0] += dx * T.player_speed * DT;
    P.pos[2] += dz * T.player_speed * DT;
    const dc = Math.hypot(P.pos[0], P.pos[2]);
    if (dc > W.island_radius) { P.pos[0] *= W.island_radius / dc; P.pos[2] *= W.island_radius / dc; }
    if (jump && P.pos[1] <= 0) P.vy = W.jump_speed;
    if (P.pos[1] > 0 || P.vy > 0) {
      P.vy -= W.gravity * DT;
      P.pos[1] += P.vy * DT;
      if (P.pos[1] <= 0) { P.pos[1] = 0; P.vy = 0; }
    }

    // 3 nhặt đom đóm
    for (let i = 0; i < this.motes.length && P.carried < T.carry_capacity;) {
      if (dist(this.motes[i].pos, P.pos) <= T.pickup_radius) {
        this.motes.splice(i, 1);
        P.carried++;
        this.score += T.score.per_mote;
        emit('mote_picked', { carried: P.carried });
      } else i++;
    }

    // 4 nạp đèn
    if (interact && P.carried > 0) {
      let best = null;
      for (const l of this.lanterns) {
        const d = dist(l.pos, P.pos);
        if (!l.lit && d <= T.interact_radius && (!best || d < best.d)) best = { l, d };
      }
      if (best) {
        const L = best.l, amount = Math.min(P.carried, T.lantern_cost - L.deposited);
        P.carried -= amount;
        L.deposited += amount;
        emit('deposit', { lantern_id: L.id, amount, deposited: L.deposited });
        if (L.deposited >= T.lantern_cost) {
          L.lit = true;
          this.score += T.score.per_lantern;
          emit('lantern_lit', { lantern_id: L.id });
        }
      }
    }
    if (this.lanterns.every((l) => l.lit)) {
      const left = this.leftTicks - (this.steps + 1);
      this.score += Math.floor(Math.max(0, left) / W.tick_hz) * T.score.per_second_left
        + P.flames * T.score.per_flame_left;
      return this.finish(ev, k, 'won', 'all_lit');
    }

    // 5 tỏa sáng (pulse): tốn pulse_cost đom đóm đang mang, có hồi
    if (pulse && P.pulseCd === 0 && P.carried >= T.pulse_cost) {
      P.carried -= T.pulse_cost;
      P.pulseCd = ticksOf(T.pulse_cooldown_s);
      const ids = [];
      for (const s of this.shades) {
        if (dist(s.pos, P.pos) > T.pulse_radius) continue;
        const ex = s.pos[0] - P.pos[0], ez = s.pos[2] - P.pos[2], d = Math.hypot(ex, ez);
        const ux = d > 1e-9 ? ex / d : 1, uz = d > 1e-9 ? ez / d : 0;
        s.pos[0] += ux * T.pulse_push_m;
        s.pos[2] += uz * T.pulse_push_m;
        this.clampShade(s);
        s.state = 'stunned';
        s.timer = ticksOf(T.pulse_stun_s);
        ids.push(s.id);
        this.score += T.score.per_stun;
      }
      emit('pulse', { stunned_ids: ids });
    }

    // 6 Bóng Mực
    for (const s of this.shades) {
      if (s.state === 'stunned') { if (--s.timer <= 0) s.state = 'chase'; continue; }
      let ux = P.pos[0] - s.pos[0], uz = P.pos[2] - s.pos[2];
      const d = Math.hypot(ux, uz);
      if (d > 1e-9) { ux /= d; uz /= d; }
      if (s.state === 'recoil') {
        s.pos[0] -= ux * T.shade_speed * DT;
        s.pos[2] -= uz * T.shade_speed * DT;
        if (--s.timer <= 0) s.state = 'chase';
      } else {
        const m = Math.min(T.shade_speed * DT, d);
        s.pos[0] += ux * m;
        s.pos[2] += uz * m;
      }
      this.clampShade(s);
      if (s.state === 'chase' && P.invuln === 0 && dist(s.pos, P.pos) <= T.shade_hit_radius) {
        P.flames--;
        P.invuln = ticksOf(T.invuln_s);
        const dropped = Math.floor(P.carried * T.hit_drop_ratio + 1e-9);
        P.carried -= dropped;
        const a0 = this.rng() * 2 * Math.PI;
        for (let i = 0; i < dropped; i++) {
          const a = a0 + (i * 2 * Math.PI) / dropped;
          this.addMote(P.pos[0] + W.drop_ring_m * Math.sin(a), P.pos[2] + W.drop_ring_m * Math.cos(a));
        }
        s.state = 'recoil';
        s.timer = ticksOf(W.shade_recoil_s);
        emit('player_hit', { by: 'shade', flames: P.flames, dropped });
        if (P.flames <= 0) return this.finish(ev, k, 'lost', 'no_flames');
      }
    }

    // 7 sinh ngẫu nhiên (chỉ khi scenario không tắt)
    const n = this.steps + 1;
    if (this.randomMotes && n % ticksOf(W.mote_respawn_s) === 0 && this.motes.length < W.mote_min_active) this.spawnRandomMote();
    if (this.randomShades && n % ticksOf(W.shade_spawn_every_s) === 0 && this.shades.length < W.max_shades) {
      const s = this.addShade(this.shadeSpawnPos());
      emit('shade_spawned', { id: s.id });
    }

    // 8 hết giờ
    this.steps = n;
    this.tick = k;
    if (this.leftTicks - this.steps <= 0) return this.finish(ev, k, 'lost', 'dawn');
    return ev;
  }

  finish(ev, k, result, reason) {
    this.steps = k;
    this.tick = k;
    this.state = result;
    ev.push({ type: 'event', tick: k, name: 'game_over', data: { result, reason } });
    return ev;
  }

  snapshot() {
    const P = this.player;
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.steps, state: this.state,
      time_left_s: r3((this.leftTicks - this.steps) / W.tick_hz), score: this.score,
      player: { pos: rp(P.pos), flames: P.flames, carried: P.carried },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: rp(l.pos), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: rp(s.pos), state: s.state })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: rp(m.pos) })),
    };
  }
}
