# figma-bridge 프로젝트

## 프로젝트 개요

Claude Code ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.

- **mcp-bridge/**: TypeScript MCP 서버 + WebSocket 브릿지 서버 (단일 프로세스)
- **figma-plugin/**: Figma 플러그인 (Preact UI + canvas 스레드)

## 아키텍처

상세 통신 흐름·디렉토리 구조는 [docs/architecture.md](docs/architecture.md), 메시지 프로토콜은 [docs/protocol.md](docs/protocol.md) 참고.

## 사용 방법

1. `cd mcp-bridge && npm run build && node dist/index.js` 로 MCP 서버 실행
2. Figma에서 플러그인 로드 → UI에 "Connected ✓" 확인
3. Claude에서 MCP 툴 호출 (`create_rectangle`, `create_text`, `create_frame` 등)

**트리거:** Figma 캔버스 조작, 도형/텍스트/프레임 생성, 연결 문제 디버깅 시 `figma-bridge` 스킬을 사용하라.

## mcp-bridge 구조

상세 프로세스 구조·메시지 프로토콜은 [docs/architecture.md](docs/architecture.md), 패키지 빌드 방법은 [mcp-bridge/README.md](mcp-bridge/README.md) 참고.

## figma-plugin 구조

상세 디렉토리 구조·레이어 제약사항은 [docs/architecture.md](docs/architecture.md), 패키지 빌드 방법은 [figma-plugin/README.md](figma-plugin/README.md) 참고.

## 빌드

빌드 명령은 [figma-plugin/README.md](figma-plugin/README.md#빌드) 참고.

## Git Hooks

husky 기반 pre-commit/pre-push/commit-msg 훅과 절대경로 금지 규칙은 [docs/git-hooks.md](docs/git-hooks.md) 참고.

## 테스트 코드 작성 규칙

테스트 제목 한글 작성, 주석 JSDoc 사용 기준은 [docs/testing.md](docs/testing.md) 참고.
