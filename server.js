// Máy chủ tĩnh tối giản + bảng xếp hạng lưu trên đĩa. Không thêm phụ thuộc.
//   node server.js                                   # chơi tại http://localhost:8080
//   node server.js --export-leaderboard out.json     # xuất {"entries":[...]} rồi thoát (mã 0)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeEntry, addEntry, sortEntries, TOP_N } from './src/leaderboard.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const maps = [['/vendor/three/', 'node_modules/three/build/'], ['/src/', 'src/'], ['/', 'web/']];
export const defaultBoardFile = () => process.env.LEADERBOARD_FILE || join(root, 'data', 'leaderboard.json');

export function readBoard(file) {
  try { const j = JSON.parse(readFileSync(file, 'utf8')); return sortEntries(Array.isArray(j.entries) ? j.entries : []).slice(0, TOP_N); } catch { return []; }
}
export function writeBoard(file, entries) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ entries }, null, 2) + '\n');
}

const body = (req, limit = 5e6) => new Promise((ok, no) => {
  let s = '';
  req.on('data', (c) => { s += c; if (s.length > limit) { no(new Error('quá lớn')); req.destroy(); } });
  req.on('end', () => ok(s)); req.on('error', no);
});
const json = (res, code, obj) => res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(obj));

export function createApp({ boardFile = defaultBoardFile(), onBenchResult } = {}) {
  return createServer(async (req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (url === '/api/leaderboard') {
      if (req.method === 'GET') return json(res, 200, { entries: readBoard(boardFile) });
      if (req.method === 'POST') {
        try {
          const b = JSON.parse(await body(req));
          const entry = makeEntry({ name: b.name, score: b.score, nights_won: b.nights_won, seed: b.seed }); // giờ do máy chủ đóng dấu
          const list = addEntry(readBoard(boardFile), entry);
          writeBoard(boardFile, list);
          return json(res, 200, { ok: true, entries: list });
        } catch (e) { return json(res, 400, { error: e.message }); }
      }
      return json(res, 405, { error: 'method' });
    }
    if (url === '/api/bench-result' && req.method === 'POST') {
      try { onBenchResult?.(JSON.parse(await body(req, 5e7))); return json(res, 200, { ok: true }); } catch (e) { return json(res, 400, { error: e.message }); }
    }
    if (url === '/') url = '/index.html';
    const [prefix, dir] = maps.find(([p]) => url.startsWith(p));
    const file = normalize(join(root, dir, url.slice(prefix.length)));
    if (!file.startsWith(resolve(root, dir.split('/')[0]))) { res.writeHead(403).end(); return; }
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(data);
    } catch { res.writeHead(404).end('not found'); }
  });
}

function main() {
  const a = process.argv.slice(2), get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  const exportTo = get('--export-leaderboard');
  if (a.includes('--export-leaderboard')) {
    if (!exportTo) { process.stderr.write('dùng: node server.js --export-leaderboard out.json\n'); process.exit(2); }
    writeFileSync(exportTo, JSON.stringify({ entries: readBoard(defaultBoardFile()) }, null, 2) + '\n');
    process.stdout.write(`Đã xuất bảng xếp hạng → ${exportTo}\n`);
    process.exit(0);
  }
  const port = Number(get('--port') || process.env.PORT) || 8080;
  createApp().listen(port, () => console.log(`Đảo Đèn Lồng: http://localhost:${port}`));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
