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

## Git Hooks (husky + oxlint/oxfmt)

- `pre-commit`: 절대경로 검사 + `pnpm run lint`(oxlint) + `pnpm run format:check`(oxfmt) 통과해야 커밋 가능
- `pre-push`: 루트 `pnpm run build`(plugin + mcp-bridge) 통과해야 push 가능. `SKIP_PRE_PUSH=1 git push`로 스킵 가능
- `commit-msg`: `type(scope): 한글 메시지` 형식 강제 (scope 필수). 타입: feat/fix/docs/style/refactor/test/chore/build
- 포맷 실패 시 `pnpm run format`으로 자동 정리 후 재커밋

## 절대경로 금지

- 스크립트·문서·설정에 `/Users/<사용자명>`, `/home/<사용자명>` 같은 로컬 환경 종속 절대경로를 **하드코딩 금지**. 다른 사용자/머신에서 깨진다.
- 셸 스크립트는 `SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"` 패턴으로 자기 위치 기준 경로를 구하라.
- 문서의 안내 명령어는 프로젝트 루트 기준 상대경로(`cd mcp-bridge`)로 작성하라.
- `pre-commit` 훅이 이를 자동 검사한다 (위 Git Hooks 참고).
