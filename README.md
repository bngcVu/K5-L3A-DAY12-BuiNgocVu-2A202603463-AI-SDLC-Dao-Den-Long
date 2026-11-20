# Đảo Đèn Lồng (Phase 1)

Game 3D góc nhìn thứ ba: **Mây**, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại 5 Đèn Lồng Lớn trên Đảo Bến và tỏa sáng xua **Bóng Mực**. Logic tất định 60 tick/s nằm ở `src/sim/`, render bằng Three.js ở `web/`.

> Video demo: _(thêm ở Phase 4)_

## Cài đặt và chạy (3 lệnh)

Cần Node.js ≥ 20 (macOS/Linux/Windows).

```bash
npm install        # cài three.js
npm start          # mở http://localhost:8080
npm test           # (tùy chọn) unit test
```

Kiểm chứng đầy đủ (unit test + scenario headless + tất định): `./scripts/check.sh` (cần `python3`).

## Điều khiển

| Phím | Việc |
|---|---|
| W A S D | Đi (theo hướng camera) |
| Kéo chuột | Xoay camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất (trong 2.5 m) |
| F | Tỏa sáng: xua Bóng Mực (tốn 2 đom đóm, hồi 1.5 s) |
| R | Chơi lại (cũng có nút trên màn hình thắng/thua) |

## Luật & cách tính điểm

- Nhặt đom đóm: đi lại gần (≤ 1.2 m). Mang tối đa 10. Mỗi đèn cần 10 đom đóm để sáng. Thắp đủ 5 đèn trong 300 s thì **thắng**; hết đêm hoặc hết 3 ngọn lửa thì **thua**.
- Bóng Mực đuổi Mây (chậm hơn Mây), chạm thì mất 1 ngọn lửa và rơi một nửa số đom đóm đang mang, bất tử 1.5 s. Chúng không vào được vòng 4 m quanh đèn.
- Điểm: +10 mỗi đom đóm nhặt · +100 mỗi đèn thắp · +20 mỗi Bóng Mực bị choáng · khi thắng: +1 mỗi giây còn lại, +50 mỗi ngọn lửa còn lại.
- HUD: ngọn lửa, đom đóm đang mang, đèn đã sáng, thời gian đêm, điểm. Đảo sáng dần và ấm lên theo số đèn đã thắp.

## Chế độ headless (Test Contract v1.0)

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```

Khai báo trong [game.contract.json](game.contract.json). Tuning thực tế (khớp `src/sim/config.js`): tốc độ 6 m/s, mang 10, đèn cần 10, 5 đèn, nhặt 1.2 m, tương tác 2.5 m, pulse tốn 2 / bán kính 6 m / choáng 3 s / đẩy 3 m / hồi 1.5 s, đêm 300 s, 3 ngọn lửa, bất tử 1.5 s, rơi 50 % đom đóm, vòng an toàn 4 m, Bóng Mực 3.5 m/s với bán kính chạm 1 m, `fall_enabled=false` (rìa đảo là tường vô hình nên không có rơi/event `fall`). Điểm: 10 / 100 / 20 / 1 / 50.

Giả định cho phần PRD còn mơ hồ: [docs/assumptions.md](docs/assumptions.md).

## Bằng chứng

- `./scripts/check.sh --label phase-1` → [evidence/phase-1/report.md](evidence/phase-1/report.md): 10 scenario (nhặt, nạp đèn, pulse, bị chạm, thua hết lửa, thua dawn, thắng, safe radius, định dạng/exit 2, chạy mặc định) + mỗi case chạy 2 lần so từng byte (tất định) + 8 unit test.
- Ảnh chụp màn chơi: `evidence/phase-1/screens/`.
- Thay đổi test/harness có lý do: [docs/changes.md](docs/changes.md). Nhật ký dùng AI: [docs/ai-log.md](docs/ai-log.md).
- CI: `.github/workflows/check.yml` chạy cùng `check.sh` mỗi lần push.

## Sáng tạo của tôi

- **Cá Mây**: vài chú cá trắng tím bơi quanh đảo trong biển mây, cộng âm chuông nhỏ (WebAudio) khi nhặt/nạp/thắp đèn và lời dẫn truyện ngắn đầu màn.
- Bằng chứng phần cũ vẫn đúng: chỉ nằm trong `web/main.js` (không import vào `src/sim`), nên output headless không đổi; `check.sh` vẫn 100 % đạt và 2 lần chạy giống hệt byte.

## Hạn chế đã biết (trung thực)

- Chưa có kiểm thử tự động cho phần đồ họa; chỉ có ảnh chụp trình duyệt headless.
- Chưa chạy thử trên macOS/Linux thật (phát triển trên Windows); runner mẫu đã được vá cho Windows, xem `docs/changes.md`.
