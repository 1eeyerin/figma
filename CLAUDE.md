# figma-bridge 프로젝트 공통 에이전트 지침

## 프로젝트 개요

AI 코딩 에이전트 ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.

- **packages/figma-bridge-mcp/**: TypeScript MCP stdio 서버 + bridge daemon
- **packages/figma-plugin/**: Figma 플러그인 (Preact UI + canvas 스레드)

## 설치 (최초 1회)

레포를 처음 받았다면 다른 작업보다 먼저 플러그인을 전역 설치한다. 실행 중인 에이전트에 맞는 명령을 고른다. 설치 명령, 빌드 순서, Figma 연동 확인 단계는 [docs/install.md](docs/install.md) 참고 — 설치 스크립트 실행 후 사용자에게 `Connected ✓` 확인을 요청하는 것까지 그 문서의 지침을 따른다.

## 사용 방법

플러그인을 설치했다면([설치](#설치-최초-1회) 참고) MCP stdio 서버는 아래 매니페스트의 `mcpServers` 설정에 따라 세션 시작 시 자동 실행된다.

| 에이전트 | 매니페스트 |
|---|---|
| Claude Code | [.claude-plugin/plugin.json](.claude-plugin/plugin.json) |
| Codex | [.codex-plugin/plugin.json](.codex-plugin/plugin.json) |

Figma 캔버스 작업에는 bridge daemon 프로세스와 Figma 플러그인 연결이 모두 필요하다. daemon이 응답하지 않으면 에이전트가 직접 실행 또는 진단하고, 사용자는 Figma 앱에서 `figma-bridge` 플러그인을 열어 `Connected ✓` 상태를 확인한다. 세부 절차는 [docs/usage.md](docs/usage.md)를 따른다.

**트리거:** Figma 캔버스 조작, 도형/텍스트/프레임 생성, 연결 문제 디버깅 시 `figma-bridge` 플러그인의 `figma-bridge` 스킬을 사용하라.

## 아키텍처 (필수 준수)

새 기능·리팩터링 시 [docs/architecture-principles.md](docs/architecture-principles.md)의 규칙(상태 배치, FSM 우선, 통신 프로토콜 선택 기준, thin/thick 경계, agentic UI 설계, 관측성 최소 기준)을 어기지 않아야 한다.

## 커밋 원칙

커밋할 때는 pre-commit/commit-msg 훅을 우회하지 않는다. 훅이 환경 문제로 실패하면 `--no-verify`로 넘기지 말고 원인을 해결한 뒤 다시 커밋한다.

## 문서 참고

| 주제 | 문서 |
|---|---|
| 설치·플러그인 실행 가이드 | [docs/install.md](docs/install.md) |
| 사용 방법·실행 책임 | [docs/usage.md](docs/usage.md) |
| 통신 흐름·디렉토리 구조 | [docs/architecture.md](docs/architecture.md) |
| 메시지 프로토콜 | [docs/protocol.md](docs/protocol.md) |
| figma-bridge-mcp 빌드 방법 | [packages/figma-bridge-mcp/README.md](packages/figma-bridge-mcp/README.md) |
| figma-plugin 빌드 방법 | [packages/figma-plugin/README.md](packages/figma-plugin/README.md#빌드) |
| Git Hooks (husky, 절대경로 금지 등) | [docs/git-hooks.md](docs/git-hooks.md) |
| 테스트 작성 규칙 (제목 한글, JSDoc 기준) | [docs/testing.md](docs/testing.md) |
| 프론트엔드 설계 지침 (가독성·예측 가능성·응집도) | [docs/frontend-guidelines.md](docs/frontend-guidelines.md) |
