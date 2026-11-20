# Changelog

## v1.0.0 — Phase 4 "Bình minh" (Contract v1.3)

Không có breaking change về luật hay đầu ra headless (Phase 1–3 giữ nguyên; `check.sh` 46 scenario vẫn đạt). Thay đổi lệnh: `run_cmd` là `node server.js` (để truyền `--export-leaderboard`).

### Thêm
- **Benchmark** `node bench/bench.js --seed 42 --duration 30 --out bench.json`: cảnh chuẩn 1280×720 (200 Bóng Mực `wander`, 100 đom đóm, L1–L3 sáng), camera bay vòng, khởi động 3 s, số liệu `avg_fps`, `p1_low_fps`, `frame_ms_p95`, `frames`, `load_ms`, `peak_mem_mb`, `vsync_off`, `renderer`, `os`. Sim có chế độ `bench` (tắt sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm).
- **Soak test** `node src/soak.js --seed 7 --nights 10 --out soak.json`: 10 Đêm trong một tiến trình, input ngẫu nhiên theo seed, báo `crashes`, `mem_start_mb`, `mem_end_mb`.
- **Bảng xếp hạng cục bộ** top 10 (lưu `data/leaderboard.json`, màn hình trong menu, nhập tên sau Bình Minh hoặc khi thua) và `node server.js --export-leaderboard out.json`.
- **Dễ tiếp cận:** đổi phím (báo trùng, khôi phục mặc định, lưu), phụ đề / mũi tên chỉ hướng Bóng Mực mới, gió sắp thổi, đếm ngược 10 s, đèn sắp cạn dầu; giảm chuyển động; chữ ≥ 18 px và chữ lớn ×1.25.
- **Đóng gói:** `LICENSE` (MIT), `CREDITS.md`, `Dockerfile`, `npm run build:web` (web tĩnh), hướng dẫn Release `release/RELEASE.md`, retro `retro/retro.md`.
- `game.contract.json` v1.3: thêm `bench_cmd`, `soak_cmd`.

### Thay đổi
- Client: dùng chung hình học/vật liệu cho Bóng Mực và đom đóm (hiệu năng), gom mọi chữ UI về ≥ 18 px, bỏ dòng hướng dẫn phím cố định (hiện trong màn giới thiệu và tạm dừng theo phím đang gán).

### Test
- 8 unit test mới (`tests/unit/phase4.test.js`): tên/bảng xếp hạng, cảnh bench, thống kê khung hình, soak, API bảng xếp hạng + xuất. Tổng 27 unit test, 46 scenario.

## Phase 3 — Ticket-03 "Đèn cạn dầu" (Contract v1.2)

### ⚠ Thay đổi phá vỡ tương thích (breaking changes)

| Mục | Trước (Phase 1–2) | Sau (Phase 3) |
|---|---|---|
| Luật thắng | Thắp đủ đèn → thắng ngay (`all_lit`) | Hết giờ + đủ `ceil(0.6 × tổng)` đèn sáng → thắng (`dawn_survived`); thắp đủ **không** kết thúc Đêm |
| `game_over.reason` | `all_lit`, `dawn`, `no_flames` | `dawn_survived`, `dawn`, `no_flames` (**bỏ** `all_lit`) |
| Đèn đã sáng | Không nhận thêm đom đóm, sáng mãi | Có dầu 0–100, hao 1/s, nhận dầu (`refuel`), hết dầu thì tắt (`lantern_out`) |
| Thắp đèn | Luôn 10 đom đóm | Lần đầu 10, thắp lại (`ever_lit`) 5 |
| Vùng an toàn | Đèn sáng, luôn có | Chỉ khi `fuel ≥ 30`; Bóng Mực vào được đèn yếu và hút dầu (`drain`) |
| Thời gian Đêm 1/2/3 | 300 / 330 / 360 s | 240 / 270 / 300 s |
| Sức chứa | 10 cố định | `10 + 2 × successful_lights`, tối đa 20 |
| Điểm | +10/đom đóm, +100/đèn, +2/giây còn lại, +50/lửa | +5/đom đóm nạp, +100 thắp đầu, +40 thắp lại, +5 (+15 nếu `drain`) mỗi bóng trúng Tỏa Sáng, bình minh +50+floor(fuel)/đèn sáng và +50/lửa; **bỏ** thưởng thời gian |
| `lantern_lit` | `{lantern_id}` | `{lantern_id, relight}` |
| Snapshot đèn / người chơi | `id,pos,lit,deposited` / không `capacity` | thêm `fuel, ever_lit, relit_count` / `capacity` |
| Trạng thái Bóng Mực | `spawning, wander, chase, recoil, stunned` | thêm `drain` |
| Scenario | — | `lanterns[].{lit,fuel,ever_lit}`, `player.successful_lights`, `shades[].target_lantern_id` (đèn `lit:true` không `fuel` → 100) |
| Event mới | — | `refuel`, `lantern_out`, `fuel_drain` |

### Thêm
- Cài đặt **"Bảng màu dễ phân biệt"** (lưu giữa các lần mở): viền/mắt Bóng Mực `#00B3FF`, cảnh báo UI `#FFFFFF` + ⚠, đèn tắt xẹp 20% + giấy rách, đèn sắp hết dầu nhấp nháy 1 Hz.
- HUD: thanh dầu trên đèn, "đang mang / sức chứa", "đèn k/n (cần m)", cảnh báo đèn sắp cạn.

### Test
- Xóa: `p1_win_all_lit`, `p2_win_on_last_tick` (luật thắng sớm không còn). Đổi số: `p2_safe_zone_evicts_shade`, `p2_night2_map`, `p2_night3_map`, `p2_pause_freezes_logic`, `p2_full_night3_performance`. Lý do: [docs/changes.md](docs/changes.md).
- Mới: 15 scenario `p3_*` + 5 unit test. Quyết định thiết kế: [adr/0001-den-can-dau-va-luat-thang.md](adr/0001-den-can-dau-va-luat-thang.md).

## Phase 2 — Ticket-02 "Ba hòn đảo" (Contract v1.1)
- Số liệu chuẩn, 3 bản đồ, Lướt, Gió Lạc, Bùa Gió, rơi khỏi đảo, tạm dừng, chuỗi 3 Đêm. Chi tiết: [docs/spec-phase-2.md](docs/spec-phase-2.md).

## Phase 1 — PRD-0 (Contract v1.0)
- Đêm 1, nhặt đom đóm, thắp đèn, Bóng Mực, Tỏa Sáng, headless theo Test Contract.
