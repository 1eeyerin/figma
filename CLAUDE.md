# figma-bridge 프로젝트

## 프로젝트 개요
Claude Code ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.

- **mcp-bridge/**: TypeScript MCP 서버 + WebSocket 브릿지 서버 (단일 프로세스)
- **figma-plugin/**: Figma 플러그인 (Preact UI + canvas 스레드)

## 아키텍처
```
Claude Code --[stdio/MCP]--> MCP 서버 --[WebSocket]--> UI iframe --[postMessage]--> Canvas 스레드
```

## 사용 방법

1. `cd mcp-bridge && npm run build && node dist/index.js` 로 MCP 서버 실행
2. Figma에서 플러그인 로드 → UI에 "Connected ✓" 확인
3. Claude에서 MCP 툴 호출 (`create_rectangle`, `create_text`, `create_frame` 등)

**트리거:** Figma 캔버스 조작, 도형/텍스트/프레임 생성, 연결 문제 디버깅 시 `figma-bridge` 스킬을 사용하라.

## figma-plugin 구조

> 상세 내용은 [figma-plugin/README.md](figma-plugin/README.md) 참고.

```
src/
├── index.tsx              UI 엔트리포인트 (render 호출만)
├── ui/                    Preact 컴포넌트 (표현 레이어)
├── bridge/                WS ↔ canvas 중계 레이어
│   ├── types.ts           ConnectionState FSM 타입
│   ├── constants.ts       WS_URL, ACTION_MAP
│   ├── wsClient.ts        WS 연결·재연결 (UI 상태 모름)
│   ├── canvasChannel.ts   sendToCanvas / canvas 수신 중계
│   └── useBridgeConnection.ts  useReducer FSM 훅
├── canvas/                Figma canvas 스레드 전용
│   ├── main.ts            showUI + 메시지 라우팅
│   ├── handlers.ts        메시지 타입별 핸들러
│   ├── nodes.ts           노드 생성·조작
│   ├── nodeQuery.ts       노드 조회·직렬화·export
│   └── utils/             figma API 의존 순수 유틸 (UI에서 import 금지)
└── utils/uuid.ts          범용 유틸 (어디서나 사용 가능)
```

## 핵심 제약사항

- `src/canvas/` 에서 `fetch` / `WebSocket` 직접 사용 **금지** → UI iframe 경유 필수
- `src/canvas/utils/`는 figma 전역 타입에 의존 → UI/bridge에서 import 금지
- postMessage는 항상 `{ pluginMessage: ... }` 래핑
- MCP 툴 응답은 비동기: WS 왕복을 `id` 매칭으로 처리

## 빌드

```bash
cd figma-plugin
npm run build   # 프로덕션
npm run watch   # 개발 중 watch
```

## Git Hooks (husky + oxlint/oxfmt)

- `pre-commit`: 절대경로 검사 + `pnpm run lint`(oxlint) + `pnpm run format:check`(oxfmt) 통과해야 커밋 가능
- `pre-push`: 루트 `pnpm run build`(plugin + mcp-bridge) 통과해야 push 가능. `SKIP_PRE_PUSH=1 git push`로 스킵 가능
- `commit-msg`: `type(scope): 한글 메시지` 형식 강제 (scope 필수). 타입: feat/fix/docs/style/refactor/test/chore/build
- 포맷 실패 시 `pnpm run format`으로 자동 정리 후 재커밋

## 절대경로 금지

- 스크립트·문서·설정에 `/Users/<사용자명>`, `/home/<사용자명>` 같은 로컬 환경 종속 절대경로를 **하드코딩 금지**. 다른 사용자/머신에서 깨진다.
- 셸 스크립트는 `SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"` 패턴으로 자기 위치 기준 경로를 구하라.
- 문서의 안내 명령어는 프로젝트 루트 기준 상대경로(`cd mcp-bridge`)로 작성하라.
- `pre-commit` 훅이 스테이징된 파일에서 `/Users/`, `/home/` 패턴을 자동 검사해 커밋을 차단한다 (바이너리/lock 파일 제외).

## 변경 이력
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-24 | 초기 하네스 구성 | 전체 | - |
| 2026-06-24 | ui.html → Preact 컴포넌트 구조로 리팩터링 | figma-plugin | 유지보수성 |
| 2026-06-24 | canvas/bridge/ui 레이어 분리 (RADIO 아키텍처) | figma-plugin | 책임 분리 |
| 2026-06-30 | husky git hooks 도입 (oxlint/oxfmt 기반) | 전체 | looppit-frontend 패턴 이식, prettier+eslint → oxlint+oxfmt 대체 |
