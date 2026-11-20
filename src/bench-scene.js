// Cảnh benchmark chuẩn (Ticket-04 §1): Đêm 1, 200 Bóng Mực `wander` rải đều, 100 đom đóm, L1–L3 sáng fuel 100.
// Sim chạy với `bench: true`: tắt sinh thêm, sát thương, nhặt, hao dầu, điều kiện kết thúc, và Bóng Mực không đổi sang chase/nhắm đèn.
import { makeRng } from './sim/rng.js';

export const BENCH = { shades: 200, motes: 100, radius: 38, duration_warmup_s: 3, camera_radius: 30, camera_height: 15, camera_period_s: 15 };

export function benchScenario(seed = 42) {
  const rng = makeRng(seed);
  const disk = () => { const r = BENCH.radius * Math.sqrt(rng()), a = rng() * 2 * Math.PI; return [Math.round(r * Math.cos(a) * 1000) / 1000, Math.round(r * Math.sin(a) * 1000) / 1000]; };
  const shades = Array.from({ length: BENCH.shades }, () => { const [x, z] = disk(); return { pos: [x, 1, z], state: 'wander' }; });
  const motes = Array.from({ length: BENCH.motes }, () => { const [x, z] = disk(); return [x, 0, z]; });
  return {
    player: { pos: [0, 0, 0], carried: 0, flames: 3 },
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    motes, shades,
    lanterns: [{ id: 'L1', lit: true, fuel: 100 }, { id: 'L2', lit: true, fuel: 100 }, { id: 'L3', lit: true, fuel: 100 }],
  };
}

// Camera bay vòng: tâm (0,0,0), r = 30 m, Y = 15, xuất phát (30,15,0), 15 s/vòng, luôn nhìn vào (0,0,0)
export function benchCamera(tSeconds) {
  const a = (2 * Math.PI * tSeconds) / BENCH.camera_period_s;
  return [BENCH.camera_radius * Math.cos(a), BENCH.camera_height, BENCH.camera_radius * Math.sin(a)];
}
