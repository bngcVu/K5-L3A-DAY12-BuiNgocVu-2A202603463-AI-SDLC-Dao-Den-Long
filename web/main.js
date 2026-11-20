// Client 3D (Three.js). Chỉ ĐỌC state từ Sim; mọi luật chơi nằm trong src/sim.
import * as THREE from 'three';
import { Sim } from '/src/sim/sim.js';
import { TUNING as T, WORLD as W } from '/src/sim/config.js';

const $ = (id) => document.getElementById(id);
const WARM = 0xffb347, DANGER = 0x3a1d5c;

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
const hemi = new THREE.HemisphereLight(0x6a5acd, 0x1a1030, 0.5);
scene.add(hemi);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const mat = (c, e = 0, ei = 0) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: ei, roughness: 0.8 });
const island = new THREE.Mesh(new THREE.CylinderGeometry(W.island_radius, W.island_radius - 3, 3, 48), mat(0x3d6652));
island.position.y = -1.5; scene.add(island);
const rim = new THREE.Mesh(new THREE.TorusGeometry(W.island_radius, 0.4, 8, 64), mat(0x7a5a3a, 0x3a2410, 0.5));
rim.rotation.x = Math.PI / 2; scene.add(rim);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x9a8fc8, transparent: true, opacity: 0.55, roughness: 1 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -7; scene.add(sea);

// Sáng tạo: Cá Mây (chỉ trang trí, không liên quan sim/headless)
const fish = [];
for (let i = 0; i < 7; i++) {
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 6), mat(0xe8e0ff, 0xb8a8ff, 0.4));
  f.rotation.z = -Math.PI / 2; const g = new THREE.Group(); g.add(f); scene.add(g);
  fish.push({ g, r: 52 + i * 5, a: i * 0.9, s: 0.12 + (i % 3) * 0.04, y: -4.5 - (i % 2) });
}

const glow = (color, intensity, dist) => { const l = new THREE.PointLight(color, intensity, dist, 1.6); return l; };

// ---------- thực thể ----------
let sim, seed = 1;
const lanternViews = new Map(), moteViews = new Map(), shadeViews = new Map();
const player = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.7, 4, 10), mat(0xd9a05b)); body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), mat(0xf2c9a0)); head.position.y = 1.55;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 20), mat(0xe9d28a)); hat.position.y = 1.95; // nón lá
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), mat(0x5a3a1a)); pole.position.set(0.55, 1.2, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(0xffd27a, 0xffa030, 2)); lamp.position.set(0.55, 0.7, 0);
  const l = glow(WARM, 3, 14); l.position.copy(lamp.position);
  player.add(body, head, hat, pole, lamp, l);
}
scene.add(player);
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2; scene.add(pulseRing);
let pulseT = 99;

function makeLantern(l) {
  const g = new THREE.Group(); g.position.set(...l.pos);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), mat(0x4a3322));
  post.position.y = 1.5; g.add(post);
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), mat(0x2a2038, 0x6a2cc0, 0.3)); cage.position.y = 3.6;
  const light = glow(WARM, 0, 30); light.position.y = 3.6;
  const zone = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.12, T.safe_radius, 48), new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  zone.rotation.x = -Math.PI / 2; zone.position.y = 0.05;
  g.add(cage, light, zone); scene.add(g);
  return { g, cage, light, zone };
}
function makeMote() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xffe27a, 0xffc830, 2.5));
  m.add(glow(0xffc830, 0.6, 5)); scene.add(m); return m;
}
function makeShade() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), mat(0x1a0f2e, DANGER, 0.8)); b.scale.y = 1.15;
  for (const x of [-0.28, 0.28]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc9a0ff })); e.position.set(x, 0.15, 0.7); g.add(e); }
  g.add(b); scene.add(g); return { g, b };
}

function rebuild() {
  for (const v of [lanternViews, moteViews, shadeViews]) { for (const x of v.values()) scene.remove(x.g || x); v.clear(); }
  sim = new Sim({ seed }); window.__sim = sim;
  for (const l of sim.lanterns) lanternViews.set(l.id, makeLantern(l));
  $('end').style.display = 'none'; say('Sương đen đã nuốt ánh sáng. Gom đom đóm, thắp lại 5 Đèn Lồng!', 6000);
}

// ---------- âm thanh (WebAudio, tùy chọn) ----------
let ac; function chime(f, d = 0.18) {
  try {
    ac ||= new AudioContext(); const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; o.type = 'sine'; g.gain.value = 0.06; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
  } catch { /* không có âm thanh cũng được */ }
}
let msgTimer; function say(t, ms = 2500) { $('msg').textContent = t; clearTimeout(msgTimer); msgTimer = setTimeout(() => ($('msg').textContent = ''), ms); }

// ---------- input ----------
const keys = new Set(); const latch = { jump: false, interact: false, pulse: false };
let yaw = 0, drag = false;
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space') { latch.jump = true; e.preventDefault(); }
  if (e.code === 'KeyE') latch.interact = true;
  if (e.code === 'KeyF') latch.pulse = true;
  if (e.code === 'KeyR') { seed++; rebuild(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('pointerdown', () => (drag = true)); addEventListener('pointerup', () => (drag = false));
addEventListener('pointermove', (e) => { if (drag) yaw -= e.movementX * 0.3; });
$('again').onclick = () => { seed++; rebuild(); };

function readInput() {
  const k = (c) => (keys.has(c) ? 1 : 0);
  const x = -(k('KeyD') - k('KeyA')) , z = k('KeyW') - k('KeyS'); // D = sang phải màn hình = -X khi yaw 0
  return { move: [x, z], cam_yaw_deg: yaw, jump: latch.jump, interact: latch.interact, pulse: latch.pulse };
}

// ---------- vòng lặp ----------
function onEvent(e) {
  if (e.name === 'mote_picked') chime(660 + e.data.carried * 40, 0.1);
  if (e.name === 'deposit') chime(440);
  if (e.name === 'lantern_lit') { chime(880, 0.5); say(`Đèn ${e.data.lantern_id} đã sáng!`); }
  if (e.name === 'pulse') { pulseT = 0; chime(520, 0.4); }
  if (e.name === 'player_hit') { chime(120, 0.4); say(e.data.dropped ? `Bóng Mực chạm! Rơi ${e.data.dropped} đom đóm` : 'Bóng Mực chạm!'); }
  if (e.name === 'shade_spawned') say('Một Bóng Mực mới trồi lên từ sương...');
  if (e.name === 'game_over') endScreen(e.data);
}
function endScreen({ result, reason }) {
  const won = result === 'won';
  $('endTitle').textContent = won ? 'Đảo đã sáng! 🏮' : 'Sương đen thắng...';
  $('endText').textContent = won ? 'Mây đã thắp lại mọi Đèn Lồng.' : reason === 'dawn' ? 'Trời sáng mà đèn chưa thắp hết.' : 'Mây đã hết ngọn lửa.';
  $('endScore').textContent = `Điểm: ${sim.score}`; $('end').style.display = 'flex';
}

const clock = new THREE.Clock(); let acc = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1); acc += dt;
  while (acc >= 1 / 60) {
    const evs = sim.step(readInput()); latch.jump = latch.interact = latch.pulse = false;
    for (const e of evs) onEvent(e); acc -= 1 / 60;
  }
  render(performance.now() / 1000);
}

function render(t) {
  const P = sim.player, lit = sim.lanterns.filter((l) => l.lit).length, f = lit / sim.lanterns.length;
  // đảo sáng dần khi thắp đèn
  hemi.intensity = 0.9 + f * 0.9; hemi.color.setHex(0x6a5acd).lerp(new THREE.Color(0xffc27a), f);
  scene.background = new THREE.Color(0x0b0818).lerp(new THREE.Color(0x4a2a50), f);
  scene.fog = new THREE.Fog(scene.background, 25, 90 + f * 60);
  player.position.set(...P.pos); player.rotation.y = -yaw * Math.PI / 180;
  player.visible = !(P.invuln > 0 && Math.floor(t * 12) % 2);
  const th = (yaw * Math.PI) / 180;
  camera.position.set(P.pos[0] - Math.sin(th) * 11, P.pos[1] + 7, P.pos[2] - Math.cos(th) * 11);
  camera.lookAt(P.pos[0], P.pos[1] + 1.2, P.pos[2]);

  for (const l of sim.lanterns) {
    const v = lanternViews.get(l.id), p = l.lit ? 1 : l.deposited / T.lantern_cost;
    v.cage.material.emissive.setHex(l.lit ? 0xffa030 : 0x6a2cc0); v.cage.material.emissiveIntensity = l.lit ? 2.5 : 0.3 + p * 1.5;
    v.cage.material.color.setHex(l.lit ? 0xffd27a : 0x2a2038);
    v.light.intensity = l.lit ? 18 + Math.sin(t * 3 + l.pos[0]) * 2 : p * 4; v.cage.rotation.y = t * 0.6;
  }
  syncList(moteViews, sim.motes, makeMote, (v, m) => { v.position.set(m.pos[0], 0.9 + Math.sin(t * 2 + m.pos[0]) * 0.15, m.pos[2]); });
  syncList(shadeViews, sim.shades, makeShade, (v, s) => {
    v.g.position.set(s.pos[0], 1 + Math.sin(t * 3) * 0.1, s.pos[2]);
    v.g.rotation.y = Math.atan2(P.pos[0] - s.pos[0], P.pos[2] - s.pos[2]);
    v.b.material.color.setHex(s.state === 'stunned' ? 0x6a5a90 : 0x1a0f2e); v.g.scale.setScalar(s.state === 'stunned' ? 0.75 : 1);
  });
  pulseT += 1 / 60;
  const pr = Math.min(pulseT / 0.5, 1); pulseRing.visible = pr < 1; pulseRing.position.set(P.pos[0], 0.1, P.pos[2]);
  pulseRing.scale.setScalar(Math.max(0.1, pr * T.pulse_radius)); pulseRing.material.opacity = 1 - pr;
  for (const o of fish) { o.a += o.s / 60; o.g.position.set(Math.sin(o.a) * o.r, o.y, Math.cos(o.a) * o.r); o.g.rotation.y = o.a; }

  $('flames').textContent = '🏮'.repeat(P.flames) || '—';
  $('carry').textContent = `Đom đóm ${P.carried}/${T.carry_capacity}`;
  $('lamps').textContent = `Đèn ${lit}/${sim.lanterns.length}`;
  $('time').textContent = `Đêm còn ${Math.max(0, Math.ceil((sim.leftTicks - sim.steps) / 60))}s`;
  $('score').textContent = `Điểm ${sim.score}`;
  renderer.render(scene, camera);
}

function syncList(views, items, make, upd) {
  const alive = new Set();
  for (const it of items) { alive.add(it.id); let v = views.get(it.id); if (!v) { v = make(); views.set(it.id, v); } upd(v, it); }
  for (const [id, v] of views) if (!alive.has(id)) { scene.remove(v.g || v); views.delete(id); }
}

rebuild(); frame();
