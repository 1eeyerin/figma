#!/usr/bin/env bash
# Stop 훅: 소스 코드가 docs/보다 최근에 변경됐는데 docs/가 따라가지 못했으면 경고.
# 자동 수정은 하지 않음 — exit 2로 stderr 메시지를 Claude에게 보여주고 다음 턴 판단에 맡긴다.
# auto-commit.sh 다음에 실행되어야 커밋된 최신 상태 기준으로 비교 가능.

cd "$(dirname "$0")/../.." || exit 0

# 추적 대상: 소스 디렉토리 → 관련 docs 매핑
declare -a SRC_DIRS=("mcp-bridge/src" "figma-plugin/src")
declare -a DOC_FILES=("docs/architecture.md" "docs/protocol.md")

last_commit_epoch() {
  # 경로(들)에 대한 가장 최근 커밋 시각(unix epoch). 커밋 이력 없으면 0.
  git log -1 --format=%ct -- "$@" 2>/dev/null || echo 0
}

SRC_EPOCH=$(last_commit_epoch "${SRC_DIRS[@]}")
DOC_EPOCH=$(last_commit_epoch "${DOC_FILES[@]}")

[[ -z "$SRC_EPOCH" ]] && SRC_EPOCH=0
[[ -z "$DOC_EPOCH" ]] && DOC_EPOCH=0

# 소스 커밋 이력이 없으면(아직 한 번도 안 건드림) 점검 불필요
[[ "$SRC_EPOCH" -eq 0 ]] && exit 0

if [[ "$SRC_EPOCH" -gt "$DOC_EPOCH" ]]; then
  # docs보다 최근에 바뀐 소스 커밋들을 사람이 보기 쉽게 나열
  CHANGED_COMMITS=$(git log --since="@${DOC_EPOCH}" --format='- %h %s' -- "${SRC_DIRS[@]}" 2>/dev/null | head -10)

  cat >&2 <<EOF
⚠️  docs/architecture.md, docs/protocol.md 가 최근 소스 변경을 반영하지 못했을 수 있습니다.

docs/ 보다 최근에 mcp-bridge/src 또는 figma-plugin/src 가 변경된 커밋:
${CHANGED_COMMITS}

통신 흐름(아키텍처) 또는 메시지 타입/MCP action 매핑(프로토콜)에 영향이 있다면 docs/architecture.md, docs/protocol.md 갱신을 검토하세요.
EOF
  exit 2
fi

exit 0
