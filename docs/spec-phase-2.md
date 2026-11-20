# Spec & tiêu chí nghiệm thu — Phase 2 (Ticket-02, Contract v1.1)

Nguồn yêu cầu: [phase-2.md](phase-2.md). Cột "Kiểm chứng": `S:` = scenario headless trong `tests/scenarios/` (chạy bằng `./scripts/check.sh`), `U:` = unit test, `M:` = kiểm tay trong trình duyệt (chưa tự động hóa được).

## A. Số liệu chuẩn (Phần 1) — thay mọi giá trị Phase 1

| Yêu cầu | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| Chạy 6 m/s, tăng/dừng ≤ 0.1 s | Giữ `move [0,1]` 1 s thì đi đúng 6 m | U: "chạy 6 m/s" |
| Nhảy 7 m/s, g=20, chỉ khi chạm đất | Đỉnh ≈ 1.2 m; bấm nhảy khi đang bay bị bỏ qua | U: "nhảy" |
| Lướt 14 m/s / 0.2 s / hồi 1.5 s từ lúc bắt đầu | Lướt 2.8 m; bấm lại trước 90 tick bị bỏ qua; đúng tick 90 được | S: p2_dash |
| Đom đóm: sức chứa 10, nhặt ≤1.0 m XZ và ≤1.5 m cao | Chạm bán kính 1.0 mới nhặt | S: p1_pickup_mote |
| Số lượng đom đóm: 20 ở 20 điểm khác nhau, trần 30, +1 mỗi 240 tick | tick 0: 20 đom đóm; tick 240: 21 | U: "20 đom đóm", S: p2_night1_defaults_standard |
| Đèn: 10 đom đóm, nạp nhiều lần, bán kính 2.0 m, đèn gần nhất chưa sáng | Nạp `min(mang, thiếu)`; đèn nhớ tiến độ | S: p1_deposit_lights_lantern |
| Vùng an toàn 6 m của **đèn đã sáng**; bóng đang ở trong bị đẩy ra ≤30 tick, không sát thương | Bóng bị chặn ở mép 6 m; đèn vừa sáng đẩy bóng ra | S: p1_safe_radius, p2_safe_zone_evicts_shade |
| Tỏa Sáng: 3 đom đóm / 5 m 3D / hồi 3 s; choáng 120 tick; đẩy 4 m trong 15 tick; +5/con | Đủ chi phí mới kích hoạt; chốt mục tiêu ở tick kích hoạt | S: p2_pulse_standard, p2_pulse_needs_three_motes, U: "Tỏa Sáng bị bỏ qua" |
| Bóng Mực: 4.0 (Đêm 3: 4.5) m/s, phát hiện 12 / bỏ đuổi 18 m, chạm ≤1.0 m và ≤1.5 m cao, tối đa 1 lần mất lửa/tick, recoil 2 m/60 tick | Hit đúng tick tính từ khoảng cách; hai bóng cùng chạm chỉ mất 1 lửa | S: p1_shade_hit_loses_flame, U: "chạm lúc bất tử" |
| Lịch sinh Bóng Mực: 2 con ở tick 300, rồi 1 con mỗi 480/420/360 tick, tối đa 6/8/10, ≥15 m người chơi | `shade_spawned` S1,S2 tại tick 300 | S: p2_night1_defaults_standard, U: "bản đồ chuẩn" |
| Bị đánh: −1 lửa, rơi floor(mang/2) (tồn tại 480 tick), bất tử 90 tick | `player_hit {flames, dropped}` | S: p1_shade_hit_loses_flame |
| Rơi Y<−10: đúng 1 lần, −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh ở xuất phát bất tử 90 tick; hết lửa thì thua ngay | `player_hit {by:"fall", lost}`; hồi sinh; thua `no_flames` | S: p2_fall_and_respawn, p2_fall_last_flame_loses |
| Ngọn Lửa 3 hồi đầy mỗi Đêm; thời gian 300/330/360 s | Mỗi Đêm là một `Sim` mới | S: p2_night2_map, p2_night3_map |
| Thắng/thua sau mỗi tick (hết lửa → thua; sống + đủ đèn → thắng kể cả đúng tick hết giờ; còn lại hết giờ → dawn) | Thắng ở tick hết giờ vẫn là `all_lit` | S: p2_win_on_last_tick, p1_lose_dawn, p1_lose_no_flames |
| Điểm: +10/đom đóm nạp, +100/đèn, +5/bóng trúng pulse, thắng: floor(giây)×2 + 50×lửa | 548 với 10 đom đóm, 99 s, 3 lửa | S: p1_win_all_lit |
| Thứ tự 12 bước trong một tick | Ghi ở đầu `src/sim/sim.js`, mỗi bước một khối | đọc mã |
| Tạm dừng: tick tăng, `sim_tick`/thời gian đứng yên, snapshot `paused` | `paused`/`resumed`, `sim_tick` đóng băng | S: p2_pause_freezes_logic |

## B. Bản đồ chuẩn (Phần 2)

| Bản đồ | Tiêu chí | Kiểm chứng |
|---|---|---|
| Đêm 1: đảo r=40, 5 đèn chuẩn, 24 điểm đom đóm, 12 điểm bóng | Vị trí đèn đúng; 24/12 điểm | U: "bản đồ chuẩn", S: p2_night1_defaults_standard |
| Đêm 2: hai đảo r=28 + cầu x∈[26,44], |z|≤2; 6 đèn; 2 bục nhảy (Y14, ngang 24 về đảo kia); 24 điểm đom đóm, 16 điểm bóng | Mép cầu: lệch z>2 thì rơi; bục bắn sang đảo B, đáp ≈ (51.6,0,6.6) | U: "Đêm 2", S: p2_night2_map, p2_jump_pad_night2 |
| Đêm 3: đảo r=45, tầng 0/1/2 (Y 0/3/6), vách đứng, 2 dốc 30°/150°, bục (0,3,13) lên tầng 2, tháp r=2 cao 8; 7 đèn; 30 điểm đom đóm; 16 điểm bóng; gió 2 m/s | Vách chặn (không leo); dốc nâng Y từ 0 lên 3; gió đúng lịch | U: "Đêm 3", S: p2_night3_wall_blocks, p2_night3_ramp_climb, p2_night3_wind_schedule, p2_night3_map |

## C. Tính năng mới (Phần 3) — tiêu chí nghiệm thu

| Tính năng | Tiêu chí | Kiểm chứng |
|---|---|---|
| **Gió Lạc** | (1) `idle`→`chase` khi mang ≥5 và ≤15 m; (2) chạm ≤1.2 m cướp min(3, mang), chuyển `flee` 240 tick rồi `removed`, mỗi con 1 lần; (3) Tỏa Sáng lúc `chase` → `flee` không cướp; (4) Tỏa Sáng lúc `flee` có mang → `drifter_drop`, đom đóm thành `dropped`; (5) không làm mất lửa, không bị chặn bởi vùng an toàn | S: p2_drifter_steals, p2_drifter_pulse_makes_flee, p2_drifter_pulse_drops_stolen, p2_night2_default_run (sinh ở tick 1200, 2400) |
| **Bùa Gió** | Nhặt như đom đóm (`charm_picked`, 600 tick); chạy 7.2 m/s; Lướt không hồi chiêu; xuất hiện lại sau 2700 tick (`respawn_s`) | S: p2_charm_pickup_speed, p2_dash_charm_no_cooldown |
| **Chuỗi 3 Đêm** | Menu → giới thiệu (tên đảo, lời Ông Đăng) → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh + tổng điểm; thua → chơi lại Đêm đó | M: `npm start`, chơi hết |
| **Tạm dừng (Esc/P)** | Logic dừng hẳn; có Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu | M (logic: S: p2_pause_freezes_logic) |
| **Cài đặt** | Âm lượng, độ nhạy chuột; lưu giữa các lần mở (localStorage) | M: đổi, tải lại trang |
| **Âm thanh** | Nhạc nền + SFX: nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, bóng xuất hiện, đếm ngược 10 s cuối (+ gió, bùa, bị cướp) | M (tổng hợp bằng WebAudio, `web/audio.js`) |
| **HUD đầy đủ** | Lửa (trái trên); mm:ss (giữa trên, đỏ + nhấp nháy ≤30 s); đèn k/n + điểm (phải trên); thanh 10 ô; hồi chiêu Lướt/Tỏa Sáng (phải dưới); nhắc "E — Nạp ánh sáng (x/10)" khi ở gần đèn; mũi tên tới đèn chưa sáng gần nhất khi ngoài màn hình | M: ảnh `evidence/phase-2/screens/` |
| **Bảng màu chuẩn** | Hằng số màu `C` trong `web/main.js` khớp bảng hex; ánh sáng môi trường = 0.15 + 0.55×(đèn sáng/tổng) | đọc `web/main.js` (`ambient.intensity`) |

## D. Hồi quy Phase 1

Mọi scenario `p1_*` còn chạy và đạt **với số chuẩn mới**. Số mong đợi của 4 scenario phải đổi vì ticket thay số (xem [changes.md](changes.md)).

## E. Hiệu năng

- Headless một Đêm đầy đủ (21.600 tick) ≤ 30 s: S: p2_full_night3_performance (`max_seconds: 30`).
- ≥ 30 FPS trung bình ở 1280×720 (bản thường): **chưa đo** (xem README, mục hạn chế).

---

# Giả định Phase 2 (chỗ ticket chưa nói rõ)

Các giả định Phase 1 trong [assumptions.md](assumptions.md) còn hiệu lực trừ chỗ số liệu hoặc luật bị ticket thay.

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| B1 | Điểm xuất phát Đêm 3 (ticket không nêu; tâm đảo là tháp) | (0,0,−12) trên tầng 0, quay mặt +Z. Hồi sinh ở cùng điểm |
| B2 | Quy ước góc | Góc đo từ +X: x = r·cos a, z = r·sin a. Bằng chứng: tầng 1 và dốc 30°/150° nằm ở z>0 như ticket mô tả |
| B3 | Kiểu của `player.invuln` trong snapshot | boolean (còn bất tử hay không); scenario dùng `invuln_ticks` |
| B4 | `ttl_s` của đom đóm `random` | `null` (không hết hạn); đom đóm rơi: số giây còn lại |
| B5 | `night_start` | Ghi ngay sau snapshot tick 0 với `tick: 0` |
| B6 | Trần 30 đom đóm | Đếm mọi đom đóm đang có (cả đom đóm rơi) |
| B7 | Tương tác đèn | Chỉ đo XZ ≤ 2.0 (không xét chênh cao) |
| B8 | Chênh cao khi chạm | So `shade.pos.y` (tâm) với chân Mây ≤ 1.5 |
| B9 | "Tăng tốc/dừng ≤ 0.1 s" | Chọn tức thời (0 s) cho kết quả dễ dự đoán |
| B10 | Bóng Mực `spawning`/`wander` | `spawning` kéo dài đúng tick sinh (tick sau mới hành động); `wander` 2 m/s đổi hướng mỗi 2–4 s; đuổi theo đường thẳng, bị vách/vực chặn, không tìm đường |
| B11 | Đẩy bóng ra khỏi vùng an toàn | Đều trong 30 tick tới mép 6 m, bóng đứng yên hành vi trong lúc đó và không gây sát thương |
| B12 | Gió Lạc | Sinh ở điểm sương = các điểm sinh Bóng Mực; `idle` giữ trong bán kính bản đồ; con `removed` vẫn nằm trong mảng `drifters`; chỉ cướp khi mang >0; thả đom đóm do pulse có TTL 120 tick |
| B13 | Gió Đêm 3 | Báo trước từ tick 1680 (+1800k), hoạt động tick 1800..2099 (+1800k), hướng chọn bằng RNG lúc báo; `dir_deg` = hướng đó khi báo/hoạt động, ngoài ra 0 |
| B14 | `stunned_ids` | Gồm cả bóng đang choáng; hồi chiêu chỉ tính khi kích hoạt |
| B15 | `player_hit` do rơi | Thêm `lost` (số đom đóm mất); `dropped` = 0. Hit do bóng không có `lost` |
| B16 | Bục nhảy | Kích hoạt khi chân đứng trên mặt đất trong bán kính 1 m và lệch cao ≤ 0.5 m |
| B17 | Vách / dốc | Cột đặc; tự bước lên được chênh ≤ 0.5 m (dốc), cao hơn là vách chặn; bước ra mép thì rơi |
| B18 | Tạm dừng | Sự kiện `paused` ở tick bấm (dừng bước tại đó); `resumed` ở tick bấm lại và tick đó chạy bình thường |
| B19 | Rơi: chờ 60 tick | Người chơi đứng im, không nhận input (không nhặt/không bị chạm); bóng vẫn di chuyển |
| B20 | Tổng điểm game | Client cộng điểm các Đêm đã thắng; headless báo điểm của một Đêm |
