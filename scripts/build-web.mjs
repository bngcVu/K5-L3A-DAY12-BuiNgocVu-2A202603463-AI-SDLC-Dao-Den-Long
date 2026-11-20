// Đóng gói bản web tĩnh (không cần Node để chơi): node scripts/build-web.mjs  →  dist/web/
// Phục vụ bằng bất kỳ máy chủ tĩnh nào, ví dụ:  python3 -m http.server -d dist/web 8080
// Bản tĩnh không có máy chủ API: bảng xếp hạng tự lưu trong trình duyệt (localStorage).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url)), out = join(root, 'dist', 'web');
const three = join(root, 'node_modules', 'three', 'build', 'three.module.js');
if (!existsSync(three)) { console.error('Thiếu three.js: chạy `npm install` trước.'); process.exit(1); }
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'vendor', 'three'), { recursive: true });
cpSync(join(root, 'web'), out, { recursive: true });
cpSync(join(root, 'src'), join(out, 'src'), { recursive: true });
cpSync(three, join(out, 'vendor', 'three', 'three.module.js'));
// Đường dẫn tuyệt đối → tương đối để chạy được ở thư mục con
const fix = (f, pairs) => { const p = join(out, f); let s = readFileSync(p, 'utf8'); for (const [a, b] of pairs) s = s.split(a).join(b); writeFileSync(p, s); };
fix('index.html', [['"/vendor/three/three.module.js"', '"./vendor/three/three.module.js"'], ['src="/main.js"', 'src="./main.js"']]);
fix('main.js', [["from '/src/", "from './src/"], ["from '/audio.js'", "from './audio.js'"], ["fetch('/api/", "fetch('./api/"]]);
console.log(`Đã tạo ${out}`);
