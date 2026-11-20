#!/usr/bin/env bash
# Stop hook: không cho agent kết thúc lượt khi scripts/check.sh đang đỏ.
# Chặn tối đa 3 lần liên tiếp (tránh vòng lặp vô hạn); xanh thì reset bộ đếm.
INPUT=$(cat)
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f game.contract.json ] || exit 0            # chưa có contract: giai đoạn dựng repo
COUNT_F=.claude/.stop-gate-count

# Không có thay đổi nào ngoài evidence/ thì không cần chạy lại
if git rev-parse --git-dir >/dev/null 2>&1 && \
   [ -z "$(git status --porcelain -- . ':(exclude)evidence' ':(exclude).claude/.stop-gate-count')" ] && \
   ! echo "$INPUT" | grep -q '"stop_hook_active": *true'; then
  exit 0
fi

OUT=$(./scripts/check.sh 2>&1); RC=$?
if [ $RC -eq 0 ]; then rm -f "$COUNT_F"; exit 0; fi

N=$(( $(cat "$COUNT_F" 2>/dev/null || echo 0) + 1 ))
if [ "$N" -gt 3 ]; then
  rm -f "$COUNT_F"
  echo "stop-gate: đã chặn 3 lần, vẫn đỏ. Cho dừng — hãy báo người dùng rõ phần nào CHƯA ĐẠT." >&2
  exit 0
fi
echo "$N" > "$COUNT_F"
{
  echo "Kiểm chứng đang ĐỎ (scripts/check.sh exit $RC, lần chặn $N/3). Chưa được kết thúc."
  echo "Sửa mã cho đúng yêu cầu. KHÔNG sửa expect/test cho khớp output sai, KHÔNG sửa tay file evidence."
  echo "--- 40 dòng cuối ---"
  echo "$OUT" | tail -40
} >&2
exit 2
