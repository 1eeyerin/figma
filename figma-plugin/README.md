# figma-plugin

Claude Code ↔ MCP 서버 ↔ Figma 캔버스를 잇는 브릿지 플러그인.  
WebSocket으로 MCP 명령을 수신하고 Figma API로 실행한다.

## 통신 흐름

```
Claude
  │  MCP 툴 호출 (stdio)
  ▼
MCP 서버 (mcp-bridge/)
  │  WebSocket (ws://localhost:8765)
  ▼
UI iframe (src/index.tsx)          ← 네트워크 담당 (WS 연결·재연결·중계)
  │  postMessage { pluginMessage }
  ▼
Canvas 스레드 (src/canvas/main.ts) ← Figma API 실행
  │  postMessage DRAW_RESULT
  ▼
UI iframe
  │  WebSocket RESPONSE
  ▼
MCP 서버 → Claude (nodeId 반환)
```

> **핵심 제약:** Canvas 스레드에서 `fetch` / `WebSocket` 직접 사용 금지.  
> 네트워크는 반드시 UI iframe 경유. (`manifest.json` `networkAccess` 참고)

## 디렉터리 구조

```
figma-plugin/
├── src/
│   ├── index.tsx                   엔트리포인트 — render(App) 호출만
│   │
│   ├── ui/                         Preact UI 컴포넌트 (표현 레이어)
│   │   ├── App.tsx                 루트 레이아웃, useBridgeConnection 호출
│   │   └── StatusBadge.tsx         연결 상태 표시 (connecting / connected / disconnected)
│   │
│   ├── bridge/                     WS ↔ canvas 중계 레이어
│   │   ├── types.ts                ConnectionState FSM 타입, BridgeMessage 인터페이스
│   │   ├── constants.ts            WS_URL, RECONNECT_DELAY, ACTION_MAP
│   │   ├── wsClient.ts             WS 연결·재연결 순수 로직 (UI 상태 모름, 콜백 노출)
│   │   ├── canvasChannel.ts        sendToCanvas / canvas→UI 메시지 수신 후 WS 중계
│   │   └── useBridgeConnection.ts  useReducer FSM으로 ConnectionState 관리
│   │
│   ├── canvas/                     Figma canvas 스레드 전용 (figma API 의존)
│   │   ├── main.ts                 showUI + figma.ui.onmessage 라우팅 (3줄)
│   │   ├── handlers.ts             메시지 타입별 핸들러, reply() 헬퍼로 응답
│   │   ├── nodes.ts                노드 생성·조작 (createRect / createText / createFrame)
│   │   ├── nodeQuery.ts            노드 조회·직렬화·export (읽기 전용)
│   │   └── utils/                  canvas 스레드 전용 순수 유틸 (UI에서 import 불가)
│   │       ├── color.ts            hex/rgba 파싱 → SolidPaint 변환
│   │       ├── font.ts             폰트 로딩 + Inter 폴백
│   │       └── effects.ts          DropShadow / LayerBlur / Stroke 빌더
│   │
│   └── utils/
│       └── uuid.ts                 RFC4122 v4 UUID (canvas·bridge·UI 어디서나 사용 가능)
│
├── build/                          빌드 결과물 (git 제외)
│   ├── main.js                     canvas 번들
│   └── ui.js                       UI 번들 (Preact 포함)
│
├── manifest.json                   build-figma-plugin이 자동 갱신
└── package.json
```

## 지원 메시지 타입

UI iframe ↔ Canvas 사이의 postMessage 계약.  
MCP action → canvas 타입 매핑은 `src/bridge/constants.ts`의 `ACTION_MAP` 참고.

### 생성

| canvas 타입 | MCP action | 주요 파라미터 | 응답 |
|-------------|-----------|-------------|------|
| `DRAW_RECT` | `create_rectangle` | x, y, width, height, color, cornerRadius, strokeColor, shadow | `DRAW_RESULT { nodeId }` |
| `DRAW_TEXT` | `create_text` | x, y, content, fontSize, fontFamily, fontWeight, color, textAlign | `DRAW_RESULT { nodeId }` |
| `DRAW_FRAME` | `create_frame` | x, y, width, height, color, layoutMode, padding*, itemSpacing | `DRAW_RESULT { nodeId }` |
| `CREATE_SCREEN` | `create_screen` | tree (재귀 노드 트리 정의) | `DRAW_RESULT { nodeId }` |

### 조작

| canvas 타입 | MCP action | 주요 파라미터 | 응답 |
|-------------|-----------|-------------|------|
| `SET_PARENT` | `set_parent` | nodeId, parentId, index? | `DRAW_RESULT { nodeId }` |
| `SET_NAME` | `set_name` | nodeId, name | `DRAW_RESULT { nodeId }` |
| `REMOVE_NODE` | `remove_node` | nodeId | `DRAW_RESULT { success }` |

### 조회

| canvas 타입 | MCP action | 주요 파라미터 | 응답 |
|-------------|-----------|-------------|------|
| `GET_NODE` | `get_node` | nodeId? (없으면 현재 선택) | `DRAW_RESULT { result: SerializedNode }` |
| `GET_PAGE` | `get_page` | — | `DRAW_RESULT { result: SerializedNode[] }` |
| `EXPORT_NODE` | `export_node` | nodeId?, scale? | `DRAW_RESULT { result: { base64, nodeId } }` |

### 시스템

| canvas 타입 | 동작 |
|-------------|------|
| `PING` | `PONG` 응답 |
| `LOG` | `console.log` 출력 |
| `CLOSE` | 플러그인 종료 |

### 공통 응답 형태

```ts
// 성공
{ type: 'DRAW_RESULT', id: string, action: string, success: true, nodeId?: string, result?: any }

// 실패
{ type: 'DRAW_RESULT', id: string, action: string, success: false, error: string }
```

## 빌드

```bash
# 프로덕션 빌드 (타입체크 + minify)
npm run build

# 개발 중 watch (파일 저장 시 자동 재빌드)
npm run watch
```

빌드 결과로 `build/main.js`, `build/ui.js`, `manifest.json`이 갱신된다.  
Figma에서 플러그인을 닫았다가 다시 열면 변경사항이 반영된다.

## Figma 플러그인 제약사항

- Canvas 스레드(`src/canvas/`)에서 `fetch` / `WebSocket` **사용 불가** → UI iframe 경유 필수
- 외부 리소스 로드는 `manifest.json`의 `networkAccess.devAllowedDomains`에 등록 필요
- UI ↔ Canvas postMessage는 반드시 `{ pluginMessage: ... }` 래핑
- Canvas에서 `src/canvas/utils/` 외부 파일을 import할 때 figma 전역 타입에 의존하지 않는지 확인
