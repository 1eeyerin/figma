---
description: "figma-bridge를 클론·빌드하고 Claude Code 마켓플레이스/플러그인으로 등록한다."
---

# figma-bridge 설치

현재 작업 디렉토리는 이미 클론된 figma-bridge 레포라고 가정한다 (README의 `git clone` 안내를 따라온 상태).

1. 아래 명령으로 의존성 설치·빌드·마켓플레이스 등록·플러그인 설치를 한 번에 처리한다 (내부 동작은 [scripts/claude-plugin.mjs](../../scripts/claude-plugin.mjs) 참고)

```bash
pnpm run claude:install
```

2. Figma 측 설정

- Figma 데스크톱 앱 → `Plugins` → `Development` → `Import plugin from manifest...`
- `packages/figma-plugin/manifest.json` 선택
- 플러그인 실행 후 UI에 `Connected ✓` 표시 확인

위 단계를 사용자 대신 순서대로 실행하고, 각 단계 결과(빌드 성공 여부, marketplace/plugin 등록 성공 여부)를 확인해 보고하라. 실패하면 원인을 진단하고 다음 단계로 넘어가지 마라.
