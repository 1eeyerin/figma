#!/usr/bin/env bash
# Claude가 한 턴을 끝낼 때(Stop 훅) 변경사항이 있으면 자동 커밋.
# claude -p 로 diff를 요약해 커밋 메시지를 생성한다.
# 루프 방지: AUTO_COMMIT_RUNNING 환경변수가 설정된 경우 즉시 종료.

cd "$(dirname "$0")/../.." || exit 0

# 루프 방지 가드
[[ -n "$AUTO_COMMIT_RUNNING" ]] && exit 0

# 변경사항 없으면 종료
git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]] && exit 0

git add -A

DIFF_STAT=$(git diff --cached --stat)
DIFF_CONTENT=$(git diff --cached -- . ':(exclude)*.lock' ':(exclude)package-lock.json' | head -200)

PROMPT="아래는 git diff 결과야. 이 변경사항을 보고 한국어로 커밋 메시지 한 줄만 작성해줘.
- 형식: <type>: <내용> (type은 feat/fix/refactor/chore/docs 중 하나)
- 구체적으로 무엇을 했는지 서술
- 반드시 JSON 오브젝트 하나만 출력: {\"message\": \"<커밋 메시지>\"}
- 다른 텍스트, 설명, 마크다운 없이 JSON만 출력

--- diff stat ---
${DIFF_STAT}

--- diff content ---
${DIFF_CONTENT}"

RAW=$(AUTO_COMMIT_RUNNING=1 claude -p "$PROMPT" --output-format json 2>/dev/null)
# json 출력의 result 필드 → 거기서 message 키 추출
MSG=$(echo "$RAW" | python3 -c "
import sys, json
try:
    outer = json.load(sys.stdin)
    # claude --output-format json 의 result 필드가 문자열
    inner_str = outer.get('result', '')
    # inner_str 자체가 JSON 오브젝트 형태
    inner = json.loads(inner_str.strip())
    print(inner.get('message', ''))
except Exception:
    pass
" 2>/dev/null | tr -d '\n' | head -c 200)

# claude 호출 실패 시 fallback
if [[ -z "$MSG" ]]; then
  CHANGED=$(git diff --cached --name-only | head -3 | tr '\n' ' ')
  MSG="auto: ${CHANGED:-변경사항}"
fi

git commit -m "$MSG"
