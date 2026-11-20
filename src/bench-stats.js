// Thống kê khung hình đúng định nghĩa Ticket-04 §1 (dt tính bằng ms). Dùng cho bench và test.
export function summarizeFrames(dts) {
  const n = dts.length;
  if (!n) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => b - a); // lớn → nhỏ
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(0, k).reduce((a, b) => a + b, 0) / k;
  const asc = [...dts].sort((a, b) => a - b);
  const p95 = asc[Math.min(n - 1, Math.ceil(0.95 * n) - 1)]; // phân vị 95, nearest-rank
  return { frames: n, avg_fps: (1000 * n) / sum, p1_low_fps: 1000 / worst, frame_ms_p95: p95 };
}
