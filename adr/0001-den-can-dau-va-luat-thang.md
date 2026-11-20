# ADR-0001 — Nhiên liệu đèn và luật thắng "giữ sáng tới bình minh" (Ticket-03)

- **Trạng thái:** chấp nhận · **Ngày:** 2026-11-20 · **Contract:** v1.1 → v1.2
- **Thay thế:** luật Phase 1/2 "đèn đã sáng là xong" và "thắp đủ đèn thì thắng ngay".

## Bối cảnh

Playtest: người giỏi thắp hết đèn trong 2 phút rồi game dừng, cuối Đêm thiếu căng thẳng. Ticket-03 đổi mục tiêu từ "thắp hết" sang "giữ đảo sáng tới bình minh": đèn có dầu, hao dần, bị Bóng Mực hút, phải châm thêm.

## Quyết định

### 1. Mô hình trạng thái của đèn

Trước (Phase 1–2): `lit: bool`, một chiều (chưa sáng → sáng, mãi mãi).

Sau (Phase 3): mỗi đèn có `lit`, `fuel`, `ever_lit`, `relit_count`, `deposited`.

```
          nạp 10 (lần đầu) / 5 (đã từng sáng)
 TẮT ───────────────────────────────────────────▶ SÁNG (fuel = 100)
 (fuel 0, deposited tích lũy)                        │  hao 1/s, bị hút +5/s mỗi Bóng Mực
   ▲                                                 │  châm dầu: fuel += 10 × used
   │            fuel ≤ 0: lantern_out                │
   └───────── deposited = 0, ever_lit = true ◀───────┘
```

- `ever_lit` quyết định giá thắp: 10 (lần đầu, +100 điểm) hoặc 5 (thắp lại, +40 điểm).
- Đèn sáng **vẫn nhận đom đóm** (châm dầu), đèn đầy dầu thì không được chọn.
- **Vùng an toàn là hàm của dầu:** `lit && fuel ≥ 30` (đúng 30 vẫn còn). Đèn yếu (`lit && fuel < 30`) là mồi của Bóng Mực.
- **Dầu tính bằng số nguyên đơn vị 1/60** (`fuel_unit = 60`): 1 tick hao đúng 1 đơn vị, hút 5 đơn vị/tick/con. Chỉ làm tròn (1 chữ số) khi ghi snapshot và event. Lý do: ticket yêu cầu tránh sai số số thực; cộng/trừ số nguyên cho kết quả giống hệt giữa hai lần chạy và giữa các máy.

### 2. Bóng Mực hút dầu

Thêm trạng thái `drain`. Máy trạng thái: `wander` → (đèn yếu trong ≤2 m) `drain` → `chase` (Mây vào 6 m) / `stunned` (Tỏa Sáng) / `wander` (đèn tắt, dầu ≥ 30, hoặc >2 m).

- `wander` có mục tiêu: đèn yếu gần nhất (đồng hạng: id nhỏ), không có thì đèn tắt gần nhất, không có nữa thì lang thang ngẫu nhiên như Phase 2. Bóng `chase` không đổi mục tiêu.
- Hút xảy ra ở **bước 2** của tick (cùng chỗ với hao), nên "đèn fuel ≤ 0 tắt" xảy ra ngay sau bước 2, trước mọi tương tác của tick đó.
- Châm dầu lên ≥ 30 khi có Bóng Mực trong 6 m: dùng lại cơ chế đẩy-ra-trong-30-tick của "đèn vừa thắp" (một cơ chế `evict` duy nhất, kích hoạt bất cứ khi nào bóng nằm trong vùng an toàn đang hoạt động).

### 3. Luật thắng

Bỏ thắng sớm. Bước "xét thắng/thua" (bước 11) chạy sau mọi cập nhật:

1. hết Ngọn Lửa → thua `no_flames` (luôn đứng đầu, kể cả tick bình minh);
2. hết giờ và `số đèn sáng ≥ ceil(0.6 × tổng)` (3/5, 4/6, 5/7) → thắng `dawn_survived`, cộng điểm bình minh;
3. hết giờ mà dưới ngưỡng → thua `dawn`.

Thời gian Đêm rút xuống 240/270/300 s để giữ nhịp căng.

### 4. Sức chứa và điểm

`capacity = min(20, 10 + 2 × successful_lights)`, đếm cả thắp lại, đặt sẵn bằng scenario không tính, đặt lại mỗi Đêm (mỗi Đêm là một `Sim` mới). Điểm: +5/đom đóm nạp (thắp, thắp lại, châm), +100 thắp lần đầu, +40 thắp lại, +5 mỗi bóng trúng Tỏa Sáng (+15 nếu nó đang `drain`), bình minh: +50 + floor(fuel) mỗi đèn sáng và +50 mỗi Ngọn Lửa; bỏ thưởng thời gian.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Dầu là số thực (giây) | Cộng dồn 1/60 mỗi tick sinh sai số, đèn tắt lệch tick giữa các lần chạy/nền tảng |
| Vùng an toàn là cờ tách riêng (`safe: bool`) | Dễ lệch với `fuel`; suy ra từ `fuel ≥ 30` thì không thể sai khác nhau |
| Thêm tham số `win_condition` chọn luật cũ/mới | Ticket nói rõ **thay thế**; giữ hai luật làm đôi số test và đầu ra |
| Bóng `drain` tự quay về `wander` khi có Mây trong 12 m | Ticket định nghĩa ngưỡng chuyển sang `chase` là 6 m |

## Hệ quả

- **Breaking:** `lantern_lit` thêm `relight`; `game_over.reason` mất `all_lit`, thêm `dawn_survived`; điểm và thời gian Đêm đổi; snapshot thêm trường (xem [CHANGELOG.md](../CHANGELOG.md)).
- Test cũ bị luật mới làm sai đã được sửa hoặc xóa kèm lý do trong [docs/changes.md](../docs/changes.md); tiêu chí nghiệm thu mới ở [spec/phase-3.md](../spec/phase-3.md).
- Mã: `src/sim/sim.js` (bước 2, 5, 6, 8, 11), `src/sim/config.js` (`TUNING` v1.2), `src/sim/validate.js` (scenario v1.2).
