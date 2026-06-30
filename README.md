# figma-bridge

Claude Code ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.

## 아키텍처

```
Claude Code --[stdio/MCP]--> MCP 서버 --[WebSocket]--> UI iframe --[postMessage]--> Canvas 스레드
```

| 디렉토리 | 역할 |
|---|---|
| `mcp-bridge/` | TypeScript MCP 서버 + WebSocket 브릿지 서버 (단일 프로세스) |
| `figma-plugin/` | Figma 플러그인 (Preact UI + canvas 스레드) |
| `.claude-plugin/` | Claude Code 플러그인 매니페스트 (MCP 서버 등록 + `figma-bridge` 스킬) |

상세 통신 흐름·디렉토리 구조는 [docs/architecture.md](docs/architecture.md), 메시지 프로토콜은 [docs/protocol.md](docs/protocol.md) 참고.

## 설치 / 업데이트

```bash
git clone https://github.com/1eeyerin/figma.git
cd figma
```

클론한 디렉토리에서 Claude Code를 실행하면 아래 커맨드를 바로 쓸 수 있다 (프로젝트 레벨 커맨드라 플러그인 설치 전에도 인식됨). 절차(빌드, 마켓플레이스 등록, 버전 갱신, 재시작 필요 여부 판단 등)는 커맨드가 안내한다.

| 커맨드 | 언제 사용 |
|---|---|
| `/install` | 처음 설치할 때 (빌드 → 마켓플레이스 추가 → 플러그인 설치 → Figma 플러그인 로드) |
| `/update` | 레포에 변경 사항이 생겼을 때 (`git pull` → 재빌드 → 마켓플레이스/플러그인 갱신) |

각 커맨드의 세부 단계는 [.claude/commands/](.claude/commands/)에 정의되어 있다.

## 사용법

Claude Code에서 Figma 캔버스 조작을 요청하면 `figma-bridge` 스킬이 자동으로 트리거되어 MCP 툴(`create_rectangle`, `create_text`, `create_frame` 등)을 호출한다.

## 로컬 개발

```bash
pnpm run dev           # plugin watch + bridge 서버 동시 실행
pnpm run watch:bridge   # mcp-bridge만 watch (dist 자동 재생성, 재시작 전까지 구버전 유지)
```

자세한 내용은 [CLAUDE.md](CLAUDE.md), [docs/architecture.md](docs/architecture.md), [figma-plugin/README.md](figma-plugin/README.md) 참고.
