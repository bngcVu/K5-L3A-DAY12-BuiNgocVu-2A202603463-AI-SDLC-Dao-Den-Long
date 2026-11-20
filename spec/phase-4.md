# Spec & tiêu chí nghiệm thu — Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0", Contract v1.3)

Nguồn: [docs/phase-4.md](../docs/phase-4.md). `S:` scenario/CI, `U:` unit test, `R:` chạy lệnh và lưu kết quả, `M:` kiểm tay.
Trạng thái ghi trung thực: **ĐẠT** (có bằng chứng chạy; mục `M` nghĩa là tác giả đã chơi thử bằng tay, không có test tự động), **CHƯA KIỂM** (cần người/máy khác), **KHÔNG ĐẠT**.

## 1. Benchmark

| Yêu cầu | Tiêu chí | Kiểm chứng | Trạng thái |
|---|---|---|---|
| `bench_cmd --seed 42 --duration 30 --out bench.json` | Lệnh `node bench/bench.js …` chạy và thoát mã 0 | R: `evidence/phase-4/bench.json` | ĐẠT (máy dev) |
| Cảnh chuẩn: 1280×720, Đêm 1 đầy đủ hiệu ứng, 200 Bóng Mực `wander` rải đều, 100 đom đóm, L1–L3 sáng fuel 100 | `?bench=1`: canvas cố định 1280×720; `benchScenario(42)` | U: "cảnh benchmark…", ảnh `evidence/phase-4/bench-scene.png` | ĐẠT |
| Tắt trong bench: sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm; không input; Mây ở (0,0,0) | `Sim({bench:true})` chạy 18.000 tick: 3 lửa, 0 đang mang, 100 đom đóm, L1–L3 fuel 100, `playing` | U: "cảnh benchmark…" | ĐẠT |
| Camera bay vòng r=30, Y=15, nhìn (0,0,0), từ (30,15,0), 15 s/vòng, ngược chiều kim đồng hồ | `benchCamera(t)` | đọc mã, ảnh | ĐẠT (hướng quay theo quy ước trục của bản đồ, xem giả định D2) |
| 3 s khởi động không đo; đo đúng `--duration` rồi thoát mã 0 | `benchFrame` + `bench.js` | R | ĐẠT |
| Output: `contract_version, avg_fps, p1_low_fps, frame_ms_p95, frames, load_ms, peak_mem_mb, vsync_off, renderer, os` đúng định nghĩa | `src/bench-stats.js` (nearest-rank cho p95; `k = max(1, ceil(0.01·N))`) | U: "thống kê khung hình…" | ĐẠT |
| Ngưỡng (máy chấm): avg ≥ 60, p1 low ≥ 30, load ≤ 10 s | số tự đo chỉ tham khảo | R | xem bench.json (máy dev); **máy chấm CHƯA KIỂM** |
| `peak_mem_mb` | `null` cho bản web, kèm giải thích | R | ĐẠT (theo cho phép của ticket) |

## 2. Soak test

| Yêu cầu | Tiêu chí | Kiểm chứng | Trạng thái |
|---|---|---|---|
| `soak_cmd --seed 7 --nights 10 --out soak.json`, 10 Đêm trong **một tiến trình**, Đêm 1→2→3 xoay vòng, Đêm thứ i dùng seed 7+i | `node src/soak.js` | R: `evidence/phase-4/soak.json`, U: "soak…" | ĐẠT |
| Input ngẫu nhiên theo seed: đổi hướng mỗi 30 tick; mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác | RNG riêng của input, tách khỏi RNG của sim | đọc mã, U (tất định theo seed) | ĐẠT |
| Output `nights, crashes, results, mem_start_mb, mem_end_mb, duration_s` | khớp mẫu | R | ĐẠT |
| `crashes = 0` và `mem_end_mb ≤ 1.2 × mem_start_mb` | lệnh thoát mã 1 nếu vi phạm | R | ĐẠT (≈1.08×); heap ổn định ~5 MB sau mỗi 10 Đêm |

## 3. Bảng xếp hạng cục bộ

| Yêu cầu | Kiểm chứng | Trạng thái |
|---|---|---|
| Nhập tên sau Bình Minh hoặc sau khi thua; tên 3–12 ký tự `[A-Za-z0-9_]` | U: "tên bảng xếp hạng", M: màn Bình Minh / màn thua | ĐẠT: logic có unit test; giao diện do tác giả chơi thử bằng tay (2026-11-20) |
| Mục: `name, score, nights_won (0–3), achieved_at (ISO 8601 có múi giờ), seed` | U: "mục bảng xếp hạng" | ĐẠT |
| Top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên | U: "giữ top 10…" | ĐẠT |
| Lưu trên đĩa, còn sau khi tắt/mở lại | U: "máy chủ: POST/GET…" (đóng máy chủ rồi đọc lại tệp) | ĐẠT |
| Màn Bảng xếp hạng từ menu chính | M | ĐẠT: tác giả chơi thử bằng tay (2026-11-20) |
| `run_cmd --export-leaderboard out.json` → `{"entries":[…]}` đúng thứ tự | U (chạy `node server.js --export-leaderboard`) | ĐẠT |

## 4. Dễ tiếp cận

| Yêu cầu | Cách làm | Kiểm chứng | Trạng thái |
|---|---|---|---|
| Đổi phím mọi hành động (4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng); phát hiện trùng; khôi phục mặc định; lưu | Cài đặt → "Phím điều khiển" | M | ĐẠT: tác giả chơi thử bằng tay (2026-11-20) |
| Phụ đề / chỉ báo: Bóng Mực xuất hiện (mũi tên ở mép màn hình), gió sắp thổi, 10 s cuối, đèn fuel<30 | `caption()` + mũi tên tím 5 s; đếm "Còn N giây"; "Đèn Lx sắp cạn dầu" | M | ĐẠT: tác giả chơi thử bằng tay (2026-11-20) |
| Giảm chuyển động: tắt rung camera và chớp màn hình | Cài đặt → "Giảm chuyển động" (`shake`, `flash` bị chặn; đồng hồ ≤30 s không nhấp nháy) | M | ĐẠT: tác giả chơi thử bằng tay (2026-11-20) |
| Cỡ chữ UI ≥ 18 px ở 1280×720; tùy chọn chữ lớn ×1.25 | `--fs: 18px` / `22.5px`, mọi chữ ≥ 1em | M, ảnh `evidence/phase-4/screens/` | ĐẠT: ảnh chụp + tác giả chơi thử bằng tay (2026-11-20) |

## 5. Đóng gói & tài liệu

| Yêu cầu | Kiểm chứng | Trạng thái |
|---|---|---|
| Clone sạch → tối đa 3 lệnh → chơi được | CI chạy `npm ci`/`check.sh` trên Ubuntu; máy sạch: `npm install` + `npm start` | ĐẠT: CI Ubuntu xanh; clone sạch từ GitHub chạy `npm install`, `npm test` (27/27), `npm start` (HTTP 200) và `check.sh` ở cả 4 tag. Máy khác của người dùng: CHƯA KIỂM |
| README: mô tả, ảnh, yêu cầu hệ thống, cài đặt, điều khiển, test, headless, bench, soak | [README.md](../README.md) | ĐẠT |
| CHANGELOG có mục cả 4 phase | [CHANGELOG.md](../CHANGELOG.md) | ĐẠT |
| CREDITS, LICENSE | [CREDITS.md](../CREDITS.md), [LICENSE](../LICENSE) (MIT, tác giả có thể đổi) | ĐẠT |
| Release `v1.0.0` có bản chạy được | Docker (`Dockerfile`) + web tĩnh (`npm run build:web` → `dist/web`) + hướng dẫn trong [release/RELEASE.md](../release/RELEASE.md) | ĐẠT: Release `v1.0.0` (tag `v1.0.0` = commit của `phase-4`) kèm `demo.mp4` và `dao-den-long-web-v1.0.0.zip`; bản Docker chưa dựng thử |

## 6. Contract v1.3 · 7. Retro & demo

| Yêu cầu | Kiểm chứng | Trạng thái |
|---|---|---|
| `contract_version: "1.3"`, thêm `bench_cmd`, `soak_cmd`; v1.0–v1.2 giữ nguyên | U: "contract v1.3…"; `check.sh` 46 scenario cũ vẫn đạt | ĐẠT |
| Retro 1–2 trang | [retro/retro.md](../retro/retro.md) | ĐẠT (số token là ước lượng) |
| Video `.mp4` < 5 phút | kịch bản gợi ý ở release/RELEASE.md | ĐẠT: 3 phút 54, đính vào Release; nội dung video do tác giả kiểm |

---

# Giả định Phase 4

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| D1 | Bench cho bản web | `bench_cmd` mở Chrome/Chromium/Edge sẵn có (tìm tự động, hoặc `CHROME_PATH`), không bundle trình duyệt. Thiếu trình duyệt → thông báo lỗi, thoát mã 3 |
| D2 | Hướng quay camera "ngược chiều kim đồng hồ" | Dùng cùng quy ước trục với bản đồ (x = r·cos a, z = r·sin a); khác hướng chỉ ảnh hưởng ảnh chụp, không ảnh hưởng số đo |
| D3 | Bóng Mực trong bench | Chỉ `wander` ngẫu nhiên (không chase, không nhắm đèn) để họ "rải đều"; ánh sáng, bóng đổ, HUD vẫn bật như lúc chơi |
| D4 | `vsync_off` | Ghi `true` khi đã truyền `--disable-gpu-vsync --disable-frame-rate-limit`; trình điều khiển có thể vẫn ép vsync, nên đi kèm `vsync_note` |
| D5 | `load_ms` | Từ lúc tiến trình `bench.js` bắt đầu (kể cả khởi động trình duyệt) tới khung hình đầu tiên của cảnh bench |
| D6 | Soak: "Đêm thứ i" | i bắt đầu từ 0 (Đêm đầu dùng seed 7); khởi động nóng 3 Đêm ngắn trước khi đo `mem_start_mb` (JIT, không phải rò rỉ); gọi GC trước mỗi lần đo RSS |
| D7 | Soak: input lướt/nhảy/tỏa sáng/tương tác | Mỗi tick bật một lượt (true) rồi đặt lại; chỉ tính cạnh lên theo contract |
| D8 | Bảng xếp hạng: nơi lưu | `data/leaderboard.json` do máy chủ Node ghi (để `--export-leaderboard` đọc được); bản web tĩnh tự lưu trong `localStorage` |
| D9 | `achieved_at` | Do máy chủ đóng dấu khi nhận (ISO UTC, hậu tố `Z`) |
| D10 | Lưu điểm khi thua | Cho lưu tại màn thua (điểm = tổng các Đêm đã thắng, `nights_won` = số Đêm đã thắng, `seed` = seed Đêm vừa thua); không bắt buộc, có thể bỏ qua |
| D11 | Tên có dấu | Chưa hỗ trợ (điểm cộng, không bắt buộc) |
| D12 | `run_cmd` | Đổi thành `node server.js` để `--export-leaderboard` truyền thẳng được (với `npm start` phải thêm `--`) |
