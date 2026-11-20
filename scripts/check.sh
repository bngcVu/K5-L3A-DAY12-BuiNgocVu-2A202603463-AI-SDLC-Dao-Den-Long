#!/usr/bin/env bash
# Một lệnh kiểm chứng toàn bộ: unit test + scenario headless + tính tất định.
# Dùng bởi: người, Stop hook, CI.   Ví dụ: ./scripts/check.sh --label phase-1
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) Unit test — ĐẶT lệnh theo stack của bạn (vd: "npm test", "pytest -q", "cargo test")
UNIT_TEST_CMD="${UNIT_TEST_CMD:-node --test tests/unit/*.test.js}"
PY=python3; command -v python3 >/dev/null 2>&1 && python3 -c 'pass' 2>/dev/null || PY=python
if [ -n "$UNIT_TEST_CMD" ]; then
  echo "[check] unit test: $UNIT_TEST_CMD"
  eval "$UNIT_TEST_CMD"
else
  echo "[check] CẢNH BÁO: chưa cấu hình UNIT_TEST_CMD trong scripts/check.sh"
fi

# 2) Scenario headless theo Test Contract (+ chạy 2 lần so tính tất định)
$PY tools/run_scenarios.py "$@"
