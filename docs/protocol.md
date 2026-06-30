# 메시지 프로토콜

UI iframe ↔ Canvas 사이의 postMessage 계약과, MCP 툴 ↔ canvas 메시지 타입 매핑.
MCP action → canvas 타입 매핑 구현은 `figma-plugin/src/bridge/constants.ts`의 `ACTION_MAP` 참고.

## 생성

| canvas 타입     | MCP action         | 주요 파라미터                                                     | 응답                     |
| --------------- | ------------------ | ----------------------------------------------------------------- | ------------------------ |
| `DRAW_RECT`     | `create_rectangle` | x, y, width, height, color, cornerRadius, strokeColor, shadow     | `DRAW_RESULT { nodeId }` |
| `DRAW_TEXT`     | `create_text`      | x, y, content, fontSize, fontFamily, fontWeight, color, textAlign | `DRAW_RESULT { nodeId }` |
| `DRAW_FRAME`    | `create_frame`     | x, y, width, height, color, layoutMode, padding\*, itemSpacing    | `DRAW_RESULT { nodeId }` |
| `CREATE_SCREEN` | `create_screen`    | tree (재귀 노드 트리 정의)                                        | `DRAW_RESULT { nodeId }` |

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
| `EXPORT_NODE` | `export_node` | nodeId?, scale?            | `DRAW_RESULT { result: { base64, nodeId } }` |

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
