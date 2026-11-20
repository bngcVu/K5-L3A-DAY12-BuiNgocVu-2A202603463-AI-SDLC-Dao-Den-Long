// Client 3D (Three.js). Chỉ ĐỌC state từ Sim; mọi luật chơi nằm trong src/sim.
// Chuỗi 3 Đêm, menu, tạm dừng, cài đặt (đổi phím, mù màu, giảm chuyển động, chữ lớn), bảng xếp hạng, chế độ benchmark (?bench=1).
import * as THREE from 'three';
import { Sim } from '/src/sim/sim.js';
import { TUNING as T } from '/src/sim/config.js';
import { validateName, makeEntry, addEntry } from '/src/leaderboard.js';
import { benchScenario, benchCamera, BENCH } from '/src/bench-scene.js';
import { GameAudio } from '/audio.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const BENCH_MODE = q.has('bench');

// Bảng màu chuẩn (Ticket-02)
const C = {
  sky: 0x0e1430, mist: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lamp: 0xffb347, core: 0xffe9b0, unlit: 0x5b5f6e, moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shade: 0x120a1a, rim: 0x7a3cff, stunned: 0x3a3450, shirt: 0xe8e2d0, red: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const GOAL = (n) => ({ 1: [3, 5], 2: [4, 6], 3: [5, 7] }[n]);
const NIGHTS = {
  1: { name: 'Đêm 1 · Đảo Bến', text: 'Ông Đăng: «Đảo Bến là nơi chuyến tàu cuối cùng cập bến. Thắp năm ngọn đèn, ta sẽ có đường về, cháu ạ.»' },
  2: { name: 'Đêm 2 · Đảo Cau', text: 'Ông Đăng: «Hai đảo cau cách nhau một cây cầu tre và một ngọn gió. Coi chừng Gió Lạc, chúng mê đom đóm lắm.»' },
  3: { name: 'Đêm 3 · Đảo Chuông', text: 'Ông Đăng: «Chuông trên tháp đã im bao năm. Leo lên, thắp bảy ngọn đèn và đón bình minh nhé.»' },
};

// ---------- cài đặt (lưu giữa các lần mở) ----------
const ACTIONS = [['up', 'Đi lên'], ['down', 'Đi xuống'], ['left', 'Sang trái'], ['right', 'Sang phải'], ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Tương tác (nạp / châm dầu)'], ['pulse', 'Tỏa sáng'], ['pause', 'Tạm dừng']];
const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'Escape' };
const settings = { vol: 70, sens: 50, cb: false, rm: false, large: false, keys: { ...DEFAULT_KEYS } };
try { const s = JSON.parse(localStorage.getItem('ddl-settings') || '{}'); Object.assign(settings, s, { keys: { ...DEFAULT_KEYS, ...(s.keys || {}) } }); } catch { /* bỏ qua */ }
const saveSettings = () => { try { localStorage.setItem('ddl-settings', JSON.stringify(settings)); } catch { /* bỏ qua */ } };
const keyName = (c) => c.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', 'Mũi tên ').replace('Space', 'Cách').replace('ShiftLeft', 'Shift trái').replace('ShiftRight', 'Shift phải').replace('Escape', 'Esc').replace('ControlLeft', 'Ctrl trái');
const applyBody = () => { document.body.classList.toggle('cb', !!settings.cb); document.body.classList.toggle('rm', !!settings.rm); document.body.classList.toggle('large', !!settings.large); document.body.classList.toggle('bench', BENCH_MODE); };
applyBody();
const audio = new GameAudio(); audio.setVolume(settings.vol / 100);
const RIM = () => (settings.cb ? 0x00b3ff : C.rim); // viền/mắt Bóng Mực

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !BENCH_MODE ? true : true });
renderer.setPixelRatio(BENCH_MODE ? 1 : Math.min(devicePixelRatio, 2));
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky); scene.fog = new THREE.Fog(C.mist, 30, 120);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);
function resize() {
  if (BENCH_MODE) { renderer.setSize(1280, 720); camera.aspect = 1280 / 720; } else { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; }
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const VW = () => (BENCH_MODE ? 1280 : innerWidth), VH = () => (BENCH_MODE ? 720 : innerHeight);
const mat = (c, e = 0, ei = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: ei, roughness: 0.85, ...o });
const halo = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,246,194,1)'); gr.addColorStop(0.35, 'rgba(255,229,138,.55)'); gr.addColorStop(1, 'rgba(255,229,138,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
})();
const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(C.sea, 0x0a2030, 0.4));
sea.rotation.x = -Math.PI / 2; sea.position.y = -9; scene.add(sea);

// Tài nguyên dùng chung (200 Bóng Mực / 100 đom đóm không tạo 300 bản sao hình học + vật liệu)
const SH = {
  body: new THREE.SphereGeometry(0.8, 16, 12), outline: new THREE.SphereGeometry(0.88, 16, 12), eye: new THREE.SphereGeometry(0.1, 8, 6),
  bodyMat: mat(C.shade), stunMat: mat(C.stunned), rimMat: new THREE.MeshBasicMaterial({ color: C.rim, side: THREE.BackSide }), eyeMat: new THREE.MeshBasicMaterial({ color: C.rim }),
  beamMat: new THREE.MeshBasicMaterial({ color: C.rim, transparent: true, opacity: 0.6 }), beamGeo: new THREE.CylinderGeometry(0.06, 0.06, 1, 6),
};
const MO = { geo: new THREE.SphereGeometry(0.2, 10, 8), mat: new THREE.MeshBasicMaterial({ color: C.moteCore }), sprite: new THREE.SpriteMaterial({ map: halo, color: C.moteHalo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }) };
function applyPalette() { SH.rimMat.color.setHex(RIM()); SH.eyeMat.color.setHex(RIM()); SH.beamMat.color.setHex(RIM()); }
applyPalette();

// ---------- thế giới từng Đêm ----------
let world = null;
function disc(g, cx, cz, r, h, y, color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 56), mat(color)); m.position.set(cx, y - h / 2, cz); g.add(m);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 8, 64), mat(C.sand)); rim.rotation.x = Math.PI / 2; rim.position.set(cx, y, cz); g.add(rim);
}
function pad(g, p) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 24), mat(C.gold, C.gold, 0.8)); m.position.set(p[0], p[1] + 0.1, p[2]); g.add(m); }
function buildWorld(night) {
  if (world) scene.remove(world);
  const g = (world = new THREE.Group()); scene.add(g);
  if (night === 1) disc(g, 0, 0, 40, 5, 0, C.grass);
  if (night === 2) {
    disc(g, 0, 0, 28, 5, 0, C.grass); disc(g, 70, 0, 28, 5, 0, C.grass);
    const br = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), mat(C.wood)); br.position.set(35, -0.2, 0); g.add(br); // cầu tre, không lan can
    pad(g, [20, 0, 18]); pad(g, [50, 0, -18]);
  }
  if (night === 3) {
    disc(g, 0, 0, 45, 6, 0, C.grass);
    const sh = new THREE.Shape(); sh.absarc(0, 0, 24, 0, Math.PI, false); sh.absarc(0, 0, 12, Math.PI, 0, true);
    const t1 = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false, curveSegments: 40 }), mat(C.sand));
    t1.rotation.x = Math.PI / 2; t1.position.y = 3; g.add(t1);
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 40), mat(C.sand)); t2.position.y = 3; g.add(t2);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 24), mat(C.wood)); tower.position.y = 10; g.add(tower);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), mat(C.gold, C.gold, 0.5)); bell.position.y = 14.6; g.add(bell);
    for (const deg of [30, 150]) {
      const a = (deg * Math.PI) / 180, gr = new THREE.Group();
      gr.position.set(27 * Math.cos(a), 1.5, 27 * Math.sin(a)); gr.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
      const r = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, Math.hypot(6, 3)), mat(C.wood)); r.rotation.x = Math.atan(0.5); gr.add(r); g.add(gr);
    }
    pad(g, [0, 3, 13]);
  }
}

// ---------- thực thể ----------
const views = { lanterns: new Map(), motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map() };
const player = new THREE.Group();
const lampLight = new THREE.PointLight(C.lamp, 3, 16, 1.6);
{
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.7, 4, 10), mat(C.shirt)); body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), mat(0xf2c9a0)); head.position.y = 1.55;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 20), mat(C.sand)); hat.position.y = 1.95; // nón lá
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 8, 18), mat(C.red)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.3;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), mat(C.wood)); pole.position.set(0.55, 1.2, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(C.lamp, C.lamp, 2)); lamp.position.set(0.55, 0.7, 0);
  lampLight.position.copy(lamp.position);
  player.add(body, head, hat, scarf, pole, lamp, lampLight);
}
scene.add(player);
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 56), new THREE.MeshBasicMaterial({ color: C.lamp, transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2; scene.add(pulseRing);
let pulseT = 99;
const leaves = Array.from({ length: 28 }, () => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshBasicMaterial({ color: 0x7a9a4a, side: THREE.DoubleSide })); m.visible = false; scene.add(m); return m;
});

function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), mat(C.wood)); post.position.y = 1.5;
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), mat(C.unlit)); cage.position.y = 3.6;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: C.core })); core.position.y = 3.6;
  const light = new THREE.PointLight(C.lamp, 0, 34, 1.4); light.position.y = 3.6;
  const zone = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.15, T.safe_radius, 64), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  zone.rotation.x = -Math.PI / 2; zone.position.y = 0.06;
  const bar = new THREE.Group(); bar.position.y = 5.1;
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.26), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
  const barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.16), new THREE.MeshBasicMaterial({ color: C.lamp })); barFill.position.z = 0.01;
  bar.add(barBg, barFill);
  const tear = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), new THREE.MeshBasicMaterial({ color: C.sky, side: THREE.DoubleSide })); tear.position.set(0.25, 3.5, 0.55); tear.rotation.z = 0.6;
  g.add(post, cage, core, light, zone, bar, tear); scene.add(g);
  return { g, cage, core, light, zone, bar, barFill, tear };
}
function makeMote() {
  const m = new THREE.Mesh(MO.geo, MO.mat);
  const s = new THREE.Sprite(MO.sprite); s.scale.setScalar(1.6); m.add(s);
  scene.add(m); return { g: m };
}
function makeShade() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(SH.body, SH.bodyMat); b.scale.y = 1.15;
  const o = new THREE.Mesh(SH.outline, SH.rimMat); o.scale.y = 1.15;
  g.add(b, o);
  for (const x of [-0.28, 0.28]) { const e = new THREE.Mesh(SH.eye, SH.eyeMat); e.position.set(x, 0.15, 0.7); g.add(e); }
  scene.add(g); return { g, b, beam: null };
}
function makeDrifter() {
  const geo = new THREE.PlaneGeometry(2.6, 0.55, 14, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.drifter, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  scene.add(m); return { g: m, geo };
}
function makeCharm() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.02, 0.04), mat(C.gold, C.gold, 0.6)));
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.88, 0.06), mat(C.red, C.red, 0.5)); g.add(card);
  scene.add(g); return { g };
}
function dropView(v) { scene.remove(v.g); if (v.beam) scene.remove(v.beam); }
function syncMap(map, items, make, upd) {
  const alive = new Set();
  for (const it of items) { alive.add(it.id); let v = map.get(it.id); if (!v) { v = make(); map.set(it.id, v); } upd(v, it); }
  for (const [id, v] of map) if (!alive.has(id)) { dropView(v); map.delete(id); }
}
function clearViews() { for (const m of Object.values(views)) { for (const v of m.values()) dropView(v); m.clear(); } }

// ---------- thông báo, phụ đề, chỉ báo hình ảnh ----------
let toastT; function toast(t, ms = 2600) { $('toast').textContent = t; clearTimeout(toastT); toastT = setTimeout(() => ($('toast').textContent = ''), ms); }
let capT; function caption(t, ms = 2800, alert = true) {
  const box = $('caption'), sp = box.firstElementChild;
  sp.textContent = t; sp.style.display = 'inline-block'; box.classList.toggle('alert', alert);
  clearTimeout(capT); capT = setTimeout(() => (sp.style.display = 'none'), ms);
}
let shake = 0; const flash = (on = 0.35) => { if (settings.rm) return; const f = $('flash'); f.style.transition = 'none'; f.style.opacity = on; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); };
// Mũi tên ở mép màn hình chỉ tới một điểm trong thế giới (ẩn khi điểm đang trong màn hình)
function edgeArrow(el, pos, yOff = 0) {
  const v = new THREE.Vector3(pos[0], pos[1] + yOff, pos[2]); v.project(camera);
  const off = v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.88;
  if (!off) { el.style.display = 'none'; return false; }
  let x = v.x, y = v.y; if (v.z > 1) { x = -x; y = -y; }
  const k = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.82, 1e-6); x /= k; y /= k;
  el.style.display = 'block'; el.style.left = `${((x + 1) / 2) * VW() - 14}px`; el.style.top = `${((1 - y) / 2) * VH() - 15}px`;
  el.style.transform = `rotate(${Math.atan2(x, y) * 180 / Math.PI}deg)`;
  return true;
}
const lanternArrow = Object.assign(document.createElement('div'), { className: 'edge hud' }); $('edges').appendChild(lanternArrow);
const shadeArrows = new Map(); // id -> {el, until}
function addShadeArrow(id) { const el = Object.assign(document.createElement('div'), { className: 'edge shade hud' }); $('edges').appendChild(el); shadeArrows.set(id, { el, until: performance.now() + 5000 }); }

// ---------- điều khiển (phím đổi được) ----------
const keys = new Set(); const latch = { jump: false, interact: false, pulse: false, dash: false };
let yaw = 0, drag = false;
const actionOf = (code) => Object.keys(settings.keys).find((a) => settings.keys[a] === code);
addEventListener('keydown', (e) => {
  if (G.rebinding) { e.preventDefault(); if (!e.repeat) tryRebind(G.rebinding, e.code); return; }
  if (e.repeat) return;
  keys.add(e.code);
  const a = actionOf(e.code);
  if (a === 'jump') { latch.jump = true; e.preventDefault(); }
  if (a === 'interact') latch.interact = true;
  if (a === 'pulse') latch.pulse = true;
  if (a === 'dash') latch.dash = true;
  if (a === 'pause') { if (G.mode === 'play') pauseGame(); else if (G.mode === 'paused') resumeGame(); }
  if (e.code === 'KeyR' && (G.mode === 'play' || G.mode === 'paused')) startNight(G.night);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('pointerdown', (e) => { if (e.target.tagName === 'CANVAS') drag = true; }); addEventListener('pointerup', () => (drag = false));
addEventListener('pointermove', (e) => { if (drag) yaw -= e.movementX * 0.3 * (settings.sens / 50); });
function readInput() {
  const k = (a) => (keys.has(settings.keys[a]) ? 1 : 0);
  return { move: [-(k('right') - k('left')), k('up') - k('down')], cam_yaw_deg: yaw, ...latch };
}
const controlsText = () => `Di chuyển ${['up', 'left', 'down', 'right'].map((a) => keyName(settings.keys[a])).join(' ')} · Kéo chuột xoay camera · Nhảy ${keyName(settings.keys.jump)} · Lướt ${keyName(settings.keys.dash)} · Nạp/châm dầu ${keyName(settings.keys.interact)} · Tỏa sáng ${keyName(settings.keys.pulse)} · Tạm dừng ${keyName(settings.keys.pause)} · R chơi lại đêm`;

// ---------- cài đặt: đổi phím ----------
function renderKeyList() {
  const box = $('keyList'); box.innerHTML = '';
  for (const [a, label] of ACTIONS) {
    const l = document.createElement('span'); l.textContent = label;
    const b = document.createElement('button'); b.className = 'sec'; b.textContent = G.rebinding === a ? 'Nhấn phím mới…' : keyName(settings.keys[a]); b.classList.toggle('listen', G.rebinding === a);
    b.onclick = () => { G.rebinding = G.rebinding === a ? null : a; $('keyMsg').textContent = ''; renderKeyList(); };
    box.append(l, b);
  }
}
function tryRebind(action, code) {
  const other = actionOf(code);
  if (other && other !== action) { // phát hiện trùng phím, báo cho người dùng, giữ phím cũ
    $('keyMsg').textContent = `⚠ Phím ${keyName(code)} đang dùng cho «${ACTIONS.find((x) => x[0] === other)[1]}». Hãy chọn phím khác.`;
    return;
  }
  settings.keys[action] = code; G.rebinding = null; $('keyMsg').textContent = ''; saveSettings(); renderKeyList();
}
$('bKeyReset').onclick = () => { settings.keys = { ...DEFAULT_KEYS }; G.rebinding = null; $('keyMsg').textContent = ''; saveSettings(); renderKeyList(); };

// ---------- bảng xếp hạng ----------
async function loadBoard() {
  try { const r = await fetch('/api/leaderboard'); if (!r.ok) throw new Error('http'); return (await r.json()).entries; } catch { try { return JSON.parse(localStorage.getItem('ddl-board') || '[]'); } catch { return []; } }
}
async function saveEntry(entry) {
  try {
    const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    if (!r.ok) throw Object.assign(new Error((await r.json()).error || 'lỗi'), { server: true });
  } catch (e) {
    if (e.server) throw e;
    const list = JSON.parse(localStorage.getItem('ddl-board') || '[]'); // không có máy chủ (bản web tĩnh): lưu trong trình duyệt
    localStorage.setItem('ddl-board', JSON.stringify(addEntry(list, makeEntry(entry))));
  }
}
async function showBoard(from) {
  G.boardFrom = from; show('board'); const body = $('boardBody'); body.textContent = 'Đang tải…';
  const list = await loadBoard();
  body.innerHTML = list.length ? '<table class="board"><tr><th>#</th><th>Tên</th><th>Điểm</th><th>Đêm thắng</th><th>Lúc</th></tr>' + list.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name}</td><td>${e.score}</td><td>${e.nights_won}/3</td><td>${new Date(e.achieved_at).toLocaleString('vi-VN')}</td></tr>`).join('') + '</table>' : '<p>Chưa có ai trên bảng. Hãy là người đầu tiên!</p>';
}
function wireSave(sfx) {
  const btn = $(`save${sfx}`), inp = $(`name${sfx}`), msg = $(`msg${sfx}`);
  btn.onclick = async () => {
    const name = inp.value.trim();
    if (!validateName(name)) { msg.style.color = ''; msg.textContent = '⚠ Tên phải 3–12 ký tự, chỉ gồm chữ cái không dấu, số và gạch dưới.'; return; }
    try {
      await saveEntry({ name, score: G.total, nights_won: G.won, seed: G.lastSeed, achieved_at: new Date().toISOString() });
      msg.style.color = 'var(--gold)'; msg.textContent = `Đã lưu ${G.total} điểm cho ${name}.`; btn.disabled = true;
    } catch (e) { msg.style.color = ''; msg.textContent = `⚠ ${e.message}`; }
  };
}
function resetSave(sfx) { $(`save${sfx}`).disabled = false; $(`msg${sfx}`).textContent = ''; }

// ---------- luồng game ----------
const G = { mode: 'menu', night: 1, attempt: 0, total: 0, won: 0, lastSeed: 0, sim: null, lastSec: 99, settingsFrom: 'menu', endTimer: 0, rebinding: null, boardFrom: 'menu', weakSeen: new Set() };
const show = (id) => { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id); };
const hud = (on) => { for (const e of document.querySelectorAll('.hud')) e.style.visibility = on ? 'visible' : 'hidden'; };
function showIntro(n) {
  G.night = n; G.mode = 'intro'; $('introName').textContent = NIGHTS[n].name;
  const [k, tot] = GOAL(n);
  $('introText').textContent = `${NIGHTS[n].text}\n\nMục tiêu: giữ ít nhất ${k}/${tot} đèn sáng tới bình minh. Đèn sẽ cạn dầu — hãy châm thêm đom đóm và đuổi Bóng Mực hút dầu.`;
  $('introKeys').textContent = controlsText();
  hud(false); show('intro');
}
function startNight(n) {
  G.night = n; G.attempt++; G.lastSeed = 1000 * n + G.attempt; G.sim = new Sim({ seed: G.lastSeed, night: n }); window.__sim = G.sim;
  buildWorld(n); clearViews(); G.mode = 'play'; G.lastSec = 99; G.endTimer = 0; G.weakSeen.clear(); yaw = 0;
  for (const a of shadeArrows.values()) a.el.remove(); shadeArrows.clear();
  hud(true); show(''); audio.startMusic(); toast(NIGHTS[n].name, 3000);
}
function newRun() { G.total = 0; G.won = 0; G.attempt = 0; showIntro(1); }
function pauseGame() { G.mode = 'paused'; $('pauseKeys').textContent = controlsText(); show('pause'); }
function resumeGame() { G.mode = 'play'; show(''); }
function toMenu() { G.mode = 'menu'; G.total = 0; G.won = 0; audio.stopMusic(); hud(false); show('menu'); }
function finishNight(won) {
  G.mode = 'result'; hud(false);
  const s = G.sim, litN = s.lanterns.filter((l) => l.lit).length; $('resTitle').textContent = won ? `${NIGHTS[G.night].name}: bình minh!` : 'Sương đen thắng...';
  $('resText').textContent = won ? `Mây giữ được ${litN}/${s.lanterns.length} đèn sáng tới bình minh.` : (s.leftTicks - s.simTick <= 0 ? `Bình minh tới nhưng chỉ ${litN}/${s.lanterns.length} đèn còn sáng (cần ${GOAL(G.night)[0]}).` : 'Mây đã hết ngọn lửa.');
  if (won) { G.total += s.score; G.won++; }
  $('resScore').textContent = won ? `Điểm đêm: ${s.score} · Tổng: ${G.total}` : `Tổng điểm các đêm đã thắng: ${G.total} (${G.won}/3 đêm). Bạn có thể lưu điểm hoặc chơi lại Đêm này.`;
  $('bNext').style.display = won ? '' : 'none'; $('bNext').textContent = G.night < 3 ? 'Đêm kế tiếp' : 'Xem Bình Minh';
  $('result').querySelector('.save').style.display = won ? 'none' : ''; // thua → được nhập tên; thắng Đêm 1–2 thì đi tiếp
  resetSave('R'); show('result');
}
$('bStart').onclick = () => { audio.ensure(); newRun(); };
$('bGo').onclick = () => startNight(G.night);
$('bResume').onclick = resumeGame;
$('bRetry').onclick = () => startNight(G.night); $('bRetry2').onclick = () => startNight(G.night);
$('bMenu').onclick = toMenu; $('bMenu2').onclick = toMenu;
$('bNext').onclick = () => { if (G.night < 3) showIntro(G.night + 1); else { G.mode = 'dawn'; $('dawnScore').textContent = `Tổng điểm: ${G.total} (${G.won}/3 đêm)`; resetSave('D'); show('dawn'); } };
$('bAgain').onclick = newRun;
for (const id of ['bSettings0', 'bSettings']) $(id).onclick = () => { G.settingsFrom = id === 'bSettings0' ? 'menu' : 'pause'; G.rebinding = null; renderKeyList(); show('settings'); };
$('bBack').onclick = () => { G.rebinding = null; show(G.settingsFrom); };
$('bBoard0').onclick = () => showBoard('menu'); $('bBoard1').onclick = () => showBoard('dawn');
$('bBoardBack').onclick = () => show(G.boardFrom);
wireSave('R'); wireSave('D');
$('sVol').value = settings.vol; $('sSens').value = settings.sens; $('sCb').checked = !!settings.cb; $('sRm').checked = !!settings.rm; $('sLarge').checked = !!settings.large;
$('sCb').onchange = (e) => { settings.cb = e.target.checked; applyBody(); applyPalette(); saveSettings(); };
$('sRm').onchange = (e) => { settings.rm = e.target.checked; applyBody(); saveSettings(); };
$('sLarge').onchange = (e) => { settings.large = e.target.checked; applyBody(); saveSettings(); };
$('sVol').oninput = (e) => { settings.vol = +e.target.value; audio.setVolume(settings.vol / 100); saveSettings(); };
$('sSens').oninput = (e) => { settings.sens = +e.target.value; saveSettings(); };

function onEvent(e) {
  const d = e.data;
  if (e.name === 'mote_picked') audio.sfx('pick');
  else if (e.name === 'deposit') audio.sfx('deposit');
  else if (e.name === 'lantern_lit') { audio.sfx('light'); toast(d.relight ? `Đèn ${d.lantern_id} được thắp lại!` : `Đèn ${d.lantern_id} đã sáng!`); }
  else if (e.name === 'pulse') { pulseT = 0; audio.sfx('pulse'); flash(0.15); }
  else if (e.name === 'player_hit') { audio.sfx('hit'); flash(0.4); if (!settings.rm) shake = 0.6; toast(d.by === 'fall' ? 'Mây rơi xuống biển mây!' : d.dropped ? `Bóng Mực chạm! Rơi ${d.dropped} đom đóm` : 'Bóng Mực chạm!'); }
  else if (e.name === 'dash') audio.sfx('dash');
  else if (e.name === 'refuel') { audio.sfx('deposit'); toast(`Châm dầu đèn ${d.lantern_id}: ${d.fuel}`); }
  else if (e.name === 'lantern_out') { audio.sfx('lose'); flash(0.25); toast(`⚠ Đèn ${d.lantern_id} đã tắt!`); caption(`Đèn ${d.lantern_id} đã tắt`, 3000); }
  else if (e.name === 'fuel_drain') toast(`⚠ Bóng Mực đang hút dầu đèn ${d.lantern_id} (${d.fuel})`);
  else if (e.name === 'shade_spawned') { audio.sfx('spawn'); caption('Bóng Mực xuất hiện — theo mũi tên tím ở mép màn hình', 3500); addShadeArrow(d.id); }
  else if (e.name === 'charm_picked') { audio.sfx('charm'); toast('Bùa Gió! Chạy nhanh, lướt không hồi chiêu'); }
  else if (e.name === 'drifter_steal') { audio.sfx('steal'); toast(`Gió Lạc cướp ${d.amount} đom đóm! Tỏa sáng để đòi lại`); }
  else if (e.name === 'game_over') { audio.sfx(d.result === 'won' ? 'win' : 'lose'); G.ending = d.result; G.endTimer = 1.3; }
}

// ---------- benchmark (?bench=1&seed=42&duration=30) ----------
const B = BENCH_MODE ? { seed: Number(q.get('seed') ?? 42), duration: Number(q.get('duration') ?? 30), start: 0, prev: 0, dts: [], first: 0, done: false, t: 0 } : null;
function startBench() {
  G.sim = new Sim({ seed: B.seed, night: 1, scenario: benchScenario(B.seed), bench: true }); window.__sim = G.sim;
  buildWorld(1); G.mode = 'bench'; show(''); hud(true); B.start = performance.now(); B.prev = B.start;
}
function glRenderer() {
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return `three r${THREE.REVISION} / WebGL ${ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)}`; } catch { return `three r${THREE.REVISION}`; }
}
function benchFrame(now) {
  B.t = (now - B.start) / 1000;
  const raw = now - B.prev; B.prev = now;
  if (!B.first) { B.first = Date.now(); return; }
  if (B.t >= BENCH.duration_warmup_s && !B.done) {
    if (B.dts.length || B.measuring) B.dts.push(raw); else B.measuring = true;
    if (B.t >= BENCH.duration_warmup_s + B.duration) {
      B.done = true;
      fetch('/api/bench-result', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dts: B.dts, first_frame_epoch: B.first, renderer: `${glRenderer()}; ${navigator.userAgent}`, platform: navigator.platform }) }).then(() => { document.title = 'bench-done'; });
    }
  }
}

// ---------- vòng lặp ----------
let acc = 0, lastNow = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.min((now - lastNow) / 1000, 0.1); lastNow = now;
  if (G.mode === 'play' || G.mode === 'bench') {
    acc += dt;
    while (acc >= 1 / 60) {
      const bench = G.mode === 'bench', wasGround = G.sim.player.grounded;
      const evs = G.sim.step(bench ? {} : readInput());
      if (!bench) {
        if (latch.jump && wasGround && !G.sim.player.grounded) audio.sfx('jump');
        latch.jump = latch.interact = latch.pulse = latch.dash = false;
        for (const e of evs) onEvent(e);
      }
      acc -= 1 / 60;
      if (G.sim.state !== 'playing') break;
    }
    if (G.mode === 'play') {
      const s = G.sim, secLeft = Math.ceil((s.leftTicks - s.simTick) / 60);
      if (secLeft <= 10 && secLeft !== G.lastSec && s.state === 'playing') { audio.sfx('tick'); caption(`Còn ${secLeft} giây`, 1100); }
      G.lastSec = secLeft;
      if (G.endTimer > 0 && (G.endTimer -= dt) <= 0) finishNight(G.ending === 'won');
      if (s.windWarn && !s.windActive && !G.windHeard) { audio.sfx('wind'); G.windHeard = true; toast('Gió sắp nổi — bám chắc!'); caption('Gió sắp thổi (2 giây nữa) — lá bay báo hiệu', 2500); }
      if (!s.windWarn) G.windHeard = false;
      for (const l of s.lanterns) { // chỉ báo đèn yếu (fuel < 30)
        if (s.isWeak(l) && !G.weakSeen.has(l.id)) { G.weakSeen.add(l.id); caption(`Đèn ${l.id} sắp cạn dầu (dưới ${T.low_fuel_threshold})`, 3000); }
        if (!s.isWeak(l)) G.weakSeen.delete(l.id);
      }
    }
  }
  if (G.sim && G.mode !== 'menu') render(now / 1000);
  else renderer.render(scene, camera);
  if (G.mode === 'bench') benchFrame(now);
}

function render(t) {
  const s = G.sim, P = s.player, lit = s.lanterns.filter((l) => l.lit).length, n = s.lanterns.length;
  ambient.intensity = 0.15 + 0.55 * (lit / n); // cường độ môi trường theo tiến độ (chuẩn Ticket-02)
  scene.fog.far = 120 + 40 * (lit / n);
  player.position.set(...P.pos); player.visible = !(P.invuln > 0 && Math.floor(t * 12) % 2) && P.respawn === 0;
  if (Math.hypot(P.vel[0], P.vel[2]) > 0.3) player.rotation.y = Math.atan2(P.vel[0], P.vel[2]);
  if (G.mode === 'bench') { const [cx, cy, cz] = benchCamera(B.t); camera.position.set(cx, cy, cz); camera.lookAt(0, 0, 0); }
  else {
    const th = (yaw * Math.PI) / 180;
    camera.position.set(P.pos[0] - Math.sin(th) * 11, P.pos[1] + 7, P.pos[2] - Math.cos(th) * 11);
    camera.lookAt(P.pos[0], P.pos[1] + 1.2, P.pos[2]);
    if (shake > 0.01 && !settings.rm) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake *= 0.9; } else shake = 0;
  }

  syncMap(views.lanterns, s.lanterns, makeLantern, (v, l) => {
    const p = l.lit ? 1 : l.deposited / s.lightCost(l), fuel = l.lit ? l.fuel / 60 : 0, low = l.lit && fuel < T.low_fuel_threshold;
    const blink = !low || Math.floor(t) % 2 === 0; // 1 Hz khi sắp hết dầu
    v.g.position.set(...l.pos);
    v.cage.material.color.setHex(l.lit ? C.lamp : C.unlit); v.cage.material.emissive.setHex(C.lamp); v.cage.material.emissiveIntensity = l.lit ? 1.8 : p * 0.9;
    v.cage.scale.set(1, l.lit ? 1 : 0.8, 1); v.tear.visible = !l.lit; // đèn tắt: xẹp 20% + giấy rách (không dựa vào màu)
    v.cage.visible = blink; v.core.visible = (l.lit && blink) || (!l.lit && p > 0.3); v.core.scale.setScalar(l.lit ? 0.5 + 0.5 * (fuel / 100) : p);
    v.light.intensity = l.lit ? (blink ? 22 : 8) * (0.4 + 0.6 * fuel / 100) + Math.sin(t * 3 + l.pos[0]) * 1.5 : p * 5;
    v.zone.visible = s.zoneActive(l); v.cage.rotation.y = t * 0.6;
    v.bar.visible = l.lit && blink; v.bar.quaternion.copy(camera.quaternion);
    v.barFill.scale.x = Math.max(0.01, fuel / 100); v.barFill.position.x = -0.9 * (1 - fuel / 100);
    v.barFill.material.color.setHex(low ? (settings.cb ? 0xffffff : 0xff5a5f) : C.lamp);
  });
  syncMap(views.motes, s.motes, makeMote, (v, m) => { v.g.position.set(m.pos[0], m.pos[1] + 0.9 + Math.sin(t * 2 + m.pos[0]) * 0.15, m.pos[2]); v.g.scale.setScalar(m.ttl !== null && m.ttl < 120 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 10)) : 1); });
  syncMap(views.shades, s.shades, makeShade, (v, sh) => {
    v.g.position.set(sh.pos[0], sh.pos[1] + Math.sin(t * 3 + sh.pos[0]) * 0.1, sh.pos[2]);
    v.g.rotation.y = Math.atan2(P.pos[0] - sh.pos[0], P.pos[2] - sh.pos[2]);
    v.b.material = sh.state === 'stunned' ? SH.stunMat : SH.bodyMat; v.g.scale.setScalar(sh.state === 'stunned' ? 0.75 : sh.state === 'spawning' ? 0.5 : 1);
    const L = sh.state === 'drain' && s.lanterns.find((x) => x.id === sh.target);
    if (L && !v.beam) { v.beam = new THREE.Mesh(SH.beamGeo, SH.beamMat); scene.add(v.beam); }
    if (v.beam) {
      v.beam.visible = !!L;
      if (L) { const ax = sh.pos[0], ay = sh.pos[1], az = sh.pos[2], bx = L.pos[0], by = L.pos[1] + 3.6, bz = L.pos[2], len = Math.hypot(bx - ax, by - ay, bz - az);
        v.beam.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); v.beam.scale.set(1, len, 1); v.beam.lookAt(bx, by, bz); v.beam.rotateX(Math.PI / 2); }
    }
  });
  syncMap(views.drifters, s.drifters.filter((d) => d.state !== 'removed'), makeDrifter, (v, d) => {
    v.g.position.set(d.pos[0], d.pos[1], d.pos[2]);
    v.g.rotation.y = Math.atan2(P.pos[0] - d.pos[0], P.pos[2] - d.pos[2]) + Math.PI / 2;
    const a = v.geo.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, (i < 15 ? 0.27 : -0.27) + Math.sin(t * 8 + a.getX(i) * 3) * 0.25); a.needsUpdate = true;
  });
  syncMap(views.charms, s.charms.filter((c) => c.available), makeCharm, (v, c) => { v.g.position.set(c.pos[0], c.pos[1] + 1.2 + Math.sin(t * 2) * 0.15, c.pos[2]); v.g.rotation.y = t; });
  pulseT += 1 / 60;
  const pr = Math.min(pulseT / 0.5, 1); pulseRing.visible = pr < 1; pulseRing.position.set(P.pos[0], P.pos[1] + 0.1, P.pos[2]);
  pulseRing.scale.setScalar(Math.max(0.1, pr * T.pulse_radius)); pulseRing.material.opacity = 1 - pr;
  const windOn = s.windWarn || s.windActive, wa = (s.windDir * Math.PI) / 180;
  leaves.forEach((l, i) => {
    l.visible = windOn;
    if (windOn) { const ph = (t * (s.windActive ? 14 : 4) + i * 3.1) % 40 - 20; l.position.set(P.pos[0] + Math.cos(wa) * ph + Math.sin(i * 12.9) * 8, P.pos[1] + 1 + (i % 5), P.pos[2] + Math.sin(wa) * ph + Math.cos(i * 7.7) * 8); l.rotation.set(t * 3 + i, t * 2, i); }
  });

  // HUD
  $('flames').textContent = '🏮'.repeat(P.flames) || '—';
  const sec = Math.max(0, Math.ceil((s.leftTicks - s.simTick) / 60));
  $('clock').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; $('clock').classList.toggle('low', sec <= 30);
  const need = GOAL(G.night)[0];
  $('lamps').textContent = `Đèn ${lit}/${n} (cần ${need})`; $('score').textContent = `Điểm ${s.score}`;
  const w = $('warn'), weak = s.lanterns.filter((l) => s.isWeak(l)).length;
  w.textContent = weak ? `⚠ ${weak} đèn sắp cạn dầu` : `⚠ Mới ${lit}/${need} đèn sáng`; w.style.display = (weak || (lit < need && sec <= 60)) ? 'block' : 'none';
  const mo = $('motes'), cap = s.capacity;
  if (mo.dataset.cap !== String(cap)) {
    mo.dataset.cap = cap; mo.innerHTML = '';
    for (let i = 0; i < cap; i++) mo.appendChild(document.createElement('i'));
    const c = document.createElement('span'); c.className = 'cap'; mo.appendChild(c);
  }
  [...mo.children].forEach((c, i) => { if (i < cap) c.classList.toggle('on', i < P.carried); });
  mo.lastChild.textContent = `${P.carried}/${cap}`;
  const cd = (id, left, total, label) => { const e = $(id); e.style.setProperty('--p', left / total); e.classList.toggle('ready', left <= 0); e.textContent = label; };
  cd('cdDash', P.charm > 0 ? 0 : P.dashCd, Math.round(T.dash_cooldown_s * 60), `Lướt ${keyName(settings.keys.dash)}`); cd('cdPulse', P.pulseCd, Math.round(T.pulse_cooldown_s * 60), `Sáng ${keyName(settings.keys.pulse)}`);
  const dist = (l) => Math.hypot(l.pos[0] - P.pos[0], l.pos[2] - P.pos[2]);
  const recv = s.lanterns.filter((l) => !l.lit || l.fuel < T.fuel_max * 60).sort((x, y) => dist(x) - dist(y));
  const unlit = s.lanterns.filter((l) => !l.lit).sort((x, y) => dist(x) - dist(y));
  const target = unlit[0] ?? [...s.lanterns].sort((x, y) => x.fuel - y.fuel)[0]; // mũi tên: đèn chưa sáng gần nhất, nếu không có thì đèn yếu nhất
  const nearL = P.carried > 0 ? recv.find((l) => dist(l) <= T.interact_radius) : null;
  $('prompt').style.display = nearL ? 'block' : 'none';
  if (nearL) $('prompt').textContent = nearL.lit ? `${keyName(settings.keys.interact)} — Châm dầu (${(nearL.fuel / 60).toFixed(0)}/${T.fuel_max})` : `${keyName(settings.keys.interact)} — Nạp ánh sáng (${nearL.deposited}/${s.lightCost(nearL)})`;
  if (target) edgeArrow(lanternArrow, target.pos, 3.6); else lanternArrow.style.display = 'none';
  const nowMs = performance.now();
  for (const [id, a] of shadeArrows) { // chỉ báo hướng Bóng Mực mới xuất hiện (5 giây)
    const sh = s.shades.find((x) => x.id === id);
    if (!sh || nowMs > a.until) { a.el.remove(); shadeArrows.delete(id); } else edgeArrow(a.el, sh.pos, 0);
  }
  renderer.render(scene, camera);
}

hud(false);
window.__game = G; window.__startNight = (n) => { G.attempt = 0; startNight(n); };
if (BENCH_MODE) startBench();
else if (q.get('night')) window.__startNight(Number(q.get('night')));
if (q.get('demo') === 'fuel' && G.sim && !BENCH_MODE) { // chỉ để chụp ảnh bằng chứng: dựng đèn yếu + Bóng Mực đang hút (không đổi luật)
  const s = G.sim; Object.assign(s.lanterns[0], { lit: true, everLit: true, fuel: 20 * 60 }); Object.assign(s.lanterns[1], { lit: true, everLit: true, fuel: 80 * 60 });
  s.player.pos = [0, 0, 10]; s.player.lights = 3; s.player.carried = 6; s.addShade([0, 1, 26.5], 'S9', 'drain', undefined, 'L1');
}
renderKeyList();
if (q.get('screen') === 'settings') { G.settingsFrom = 'menu'; show('settings'); } // chỉ để chụp ảnh bằng chứng
if (q.get('screen') === 'board') showBoard('menu');
frame();
