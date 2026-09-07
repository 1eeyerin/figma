# 아키텍처

Claude Code ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지의 전체 구조.

## 통신 흐름

```
Claude
  │  MCP 툴 호출 (stdio)
  ▼
MCP 프로세스 (packages/figma-bridge-mcp/src/index.ts)
  │  시작 전 preflight (Node/runtime/import/port 상태 확인)
  ▼
MCP 프로세스 (preflight 통과 시 daemon 시작 또는 기존 daemon 재사용)
  │  HTTP (POST /v1/dispatch, GET /v1/status — http://localhost:8766)
  ▼
WS 데몬 (packages/figma-bridge-mcp/src/cli/daemon.ts, 독립 프로세스)
  │  WebSocket (ws://localhost:8765)
  ▼
UI iframe (packages/figma-plugin/src/index.tsx)   ← 네트워크 담당 (WS 연결·재연결·중계)
  │  postMessage { pluginMessage }
  ▼
Canvas 스레드 (packages/figma-plugin/src/canvas/main.ts) ← Figma API 실행
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

`figma-bridge-mcp`는 단일 프로세스가 아니라 두 프로세스로 구성된다.

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

### 시작 전 preflight

MCP 프로세스는 stdio transport 연결 전에 `runStartupPreflight()`를 실행한다. 이 검사는 패키지 설치형 런타임에서 필요한 파일과 의존성이 실제로 로드 가능한지, 그리고 daemon 포트 상태가 정상인지 먼저 확인하기 위한 단계다.

검사 항목은 다음과 같다.

- Node.js major version이 20 이상인지 확인한다.
- 현재 런타임 디렉토리에 `index.js`와 `cli/daemon.js`가 있는지 확인한다.
- `figma-bridge-protocol`과 `ws` import가 가능하고 필요한 export가 있는지 확인한다.
- `WS_PORT`/`HTTP_PORT`의 포트 상태를 확인한다. 두 포트가 모두 비어 있으면 새 daemon을 시작할 수 있고, 기존 daemon이 있으면 `/v1/status` 응답의 `pluginConnected` boolean을 확인해 재사용 가능 여부를 판단한다.

preflight가 실패하면 MCP 서버 자체는 stdio에 연결되지만 daemon은 시작하지 않는다. 이후 MCP 툴 호출은 Figma로 전달되지 않고 preflight 실패 리포트를 `isError` 응답으로 반환한다.

## 디렉토리 역할

| 디렉토리 | 역할 |
|---|---|
| `packages/figma-bridge-mcp/` | TypeScript MCP 서버 + WebSocket 브릿지 데몬 |
| `packages/figma-plugin/` | Figma 플러그인 (Preact UI + canvas 스레드) |
| `packages/figma-bridge-protocol/` | MCP action, canvas message type, BridgeMessage 공유 계약 |
| `.claude-plugin/` | Claude Code 플러그인 매니페스트 (MCP 서버 등록 + `figma-bridge` 스킬) |

## figma-bridge-mcp 내부 구조

```
packages/figma-bridge-mcp/src/
├── index.ts                 MCP stdio 엔트리포인트
├── preflight.ts             시작 전 런타임·의존성·포트 상태 진단
├── mcp/                     MCP 서버 생성과 툴 응답 포맷팅
├── tools/                   MCP 툴 정의와 zod 스키마
├── protocol/                데몬 HTTP 계약과 MCP 툴 응답 타입
├── client/                  MCP 프로세스 → 데몬 HTTP 클라이언트와 spawn 관리
├── daemon/                  WS/HTTP 데몬 조립, pending 요청, 플러그인 소켓 관리
└── cli/daemon.ts            데몬 CLI 엔트리포인트
```

## figma-plugin 내부 구조

```
packages/figma-plugin/src/
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

- `packages/figma-plugin/src/canvas/` 에서 `fetch` / `WebSocket` 직접 사용 **금지** → UI iframe 경유 필수
- `packages/figma-plugin/src/canvas/utils/`는 figma 전역 타입에 의존 → UI/bridge에서 import 금지
- postMessage는 항상 `{ pluginMessage: ... }` 래핑
- MCP 툴 응답은 비동기: WS 왕복을 `id` 매칭으로 처리

메시지 타입별 상세 계약(파라미터, 응답 형태)은 [protocol.md](protocol.md)와 `packages/figma-bridge-protocol/` 참고.

설계 원칙(왜 이렇게 설계했는가, 무엇을 지켜야 하는가)은 [architecture-principles.md](architecture-principles.md) 참고.

## 플러그인 상태의 실시간 갱신

- `wsClient`는 자동·수동 연결 시도마다 `onConnecting`을 호출합니다. `useBridgeConnection`의 FSM은 `disconnected → connecting → connected` 순서로 화면 상태를 갱신합니다.
- 소켓 연결 후 `EVENT/ping`에 같은 ID의 `EVENT/pong`이 도착해야 연결됨으로 표시합니다. 이후 3초 간격으로 확인하고, 연결 또는 응답이 3초 동안 없으면 소켓을 정리한 뒤 3초 후 다시 연결합니다. 일반적인 무응답 감지는 마지막 확인 후 최대 약 6초이며, 앱이 백그라운드에서 정지되면 타이머도 지연될 수 있습니다.
- 이전 소켓의 이벤트와 타이머는 교체·종료 시 해제합니다. 여러 플러그인 인스턴스의 동시 작업은 기존과 같이 지원하지 않습니다.
- UI가 준비되면 `GET_SELECTION_SUMMARY`로 초기 선택을 요청합니다. 이후 canvas의 `selectionchange`(페이지 전환 포함)와 선택 레이어·현재 페이지의 이름 변경 이벤트가 표시를 갱신합니다. 이 경로는 WS 연결 여부와 무관합니다.
- UI가 보관하는 선택 요약은 페이지와 선택 레이어의 ID·이름·종류만 포함하는 표시용 스냅샷입니다. 크기·스타일·계층 등의 디자인 데이터는 저장하지 않으며, MCP 조회는 항상 캔버스를 다시 읽습니다.
- 연결됨 표시는 플러그인과 브릿지 데몬 사이의 응답을 뜻합니다. 특정 AI 클라이언트의 실행 상태나 코드 생성 완료를 뜻하지 않습니다.
