// Benchmark (Ticket-04 §1):  node bench/bench.js --seed 42 --duration 30 --out bench.json
// Mở Chrome/Chromium/Edge có cửa sổ 1280×720, tắt vsync (cờ dòng lệnh), chạy cảnh benchmark chuẩn ở web/main.js (?bench=1),
// nhận dt từng khung hình qua /api/bench-result và tính số liệu bằng src/bench-stats.js.
//   Biến môi trường: CHROME_PATH (đường dẫn trình duyệt), BENCH_HEADLESS=1 (không cửa sổ, cho CI), BENCH_SOFTWARE=1 (ép render phần mềm).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, platform, release, arch, type as osType, cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';
import { summarizeFrames } from '../src/bench-stats.js';

const t0 = Date.now() - process.uptime() * 1000; // lúc tiến trình bắt đầu (cho load_ms)
const a = process.argv.slice(2), get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const seed = Number(get('--seed', 42)), duration = Number(get('--duration', 30)), out = get('--out');
if (!Number.isInteger(seed) || !(duration > 0) || !out) { process.stderr.write('dùng: node bench/bench.js --seed 42 --duration 30 --out bench.json\n'); process.exit(2); }

function findBrowser() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    const r = spawnSync(platform() === 'win32' ? 'where' : 'which', [n], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.split(/\r?\n/)[0].trim();
  }
  return null;
}
const browser = findBrowser();
if (!browser) { process.stderr.write('Không tìm thấy Chrome/Chromium/Edge. Đặt CHROME_PATH=/đường/dẫn/tới/trình-duyệt rồi chạy lại.\n'); process.exit(3); }

let finish;
const result = new Promise((ok) => { finish = ok; });
const server = createApp({ onBenchResult: finish });
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
const profile = mkdtempSync(join(tmpdir(), 'ddl-bench-'));
const headless = process.env.BENCH_HEADLESS === '1' || (platform() === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY);
const flags = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,720', '--window-position=0,0',
  '--disable-gpu-vsync', '--disable-frame-rate-limit', // tắt vsync / giới hạn khung hình
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required',
  ...(headless ? ['--headless=new'] : []), ...(process.env.BENCH_SOFTWARE === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
  `--app=http://127.0.0.1:${port}/?bench=1&seed=${seed}&duration=${duration}`];
const child = spawn(browser, flags, { stdio: 'ignore', detached: platform() !== 'win32' });
let exited = null; child.on('exit', (c) => { exited = c; });
const kill = () => { try { if (platform() === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(-child.pid, 'SIGKILL'); } catch { /* đã thoát */ } };

const timeout = new Promise((_, no) => setTimeout(() => no(new Error(`hết giờ chờ (${duration + 90}s); trình duyệt thoát mã ${exited}`)), (duration + 90) * 1000));
let code = 0;
try {
  const r = await Promise.race([result, timeout]);
  const s = summarizeFrames(r.dts), r1 = (x) => Math.round(x * 10) / 10;
  const json = {
    contract_version: '1.3',
    avg_fps: r1(s.avg_fps), p1_low_fps: r1(s.p1_low_fps), frame_ms_p95: r1(s.frame_ms_p95), frames: s.frames,
    load_ms: Math.max(0, Math.round(r.first_frame_epoch - t0)),
    peak_mem_mb: null,
    peak_mem_note: 'Bản web: Chrome chạy nhiều tiến trình nên không đo được RSS của một tiến trình game',
    vsync_off: true,
    vsync_note: `Chạy với --disable-gpu-vsync --disable-frame-rate-limit; ${headless ? 'chế độ headless' : 'cửa sổ thường'}. Nếu GPU/trình điều khiển ép vsync, avg_fps bị chặn ở tần số quét màn hình`,
    renderer: r.renderer,
    os: `${osType()} ${release()} ${arch()} · ${platform()} · ${cpus()[0]?.model ?? '?'} ×${cpus().length} · RAM ${Math.round(totalmem() / 2 ** 30)} GB`,
  };
  writeFileSync(out, JSON.stringify(json, null, 2) + '\n');
  process.stdout.write(`bench: avg ${json.avg_fps} fps · p1 low ${json.p1_low_fps} fps · p95 ${json.frame_ms_p95} ms · ${json.frames} khung · load ${json.load_ms} ms → ${out}\n`);
} catch (e) { process.stderr.write(`bench lỗi: ${e.message}\n`); code = 1; }
kill(); server.close();
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* bỏ qua */ } process.exit(code); }, 1500);
