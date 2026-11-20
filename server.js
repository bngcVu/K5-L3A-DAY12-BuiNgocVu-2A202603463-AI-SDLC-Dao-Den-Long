// Máy chủ tĩnh tối giản: web/ + src/ + three (từ node_modules). Không thêm phụ thuộc.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 8080;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
const maps = [['/vendor/three/', 'node_modules/three/build/'], ['/src/', 'src/'], ['/', 'web/']];

createServer(async (req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') url = '/index.html';
  const [prefix, dir] = maps.find(([p]) => url.startsWith(p));
  const file = normalize(join(root, dir, url.slice(prefix.length)));
  if (!file.startsWith(join(root, dir.split('/')[0]))) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`Đảo Đèn Lồng: http://localhost:${port}`));
