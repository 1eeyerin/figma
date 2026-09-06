# 메시지 프로토콜

UI iframe ↔ Canvas 사이의 postMessage 계약과, MCP 툴 ↔ canvas 메시지 타입 매핑.
MCP action → canvas 타입 매핑 구현은 `packages/figma-bridge-protocol/src/actions.ts`의 `ACTION_MAP` 참고.

## 생성

| canvas 타입     | MCP action         | 주요 파라미터                                                     | 응답                     |
| --------------- | ------------------ | ----------------------------------------------------------------- | ------------------------ |
| `DRAW_RECT`     | `create_rectangle` | x, y, width, height, color, cornerRadius, strokeColor, shadow     | `DRAW_RESULT { nodeId }` |
| `DRAW_TEXT`     | `create_text`      | x, y, content, fontSize, fontFamily, fontWeight, color, textAlign | `DRAW_RESULT { nodeId }` |
| `DRAW_FRAME`    | `create_frame`     | x, y, width, height, color, layoutMode, padding\*, itemSpacing    | `DRAW_RESULT { nodeId }` |
| `DRAW_SCREEN`   | `create_screen`    | tree (재귀 노드 트리 정의)                                        | `DRAW_RESULT { nodeId }` |

## 조작

| canvas 타입   | MCP action    | 주요 파라미터            | 응답                      |
| ------------- | ------------- | ------------------------ | ------------------------- |
| `SET_PARENT`  | `set_parent`  | nodeId, parentId, index? | `DRAW_RESULT { nodeId }`  |
| `SET_NAME`    | `set_name`    | nodeId, name             | `DRAW_RESULT { nodeId }`  |
| `REMOVE_NODE` | `remove_node` | nodeId                   | `DRAW_RESULT { success }` |

## 조회

| canvas 타입   | MCP action    | 주요 파라미터              | 응답                                         |
| ------------- | ------------- | -------------------------- | --------------------------------------------- |
| `GET_NODE`    | `get_node`    | nodeId? (없으면 현재 선택) | `DRAW_RESULT { result: SerializedNode }`     |
| `GET_PAGE`    | `get_page`    | —                          | `DRAW_RESULT { result: SerializedNode[] }`   |
| `GET_SELECTION_CONTEXT` | `get_selection_context` | nodeId? 또는 nodeIds? (없으면 현재 선택 전체), maxDepth? | `DRAW_RESULT { result: SelectionContextResult 또는 { selectionCount, contexts: SelectionContextResult[] } }` |
| `EXPORT_NODE` | `export_node` | nodeId?, scale?, format?   | `DRAW_RESULT { result: { base64, nodeId, format } }` |

`EXPORT_NODE`의 `format`은 `PNG`(기본값) 또는 `SVG`입니다. `scale`은 PNG에만 적용됩니다. SVG는 텍스트를 윤곽선으로 내보내며, 응답의 `base64`를 디코딩하면 SVG 원본을 저장할 수 있습니다.

`get_selection_context`는 선택한 노드와 자식 계층을 재귀 조회한다. 각 노드에는
Figma Inspect의 CSS, 위치와 크기, Auto Layout, 도형 스타일, 타이포그래피,
컴포넌트 속성, 변수 바인딩이 포함된다. `maxDepth`를 생략하면 전체 계층을
반환하고, 제한 깊이에 자식이 남아 있으면 `childrenTruncated: true`를 표시한다.
Figma의 혼합 속성값은 `{ "type": "MIXED" }`로 반환해 임의 값으로 대체하지 않는다.

## 시스템

| canvas 타입 | 동작               |
| ----------- | ------------------ |
| `PING`      | `PONG` 응답        |
| `LOG`       | `console.log` 출력 |
| `CLOSE`     | 플러그인 종료      |

## 공통 응답 형태

```ts
// 성공
{ type: 'DRAW_RESULT', id: string, action: string, success: true, nodeId?: string, result?: any }

// 실패
{ type: 'DRAW_RESULT', id: string, action: string, success: false, error: string }
```

전체 통신 흐름과 레이어 구조는 [architecture.md](architecture.md) 참고.

## MCP 프로세스 ↔ WS 데몬 내부 HTTP API

| 엔드포인트 | 동작 |
| --- | --- |
| `GET /v1/status` | `{ pluginConnected: boolean }` 반환 |
| `POST /v1/dispatch?timeout=15000` | `BridgeRequestMessage`를 플러그인에 전달하고 `BridgeResponseMessage` 반환 |

`/status`, `/send`, `dist/ws-server.js` 경로는 더 이상 사용하지 않는다. 데몬 엔트리포인트는 `dist/cli/daemon.js`다.

## 새 action 추가 시 체크리스트

새 MCP action을 추가할 때 아래 항목을 반드시 동시에 수정한다. 하나라도 빠지면 런타임에서 묵묵히 실패한다.

1. **`packages/figma-bridge-protocol/src/actions.ts`** — MCP action 이름과 `ACTION_MAP` 항목 추가
2. **`packages/figma-bridge-mcp/src/tools/`** — action 그룹 파일에 MCP 툴 스키마와 설명 추가
3. **`packages/figma-bridge-protocol/src/canvas-messages.ts`** — canvas 메시지 타입과 payload 타입 추가
4. **`packages/figma-plugin/src/canvas/<action-group>/handler.ts`** — `CANVAS_TYPE`에 대응하는 핸들러 함수 구현
5. **`packages/figma-plugin/src/canvas/dispatch/handle-message.ts`** — dispatch 맵에 handler 등록

## 호환되지 않는 변경

- 데몬 HTTP API가 `/status`, `/send`에서 `/v1/status`, `/v1/dispatch`로 변경되었다.
- MCP 브릿지 프로세스가 실행하는 데몬 엔트리포인트가 `dist/ws-server.js`에서 `dist/cli/daemon.js`로 변경되었다.
- `BridgeMessage.payload`는 성공/실패 union 타입으로 해석한다.

여러 프레임을 Shift로 함께 선택한 뒤 `get_selection_context`를 호출하면 모든 케이스를 함께 읽습니다. `nodeIds`로 ID 목록을 지정할 수도 있습니다. 단일 대상은 기존 `SelectionContextResult`를 반환하고, 여러 대상은 `{ selectionCount, contexts: SelectionContextResult[] }`를 반환합니다. `contexts`는 선택 또는 ID 목록 순서를 유지하며 각 항목의 `root.id`와 `root.name`으로 케이스를 구분합니다. 중복 ID는 한 번만 조회하고, 빈 목록·동시 ID 지정·존재하지 않는 ID는 오류를 반환합니다. `maxDepth`는 각 프레임에 적용되며, 생략하면 전체 계층을 읽습니다.
