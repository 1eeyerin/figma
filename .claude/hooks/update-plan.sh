#!/usr/bin/env bash
# 에이전트가 _workspace/*.md 파일을 생성할 때 PLAN.md의 해당 체크박스를 자동 체크.
# PostToolUse 훅으로 동작: Write/Edit 도구가 _workspace/ 경로에 실행될 때 트리거.

PLAN="$(dirname "$(dirname "$0")")/../PLAN.md"
WORKSPACE="$(dirname "$(dirname "$0")")/../_workspace"

[[ ! -f "$PLAN" ]] && exit 0

check_item() {
  local pattern="$1"
  # '- [ ] ...' 에서 pattern에 매칭되는 줄을 '- [x] ...'로 변경
  sed -i '' "s/- \[ \] \(.*${pattern}.*\)/- [x] \1/" "$PLAN"
}

# _workspace/ 파일 존재 여부에 따라 체크
[[ -f "$WORKSPACE/01_spec.md" ]] && check_item "01_spec\|명세\|spec"
[[ -f "$WORKSPACE/02_bridge_done.md" ]] && {
  check_item "ws-bridge\|index\.ts\|mcp-bridge/src"
  check_item "package\.json"
  check_item "tsconfig"
}
[[ -f "$WORKSPACE/03_plugin_done.md" ]] && {
  check_item "manifest\.json"
  check_item "code\.ts"
  check_item "ui\.html"
}
[[ -f "$WORKSPACE/04_qa_report.md" ]] && {
  check_item "통합 검증\|qa_report\|검증 완료"
}

# 소스 파일 생성 여부로도 체크
[[ -f "$(dirname "$(dirname "$0")")/../mcp-bridge/src/index.ts" ]] && check_item "index\.ts 진입점"
[[ -f "$(dirname "$(dirname "$0")")/../mcp-bridge/src/ws-bridge.ts" ]] && check_item "ws-bridge\.ts"
[[ -f "$(dirname "$(dirname "$0")")/../mcp-bridge/package.json" ]] && check_item "package\.json 생성"
[[ -f "$(dirname "$(dirname "$0")")/../mcp-bridge/tsconfig.json" ]] && check_item "tsconfig"
[[ -f "$(dirname "$(dirname "$0")")/../figma-plugin/manifest.json" ]] && check_item "manifest\.json"
[[ -f "$(dirname "$(dirname "$0")")/../figma-plugin/code.ts" ]] && check_item "code\.ts"
[[ -f "$(dirname "$(dirname "$0")")/../figma-plugin/ui.html" ]] && check_item "ui\.html"

exit 0
