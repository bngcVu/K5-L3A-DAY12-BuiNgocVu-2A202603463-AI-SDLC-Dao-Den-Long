# Bằng chứng scenario — phase-1

- Commit: `135a1a0` · Contract: v1.0 · Lúc chạy: 2026-11-20 15:49:08
- Lệnh: `python3 tools/run_scenarios.py --label phase-1`
- Kết quả: 10 đạt / 0 trượt (tính cả SKIP là đạt)

| Scenario | Yêu cầu | Kết quả | Ghi chú | Thời gian / tất định |
|---|---|---|---|---|
| contract_bad_inputs | Contract B/C: inputs sai định dạng → exit 2 | PASS | tick của frame giảm (10 rồi 5) phải bị từ chối với mã thoát 2 và thông báo ở stderr | 0.07s / - |
| contract_default_run | Contract E: định dạng + tất định khi spawn ngẫu nhiên | PASS | Chạy màn mặc định 20 giây với seed 42, không input: output đúng định dạng và 2 lần chạy giống hệt | 0.09s / giống hệt |
| p1_deposit_lights_lantern | P1: nạp ánh sáng thắp đèn | PASS | Mang 10 đom đóm, đứng cạnh L1, bấm interact ở tick 1 → deposit + lantern_lit ở tick 2. Giả định lantern_cost=10, carry_capacity>=10 (số chuẩn Phase 2) — sửa theo tuning của bạn | 0.07s / giống hệt |
| p1_lose_dawn | P1: hết đêm mà chưa thắp hết đèn thì thua | PASS | time_left_s=2 → sau 120 bước: game_over lost/dawn ở tick 120 | 0.07s / giống hệt |
| p1_lose_no_flames | P1: mất hết máu thì thua | PASS | flames=1, shade chạm → flames 0 → game_over lost/no_flames, end state lost | 0.07s / giống hệt |
| p1_pickup_mote | P1: nhặt đom đóm | PASS | Đi thẳng +Z tới đom đóm ở (0,0,5) thì nhặt được, carried = 1 | 0.07s / giống hệt |
| p1_pulse_stuns_shade | P1: tỏa sáng xua Bóng Mực | PASS | Mang 5 đom đóm, shade S1 cách 4 m (trong pulse_radius 6). pulse ở tick 1 → event tick 2: stunned_ids [S1], carried 5-2=3, score +20 (per_stun), shade state stunned và bị đẩy ra (4 − 3.5/60 do chase 1 tick ở bước 0) + 3 = 6.942 m | 0.07s / giống hệt |
| p1_safe_radius | P1: Bóng Mực sợ đèn (safe_radius 4 quanh đèn) | PASS | Người chơi đứng tại L1 (0,0,10); shade ở (20,1,10) đuổi 20 s: không bao giờ vào trong 4 m của đèn → khoảng cách tới đèn ≥ 4 (snapshot tick 1200) và không player_hit | 0.07s / giống hệt |
| p1_shade_hit_loses_flame | P1: Bóng Mực chạm thì mất máu; bất tử ngắn; rơi đom đóm | PASS | Mang 10, shade cách 10 m, speed 3.5, hit radius 1: chạm khi khoảng cách ≤1 sau ~9/3.5=2.57 s. Mất 1 flame, rơi floor(10*0.5)=5. Trong invuln 1.5 s không bị chạm lần 2 (chạy 200 tick) | 0.07s / giống hệt |
| p1_win_all_lit | P1: thắp hết đèn thì thắng, có điểm | PASS | L2..L5 đã lit; mang 10, deposit vào L1 ở tick 1 → tick 2: deposit, lantern_lit, game_over won/all_lit. Điểm = 100 (lantern) + floor(5998/60=99.97)*1 = 99 (time_left 100 s − 2 bước) + 3*50 (flames) = 349 | 0.07s / giống hệt |
