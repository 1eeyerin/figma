#!/usr/bin/env bash
# Claude가 한 턴을 끝낼 때(Stop 훅) 변경사항이 있으면 자동 커밋.
# _workspace/의 완료 파일명으로 커밋 메시지를 자동 생성.

cd /Users/yerinlee/figma || exit 0

# 변경사항 없으면 종료
git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]] && exit 0

# 커밋 메시지 자동 생성: 완료된 단계 파일 기준
MSG="auto: "
[[ -f "_workspace/01_spec.md" ]]       && MSG+="명세 작성 "
[[ -f "_workspace/02_bridge_done.md" ]] && MSG+="브릿지 구현 "
[[ -f "_workspace/03_plugin_done.md" ]] && MSG+="플러그인 구현 "
[[ -f "_workspace/04_qa_report.md" ]]  && MSG+="QA 검증 "

# 일반 파일 변경 감지 (위 조건 없을 때)
if [[ "$MSG" == "auto: " ]]; then
  CHANGED=$(git diff --name-only HEAD 2>/dev/null | head -3 | tr '\n' ' ')
  [[ -z "$CHANGED" ]] && CHANGED=$(git ls-files --others --exclude-standard | head -3 | tr '\n' ' ')
  MSG+="${CHANGED:-변경사항}"
fi

git add -A
git commit -m "${MSG% }"
