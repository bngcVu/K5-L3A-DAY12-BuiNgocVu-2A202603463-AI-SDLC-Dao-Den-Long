---
name: run-scenario
description: Viết và chạy scenario headless theo Test Contract, kiểm định dạng JSONL, tính tất định và lưu bằng chứng. Dùng khi thêm/sửa tính năng gameplay, khi cần chứng minh một yêu cầu, khi contract đổi phiên bản, hoặc trước khi gắn tag phase.
---

# run-scenario

## Chạy
```bash
./scripts/check.sh                       # tất cả: unit test + scenario + tất định
python3 tools/run_scenarios.py -k pulse  # chỉ case có "pulse" trong tên
./scripts/check.sh --label phase-2       # lưu bằng chứng vào evidence/phase-2/
```
Runner đọc `headless_cmd` và `contract_version` từ `game.contract.json`, chạy mỗi case **2 lần** và so từng byte, kiểm định dạng theo contract (v1.0/v1.1), rồi kiểm `expect`. Báo cáo: `evidence/<label>/report.md` (có commit hash).

## Thêm một scenario
Tạo `tests/scenarios/<pN>_<việc>/`:
- `case.json`: `requirement` (trích yêu cầu nào), `desc`, `seed`, `night`, `ticks`, `snapshot_every`, `expect`; tùy chọn `exit_code`, `max_seconds`, `min_version`, `determinism: false`.
- `scenario.json`, `inputs.json`: đúng định dạng contract (mục C, D).

`expect` hỗ trợ:
```json
{
  "events":   [{ "name": "deposit", "tick": 2, "data": { "lantern_id": "L1" }, "count": 1 }],
  "no_events": ["player_hit"],
  "end":      { "state": "won" },
  "snapshots": [{ "tick": 60, "path": "lanterns[id=L1].lit", "equals": true },
                { "tick": 60, "path": "player.pos", "equals": [0, 0, 6], "tol": 0.01 },
                { "tick": 60, "path": "score", "min": 100 }]
}
```
`data`/`end` là so khớp tập con. `tick_min`/`tick_max` để cho phép khoảng.

## Quy tắc tính giá trị mong đợi
1. Tính **từ spec**, ghi phép tính vào `desc` (vd "6 m/s × 1 s = 6 m").
2. Nhớ mô hình tick: input ở tick k → sự kiện ghi tick k+1.
3. Dựng tình huống tối giản: `random_motes:false`, `random_shades:false`, chỉ đặt thực thể cần thiết.
4. Case FAIL → sửa **mã**. Chỉ sửa `expect` khi spec đổi; ghi lý do và trích dẫn vào `docs/changes.md`.
5. Không sửa tay file `.jsonl` trong `evidence/`.

## Khi đổi phase
- Đổi `contract_version` → runner tự kiểm thêm trường v1.1.
- Case cũ bị luật mới làm sai: sửa hoặc xóa, kèm một dòng lý do trong `docs/changes.md`.
- Chạy `./scripts/check.sh --label phase-N` rồi commit thư mục `evidence/phase-N/` trước khi gắn tag.

## Gợi ý từ Phase 2 (v1.1)
- Đặt `min_version: "1.1"`, `night: 1|2|3` trong `case.json` cho case dùng tính năng mới. Scenario v1.1: `random_drifters`, `wind_enabled`, `drifters[]`, `charms[]`, `player.{invuln_ticks,dash_cd_ticks,pulse_cd_ticks,charm_ticks}`, `shades[].{state,state_ticks_left}`.
- Tắt mọi nguồn ngẫu nhiên không liên quan: `random_motes/shades/drifters:false`, `wind_enabled:false`, `motes:[]`, `shades:[]`, `charms:[]`.
- Tick bắt đầu hành vi: input ở bước k → event `tick = k+1`. Tránh đặt expect đúng biên khoảng cách; dùng `tick_min/tick_max` khi cần.
- Case hiệu năng: `max_seconds` (vd Đêm đầy đủ 21.600 tick ≤ 30 s).

## Gợi ý từ Phase 3 (v1.2)
- `min_version: "1.2"` cho case dùng dầu/`drain`. Scenario: `lanterns[].{lit,fuel,ever_lit}` (đèn `lit:true` không `fuel` → 100), `player.successful_lights`, `shades[].{state:"drain",target_lantern_id}`.
- Khi tính tay dầu: mỗi tick hao 1 đơn vị (1/60 fuel), mỗi bóng đang hút thêm 5 đơn vị; hao/hút xảy ra ở bước 2, **trước** tương tác của tick đó. Đèn sáng sau `lantern_lit` còn 100 và hao từ tick kế.
- Đo thắng/thua ở bình minh: tick cuối = `time_left_s × 60`; điểm bình minh dùng fuel sau mọi hao của tick đó.
