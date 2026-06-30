---
description: "figma-bridge를 클론·빌드하고 Claude Code 마켓플레이스/플러그인으로 등록한다."
---

# figma-bridge 설치

현재 작업 디렉토리는 이미 클론된 figma-bridge 레포라고 가정한다 (README의 `git clone` 안내를 따라온 상태).

1. 의존성 설치 및 빌드

```bash
pnpm install
pnpm run build   # figma-plugin + mcp-bridge 둘 다 빌드
```

2. 마켓플레이스 추가 및 플러그인 설치 (현재 디렉토리의 절대 경로를 사용)

```
/plugin marketplace add <현재 디렉토리 절대 경로>
/plugin install figma-bridge@figma-bridge-marketplace
```

설치 완료 시 `figma-bridge` MCP 서버(`mcp-bridge/dist/index.js`)와 `figma-bridge` 스킬이 Claude Code 전역에 등록된다. `${CLAUDE_PLUGIN_ROOT}` 기반으로 경로가 자동 설정되므로 별도 경로 지정은 불필요하다.

3. Figma 측 설정

- Figma 데스크톱 앱 → `Plugins` → `Development` → `Import plugin from manifest...`
- `figma-plugin/manifest.json` 선택
- 플러그인 실행 후 UI에 `Connected ✓` 표시 확인

위 단계를 사용자 대신 순서대로 실행하고, 각 단계 결과(빌드 성공 여부, marketplace/plugin 등록 성공 여부)를 확인해 보고하라. 실패하면 원인을 진단하고 다음 단계로 넘어가지 마라.
