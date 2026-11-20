# Giả định Phase 1 (PRD-0 + Test Contract v1.0)

Chỗ PRD/contract chưa nói rõ → giả định dưới đây. Mỗi giả định có scenario hoặc unit test kiểm (cột cuối).

| # | Chỗ mơ hồ | Giả định | Kiểm bằng |
|---|---|---|---|
| A1 | "ánh sáng" tốn khi tỏa sáng là gì | Tốn **đom đóm đang mang** (`pulse_cost` = 2). Không đủ đom đóm hoặc đang hồi chiêu → bấm pulse bị bỏ qua, **không** ghi event | `p1_pulse_stuns_shade`, unit "pulse bị bỏ qua" |
| A2 | Máu của Mây | "Ngọn lửa" (`flames`) = máu, bắt đầu 3. Về 0 → thua `no_flames` | `p1_lose_no_flames` |
| A3 | Hết đêm (`dawn`) | Hết 300 s mà chưa thắp đủ 5 đèn → **thua**, reason `dawn` | `p1_lose_dawn` |
| A4 | Thắng | Khi cả 5 đèn `lit` (kiểm cuối bước nạp đèn) → `won`/`all_lit` | `p1_win_all_lit` |
| A5 | Nạp đèn | `interact` (cạnh false→true) nạp vào đèn **chưa sáng** gần nhất trong `interact_radius`; nạp `min(carried, lantern_cost − deposited)`. Đủ `lantern_cost` thì sáng | `p1_deposit_lights_lantern` |
| A6 | Điểm | `per_mote` mỗi lần nhặt (kể cả đom đóm rơi); `per_lantern` khi đèn sáng do nạp (đèn đặt sẵn bởi scenario không tính); `per_stun` mỗi Bóng Mực trúng pulse; khi **thắng** thêm `floor(giây còn lại) × per_second_left` + `flames × per_flame_left`. Thua: không thưởng | `p1_win_all_lit` (349) |
| A7 | `hit_drop_ratio` | Rơi `floor(carried × ratio)` đom đóm, đặt thành vòng bán kính 2.5 m quanh Mây (ngoài `pickup_radius`) | `p1_shade_hit_loses_flame` |
| A8 | Sau khi bị chạm | Bất tử `invuln_s` = 1.5 s; Bóng Mực vừa chạm lùi 1 s (`recoil`) rồi đuổi lại | `p1_shade_hit_loses_flame` |
| A9 | `safe_radius` | Quanh **mọi** đèn (sáng hay chưa). Bóng Mực bị chiếu ra ngoài vòng 4 m (kể cả khi bị đẩy bởi pulse) | `p1_safe_radius` |
| A10 | Pulse | Trúng mọi Bóng Mực trong 6 m (đo XZ): choáng 3 s (`stunned`, đứng yên, không gây sát thương), bị đẩy ra xa 3 m; hồi 1.5 s. `stunned_ids` gồm cả con đang choáng sẵn | `p1_pulse_stuns_shade` |
| A11 | Rơi khỏi đảo | `fall_enabled=false`: rìa đảo (bán kính 45 m) là tường vô hình, không phạt; không có event `fall` | unit/ chạy tay |
| A12 | Nhảy | Có nhảy (7 m/s, trọng lực 20): chỉ thẩm mỹ, khoảng cách vẫn đo theo XZ nên không né được Bóng Mực | unit "nhảy" |
| A13 | Bố cục đảo | Đảo tròn bán kính 45 m; 5 đèn xếp vòng bán kính 25 m, L1 = (0,0,25), mỗi đèn lệch 72° | unit "5 đèn ở bán kính 25" |
| A14 | Sinh ngẫu nhiên | Mặc định: 40 đom đóm lúc đầu (và bổ sung 1/giây nếu < 40), 2 Bóng Mực lúc đầu, +1 Bóng Mực mỗi 20 s (tối đa 6, event `shade_spawned`). Tắt hoàn toàn bằng `random_motes/random_shades:false` | `contract_default_run` |
| A15 | Thứ tự trong một bước | giảm bộ đếm → di chuyển → nhặt → nạp đèn (kiểm thắng) → pulse → Bóng Mực (kiểm thua) → sinh → hết giờ | comment đầu `src/sim/sim.js` |
| A16 | Scenario | `y` của Bóng Mực giữ như scenario (mặc định 1.0); đom đóm luôn nằm y=0; id đèn lạ (ngoài L1..L5) hoặc file sai kiểu → exit 2 | `contract_bad_inputs` |
| A17 | Đèn đặt `lit:true` mà không có `deposited` | `deposited` = `lantern_cost` | — |
| A18 | Thời gian | `time_left_s` làm tròn 3 chữ số; scenario `time_left_s` đặt giá trị bắt đầu | `p1_lose_dawn` |

Số tuning (tất cả ở `src/sim/config.js`, khớp `game.contract.json`, có unit test so khớp): xem README.
