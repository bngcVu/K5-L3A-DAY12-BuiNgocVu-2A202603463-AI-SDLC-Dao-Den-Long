# Nhật ký thay đổi test / harness

| Ngày | Thay đổi | Lý do |
|---|---|---|
| 2026-11-20 | `tools/run_scenarios.py`: quote tham số bằng `subprocess.list2cmdline` trên Windows; ép UTF-8 cho stdout/stderr và subprocess | Runner mẫu dùng `shlex.quote` (kiểu POSIX) và mã hóa mặc định cp1252 nên hỏng trên Windows. Không đổi logic kiểm. Trên macOS/Linux hành vi như cũ |
| 2026-11-20 | `scripts/check.sh`: mặc định `UNIT_TEST_CMD=node --test tests/unit/*.test.js`; dùng `python` nếu không có `python3` | Cấu hình theo stack Node; máy Windows không có `python3` |
| 2026-11-20 | `tests/scenarios/p1_win_all_lit`: điểm mong đợi 349 (không phải 350) | Tính lại từ spec: còn 5998 tick → `floor(5998/60)=99` giây, không phải 100. Lỗi ở phép tính trong expect của tôi, không phải mã |
| 2026-11-20 | `tests/scenarios/p1_pulse_stuns_shade`: vị trí mong đợi z=−6.942 (không phải −7) | Quên rằng Bóng Mực đuổi 1 tick (3.5/60 m) ở bước 0 trước khi pulse ở bước 1. Mã đúng, expect tính sai |
| 2026-11-20 | `.gitignore`: bỏ `docs/` khỏi danh sách bỏ qua | `docs/assumptions.md`, `docs/changes.md` là tài liệu phải nộp |
