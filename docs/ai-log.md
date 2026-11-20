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
