// Client 3D (Three.js). Chỉ ĐỌC state từ Sim; mọi luật chơi nằm trong src/sim. Chuỗi 3 Đêm, menu, tạm dừng, cài đặt.
import * as THREE from 'three';
import { Sim } from '/src/sim/sim.js';
import { TUNING as T } from '/src/sim/config.js';
import { GameAudio } from '/audio.js';

const $ = (id) => document.getElementById(id);
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
const settings = { vol: 70, sens: 50, cb: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ddl-settings') || '{}')); } catch { /* bỏ qua */ }
const saveSettings = () => { try { localStorage.setItem('ddl-settings', JSON.stringify(settings)); } catch { /* bỏ qua */ } };
const audio = new GameAudio(); audio.setVolume(settings.vol / 100);
const RIM = () => (settings.cb ? 0x00b3ff : C.rim); // viền/mắt Bóng Mực
document.body.classList.toggle('cb', !!settings.cb);

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
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
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: C.moteCore }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: C.moteHalo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(1.6); m.add(s);
  scene.add(m); return { g: m, kindDropped: false };
}
function makeShade() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), mat(C.shade)); b.scale.y = 1.15;
  const o = new THREE.Mesh(new THREE.SphereGeometry(0.88, 16, 12), new THREE.MeshBasicMaterial({ color: C.rim, side: THREE.BackSide })); o.scale.y = 1.15;
  const eyes = [];
  for (const x of [-0.28, 0.28]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: C.rim })); e.position.set(x, 0.15, 0.7); g.add(e); eyes.push(e); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), new THREE.MeshBasicMaterial({ color: C.rim, transparent: true, opacity: 0.6 })); beam.visible = false; scene.add(beam);
  g.add(b, o); scene.add(g); return { g, b, o, eyes, beam };
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
function syncMap(map, items, make, upd) {
  const alive = new Set();
  for (const it of items) { alive.add(it.id); let v = map.get(it.id); if (!v) { v = make(); map.set(it.id, v); } upd(v, it); }
  for (const [id, v] of map) if (!alive.has(id)) { scene.remove(v.g); if (v.beam) scene.remove(v.beam); map.delete(id); }
}
function clearViews() { for (const m of Object.values(views)) { for (const v of m.values()) { scene.remove(v.g); if (v.beam) scene.remove(v.beam); } m.clear(); } }

// ---------- âm thanh & thông báo ----------
let toastT; function toast(t, ms = 2600) { $('toast').textContent = t; clearTimeout(toastT); toastT = setTimeout(() => ($('toast').textContent = ''), ms); }

// ---------- điều khiển ----------
const keys = new Set(); const latch = { jump: false, interact: false, pulse: false, dash: false };
let yaw = 0, drag = false;
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space') { latch.jump = true; e.preventDefault(); }
  if (e.code === 'KeyE') latch.interact = true;
  if (e.code === 'KeyF') latch.pulse = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') latch.dash = true;
  if (e.code === 'Escape' || e.code === 'KeyP') { if (G.mode === 'play') pauseGame(); else if (G.mode === 'paused') resumeGame(); }
  if (e.code === 'KeyR' && (G.mode === 'play' || G.mode === 'paused')) startNight(G.night);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('pointerdown', (e) => { if (e.target.tagName === 'CANVAS') drag = true; }); addEventListener('pointerup', () => (drag = false));
addEventListener('pointermove', (e) => { if (drag) yaw -= e.movementX * 0.3 * (settings.sens / 50); });
function readInput() {
  const k = (c) => (keys.has(c) || keys.has(c === 'KeyW' ? 'ArrowUp' : c === 'KeyS' ? 'ArrowDown' : c === 'KeyA' ? 'ArrowLeft' : 'ArrowRight') ? 1 : 0);
  return { move: [-(k('KeyD') - k('KeyA')), k('KeyW') - k('KeyS')], cam_yaw_deg: yaw, ...latch };
}

// ---------- luồng game ----------
const G = { mode: 'menu', night: 1, attempt: 0, total: 0, sim: null, lastSec: 99, settingsFrom: 'menu', endTimer: 0 };
const show = (id) => { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id); };
const hud = (on) => { for (const e of document.querySelectorAll('.hud')) e.style.visibility = on ? 'visible' : 'hidden'; };
function showIntro(n) {
  G.night = n; G.mode = 'intro'; $('introName').textContent = NIGHTS[n].name;
  const [k, tot] = GOAL(n);
  $('introText').textContent = `${NIGHTS[n].text}\n\nMục tiêu: giữ ít nhất ${k}/${tot} đèn sáng tới bình minh. Đèn sẽ cạn dầu — hãy châm thêm đom đóm (E) và đuổi Bóng Mực hút dầu.`;
  hud(false); show('intro');
}
function startNight(n) {
  G.night = n; G.attempt++; G.sim = new Sim({ seed: 1000 * n + G.attempt, night: n }); window.__sim = G.sim;
  buildWorld(n); clearViews(); G.mode = 'play'; G.lastSec = 99; G.endTimer = 0; yaw = 0;
  hud(true); show(''); audio.startMusic(); toast(NIGHTS[n].name, 3000);
}
function pauseGame() { G.mode = 'paused'; show('pause'); }
function resumeGame() { G.mode = 'play'; show(''); }
function toMenu() { G.mode = 'menu'; G.total = 0; audio.stopMusic(); hud(false); show('menu'); }
function finishNight(won) {
  G.mode = 'result'; hud(false);
  const s = G.sim, litN = s.lanterns.filter((l) => l.lit).length; $('resTitle').textContent = won ? `${NIGHTS[G.night].name}: bình minh!` : 'Sương đen thắng...';
  $('resText').textContent = won ? `Mây giữ được ${litN}/${s.lanterns.length} đèn sáng tới bình minh.` : (s.leftTicks - s.simTick <= 0 ? `Bình minh tới nhưng chỉ ${litN}/${s.lanterns.length} đèn còn sáng (cần ${GOAL(G.night)[0]}).` : 'Mây đã hết ngọn lửa.');
  if (won) G.total += s.score;
  $('resScore').textContent = won ? `Điểm đêm: ${s.score} · Tổng: ${G.total}` : 'Bạn được chơi lại Đêm này.';
  $('bNext').style.display = won ? '' : 'none'; $('bNext').textContent = G.night < 3 ? 'Đêm kế tiếp' : 'Xem Bình Minh';
  show('result');
}
$('bStart').onclick = () => { audio.ensure(); G.total = 0; G.attempt = 0; showIntro(1); };
$('bGo').onclick = () => startNight(G.night);
$('bResume').onclick = resumeGame;
$('bRetry').onclick = () => startNight(G.night); $('bRetry2').onclick = () => startNight(G.night);
$('bMenu').onclick = toMenu;
$('bNext').onclick = () => { if (G.night < 3) showIntro(G.night + 1); else { G.mode = 'dawn'; $('dawnScore').textContent = `Tổng điểm: ${G.total}`; show('dawn'); } };
$('bAgain').onclick = () => { G.total = 0; showIntro(1); };
for (const id of ['bSettings0', 'bSettings']) $(id).onclick = () => { G.settingsFrom = id === 'bSettings0' ? 'menu' : 'pause'; show('settings'); };
$('bBack').onclick = () => show(G.settingsFrom);
$('sVol').value = settings.vol; $('sSens').value = settings.sens; $('sCb').checked = !!settings.cb;
$('sCb').onchange = (e) => { settings.cb = e.target.checked; document.body.classList.toggle('cb', settings.cb); saveSettings(); };
$('sVol').oninput = (e) => { settings.vol = +e.target.value; audio.setVolume(settings.vol / 100); saveSettings(); };
$('sSens').oninput = (e) => { settings.sens = +e.target.value; saveSettings(); };

function onEvent(e) {
  const d = e.data;
  if (e.name === 'mote_picked') audio.sfx('pick');
  else if (e.name === 'deposit') audio.sfx('deposit');
  else if (e.name === 'lantern_lit') { audio.sfx('light'); toast(d.relight ? `Đèn ${d.lantern_id} được thắp lại!` : `Đèn ${d.lantern_id} đã sáng!`); }
  else if (e.name === 'pulse') { pulseT = 0; audio.sfx('pulse'); }
  else if (e.name === 'player_hit') { audio.sfx('hit'); toast(d.by === 'fall' ? 'Mây rơi xuống biển mây!' : d.dropped ? `Bóng Mực chạm! Rơi ${d.dropped} đom đóm` : 'Bóng Mực chạm!'); }
  else if (e.name === 'dash') audio.sfx('dash');
  else if (e.name === 'refuel') { audio.sfx('deposit'); toast(`Châm dầu đèn ${d.lantern_id}: ${d.fuel}`); }
  else if (e.name === 'lantern_out') { audio.sfx('lose'); toast(`⚠ Đèn ${d.lantern_id} đã tắt!`); }
  else if (e.name === 'fuel_drain') toast(`⚠ Bóng Mực đang hút dầu đèn ${d.lantern_id} (${d.fuel})`);
  else if (e.name === 'shade_spawned') audio.sfx('spawn');
  else if (e.name === 'charm_picked') { audio.sfx('charm'); toast('Bùa Gió! Chạy nhanh, lướt không hồi chiêu'); }
  else if (e.name === 'drifter_steal') { audio.sfx('steal'); toast(`Gió Lạc cướp ${d.amount} đom đóm! Tỏa sáng để đòi lại`); }
  else if (e.name === 'game_over') { audio.sfx(d.result === 'won' ? 'win' : 'lose'); G.ending = d.result; G.endTimer = 1.3; }
}

// ---------- vòng lặp ----------
const clock = new THREE.Clock(); let acc = 0, jumpSfx = false;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (G.mode === 'play') {
    acc += dt;
    while (acc >= 1 / 60) {
      const wasAir = !G.sim.player.grounded;
      const evs = G.sim.step(readInput());
      if (latch.jump && wasAir === false && !G.sim.player.grounded) audio.sfx('jump');
      latch.jump = latch.interact = latch.pulse = latch.dash = false;
      for (const e of evs) onEvent(e);
      acc -= 1 / 60;
      if (G.sim.state !== 'playing') break;
    }
    const s = G.sim, secLeft = Math.ceil((s.leftTicks - s.simTick) / 60);
    if (secLeft <= 10 && secLeft !== G.lastSec && s.state === 'playing') audio.sfx('tick');
    G.lastSec = secLeft;
    if (G.endTimer > 0 && (G.endTimer -= dt) <= 0) finishNight(G.ending === 'won');
    if (s.windWarn && !s.windActive && !G.windHeard) { audio.sfx('wind'); G.windHeard = true; toast('Gió sắp nổi — bám chắc!'); }
    if (!s.windWarn) G.windHeard = false;
  }
  if (G.sim && G.mode !== 'menu') render(performance.now() / 1000);
  else { renderer.render(scene, camera); }
}

function render(t) {
  const s = G.sim, P = s.player, lit = s.lanterns.filter((l) => l.lit).length, n = s.lanterns.length;
  ambient.intensity = 0.15 + 0.55 * (lit / n); // cường độ môi trường theo tiến độ (chuẩn Ticket-02)
  scene.background = new THREE.Color(C.sky); scene.fog = new THREE.Fog(C.mist, 30, 120 + 40 * (lit / n));
  player.position.set(...P.pos); player.visible = !(P.invuln > 0 && Math.floor(t * 12) % 2) && P.respawn === 0;
  if (Math.hypot(P.vel[0], P.vel[2]) > 0.3) player.rotation.y = Math.atan2(P.vel[0], P.vel[2]);
  const th = (yaw * Math.PI) / 180;
  camera.position.set(P.pos[0] - Math.sin(th) * 11, P.pos[1] + 7, P.pos[2] - Math.cos(th) * 11);
  camera.lookAt(P.pos[0], P.pos[1] + 1.2, P.pos[2]);

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
    v.g.position.set(sh.pos[0], sh.pos[1] + Math.sin(t * 3) * 0.1, sh.pos[2]);
    v.g.rotation.y = Math.atan2(P.pos[0] - sh.pos[0], P.pos[2] - sh.pos[2]);
    v.b.material.color.setHex(sh.state === 'stunned' ? C.stunned : C.shade); v.g.scale.setScalar(sh.state === 'stunned' ? 0.75 : sh.state === 'spawning' ? 0.5 : 1);
    v.o.material.color.setHex(RIM()); v.eyes.forEach((e) => e.material.color.setHex(RIM())); v.beam.material.color.setHex(RIM());
    const L = sh.state === 'drain' && s.lanterns.find((x) => x.id === s.shadeObj(sh.id).target);
    v.beam.visible = !!L;
    if (L) { const ax = sh.pos[0], ay = sh.pos[1], az = sh.pos[2], bx = L.pos[0], by = L.pos[1] + 3.6, bz = L.pos[2], len = Math.hypot(bx - ax, by - ay, bz - az);
      v.beam.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); v.beam.scale.set(1, len, 1); v.beam.lookAt(bx, by, bz); v.beam.rotateX(Math.PI / 2); }
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
  w.style.display = weak || lit < need ? 'block' : 'none';
  w.textContent = weak ? `⚠ ${weak} đèn sắp cạn dầu` : `⚠ Mới ${lit}/${need} đèn sáng`; w.style.display = (weak || (lit < need && sec <= 60)) ? 'block' : 'none';
  const mo = $('motes'), cap = s.capacity;
  if (mo.dataset.cap !== String(cap)) {
    mo.dataset.cap = cap; mo.innerHTML = '';
    for (let i = 0; i < cap; i++) mo.appendChild(document.createElement('i'));
    const c = document.createElement('span'); c.className = 'cap'; mo.appendChild(c);
  }
  [...mo.children].forEach((c, i) => { if (i < cap) c.classList.toggle('on', i < P.carried); });
  mo.lastChild.textContent = `${P.carried}/${cap}`;
  const cd = (id, left, total) => { const e = $(id); e.style.setProperty('--p', left / total); e.classList.toggle('ready', left <= 0); };
  cd('cdDash', P.charm > 0 ? 0 : P.dashCd, Math.round(T.dash_cooldown_s * 60)); cd('cdPulse', P.pulseCd, Math.round(T.pulse_cooldown_s * 60));
  const dist = (l) => Math.hypot(l.pos[0] - P.pos[0], l.pos[2] - P.pos[2]);
  const recv = s.lanterns.filter((l) => !l.lit || l.fuel < T.fuel_max * 60).sort((x, y) => dist(x) - dist(y));
  const unlit = s.lanterns.filter((l) => !l.lit).sort((x, y) => dist(x) - dist(y));
  const target = unlit[0] ?? [...s.lanterns].sort((x, y) => x.fuel - y.fuel)[0]; // mũi tên: đèn chưa sáng gần nhất, nếu không có thì đèn yếu nhất
  const nearL = P.carried > 0 ? recv.find((l) => dist(l) <= T.interact_radius) : null;
  $('prompt').style.display = nearL ? 'block' : 'none';
  if (nearL) $('prompt').textContent = nearL.lit ? `E — Châm dầu (${(nearL.fuel / 60).toFixed(0)}/${T.fuel_max})` : `E — Nạp ánh sáng (${nearL.deposited}/${s.lightCost(nearL)})`;
  const ar = $('arrow');
  if (target) {
    const v = new THREE.Vector3(...target.pos); v.y += 3.6; v.project(camera);
    const off = v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.88;
    if (off) {
      let x = v.x, y = v.y; if (v.z > 1) { x = -x; y = -y; }
      const k = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.82, 1e-6); x /= k; y /= k;
      ar.style.display = 'block'; ar.style.left = `${((x + 1) / 2) * innerWidth - 14}px`; ar.style.top = `${((1 - y) / 2) * innerHeight - 15}px`;
      ar.style.transform = `rotate(${Math.atan2(x, y) * 180 / Math.PI}deg)`;
    } else ar.style.display = 'none';
  } else ar.style.display = 'none';
  renderer.render(scene, camera);
}

hud(false);
window.__game = G; window.__startNight = (n) => { G.attempt = 0; startNight(n); };
const q = new URLSearchParams(location.search);
if (q.get('night')) window.__startNight(Number(q.get('night')));
if (q.get('demo') === 'fuel' && G.sim) { // chỉ để chụp ảnh bằng chứng: dựng đèn yếu + Bóng Mực đang hút (không đổi luật)
  const s = G.sim; Object.assign(s.lanterns[0], { lit: true, everLit: true, fuel: 20 * 60 }); Object.assign(s.lanterns[1], { lit: true, everLit: true, fuel: 80 * 60 });
  s.player.pos = [0, 0, 10]; s.player.lights = 3; s.player.carried = 6; s.addShade([0, 1, 26.5], 'S9', 'drain', undefined, 'L1');
}
frame();
