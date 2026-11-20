// Chế độ headless theo Test Contract v1.0.
// node src/headless.js --seed 1 --night 1 [--scenario f.json] [--inputs f.json] --ticks N --out f.jsonl [--snapshot-every 10]
import { readFileSync, writeFileSync } from 'node:fs';
import { Sim } from './sim/sim.js';
import { validateScenario, validateInputs, FormatError } from './sim/validate.js';

class UsageError extends Error {}

function parseArgs(argv) {
  const a = { snapshotEvery: 10 };
  const intArg = (name, v) => {
    if (!/^-?\d+$/.test(v ?? '')) throw new UsageError(`${name} phải là số nguyên, nhận '${v}'`);
    return Number(v);
  };
  for (let i = 0; i < argv.length; i += 2) {
    const f = argv[i], v = argv[i + 1];
    if (v === undefined) throw new UsageError(`thiếu giá trị cho ${f}`);
    if (f === '--seed') a.seed = intArg(f, v);
    else if (f === '--night') a.night = intArg(f, v);
    else if (f === '--ticks') a.ticks = intArg(f, v);
    else if (f === '--snapshot-every') a.snapshotEvery = intArg(f, v);
    else if (f === '--scenario') a.scenario = v;
    else if (f === '--inputs') a.inputs = v;
    else if (f === '--out') a.out = v;
    else throw new UsageError(`tham số lạ: ${f}`);
  }
  if (a.seed === undefined) throw new UsageError('thiếu --seed');
  if (a.ticks === undefined || a.ticks < 0) throw new UsageError('thiếu hoặc sai --ticks');
  if (!a.out) throw new UsageError('thiếu --out');
  if (a.night !== 1) throw new UsageError('chỉ hỗ trợ --night 1 ở Phase 1');
  if (a.snapshotEvery < 1) throw new UsageError('--snapshot-every phải ≥ 1');
  return a;
}

function loadJson(path, what) {
  let text;
  try { text = readFileSync(path, 'utf8'); } catch (e) { throw new UsageError(`không đọc được ${what} '${path}': ${e.message}`); }
  try { return JSON.parse(text); } catch (e) { throw new UsageError(`${what} '${path}' không phải JSON: ${e.message}`); }
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const scenario = a.scenario ? validateScenario(loadJson(a.scenario, 'scenario')) : {};
  const frames = a.inputs ? validateInputs(loadJson(a.inputs, 'inputs')) : [];

  const sim = new Sim({ seed: a.seed, scenario });
  const lines = [];
  const push = (o) => lines.push(JSON.stringify(o));
  const input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
  let fi = 0;
  push(sim.snapshot()); // tick 0: sau khi dựng scenario, trước input
  for (let k = 0; k < a.ticks && sim.state === 'playing'; k++) {
    while (fi < frames.length && frames[fi].tick === k) {
      const { tick, ...rest } = frames[fi++];
      Object.assign(input, rest); // trường vắng mặt giữ giá trị cũ
    }
    for (const e of sim.step(input)) push(e);
    if (sim.tick % a.snapshotEvery === 0) push(sim.snapshot());
  }
  push({ type: 'end', ticks: sim.steps, state: sim.state, score: sim.score });
  writeFileSync(a.out, lines.join('\n') + '\n');
}

try {
  main();
} catch (e) {
  process.stderr.write(`lỗi: ${e.message}\n`);
  process.exit((e instanceof UsageError || e instanceof FormatError) ? 2 : 1);
}
