#!/bin/bash
# 클라우드 수집 루틴이 원문을 못 읽어 빠뜨린 발표를 이 맥에서 채운다.
# launchd가 매일 부른다 — com.paldyn.ailab.newsfill
set -uo pipefail

REPO="/Users/lwm/vault/dev/company/paldyn/ai-lab"
LOG_DIR="$HOME/Library/Logs/paldyn"
LOG="$LOG_DIR/ailab-newsfill.log"
mkdir -p "$LOG_DIR"

say() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

# nvm으로 깐 node·claude는 launchd의 기본 PATH에 없다
export PATH="/Users/lwm/.nvm/versions/node/v22.22.1/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$REPO" || { say "FATAL 저장소 없음"; exit 1; }

# 남의 작업을 덮지 않는다 — 손대던 것이 있으면 그냥 물러난다
if [ -n "$(git status --porcelain)" ]; then
  say "SKIP 작업 트리가 깨끗하지 않음"
  exit 0
fi

if ! git pull --rebase --quiet origin main; then
  say "FATAL git pull 실패"
  exit 1
fi

say "시작 (HEAD $(git rev-parse --short HEAD))"

PROMPT='이 저장소는 paldyn/ai-lab (ailab.paldyn.com)이다. 클라우드 수집 루틴이 원문을 못 읽어 빠뜨린 발표를 채운다.

절차는 저장소 안에 있다. 시작할 때 세 파일을 처음부터 끝까지 읽어라.

1. CLAUDE.md — 이 저장소의 작업 규칙
2. LOCAL-NEWS-ROUTINE.md — 이 루틴의 전체 지시서다. 그대로 따른다
3. NEWS-ROUTINE.md — 항목 쓰는 법(STEP 2 이하)이 거기 있다

LOCAL-NEWS-ROUTINE.md를 못 읽었으면 아무것도 고치지 말고 멈춘다. 무엇을 못 읽었는지 보고하고 종료한다 — 기억이나 짐작으로 데이터를 건드리지 마라.

빠진 것이 없으면 "보충할 것 없음"만 출력하고 즉시 끝낸다.'

claude -p "$PROMPT" \
  --model claude-opus-5 \
  --allowedTools Bash Read Write Edit Glob Grep WebFetch \
  --add-dir /tmp \
  >> "$LOG" 2>&1
STATUS=$?

if [ $STATUS -ne 0 ]; then
  say "FAIL claude 종료 코드 $STATUS"
  exit $STATUS
fi

# 루틴이 커밋까지 했는지 확인만 한다 — 푸시는 루틴이 한다
say "끝 (HEAD $(git rev-parse --short HEAD))"
