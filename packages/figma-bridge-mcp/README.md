# figma-bridge-mcp

AI 코딩 에이전트(Claude Code, Codex) ↔ Figma 플러그인을 잇는 MCP 서버.
MCP 툴 호출을 받아 WebSocket으로 Figma 플러그인에 중계한다.

전체 통신 흐름, 프로세스 구조, 레이어 간 제약사항은 [../../docs/architecture.md](../../docs/architecture.md) 참고.
메시지 타입별 파라미터·응답 계약은 [../../docs/protocol.md](../../docs/protocol.md) 참고.

## 빌드

```bash
# 프로덕션 빌드
pnpm run build

# 개발 중 watch (파일 저장 시 자동 재빌드)
pnpm run watch

# WS 데몬 직접 실행
pnpm run start:daemon
```

빌드는 타입 체크 후 `esbuild`로 `dist/index.js`와 `dist/cli/daemon.js`를 ESM 번들로 만든다. 이후 `node_modules` 없는 임시 staging 디렉토리에서 MCP index와 daemon이 실행되는지 smoke test한다.

`pnpm run start`로 MCP 프로세스를 직접 실행할 수 있고, `pnpm run start:daemon`은 `dist/cli/daemon.js`를 실행한다.

## 시작 전 검사

MCP 프로세스는 시작 시 Node 버전, `dist/index.js`, daemon 스크립트, `figma-bridge-protocol`/`ws` 로드 가능 여부, `8765`/`8766` 포트 상태를 검사한다. 실패하면 stderr에 preflight 결과를 출력하고, MCP 도구 호출에도 같은 내용을 에러 응답으로 반환한다.
