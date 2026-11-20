# Spec & tiêu chí nghiệm thu — Phase 3 (Ticket-03 "Đèn cạn dầu", Contract v1.2)

Nguồn: [docs/phase-3.md](../docs/phase-3.md). Quyết định thiết kế: [ADR-0001](../adr/0001-den-can-dau-va-luat-thang.md). Breaking changes: [CHANGELOG.md](../CHANGELOG.md).
`S:` = scenario headless (`tests/scenarios/`), `U:` = unit test (`tests/unit/sim.test.js`), `M:` = kiểm tay trong trình duyệt.

## §1 Nhiên liệu đèn

| Yêu cầu | Tiêu chí | Kiểm chứng |
|---|---|---|
| Max 100; vừa thắp `fuel = 100` | Sau `lantern_lit`, snapshot `fuel` = 100 | S: p3_lantern_out_and_relight |
| Hao 1.0/s (1/60 mỗi tick), đơn vị nguyên 1/60 | 600 tick → 90.0; hao đúng từng tick, không sai số | S: p3_fuel_decay, U: "hao dầu chính xác 1/60" |
| Châm dầu `used = min(mang, ceil((100−fuel)/10))`, `fuel = min(100, fuel+10×used)`, event `refuel` | fuel 50, mang 4 → +40; fuel 95 → chỉ trừ 1 đom đóm | S: p3_refuel_lit_lantern, p3_refuel_caps_at_needed |
| Chọn đèn: chỉ đèn nhận được (chưa sáng, hoặc sáng chưa đầy), gần nhất, id nhỏ | Đèn gần nhất đã sáng nhưng chưa đầy vẫn nhận dầu | U: "thắp lần đầu cần 10…" |
| Hết dầu → tắt, `deposited = 0`, `lantern_out`, `ever_lit = true` | `lantern_out` đúng tick, snapshot `lit:false, fuel:0, ever_lit:true` | S: p3_lantern_out_and_relight |
| Thắp lại 5 đom đóm (đèn chưa từng sáng vẫn 10) | mang 4 < 5 → chưa sáng; mang 5 → `lantern_lit {relight:true}` | S: p3_relight_needs_five_not_less, p3_lantern_out_and_relight |
| Hiển thị: thanh dầu; `fuel < 30` nhấp nháy 1 Hz | Thanh dầu trên đèn sáng, nhấp nháy | M: `evidence/phase-3/screens/fuel.png` |

## §2 Bóng Mực hút dầu

| Yêu cầu | Tiêu chí | Kiểm chứng |
|---|---|---|
| `fuel < 30` mất vùng an toàn (đúng 30 vẫn còn) | Bóng chạm Mây đứng ở đèn fuel 25; đèn fuel 100 chặn ở 6 m | S: p3_low_fuel_loses_safe_zone, p1_safe_radius |
| `wander` chọn đèn yếu gần nhất, rồi đèn tắt gần nhất; `chase` không đổi | S1 đi tới đèn fuel 20 và vào `drain` | S: p3_wander_drains_weak_lantern |
| ≤2 m → `drain`, hút 5/s, cộng dồn, đèn vẫn hao 1/s; `fuel_drain` mỗi 60 tick | fuel 11.98 ở tick 181, `lantern_out` tick 301 | S: p3_wander_drains_weak_lantern |
| `drain` → `chase` (Mây ≤6 m), → `stunned` (Tỏa Sáng), → `wander` (đèn tắt / fuel ≥30 / >2 m) | cả ba chuyển trạng thái | S: p3_drain_to_chase_when_player_near, p3_pulse_on_draining_shade_scores_15, p3_wander_drains_weak_lantern |
| Châm lên ≥30 khi có bóng trong 6 m → đẩy ra mép ≤30 tick, không sát thương | S1 ở (6,1,10), không `player_hit` | S: p3_refuel_above_30_evicts_shades |

## §3 Luật thắng mới

| Yêu cầu | Tiêu chí | Kiểm chứng |
|---|---|---|
| Đêm 240/270/300 s | `time_left_s` tick 0 | S: p2_night2_map, p2_night3_map, U: "v1.2 …240/270/300" |
| Thắng khi hết giờ, còn sống, đèn sáng ≥ ceil(0.6×tổng) (3/5, 4/6, 5/7) | `won / dawn_survived` ở tick hết giờ | S: p3_dawn_survived_wins, U: "thắng chỉ khi…" |
| Không thắng sớm | 5/5 đèn sáng: không `game_over` trước tick bình minh | S: p3_no_early_win_all_lit |
| Thua: hết lửa (kể cả tick cuối) hoặc dưới ngưỡng khi hết giờ | `no_flames` thắng `dawn_survived` ở tick 60; `dawn` khi 2/5 | S: p3_no_flames_beats_dawn_on_last_tick, p3_dawn_below_threshold_loses |
| Thứ tự tick: bước 2 trừ dầu, đèn fuel ≤0 tắt ngay sau, xét thắng/thua sau mọi cập nhật | Ghi trong mã (đầu `sim.js`) | đọc mã |

## §4 Sức chứa

| Yêu cầu | Tiêu chí | Kiểm chứng |
|---|---|---|
| `10 + 2×successful_lights`, tối đa 20, đặt lại mỗi Đêm; scenario đặt sẵn không tính | 0→10, 1→12, 5→20, 12→20; thắp lại cũng tính | U: "sức chứa", S: p3_capacity_grows_with_lights, p3_capacity_capped_at_twenty, p3_lantern_out_and_relight |
| HUD "đang mang / sức chứa" | `6/16` | M: `fuel.png` |

## §5 Điểm

| Yêu cầu | Kiểm chứng |
|---|---|
| +5/đom đóm nạp (thắp, thắp lại, châm) | S: p3_refuel_lit_lantern (20), p3_lantern_out_and_relight (25+40) |
| +100 thắp đầu, +40 thắp lại | S: p2_safe_zone_evicts_shade (150 = 50+100), p3_lantern_out_and_relight (65) |
| +5/bóng trúng Tỏa Sáng, +15 nếu đang `drain` | S: p1_pulse_stuns_shade (5), p3_pulse_on_draining_shade_scores_15 (15) |
| Bình minh: +50+floor(fuel)/đèn sáng, +50/Ngọn Lửa; bỏ thưởng thời gian | S: p3_dawn_survived_wins (594), p3_no_early_win_all_lit (895) |

## §6 Chế độ mù màu

| Yêu cầu | Tiêu chí | Kiểm chứng |
|---|---|---|
| Cài đặt "Bảng màu dễ phân biệt", được lưu | Hộp kiểm trong Cài đặt, lưu `localStorage` | M: bật, tải lại trang |
| Viền + mắt bóng `#7A3CFF` → `#00B3FF`; cảnh báo `#FF5A5F` → `#FFFFFF` + ⚠ | `RIM()` trong `web/main.js`; CSS `body.cb` | M |
| Đèn tắt xẹp 20% + giấy rách; sắp hết dầu nhấp nháy | `cage.scale.y = 0.8`, `tear`, nhấp nháy 1 Hz | M: `fuel.png` |

## Hồi quy Phase 1–2

Test cũ bị luật mới làm sai: sửa hoặc xóa kèm lý do ở [docs/changes.md](../docs/changes.md) (không có test nào bị skip âm thầm). Phần còn lại của `p1_*`, `p2_*`, `contract_*` vẫn chạy và đạt.

---

# Giả định Phase 3 (chỗ ticket chưa nói rõ)

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| C1 | Tốc độ `wander` khi đi tới đèn | Bằng `shade_speed` (4.0); lang thang ngẫu nhiên vẫn 2 m/s |
| C2 | Đèn tắt làm mục tiêu | Bóng đi tới ≤2 m rồi đứng, không có hiệu ứng |
| C3 | `deposited` khi đèn sáng | Giữ bằng giá thắp (10 hoặc 5); về 0 khi `lantern_out` |
| C4 | `deposit` có còn phát khi thắp? | Có (nạp vào đèn tắt); đèn đang sáng chỉ phát `refuel` |
| C5 | `fuel_drain` | Mỗi bóng, ở mỗi lần hút thứ 60, 120, … (kể cả tick đèn vừa hết dầu), `fuel` sau khi trừ |
| C6 | `used` khi châm | Tính trên dầu hiện tại sau khi trừ hao của tick đó |
| C7 | Dầu đặt bởi scenario | `lit:true` không `fuel` → 100, `ever_lit` mặc định true; `fuel>0` không nói `lit` → sáng; `lit:false` → fuel 0 |
| C8 | `target_lantern_id` | Chỉ ép mục tiêu khi đèn đó đang yếu; ngoài ra bóng tự chọn |
| C9 | "Cách 6 m" của `drain → chase` | Đo XZ giữa Mây và bóng, ≤ 6 |
| C10 | Bóng `drain` gây sát thương? | Không: chạm chỉ tính cho `chase`/`wander` |
| C11 | `per_second_left` | Giữ khóa trong `tuning.score` với giá trị 0 ("Bỏ"); điểm thắp lại, +15, thưởng bình minh là hằng số trong `config.js` (`WORLD`), không thêm khóa vào `tuning.score` |
| C12 | `successful_lights` | Tăng mỗi lần `lantern_lit` do người chơi gây ra (cả lần đầu lẫn thắp lại) |
| C13 | Số đèn sáng "tại tick cuối" | Đếm sau mọi cập nhật của tick bình minh, tức sau cả bước trừ dầu và `lantern_out` |
| C14 | Ánh sáng môi trường | Vẫn theo công thức Ticket-02 với số đèn đang sáng/tổng |
| C15 | Runner mẫu chưa biết v1.2 | Mở rộng `tools/run_scenarios.py` (sự kiện, trường, lý do mới); xem `docs/changes.md` |
