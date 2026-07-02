# 설치 / 플러그인 실행 가이드

## 1. 사전 준비

```bash
corepack enable   # package.json의 pnpm@10.30.3 버전을 자동 준비
pnpm install
```

## 2. 설치 명령 실행

실행 중인 에이전트에 맞는 명령을 하나만 실행한다.

| 에이전트 | 최초 설치 | 업데이트 |
|---|---|---|
| Claude Code | `pnpm run claude:install` | `pnpm run claude:update` |
| Codex | `pnpm run codex:install` | `pnpm run codex:update` |

Claude Code 세션에서는 `/install`, `/update` 커맨드로도 동일 스크립트를 실행할 수 있다.

세부 정의: [scripts/claude-plugin.mjs](../scripts/claude-plugin.mjs), [scripts/codex-plugin.mjs](../scripts/codex-plugin.mjs).

설치·업데이트 스크립트는 `pnpm run build:package`로 `dist/plugin-package/figma-bridge` 산출물을 만든 뒤, 그 산출물을 플러그인으로 등록한다. 산출물에는 `node_modules`를 포함하지 않는다.

## 3. Figma 플러그인 연동 확인

설치 스크립트 실행이 끝나면 Figma 데스크톱 앱에서 아래 단계를 직접 확인한다.

1. `Plugins` → `Development` → `Import plugin from manifest...`
2. `packages/figma-plugin/manifest.json` 선택
3. 플러그인 실행 → UI에 `Connected ✓` 확인

> **에이전트 지침:** 설치 스크립트 실행을 마쳤으면, 사용자에게 위 3단계를 Figma에서 직접 확인해 `Connected ✓`가 뜨는지 알려 달라고 안내해야 한다.

## 4. 업데이트와 재시작

플러그인 배포 단위가 바뀌면 먼저 버전을 수동으로 올린 뒤, 설치된 에이전트만 갱신한다.

```bash
pnpm run version:plugin
pnpm run plugins:update
```

`pnpm run plugins:update`는 현재 플러그인 버전과 `dist/plugin-package/figma-bridge`에 마지막으로 패키징된 버전을 비교해 업데이트 여부를 판단한다.

MCP 서버(`packages/figma-bridge-mcp/`) 변경분은 에이전트 재시작 후에만 반영된다. 스킬만 바뀌었다면 재시작 불필요.

설치 이후 실제 작업 절차와 bridge daemon 실행 책임은 [사용 방법](usage.md)을 따른다.
