# Nhật ký thay đổi test / harness

| Ngày | Thay đổi | Lý do |
|---|---|---|
| 2026-11-20 | `tools/run_scenarios.py`: quote tham số bằng `subprocess.list2cmdline` trên Windows; ép UTF-8 cho stdout/stderr và subprocess | Runner mẫu dùng `shlex.quote` (kiểu POSIX) và mã hóa mặc định cp1252 nên hỏng trên Windows. Không đổi logic kiểm. Trên macOS/Linux hành vi như cũ |
| 2026-11-20 | `scripts/check.sh`: mặc định `UNIT_TEST_CMD=node --test tests/unit/*.test.js`; dùng `python` nếu không có `python3` | Cấu hình theo stack Node; máy Windows không có `python3` |
| 2026-11-20 | `tests/scenarios/p1_win_all_lit`: điểm mong đợi 349 (không phải 350) | Tính lại từ spec: còn 5998 tick → `floor(5998/60)=99` giây, không phải 100. Lỗi ở phép tính trong expect của tôi, không phải mã |
| 2026-11-20 | `tests/scenarios/p1_pulse_stuns_shade`: vị trí mong đợi z=−6.942 (không phải −7) | Quên rằng Bóng Mực đuổi 1 tick (3.5/60 m) ở bước 0 trước khi pulse ở bước 1. Mã đúng, expect tính sai |
| 2026-11-20 | `.gitignore`: bỏ `docs/` khỏi danh sách bỏ qua | `docs/assumptions.md`, `docs/changes.md` là tài liệu phải nộp |
| 2026-11-20 | Phase 2 (Ticket-02): `game.contract.json` lên v1.1 + toàn bộ số chuẩn; `src/sim/config.js` đổi theo | Ticket-02 Phần 1/4 thay mọi giá trị tự chọn ở Phase 1 |
| 2026-11-20 | Viết lại `src/sim/sim.js` (12 bước theo ticket), thêm `src/sim/maps.js` | Ticket-02 bắt buộc thứ tự xử lý, 3 bản đồ, rơi khỏi đảo, lướt, Gió Lạc, bùa, gió, tạm dừng |
| 2026-11-20 | Điểm đom đóm tính khi **nạp** (không phải khi nhặt); `per_stun` 20→5; `per_second_left` 1→2 | Ticket-02 "Điểm (chuẩn hóa)" thay luật Phase 1 (giả định A6) |
| 2026-11-20 | Vùng an toàn chỉ quanh đèn **đã sáng**, bán kính 4→6 m | Ticket-02 "Vùng an toàn": thay giả định A9 của Phase 1 |
| 2026-11-20 | `p1_pulse_stuns_shade`: pulse tốn 3, đẩy 4 m trong 15 tick, +5 điểm; expect z=-7.933, carried 2, score 5 | Số chuẩn mới (A1/A10 Phase 1 bị thay) |
| 2026-11-20 | `p1_win_all_lit`: điểm 350→548 | +10/đom đóm nạp (100), ×2 giây còn lại (198): tính lại từ ticket |
| 2026-11-20 | `p1_safe_radius`: đèn L1 `lit:true`, bóng cách 11 m (≤12 phát hiện), chặn tại 6 m | Vùng an toàn chỉ của đèn sáng; bóng chỉ đuổi trong 12 m (ngoài đó `wander`) |
| 2026-11-20 | `p1_shade_hit_loses_flame`: bóng cách 10.05 m, hit tick 136 | Tốc độ 4 m/s; 10 m làm hit rơi đúng biên ≤1.0 m nên phụ thuộc làm tròn số thực. Đổi test, không đổi mã |
| 2026-11-20 | `p2_jump_pad_night2`: thả phím đi sau tick 2 | Lần đầu giữ phím sau khi đáp nên Mây đi ngược 1.6 m; lỗi ở test, mã đúng (đáp (51.145,0,6.774)) |
| 2026-11-20 | `p1_pickup_mote`, `p1_deposit_lights_lantern`, `p1_lose_dawn`, `p1_lose_no_flames`, `contract_*`: giữ nguyên, vẫn đạt với số chuẩn | Hồi quy Phase 1 |
