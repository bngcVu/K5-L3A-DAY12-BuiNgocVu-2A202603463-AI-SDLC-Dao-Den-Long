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
