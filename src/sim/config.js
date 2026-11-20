// Số liệu game — nguồn duy nhất. TUNING phải khớp game.contract.json (có unit test kiểm).
export const TUNING = {
  player_speed: 6,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.2,
  interact_radius: 2.5,
  pulse_cost: 2,
  pulse_radius: 6,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3,
  pulse_push_m: 3,
  pulse_cooldown_s: 1.5,
  safe_radius: 4,
  shade_speed: 3.5,
  shade_hit_radius: 1,
  fall_enabled: false,
  score: { per_mote: 10, per_lantern: 100, per_stun: 20, per_second_left: 1, per_flame_left: 50 },
};

// Hằng số khác (không thuộc tuning của contract)
export const WORLD = {
  tick_hz: 60,
  island_radius: 45, // rìa đảo: chặn người chơi, không rơi (fall_enabled=false)
  lantern_ring: 25, // 5 đèn xếp vòng, L1 ở (0,0,25)
  gravity: 20,
  jump_speed: 7,
  shade_y: 1.0,
  shade_recoil_s: 1.0,
  drop_ring_m: 2.5, // đom đóm rơi nằm ngoài pickup_radius
  initial_motes: 40,
  mote_min_active: 40,
  mote_respawn_s: 1,
  mote_spawn_radius: 40,
  initial_shades: 2,
  max_shades: 6,
  shade_spawn_every_s: 20,
  shade_spawn_ring: 40,
  shade_spawn_min_player_m: 15,
};
