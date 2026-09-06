# figma-bridge

AI 코딩 에이전트 ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.
Claude Code와 Codex를 모두 지원한다.

> 레포를 처음 받았다면 코딩 에이전트에게 "[CLAUDE.md](CLAUDE.md)(Codex는 [AGENTS.md](AGENTS.md))를 읽고 플러그인 설치를 진행해줘"라고 요청하면 된다.

## 🗂️ 아키텍처

```
AI 코딩 에이전트 --[stdio/MCP]--> MCP 서버 --[WebSocket]--> UI iframe --[postMessage]--> Canvas 스레드
```

| 디렉토리 | 역할 |
|---|---|
| `packages/figma-bridge-mcp/` | TypeScript MCP stdio 서버 + bridge daemon |
| `packages/figma-plugin/` | Figma 플러그인 (Preact UI + canvas 스레드) |
| `skills/` | Claude Code·Codex 공용 `figma-bridge` 스킬 |
| `.claude-plugin/` | Claude Code 플러그인 매니페스트 (MCP 서버 등록) |
| `.codex-plugin/` | Codex 플러그인 매니페스트 (MCP 서버 등록) |

상세 통신 흐름·디렉토리 구조는 [docs/architecture.md](docs/architecture.md), 메시지 프로토콜은 [docs/protocol.md](docs/protocol.md) 참고.

## 🧰 사전 요구사항

- Node.js `24.14.0`
- pnpm `10.30.3`

레포 기준은 아래처럼 관리한다.

- Node 기본값: [`.nvmrc`](.nvmrc) (`24.14.0`)
- pnpm: [`package.json`](package.json) (`pnpm@10.30.3`)

## 🚀 초기 세팅

처음 클론한 뒤에는 아래 순서로 맞추면 된다.

`pnpm`이 없다면 `corepack enable && corepack prepare pnpm@10.30.3 --activate`를 먼저 실행한다.

```bash
cd figma
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.30.3 --activate
pnpm install
```

현재 버전 확인:

```bash
node -v
pnpm -v
```

## 📦 설치 명령

기본 설치는 루트에서 진행한다.

```bash
pnpm install
```

## 🔄 설치 / 업데이트

Claude Code/Codex별 설치·업데이트 명령과 Figma 플러그인 연동 확인 절차는 [docs/install.md](docs/install.md) 참고.

설치·업데이트 스크립트는 먼저 `protocol → plugin → mcp bundle` 순서로 빌드하고, `dist/plugin-package/figma-bridge` staging 산출물을 만든 뒤 그 산출물을 Codex/Claude 플러그인으로 등록한다. 설치된 플러그인 캐시에서는 `pnpm install` 없이 MCP 번들이 실행되어야 한다.

## ▶️ 사용법

> 처음 다운로드했다면 [설치 / 업데이트](#설치--업데이트)를 먼저 끝내야 한다. 설치 전에는 MCP 툴이 동작하지 않는다.

| 에이전트 | 사용 방법 |
|---|---|
| Claude Code | Figma 캔버스 조작을 요청하면 `figma-bridge` 스킬이 자동 트리거되어 MCP 툴(`create_rectangle`, `create_text`, `create_frame` 등)을 호출한다 |
| Codex | `codex:install` 이후 새 세션에서 캔버스 조작을 요청하면 `figma-bridge:figma-bridge` 스킬과 MCP 툴을 사용할 수 있다 |

Figma에서 선택한 프레임을 코드로 구현할 때는 `get_selection_context`로 전체
노드 계층의 Inspect CSS와 디자인 속성을 조회한다. 자세한 절차는
[docs/usage.md](docs/usage.md#선택-프레임을-코드-구현에-활용)를 참고한다.

## 🛠️ 로컬 개발

```bash
pnpm run dev           # plugin watch + bridge 서버 동시 실행
pnpm run watch:bridge   # packages/figma-bridge-mcp만 watch (dist 자동 재생성, 재시작 전까지 구버전 유지)
```

자세한 내용은 [CLAUDE.md](CLAUDE.md), [docs/architecture.md](docs/architecture.md), [packages/figma-plugin/README.md](packages/figma-plugin/README.md) 참고.
