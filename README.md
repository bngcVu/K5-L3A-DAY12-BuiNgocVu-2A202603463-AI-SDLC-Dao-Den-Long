# Đảo Đèn Lồng (Phase 2 — "Ba hòn đảo")

Game 3D góc nhìn thứ ba: **Mây**, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn qua **3 Đêm** (Đảo Bến, Đảo Cau, Đảo Chuông), né **Bóng Mực** và **Gió Lạc**. Logic tất định 60 tick/s ở `src/sim/`, render Three.js ở `web/`.

> Video demo: _(thêm ở Phase 4)_

## Cài đặt và chạy (3 lệnh)

Cần Node.js ≥ 20 (macOS/Linux/Windows).

```bash
npm install        # cài three.js
npm start          # mở http://localhost:8080
npm test           # (tùy chọn) unit test
```

Kiểm chứng đầy đủ (unit test + scenario headless + tất định): `./scripts/check.sh` (cần `python3` hoặc `python`).

## Điều khiển

| Phím | Việc |
|---|---|
| W A S D / mũi tên | Đi (theo hướng camera) |
| Kéo chuột | Xoay camera (độ nhạy trong Cài đặt) |
| Space | Nhảy (chỉ khi chạm đất) |
| Shift | Lướt (14 m/s, 0.2 s, hồi 1.5 s) |
| E | Nạp đom đóm vào đèn chưa sáng gần nhất (trong 2 m) |
| F | Tỏa Sáng: choáng và đẩy lùi Bóng Mực trong 5 m (tốn 3 đom đóm, hồi 3 s) |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |
| R | Chơi lại Đêm |

## Luật & cách tính điểm

- Mang tối đa 10 đom đóm; mỗi đèn cần 10 (nạp nhiều lần được). Thắp hết đèn trước khi hết đêm (300/330/360 s) thì thắng Đêm; hết 3 Ngọn Lửa hoặc hết giờ thì thua và chơi lại Đêm đó.
- Bóng Mực chạm: −1 Ngọn Lửa, rơi nửa số đom đóm, bất tử 1.5 s. Rơi khỏi đảo (Y < −10): −1 Ngọn Lửa, mất hết đom đóm, hồi sinh sau 1 s. Đèn đã sáng tạo vùng an toàn 6 m.
- **Gió Lạc** (Đêm 2, 3) cướp 3 đom đóm khi bạn mang ≥ 5 đom đóm; Tỏa Sáng làm nó bỏ chạy và thả lại số đã cướp. **Bùa Gió** (lá bùa đỏ viền vàng): 10 s chạy nhanh 7.2 m/s và lướt không hồi chiêu. Đêm 2 có bục nhảy (vòng vàng) bắn bạn sang đảo kia; Đêm 3 có tầng, dốc, vách đứng và gió mạnh mỗi 30 s (báo trước 2 s bằng lá bay và âm thanh).
- Điểm: +10 mỗi đom đóm nạp · +100 mỗi đèn thắp · +5 mỗi Bóng Mực trúng Tỏa Sáng · khi thắng +2 mỗi giây còn lại và +50 mỗi Ngọn Lửa. Tổng điểm game là tổng điểm các Đêm đã thắng; thắng Đêm 3 thì tới màn Bình Minh.
- HUD: Ngọn Lửa, đồng hồ mm:ss (đỏ, nhấp nháy ≤ 30 s), đèn k/n và điểm, thanh đom đóm 10 ô, hồi chiêu Lướt/Tỏa Sáng, nhắc "E — Nạp ánh sáng (x/10)", mũi tên tới đèn chưa sáng ở ngoài màn hình.

## Chế độ headless (Test Contract v1.1)

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario s.json] [--inputs i.json] [--snapshot-every 10]      # --night 1 | 2 | 3
```

Khai báo ở [game.contract.json](game.contract.json) (v1.1, tuning = số chuẩn của Ticket-02, khớp `src/sim/config.js`, có unit test so khớp; `fall_enabled: true`). Một Đêm đầy đủ (21.600 tick) chạy ≈ 0.3 s. Tuning chi tiết và các số khác: [docs/spec-phase-2.md](docs/spec-phase-2.md).

Giả định cho chỗ ticket chưa nói rõ: [docs/spec-phase-2.md](docs/spec-phase-2.md) (mục B1–B20; Phase 1: [docs/assumptions.md](docs/assumptions.md)).

## Bằng chứng

- `./scripts/check.sh --label phase-2` → [evidence/phase-2/report.md](evidence/phase-2/report.md): 32 scenario (10 của Phase 1 còn đạt với số chuẩn + 22 mới cho lướt, tỏa sáng, vùng an toàn, rơi/hồi sinh, Gió Lạc, bùa, bục nhảy, vách/dốc Đêm 3, gió, tạm dừng, điểm, bản đồ, hiệu năng) + mỗi case chạy 2 lần so từng byte + 14 unit test. Bằng chứng Phase 1 giữ ở `evidence/phase-1/`.
- Tiêu chí nghiệm thu từng tính năng ↔ scenario: [docs/spec-phase-2.md](docs/spec-phase-2.md).
- Ảnh chụp màn chơi (trình duyệt headless): `evidence/phase-2/screens/night1..3.png`.
- Test cũ phải sửa vì số chuẩn mới, cùng lý do: [docs/changes.md](docs/changes.md). Nhật ký dùng AI: [docs/ai-log.md](docs/ai-log.md).
- CI: `.github/workflows/check.yml` chạy cùng `check.sh` mỗi lần push.

## Sáng tạo của tôi

- **Cá Mây** (Phase 1): vài chú cá trắng tím bơi quanh đảo trong biển mây; chỉ ở `web/`, không đụng headless. _Ở Phase 2 phần này chưa được vẽ lại trên bản client mới._
- Âm thanh do tôi tổng hợp bằng WebAudio (nhạc nền ngũ cung ấm + hiệu ứng), không dùng asset ngoài.
- Bằng chứng phần cũ vẫn đúng: phần thêm nằm hoàn toàn trong `web/`, không import vào `src/sim`; `check.sh` vẫn 100 % đạt và 2 lần chạy giống hệt byte.

## Hạn chế đã biết (trung thực)

- **Chưa đo FPS** (yêu cầu ≥ 30 FPS trung bình ở 1280×720). Chỉ có ảnh chụp từ Chrome headless (render phần mềm), chưa chơi tay toàn bộ 3 Đêm trong trình duyệt thật: menu → intro → kết quả → Bình Minh, Cài đặt (lưu giữa các lần mở), âm thanh và mũi tên chỉ đường **chưa được kiểm bằng tay**.
- Ticket không nêu điểm xuất phát Đêm 3 nên chọn (0,0,−12); các mơ hồ khác ở `docs/spec-phase-2.md` mục B.
- Bóng Mực đuổi theo đường thẳng, không tìm đường: ở Đêm 3 có thể kẹt dưới vách tầng.
- Phát triển trên Windows; macOS/Linux chỉ được CI trên GitHub kiểm.
