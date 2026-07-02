# 아키텍처

Claude Code ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지의 전체 구조.

## 통신 흐름

```
Claude
  │  MCP 툴 호출 (stdio)
  ▼
MCP 프로세스 (mcp-bridge/src/index.ts)
  │  HTTP (POST /v1/dispatch, GET /v1/status — http://localhost:8766)
  ▼
WS 데몬 (mcp-bridge/src/cli/daemon.ts, 독립 프로세스)
  │  WebSocket (ws://localhost:8765)
  ▼
UI iframe (figma-plugin/src/index.tsx)   ← 네트워크 담당 (WS 연결·재연결·중계)
  │  postMessage { pluginMessage }
  ▼
Canvas 스레드 (figma-plugin/src/canvas/main.ts) ← Figma API 실행
  │  postMessage DRAW_RESULT
  ▼
UI iframe
  │  WebSocket RESPONSE
  ▼
WS 데몬 → MCP 프로세스 → Claude (nodeId 반환)
```

> **핵심 제약:** Canvas 스레드에서 `fetch` / `WebSocket` 직접 사용 금지.
> 네트워크는 반드시 UI iframe 경유. (`manifest.json` `networkAccess` 참고)

### MCP 프로세스 ↔ WS 데몬 분리 구조

`mcp-bridge`는 단일 프로세스가 아니라 두 프로세스로 구성된다.

- **MCP 프로세스** (`index.ts`): Claude Code와 stdio로 통신. `client/ws-bridge.ts`가 데몬 생존을 HTTP `/v1/status`로 확인 후, 없으면 `dist/cli/daemon.js`를 child_process로 spawn한다. 이미 떠 있으면 재사용 — 여러 MCP 프로세스가 떠도 데몬은 하나만 유지되어 포트 바인딩 경쟁이 없다.
- **WS 데몬** (`cli/daemon.ts`, `daemon/create-daemon.ts`): Figma 플러그인과의 WebSocket(8765)을 직접 보유하는 독립 프로세스. MCP 프로세스로부터의 HTTP(8766) 요청을 받아 플러그인에 중계하고, 플러그인의 RESPONSE를 HTTP 응답으로 되돌린다.
- 둘 사이의 메시지 봉투는 동일한 `BridgeMessage` 타입을 공유한다:
  ```typescript
  type BridgeMessage =
    | { id: string; type: 'REQUEST'; action: McpAction; payload: Record<string, unknown> }
    | { id: string; type: 'RESPONSE'; action: McpAction; payload: BridgeResponsePayload }
    | { id: string; type: 'EVENT'; action: string; payload?: Record<string, unknown> };
  ```
- 플러그인은 마지막에 연결된 WS 클라이언트 1개만 데몬에 보관된다 (다중 UI 인스턴스 동시 연결 미지원).
- 포트는 `WS_PORT`(기본 8765), `HTTP_PORT`(기본 8766) 환경변수로 오버라이드 가능.

## 디렉토리 역할

| 디렉토리 | 역할 |
|---|---|
| `mcp-bridge/` | TypeScript MCP 서버 + WebSocket 브릿지 데몬 |
| `figma-plugin/` | Figma 플러그인 (Preact UI + canvas 스레드) |
| `packages/protocol/` | MCP action, canvas message type, BridgeMessage 공유 계약 |
| `.claude-plugin/` | Claude Code 플러그인 매니페스트 (MCP 서버 등록 + `figma-bridge` 스킬) |

## mcp-bridge 내부 구조

```
mcp-bridge/src/
├── index.ts                 MCP stdio 엔트리포인트
├── mcp/                     MCP 서버 생성과 툴 응답 포맷팅
├── tools/                   MCP 툴 정의와 zod 스키마
├── protocol/                action, BridgeMessage, 데몬 HTTP 계약
├── client/                  MCP 프로세스 → 데몬 HTTP 클라이언트와 spawn 관리
├── daemon/                  WS/HTTP 데몬 조립, pending 요청, 플러그인 소켓 관리
└── cli/daemon.ts            데몬 CLI 엔트리포인트
```

## figma-plugin 내부 구조

```
figma-plugin/src/
├── index.tsx                       엔트리포인트 — render(App) 호출만
│
├── ui/                             Preact UI 컴포넌트 (표현 레이어)
│   ├── App.tsx                     루트 레이아웃, useBridgeConnection 호출
│   └── StatusBadge.tsx             연결 상태 표시 (connecting / connected / disconnected)
│
├── bridge/                         WS ↔ canvas 중계 레이어
│   ├── types.ts                    ConnectionState FSM 타입
│   ├── constants.ts                WS_URL, RECONNECT_DELAY
│   ├── wsClient.ts                 WS 연결·재연결 순수 로직 (UI 상태 모름, 콜백 노출)
│   ├── canvasChannel.ts            sendToCanvas / canvas→UI 메시지 수신 후 WS 중계
│   └── useBridgeConnection.ts      useReducer FSM으로 ConnectionState 관리
│
├── canvas/                         Figma canvas 스레드 전용 (figma API 의존)
│   ├── main.ts                     showUI + figma.ui.onmessage 연결
│   ├── dispatch/                   LOG/PING/CLOSE 및 action dispatch, 공통 응답 처리
│   ├── draw/                       DRAW_RECT / DRAW_TEXT / DRAW_FRAME 생성
│   ├── screen/                     DRAW_SCREEN 재귀 트리 생성
│   ├── query/                      GET_NODE / GET_PAGE / EXPORT_NODE 조회·직렬화
│   ├── mutation/                   SET_PARENT / SET_NAME / REMOVE_NODE 조작
│   ├── shared/                     여러 action 그룹에서 공유하는 노드 조회·부모 append 헬퍼
│   └── utils/                      canvas 스레드 전용 순수 유틸 (UI에서 import 불가)
│       ├── color.ts                hex/rgba 파싱 → SolidPaint 변환
│       ├── font.ts                 폰트 로딩 + Inter 폴백
│       └── effects.ts              DropShadow / LayerBlur / Stroke 빌더
│
└── utils/
    └── uuid.ts                     RFC4122 v4 UUID (canvas·bridge·UI 어디서나 사용 가능)
```

빌드 산출물(`build/main.js`, `build/ui.js`)은 git 제외 대상이며 `manifest.json`은 build-figma-plugin이 자동 갱신한다.

## 레이어 간 제약사항

- `figma-plugin/src/canvas/` 에서 `fetch` / `WebSocket` 직접 사용 **금지** → UI iframe 경유 필수
- `figma-plugin/src/canvas/utils/`는 figma 전역 타입에 의존 → UI/bridge에서 import 금지
- postMessage는 항상 `{ pluginMessage: ... }` 래핑
- MCP 툴 응답은 비동기: WS 왕복을 `id` 매칭으로 처리

메시지 타입별 상세 계약(파라미터, 응답 형태)은 [protocol.md](protocol.md)와 `packages/protocol/` 참고.
