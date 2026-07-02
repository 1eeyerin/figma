# figma-bridge

AI 코딩 에이전트 ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.
Claude Code와 Codex를 모두 지원한다.

> 레포를 처음 받았다면 코딩 에이전트에게 "[CLAUDE.md](CLAUDE.md)(Codex는 [AGENTS.md](AGENTS.md))를 읽고 플러그인 설치를 진행해줘"라고 요청하면 된다.

## 아키텍처

```
AI 코딩 에이전트 --[stdio/MCP]--> MCP 서버 --[WebSocket]--> UI iframe --[postMessage]--> Canvas 스레드
```

| 디렉토리 | 역할 |
|---|---|
| `mcp-bridge/` | TypeScript MCP 서버 + WebSocket 브릿지 서버 (단일 프로세스) |
| `figma-plugin/` | Figma 플러그인 (Preact UI + canvas 스레드) |
| `skills/` | Claude Code·Codex 공용 `figma-bridge` 스킬 |
| `.claude-plugin/` | Claude Code 플러그인 매니페스트 (MCP 서버 등록) |
| `.codex-plugin/` | Codex 플러그인 매니페스트 (MCP 서버 등록) |

상세 통신 흐름·디렉토리 구조는 [docs/architecture.md](docs/architecture.md), 메시지 프로토콜은 [docs/protocol.md](docs/protocol.md) 참고.

## 설치 / 업데이트

```bash
git clone https://github.com/1eeyerin/figma.git
cd figma
corepack enable   # package.json의 pnpm@10.30.3 버전을 자동 준비
pnpm install
```

Claude Code/Codex별 설치·업데이트 명령과 Figma 플러그인 연동 확인 절차는 [docs/install.md](docs/install.md) 참고.

## 사용법

> 처음 다운로드했다면 [설치 / 업데이트](#설치--업데이트)를 먼저 끝내야 한다. 설치 전에는 MCP 툴이 동작하지 않는다.

| 에이전트 | 사용 방법 |
|---|---|
| Claude Code | Figma 캔버스 조작을 요청하면 `figma-bridge` 스킬이 자동 트리거되어 MCP 툴(`create_rectangle`, `create_text`, `create_frame` 등)을 호출한다 |
| Codex | `codex:install` 이후 새 세션에서 캔버스 조작을 요청하면 `figma-bridge:figma-bridge` 스킬과 MCP 툴을 사용할 수 있다 |

## 로컬 개발

```bash
pnpm run dev           # plugin watch + bridge 서버 동시 실행
pnpm run watch:bridge   # mcp-bridge만 watch (dist 자동 재생성, 재시작 전까지 구버전 유지)
```

자세한 내용은 [CLAUDE.md](CLAUDE.md), [docs/architecture.md](docs/architecture.md), [figma-plugin/README.md](figma-plugin/README.md) 참고.
