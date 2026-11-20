# Đảo Đèn Lồng (Phase 3 — "Đèn cạn dầu")

Game 3D góc nhìn thứ ba: **Mây**, người giữ đèn nhỏ tuổi, gom đom đóm để thắp và **giữ sáng** các Đèn Lồng Lớn tới bình minh qua **3 Đêm** (Đảo Bến, Đảo Cau, Đảo Chuông), né **Bóng Mực** và **Gió Lạc**. Logic tất định 60 tick/s ở `src/sim/`, render Three.js ở `web/`.

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
| E | Nạp đom đóm vào đèn gần nhất (trong 2 m): thắp đèn tắt hoặc châm dầu đèn đang sáng |
| F | Tỏa Sáng: choáng và đẩy lùi Bóng Mực trong 5 m (tốn 3 đom đóm, hồi 3 s) |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |
| R | Chơi lại Đêm |

## Luật & cách tính điểm

- **Mục tiêu: giữ đảo sáng tới bình minh.** Đêm dài 240/270/300 s. Còn sống lúc hết giờ và còn ít nhất 3/5, 4/6, 5/7 đèn sáng thì thắng; thắp đủ đèn **không** kết thúc Đêm. Hết 3 Ngọn Lửa, hoặc hết giờ mà đèn sáng chưa đủ thì thua (chơi lại Đêm đó).
- **Đèn có dầu** (0–100): thắp lần đầu cần 10 đom đóm (+100 điểm), vừa thắp đầy 100, hao 1/giây. Bấm E ở đèn đang sáng để châm dầu (mỗi đom đóm +10). Hết dầu đèn tắt; thắp lại chỉ cần 5 đom đóm (+40 điểm). Thanh dầu hiện trên đèn; dưới 30 thì đèn nhấp nháy, mất vùng an toàn.
- **Bóng Mực hút dầu:** chúng tìm đèn yếu (dầu < 30), đứng lại hút 5/giây; lại gần trong 6 m hoặc Tỏa Sáng để đuổi chúng. Đèn dầu ≥ 30 có vùng an toàn 6 m.
- **Sức chứa** tăng dần: 10 + 2 × số lần thắp thành công trong Đêm (tối đa 20).
- Bóng Mực chạm: −1 Ngọn Lửa, rơi nửa số đom đóm, bất tử 1.5 s. Rơi khỏi đảo (Y < −10): −1 Ngọn Lửa, mất hết đom đóm, hồi sinh sau 1 s. Đèn đã sáng tạo vùng an toàn 6 m.
- **Gió Lạc** (Đêm 2, 3) cướp 3 đom đóm khi bạn mang ≥ 5 đom đóm; Tỏa Sáng làm nó bỏ chạy và thả lại số đã cướp. **Bùa Gió** (lá bùa đỏ viền vàng): 10 s chạy nhanh 7.2 m/s và lướt không hồi chiêu. Đêm 2 có bục nhảy (vòng vàng) bắn bạn sang đảo kia; Đêm 3 có tầng, dốc, vách đứng và gió mạnh mỗi 30 s (báo trước 2 s bằng lá bay và âm thanh).
- Điểm: +5 mỗi đom đóm nạp (thắp, thắp lại, châm dầu) · +100 thắp lần đầu · +40 thắp lại · +5 mỗi Bóng Mực trúng Tỏa Sáng (+15 nếu nó đang hút dầu) · khi thắng ở bình minh: +50 + phần nguyên dầu mỗi đèn đang sáng, +50 mỗi Ngọn Lửa. Tổng điểm game là tổng điểm các Đêm đã thắng; thắng Đêm 3 thì tới màn Bình Minh. Cài đặt có **Bảng màu dễ phân biệt** (viền Bóng Mực xanh lam, cảnh báo trắng + ⚠; đèn tắt xẹp và rách giấy).
- HUD: Ngọn Lửa, đồng hồ mm:ss (đỏ, nhấp nháy ≤ 30 s), đèn k/n (cần m) và điểm, thanh đom đóm (đang mang / sức chứa), hồi chiêu Lướt/Tỏa Sáng, nhắc "E — Nạp ánh sáng (x/10)", mũi tên tới đèn chưa sáng ở ngoài màn hình.

## Chế độ headless (Test Contract v1.2)

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario s.json] [--inputs i.json] [--snapshot-every 10]      # --night 1 | 2 | 3
```

Khai báo ở [game.contract.json](game.contract.json) (v1.2, tuning = số chuẩn Ticket-02 + khóa nhiên liệu của Ticket-03, khớp `src/sim/config.js`, có unit test so khớp; `fall_enabled: true`). Một Đêm đầy đủ chạy ≈ 0.3 s (≤ 30 s theo yêu cầu). Tuning chi tiết và các số khác: [docs/spec-phase-2.md](docs/spec-phase-2.md).

Giả định cho chỗ ticket chưa nói rõ: Phase 3 [spec/phase-3.md](spec/phase-3.md) (C1–C15), Phase 2 [docs/spec-phase-2.md](docs/spec-phase-2.md) (B1–B20), Phase 1 [docs/assumptions.md](docs/assumptions.md). **Quyết định thiết kế Phase 3:** [adr/0001-den-can-dau-va-luat-thang.md](adr/0001-den-can-dau-va-luat-thang.md). **Breaking changes:** [CHANGELOG.md](CHANGELOG.md).

## Bằng chứng

- `./scripts/check.sh --label phase-3` → [evidence/phase-3/report.md](evidence/phase-3/report.md): 46 scenario (Phase 1–2 còn hiệu lực + 15 `p3_*` cho nhiên liệu, thắp lại, `drain`, thắng ở bình minh, sức chứa) + mỗi case chạy 2 lần so từng byte + 19 unit test. Bằng chứng Phase 1–2 giữ ở `evidence/phase-1/`, `evidence/phase-2/`.
- Tiêu chí nghiệm thu ↔ scenario: [spec/phase-3.md](spec/phase-3.md) (Phase 2: [docs/spec-phase-2.md](docs/spec-phase-2.md)).
- Ảnh chụp màn chơi (trình duyệt headless): `evidence/phase-2/screens/night1..3.png`, `evidence/phase-3/screens/fuel.png` (thanh dầu, đèn yếu, Bóng Mực đang hút, sức chứa 6/16).
- Test cũ phải sửa/xóa vì luật mới, cùng lý do: [docs/changes.md](docs/changes.md). Nhật ký dùng AI: [docs/ai-log.md](docs/ai-log.md).
- CI: `.github/workflows/check.yml` chạy cùng `check.sh` mỗi lần push.

## Sáng tạo của tôi

- **Cá Mây** (Phase 1): vài chú cá trắng tím bơi quanh đảo trong biển mây; chỉ ở `web/`, không đụng headless. _Ở Phase 2 phần này chưa được vẽ lại trên bản client mới._
- Âm thanh do tôi tổng hợp bằng WebAudio (nhạc nền ngũ cung ấm + hiệu ứng), không dùng asset ngoài.
- Bằng chứng phần cũ vẫn đúng: phần thêm nằm hoàn toàn trong `web/`, không import vào `src/sim`; `check.sh` vẫn 100 % đạt và 2 lần chạy giống hệt byte.

## Hạn chế đã biết (trung thực)

- **Chưa đo FPS** (yêu cầu ≥ 30 FPS trung bình ở 1280×720). Chỉ có ảnh chụp từ Chrome headless (render phần mềm), chưa chơi tay toàn bộ 3 Đêm trong trình duyệt thật: menu → intro → kết quả → Bình Minh, Cài đặt (lưu giữa các lần mở), âm thanh và mũi tên chỉ đường **chưa được kiểm bằng tay**.
- Chế độ mù màu, nhấp nháy 1 Hz và thanh dầu mới chỉ xem qua một ảnh chụp headless; **chưa kiểm tay** trong trình duyệt thật.
- Ticket không nêu điểm xuất phát Đêm 3 nên chọn (0,0,−12); các mơ hồ khác ở `docs/spec-phase-2.md` mục B.
- Bóng Mực đuổi theo đường thẳng, không tìm đường: ở Đêm 3 có thể kẹt dưới vách tầng.
- Phát triển trên Windows; macOS/Linux chỉ được CI trên GitHub kiểm.
