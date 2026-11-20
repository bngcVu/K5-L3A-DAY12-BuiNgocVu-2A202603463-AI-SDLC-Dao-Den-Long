# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js), logic tất định 60 tick/giây trong `src/sim/`, có chế độ headless theo Test Contract (đang dùng: **v1.1** từ Phase 2, cập nhật khi đổi phase).

## Lệnh
- Build: `npm install`
- Chạy game: `npm start` (http://localhost:8080)
- Headless: `node src/headless.js --seed 1 --night 1|2|3 --ticks 600 --out out.jsonl`
- Unit test: `npm test`
- **Kiểm chứng toàn bộ (bắt buộc trước khi báo xong):** `./scripts/check.sh`
- Lưu bằng chứng cho phase: `./scripts/check.sh --label phase-N` → `evidence/phase-N/report.md`

## Kiến trúc (không phá)
- `src/sim/` = logic thuần, không import gì của render/âm thanh/DOM. `web/` chỉ đọc state từ `Sim`.
- Bước tick theo đúng 12 bước ghi ở đầu `src/sim/sim.js` (khớp Ticket-02). Bản đồ ở `src/sim/maps.js`; mỗi Đêm là một `Sim` mới. dt cố định 1/60, không dùng đồng hồ thật trong logic.
- Mọi ngẫu nhiên đi qua 1 RNG có seed (`src/sim/rng.js`); id sinh theo thứ tự (S1, S2…). Không `Math.random`/`Date` trong `src/sim`.
- Số liệu nằm ở `src/sim/config.js`, phải khớp `tuning` trong `game.contract.json` (unit test kiểm).
- Phần sáng tạo thêm: chỉ ở `web/`, tắt khi headless, không đổi output contract.

## Quy tắc làm việc
- Spec + tiêu chí nghiệm thu từng phase: `docs/spec-phase-2.md` (mỗi tính năng Phần 3 một dòng + scenario). Đọc spec phase trong `docs/` trước khi code; trích nguyên văn yêu cầu khi lập kế hoạch. Không bịa yêu cầu; chỗ mơ hồ → ghi giả định vào `docs/assumptions.md`.
- Mỗi tính năng mới: thêm ít nhất 1 scenario trong `tests/scenarios/` (dùng skill `run-scenario`), viết scenario/test **trước** khi code.
- **Cấm**: sửa `expect` cho khớp output sai; sửa tay file trong `evidence/`; test luôn đạt; tắt test mà không ghi lý do trong `docs/changes.md`.
- Commit nhỏ, mỗi commit một việc, thông điệp rõ (`feat:`, `fix:`, `test:`, `docs:`).
- Không commit `.env`, API key.
- Windows: dùng Git Bash để chạy `scripts/check.sh`; heredoc dài dễ hỏng quoting → ghi file bằng công cụ Write.

## Lỗi AI đã gặp (thêm khi lặp lại lần 2)
- Tự tính `expect` sai (quên bước chase 1 tick; làm tròn giây còn lại) → luôn dẫn phép tính vào `desc` và đối chiếu với spec, sửa expect chỉ khi phép tính từ spec sai (ghi `docs/changes.md`).
- Runner mẫu giả định POSIX (quote, mã hóa) → xem `docs/changes.md`.
- Ticket mới làm sai giả định/số của phase trước: sửa `config.js` + `game.contract.json` cùng lúc, cập nhật scenario cũ kèm dòng lý do trong `docs/changes.md` (đã làm ở Phase 2).
- Expect nằm ngay biên (khoảng cách đúng 1.0 m, dừng đúng ranh vách) phụ thuộc làm tròn số thực: dịch tình huống ra khỏi biên hoặc dùng `tick_min/tick_max`, đừng sửa mã cho khớp.
- Giữ phím sau khi đáp/đến nơi làm lệch vị trí mong đợi: thả phím trong `inputs.json` khi chỉ muốn kiểm một giai đoạn.
