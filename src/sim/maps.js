// Bản đồ chuẩn (Ticket-02 Phần 2). Góc đo từ +X, x = r·cos a, z = r·sin a
// (khớp tầng 1 Đêm 3 nằm ở z > 0 và các điểm sinh đom đóm tầng 1 / dốc ở z > 0).
const r3 = (x) => Math.round(x * 1000) / 1000;
const rad = (d) => (d * Math.PI) / 180;
const ring = (cx, y, cz, r, stepDeg, startDeg = 0, count = Math.round(360 / stepDeg)) =>
  Array.from({ length: count }, (_, i) => {
    const a = rad(startDeg + i * stepDeg);
    return [r3(cx + r * Math.cos(a)), y, r3(cz + r * Math.sin(a))];
  });
const hyp = (x, z) => Math.hypot(x, z);

function night1() {
  return {
    night: 1, duration_key: 'night1_duration_s',
    start: [0, 0, 0],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    moteSpawns: [...ring(0, 0, 0, 12, 45), ...ring(0, 0, 0, 33, 22.5)],
    shadeSpawns: ring(0, 0, 0, 37, 30, 15),
    shadeEvery: 480, shadeMax: 6, shadeSpeed: 4,
    charms: [], pads: [], drifters: false, wind: false, center: [0, 0], bound: 45,
    top: (x, z) => (hyp(x, z) <= 40 ? 0 : null),
  };
}

function night2() {
  const A = [0, 0], B = [70, 0];
  const isl = (x, z, c) => hyp(x - c[0], z - c[1]) <= 28;
  return {
    night: 2, duration_key: 'night2_duration_s',
    start: [0, 0, 0],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    moteSpawns: [...[A, B].flatMap((c) => [...ring(c[0], 0, c[1], 10, 90), ...ring(c[0], 0, c[1], 22, 45)])],
    shadeSpawns: [A, B].flatMap((c) => ring(c[0], 0, c[1], 26, 45, 22.5)),
    shadeEvery: 420, shadeMax: 8, shadeSpeed: 4,
    charms: [[35, 0, 0]],
    pads: [
      { pos: [20, 0, 18], vy: 14, hspeed: 24, target: [70, 0] },
      { pos: [50, 0, -18], vy: 14, hspeed: 24, target: [0, 0] },
    ],
    drifters: true, wind: false, center: [35, 0], bound: 75,
    top: (x, z) => (isl(x, z, A) || isl(x, z, B) || (x >= 26 && x <= 44 && Math.abs(z) <= 2) ? 0 : null),
  };
}

function night3() {
  const ramps = [30, 150].map((deg) => ({ ux: Math.cos(rad(deg)), uz: Math.sin(rad(deg)) }));
  return {
    night: 3, duration_key: 'night3_duration_s',
    start: [0, 0, -12], // ticket không nêu điểm xuất phát Đêm 3 (tâm là tháp) → giả định, xem docs/assumptions.md
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    moteSpawns: [
      ...ring(0, 0, 0, 34, 20, 0, 18),
      ...ring(0, 3, 0, 18, 20, 20, 8),
      ...ring(0, 6, 0, 5, 90, 45, 4),
    ],
    shadeSpawns: ring(0, 0, 0, 43, 22.5),
    shadeEvery: 360, shadeMax: 10, shadeSpeed: 4.5,
    charms: [[30, 0, 25], [-30, 0, 25]],
    pads: [{ pos: [0, 3, 13], vy: 12, hspeed: 8, dir: [0, -1] }],
    drifters: true, wind: true, center: [0, 0], bound: 55,
    // Cột đặc: trả về độ cao mặt trên cùng tại (x,z); null = hư không
    top: (x, z) => {
      const r = hyp(x, z);
      if (r > 45) return null;
      if (r < 2) return 14; // tháp chuông (không leo được)
      if (r < 8) return 6; // tầng 2
      let h = 0;
      if (r >= 12 && r <= 24 && z > 0) h = 3; // tầng 1
      for (const q of ramps) {
        const s = x * q.ux + z * q.uz, p = Math.abs(-x * q.uz + z * q.ux);
        if (s >= 24 && s <= 30 && p <= 1.5) h = Math.max(h, (3 * (30 - s)) / 6);
      }
      return h;
    },
  };
}

export function buildMap(night) {
  if (night === 1) return night1();
  if (night === 2) return night2();
  if (night === 3) return night3();
  throw new Error(`night không hợp lệ: ${night}`);
}
