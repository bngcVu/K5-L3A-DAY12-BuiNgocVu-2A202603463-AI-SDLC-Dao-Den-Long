# Nhật ký dùng AI — Phase 1

- Công cụ: Claude Code (Sonnet 5.5) trong VS Code. Skill dùng: `superpowers:test-driven-development` (scenario/unit test viết trước, thấy đỏ rồi mới viết sim), `run-scenario` (quy trình trong `.claude/skills/run-scenario`), hook Stop (`.claude/hooks/stop-gate.sh`) chặn kết thúc khi `check.sh` đỏ.
- Quy trình: đọc `docs/phase-1.md` + harness mẫu → copy harness ra gốc repo → viết `game.contract.json`, 7 scenario mới + 8 unit test (đỏ: thiếu `src/sim`) → viết `sim` + `headless` → 10/10 scenario xanh → client Three.js → chụp ảnh headless Chrome → README/giả định.
- Token/chi phí: chưa đo chính xác (không có số liệu từ công cụ); ước lượng thô ~150–200k token cho Phase 1. Tiết kiệm: không dùng subagent, đọc từng tài liệu một lần, sim viết một lần ~250 dòng, client một file.
- Lỗi AI đã gặp: (1) tự tính `expect` sai hai chỗ (xem `docs/changes.md`), phát hiện nhờ scenario FAIL rồi tính lại từ spec; (2) heredoc bash dài hỏng quoting trên Windows → chuyển sang công cụ Write; (3) `Object.assign` vào thuộc tính `position` chỉ-đọc của Three.js làm client chết trắng màn hình, phát hiện nhờ đọc console của Chrome headless.
- Chưa làm / ghi chú: chưa đo token thật; chưa có cơ chế reviewer agent riêng.

# Phase 2

- Quy trình: đọc `docs/phase-2.md` → bảng tiêu chí `docs/spec-phase-2.md` → viết 24 scenario + 14 unit test **trước** (đỏ: sim còn v1.0) → viết `maps.js` + `sim.js` mới → sửa test sai (xem `docs/changes.md`) → client 3 Đêm → ảnh chụp headless Chrome → `check.sh --label phase-2`.
- Token/chi phí: chưa đo chính xác; ước lượng thô ~250–300k token cho Phase 2 (viết lại sim ~480 dòng, client ~330 dòng, sinh scenario bằng một script Node). Tiết kiệm: sinh scenario bằng script thay vì viết tay từng file, không dùng subagent, một lần đọc spec.
- Lỗi AI/test đã gặp: (1) hai scenario sai ở phía test (hit rơi đúng biên 1.0 m; giữ phím sau khi đáp bục) → phát hiện nhờ FAIL rồi tính lại từ ticket, không sửa mã; (2) `.gitignore` `skills/` từng nuốt `.claude/skills/` (Phase 1) → neo `/skills/`; (3) mơ hồ của ticket (điểm xuất phát Đêm 3, quy ước góc, kiểu `invuln`) → ghi `docs/spec-phase-2.md` mục B1–B20.
- Chưa làm: đo FPS thật ≥ 30 ở 1280×720; kiểm tay âm thanh/cài đặt/menu trong trình duyệt thật.

# Phase 3

- Quy trình: đọc `docs/phase-3.md` → liệt kê luật bị THAY THẾ → viết 15 scenario `p3_*` + 5 unit test **trước** (đỏ) → ADR + CHANGELOG → sửa `sim.js` (bước 2/5/6/8/11) → mở rộng runner cho v1.2 → sửa/xóa test cũ có lý do → client (thanh dầu, mù màu, HUD) → ảnh chụp.
- Token/chi phí: chưa đo chính xác; ước lượng thô ~150k token (tận dụng khung Phase 2, sửa bằng script Python thay vì viết lại file). Tiết kiệm: patch có assert thay vì đọc lại file lớn; sinh scenario bằng script Node.
- Lỗi AI/quy trình đã gặp: (1) heredoc bash dài lại hỏng quoting trên Windows (lần 2) → quy tắc ghi vào AGENTS.md: ghi script bằng công cụ Write rồi chạy; (2) scenario `p3_pulse_on_draining_shade_scores_15` ban đầu đặt pulse sau khi bóng đã đổi `drain→chase` (Mây trong 6 m) → phát hiện khi tính tay thứ tự bước 7 trước bước 8, sửa trong test trước khi chạy; (3) `docs/` bị `.gitignore` chặn file mới → ghi tài liệu mới ở `adr/`, `spec/`.
- Chưa làm: kiểm tay chế độ mù màu và nhấp nháy 1 Hz trong trình duyệt thật; đo FPS.

# Phase 4

- Quy trình: đọc `docs/phase-4.md` → viết 8 unit test **trước** (đỏ: thiếu `leaderboard`, `soak`, `bench-scene`, `bench-stats`) → module thuần + cờ `bench` → soak (đo, chỉnh khởi động nóng) → server API + `--export-leaderboard` → `bench/bench.js` (Chrome qua dòng lệnh) → viết lại `web/main.js` + `index.html` (tiếp cận, đổi phím, bảng xếp hạng, bench) → chạy bench/soak thật → LICENSE/CREDITS/Docker/README/retro.
- Token/chi phí: chưa đo chính xác; ước lượng thô ~300–350k token (viết lại client ~500 dòng là khoản lớn nhất).
- Lỗi AI/test: (1) Σdt sai trong test thống kê (90 thay vì 140) → unit đỏ, sửa test; (2) soak RSS lạnh 1.15× sát ngưỡng → chạy lặp, đo heap, thêm khởi động nóng; (3) heredoc quoting hỏng thêm lần nữa → Write + script.
- Chưa làm: kiểm tay giao diện mới (đổi phím, nhập tên, giảm chuyển động…), tạo Release/video, dựng thử Docker.

