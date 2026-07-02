# 설치 / 플러그인 실행 가이드

## 사전 준비

```bash
cd figma
corepack enable   # package.json의 pnpm@10.30.3 버전을 자동 준비
pnpm install
```

## Claude Code

| 커맨드 | 용도 |
|---|---|
| `pnpm run claude:install` | 최초 설치 (의존성 → 빌드 → 마켓플레이스 추가 → 플러그인 설치) |
| `pnpm run claude:update` | 변경 사항 반영 (빌드 → 마켓플레이스/플러그인 갱신) |

클론한 디렉토리에서 Claude Code 세션을 열면 `/install`, `/update` 커맨드로도 동일 스크립트를 실행할 수 있다. 세부 정의: [.claude/commands/](../.claude/commands/), [scripts/claude-plugin.mjs](../scripts/claude-plugin.mjs).

> MCP 서버(`mcp-bridge/`) 변경분은 재시작 후에만 반영된다. 스킬만 바뀌었다면 재시작 불필요.

## Codex

| 커맨드 | 용도 |
|---|---|
| `pnpm run codex:install` | 최초 설치 (의존성 → 빌드 → 개인 marketplace 등록 → 플러그인 설치) |
| `pnpm run codex:update` | 레포 변경 사항을 전역 플러그인에 반영 |

설치 스크립트가 `~/.agents/plugins/marketplace.json`에 `figma-bridge`를 등록하고 `~/plugins/figma-bridge`를 현재 레포로 링크한 뒤 `codex plugin add figma-bridge@personal`을 실행한다. MCP 서버 설정은 [.codex-plugin/plugin.json](../.codex-plugin/plugin.json), 스킬은 Claude Code와 공유하는 루트 [skills/](../skills/) 하나뿐이다.

각 설치 명령은 `pnpm install` → `pnpm run build` → 마켓플레이스 등록 → 플러그인 설치를 한 번에 처리한다. 빌드를 별도로 먼저 돌릴 필요 없음. 플러그인은 빌드가 돼 있어야 동작하므로 다른 작업보다 이 설치부터 끝낸다.

## Figma 플러그인 연동 확인

설치 스크립트 실행이 끝나면 Figma 데스크톱 앱에서 아래 단계를 직접 확인한다.

1. `Plugins` → `Development` → `Import plugin from manifest...`
2. `figma-plugin/manifest.json` 선택
3. 플러그인 실행 → UI에 `Connected ✓` 확인

> **에이전트 지침:** 설치 스크립트 실행을 마쳤으면, 사용자에게 위 3단계를 Figma에서 직접 확인해 `Connected ✓`가 뜨는지 알려 달라고 안내해야 한다.

Claude Code 기준 단계별 상세·실패 진단은 [.claude/commands/install.md](../.claude/commands/install.md) 참고.
