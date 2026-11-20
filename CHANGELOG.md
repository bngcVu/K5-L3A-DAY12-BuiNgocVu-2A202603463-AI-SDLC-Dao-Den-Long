# Changelog

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
