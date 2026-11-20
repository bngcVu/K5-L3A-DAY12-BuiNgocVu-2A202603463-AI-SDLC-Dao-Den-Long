# Retro — Đảo Đèn Lồng (4 phase)

Tác giả: Bui Ngoc Vu · Công cụ: Claude Code (Sonnet 5.5) trong VS Code · Stack: Node.js + Three.js, sim tất định chạy headless.

## 1. Tổng hợp đánh giá 4 phase

| Phase | Yêu cầu | Kết quả | Hỏng phase trước? | Điều cần chỉnh |
|---|---|---|---|---|
| 1 — PRD-0 | Đêm 1, headless Contract v1.0 | 10 scenario + 8 unit test, tất định | — | Harness mẫu chỉ chạy trên POSIX → vá runner cho Windows |
| 2 — "Ba hòn đảo" | Số chuẩn, 3 bản đồ, lướt, Gió Lạc, bùa, rơi, tạm dừng | 32 scenario + 14 unit | Có: 5 test Phase 1 đổi số (ghi lý do) | Mơ hồ của ticket (điểm xuất phát Đêm 3, quy ước góc) phải đoán và ghi |
| 3 — "Đèn cạn dầu" | Thay luật cốt lõi (dầu, thắng ở bình minh) | 46 scenario + 19 unit | Có: xóa 2 test luật thắng cũ, sửa 5 test | ADR + CHANGELOG trước khi sửa test; mở rộng runner cho v1.2 |
| 4 — "Bình minh" | Bench, soak, bảng xếp hạng, tiếp cận, đóng gói | 46 scenario + 27 unit; bench 282 FPS, soak 0 crash | Không (headless không đổi) | Giao diện chỉ kiểm tay (không test tự động); Release và video đã tạo |

## 2. Điều gì hiệu quả

- **Viết scenario/test trước khi code (TDD)** và tính giá trị mong đợi **từ ticket**, ghi phép tính vào `desc`. Khi scenario đỏ, câu hỏi luôn là "mã sai hay phép tính sai?" và có chỗ để đối chiếu. Phần lớn scenario Phase 3 xanh ngay lần chạy đầu vì đã nghĩ kỹ trước.
- **Tất định bằng thiết kế:** một RNG có seed, dt cố định, dầu tính bằng số nguyên đơn vị 1/60. Runner chạy mỗi case 2 lần và so từng byte nên mọi sự không tất định bị bắt ngay.
- **Sim thuần tách khỏi render**: headless, soak (10 Đêm trong 0.3 s) và bench dùng chung một sim; chỉ thêm cờ `bench`.
- **Script sinh scenario/patch** (Node, Python có `assert` trên chuỗi cần thay) thay vì viết tay hàng chục file hoặc đọc lại file lớn: rẻ token và lỗi sửa sai chỗ bị chặn.

## 3. Điều gì không hiệu quả

- Heredoc bash dài trên Windows hỏng quoting **hai lần** → chuyển sang công cụ Write rồi chạy file. Lẽ ra ghi vào AGENTS.md ngay lần đầu.
- Mỗi phase tôi viết lại phần client nhiều hơn dự kiến; ở Phase 4 phải viết lại cả `main.js` vì thay đổi rải khắp file.
- Giao diện không có test tự động; tôi kiểm bằng ảnh chụp Chrome headless rồi chơi thử bằng tay ở cuối. Ảnh chụp không thay được chơi thật, và chơi tay không bắt được hồi quy về sau: đây là khoảng trống còn lại của bài (nên có Playwright cho luồng menu → nhập tên → bảng xếp hạng).

## 4. Những lần AI sai và cách phát hiện

| Lỗi | Phát hiện bằng | Sửa ở đâu |
|---|---|---|
| Tính `expect` sai (quên một tick đuổi; làm tròn giây) — Phase 1 | Scenario đỏ → tính lại từ spec | Sửa expect có ghi `docs/changes.md` |
| `Object.assign` vào thuộc tính chỉ-đọc của Three.js → màn hình trắng | Đọc console Chrome headless | Mã |
| `.gitignore` `skills/` nuốt `.claude/skills/` (SKILL.md không vào git) | Rà checklist nộp bài bằng `git ls-files` | `.gitignore` neo `/skills/` |
| Hai scenario Phase 2 sai phía test (đặt expect ngay biên 1.0 m; giữ phím sau khi đáp) | Scenario đỏ, đọc trace từng tick | Sửa test, không sửa mã |
| Thứ tự bước pulse/drain làm scenario Phase 3 sai trước khi chạy | Tính tay thứ tự bước 7 trước 8 | Sửa test trước khi chạy |
| Thống kê khung hình: tự cộng sai Σdt trong test (90 thay vì 140) | Unit test đỏ | Sửa test |
| Soak: RSS lạnh làm tỉ số 1.15× sát ngưỡng 1.2× | Chạy lặp 3 lần, đo heap riêng | Khởi động nóng + ghi rõ trong spec |

Bài học chung: **AI sai nhiều nhất ở phép tính tay và ở giả định môi trường** (POSIX, bộ nhớ lạnh), ít sai ở cấu trúc. Sửa ở nơi chắc nhất: test có `assert`, runner tự kiểm định dạng, `check.sh` bắt buộc trước khi báo xong.

## 5. Harness nào giúp nhiều nhất

1. `scripts/check.sh` + `tools/run_scenarios.py` (một lệnh, 2 lần chạy, so từng byte, báo cáo có commit hash).
2. Hook Stop (`.claude/hooks/stop-gate.sh`) chặn kết thúc khi `check.sh` đỏ.
3. Skill `run-scenario`: giữ quy tắc "tính expect từ spec, sửa mã chứ không sửa expect".
4. `AGENTS.md` ngắn, mục "Lỗi AI đã gặp" cập nhật qua từng phase (lịch sử git thể hiện).
5. ADR/CHANGELOG/spec theo phase: buộc phải viết ra "luật nào bị thay" trước khi sửa test.

## 6. Token / chi phí AI (ước lượng thô, **không đo được chính xác**)

Công cụ không cung cấp số token tổng; con số dưới đây là ước lượng theo khối lượng làm việc: Phase 1 ≈ 150–200k, Phase 2 ≈ 250–300k, Phase 3 ≈ 150k, Phase 4 ≈ 300–350k → **tổng ≈ 0.85–1.0 triệu token** (độ chênh ±30 %). Cách tiết kiệm: không dùng subagent; đọc tài liệu một lần; sinh scenario bằng script; vá file lớn bằng script có `assert` thay vì đọc lại; tái dùng khung từ phase trước; chỉ mở file khi cần.

## 6b. Số liệu cuối

46 scenario headless (mỗi cái chạy 2 lần), 27 unit test, 15 commit trải 4 phase, bench 282 FPS / 74.6 FPS 1%-low (iGPU), soak 10 Đêm 0 crash RSS ×1.07, headless một Đêm ≈ 0.3 s.

## 7. Nếu làm lại

- Ghi quy tắc "ghi file bằng công cụ Write, không heredoc dài" và "dầu/đếm bằng số nguyên" vào AGENTS.md **ngay từ ngày đầu**.
- Tách `web/main.js` thành module (renderer, UI, bindings, leaderboard) từ Phase 2 để Phase 4 không phải viết lại cả file; thêm một test giao diện tự động (Playwright) cho luồng menu → nhập tên → bảng xếp hạng.
- Dành 10 phút cuối **mỗi** phase để chơi thật bằng tay và quay clip ngắn, thay vì dồn tới cuối.
- Hỏi giảng viên sớm các điểm mơ hồ có thể đổi kết quả test ẩn (điểm xuất phát Đêm 3, kiểu `invuln`, `night_start` ở tick nào).
- Tạo Release và video ngay khi phase 4 xanh, không để cuối.
