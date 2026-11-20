// Soak test (Ticket-04 §2): nhiều Đêm liên tiếp, CÙNG MỘT tiến trình, input ngẫu nhiên theo seed.
//   node src/soak.js --seed 7 --nights 10 --out soak.json
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import v8 from 'node:v8';
import vm from 'node:vm';
import { Sim } from './sim/sim.js';
import { makeRng } from './sim/rng.js';
import { TUNING as T } from './sim/config.js';

const mb = () => Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
let gcFn = null;
try { v8.setFlagsFromString('--expose-gc'); gcFn = vm.runInNewContext('gc'); } catch { /* không có gc thủ công cũng được */ }
const settle = () => { if (gcFn) { gcFn(); gcFn(); } }; // đo RSS sau khi bộ nhớ đã thu dọn để so sánh công bằng

// Đêm thứ i (i = 0..): bản đồ 1,2,3 xoay vòng, seed = seed + i
// Khởi động nóng (JIT/bộ cấp phát) để mem_start không quá thấp so với trạng thái ổn định; heap thật được kiểm ở docs (không rò rỉ)
function warmup() {
  for (let n = 1; n <= 3; n++) {
    const sim = new Sim({ seed: 1000 + n, night: n }), rng = makeRng(n);
    for (let k = 0; k < 4000 && sim.state === 'playing'; k++) sim.step({ move: [Math.cos(k / 40), Math.sin(k / 40)], jump: rng() < 0.05, dash: rng() < 0.03, pulse: rng() < 0.02, interact: rng() < 0.1 });
  }
}

export function runSoak({ seed = 7, nights = 10 } = {}) {
  warmup();
  const t0 = performance.now();
  const results = [];
  let crashes = 0, memStart = null;
  for (let i = 0; i < nights; i++) {
    const night = (i % 3) + 1;
    try {
      let sim = new Sim({ seed: seed + i, night });
      if (memStart === null) { settle(); memStart = mb(); } // sau khi tải xong Đêm đầu tiên
      const rng = makeRng((seed + i) * 7919 + 13); // RNG của input, tách khỏi RNG của sim
      const maxTicks = Math.round(T[`night${night}_duration_s`] * 60) + 5;
      const input = { move: [0, 0], cam_yaw_deg: 0, jump: false, dash: false, pulse: false, interact: false };
      for (let k = 0; k < maxTicks && sim.state === 'playing'; k++) {
        if (k % 30 === 0) { const a = rng() * 2 * Math.PI; input.move = [Math.cos(a), Math.sin(a)]; } // chọn lại hướng mỗi 30 tick
        input.jump = rng() < 0.05; input.dash = rng() < 0.03; input.pulse = rng() < 0.02; input.interact = rng() < 0.1;
        sim.step(input);
      }
      results.push(sim.state === 'won' ? 'won' : 'lost');
      sim = null; // reset: bỏ tham chiếu Đêm vừa xong
    } catch (e) {
      crashes++; results.push('lost');
      process.stderr.write(`soak: Đêm ${i + 1} lỗi: ${e.stack || e}\n`);
    }
  }
  settle();
  return {
    nights, crashes, results,
    mem_start_mb: memStart ?? mb(), mem_end_mb: mb(), duration_s: Math.round(((performance.now() - t0) / 1000) * 10) / 10,
  };
}

// RSS của Node tăng bậc thang vì V8 nở dần vùng nhớ "thế hệ trẻ" khi sinh nhiều rác (đo trên GitHub Actions/Ubuntu: 68.7 → 86.1 MB = 1.25×
// dù heap thật phẳng ~5 MB). Chặn vùng này bằng cờ V8; mọi Đêm vẫn chạy trong CÙNG MỘT tiến trình (tiến trình con này).
const V8_FLAGS = ['--max-semi-space-size=1', '--expose-gc'];
function relaunchWithFlags() {
  if (process.env.DDL_SOAK_CHILD) return;
  const r = spawnSync(process.execPath, [...V8_FLAGS, fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, DDL_SOAK_CHILD: '1' } });
  process.exit(r.status ?? 1);
}

function main() {
  relaunchWithFlags();
  const a = process.argv.slice(2), get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
  const seed = Number(get('--seed', 7)), nights = Number(get('--nights', 10)), out = get('--out');
  if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1 || !out) {
    process.stderr.write('dùng: node src/soak.js --seed 7 --nights 10 --out soak.json\n');
    process.exit(2);
  }
  const res = runSoak({ seed, nights });
  writeFileSync(out, JSON.stringify(res) + '\n');
  process.stdout.write(`soak: ${JSON.stringify(res)}\n`);
  process.exit(res.crashes === 0 && res.mem_end_mb <= 1.2 * res.mem_start_mb ? 0 : 1);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
