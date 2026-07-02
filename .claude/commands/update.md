---
description: "figma-bridge 로컬 마켓플레이스를 최신 코드로 갱신하고 Claude Code 등록을 동기화한다."
---

# figma-bridge 업데이트

로컬 마켓플레이스는 클론된 워킹 디렉토리를 그대로 참조한다. `git pull`만으로는 Claude Code 등록 내용이 갱신되지 않으므로 아래 순서를 따른다.

1. 최신 코드 받기 (현재 작업 디렉토리가 figma-bridge 레포라고 가정)

```bash
git pull
```

2. 아래 명령으로 빌드·마켓플레이스 갱신·플러그인 업데이트를 한 번에 처리한다 (내부 동작은 [scripts/claude-plugin.mjs](../../scripts/claude-plugin.mjs) 참고)

```bash
pnpm run claude:update
```

3. 아래 사항을 확인하고 필요하면 사용자에게 안내하라

- **버전 자동 갱신**: `pnpm run build`가 `.claude-plugin/plugin.json`, `marketplace.json`의 patch 버전을 자동으로 올린다(`scripts/bump-plugin-version.mjs`). 버전 변경 여부로 업데이트 유무를 판단한다.
- **MCP 서버 변경 시 재시작 필수**: MCP 서버는 세션 시작 시 1회만 기동되므로, `packages/figma-bridge-mcp/` 변경분을 반영하려면 빌드 후 **Claude Code 재시작**이 필요하다. 재시작이 필요하면 사용자에게 명확히 알려라.
- **스킬만 변경된 경우**: 빌드 불필요, 마켓플레이스/플러그인 갱신만으로 반영된다.

위 단계를 사용자 대신 순서대로 실행하고, 결과(pull 변경사항 유무, 빌드 실행 여부, 버전 변화, 재시작 필요 여부)를 요약해 보고하라.
