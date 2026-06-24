# figma-bridge 구현 명세 — 1단계

## 목표 단계
**1단계: Claude → Figma (방향 A: 그리기)**

MCP 툴로 Claude Code에서 Figma 캔버스에 도형을 생성한다.

## 0단계에서 이어받는 것
- WS 브릿지(`ws-bridge.ts`)는 이미 동작 중 — **수정하지 않아도 됨**
- MCP 서버(`index.ts`)에 툴 정의만 추가
- `ui.html`에 메시지 핸들러 추가, `code.ts`에 canvas 생성 핸들러 추가

## 구현할 MCP 툴 (3개)

### 1. `create_rectangle`
```typescript
{
  name: "create_rectangle",
  description: "Figma 캔버스에 사각형을 생성합니다",
  inputSchema: {
    type: "object",
    properties: {
      x:      { type: "number", description: "X 좌표" },
      y:      { type: "number", description: "Y 좌표" },
      width:  { type: "number", description: "너비" },
      height: { type: "number", description: "높이" },
      color:  { type: "string", description: "HEX 색상 코드 (예: #FF5733)", default: "#000000" }
    },
    required: ["x", "y", "width", "height"]
  }
}
```

### 2. `create_text`
```typescript
{
  name: "create_text",
  description: "Figma 캔버스에 텍스트를 생성합니다",
  inputSchema: {
    type: "object",
    properties: {
      x:        { type: "number" },
      y:        { type: "number" },
      content:  { type: "string", description: "텍스트 내용" },
      fontSize: { type: "number", description: "폰트 크기 (px)", default: 16 }
    },
    required: ["x", "y", "content"]
  }
}
```

### 3. `create_frame`
```typescript
{
  name: "create_frame",
  description: "Figma 캔버스에 프레임을 생성합니다",
  inputSchema: {
    type: "object",
    properties: {
      name:   { type: "string", description: "프레임 이름" },
      x:      { type: "number" },
      y:      { type: "number" },
      width:  { type: "number" },
      height: { type: "number" }
    },
    required: ["name", "x", "y", "width", "height"]
  }
}
```

## MCP 툴 → Figma 메시지 흐름

```
Claude Code
  --[MCP tool call]--> index.ts
    --[WS REQUEST]--> ui.html
      --[postMessage]--> code.ts (canvas 조작)
        --[postMessage 응답]--> ui.html
          --[WS RESPONSE]--> index.ts
            --[MCP tool result]--> Claude Code
```

### WS 메시지 포맷 (0단계 봉투 그대로)
```json
// MCP → Plugin (REQUEST)
{
  "id": "uuid-v4",
  "type": "REQUEST",
  "action": "create_rectangle" | "create_text" | "create_frame",
  "payload": { ...툴 인자 }
}

// Plugin → MCP (RESPONSE)
{
  "id": "동일 uuid",
  "type": "RESPONSE",
  "action": "create_rectangle" | "create_text" | "create_frame",
  "payload": { "nodeId": "figma-node-id", "success": true }
}

// 에러 시
{
  "id": "동일 uuid",
  "type": "RESPONSE",
  "action": "...",
  "payload": { "success": false, "error": "에러 메시지" }
}
```

### UI ↔ canvas postMessage 포맷
```js
// ui.html → code.ts
parent.postMessage({
  pluginMessage: {
    type: 'DRAW_RECT' | 'DRAW_TEXT' | 'DRAW_FRAME',
    id: "uuid",          // WS id 그대로 전달 (응답 매칭용)
    ...payload
  }
}, '*')

// code.ts → ui.html
figma.ui.postMessage({
  type: 'DRAW_RESULT',
  id: "uuid",            // 요청 id 그대로 echo
  nodeId: "...",
  success: true | false,
  error?: "..."
})
```

## 구현 대상 파일

### mcp-bridge/src/index.ts (수정)
- `server.tool()` x3 추가
- 각 툴: `bridge.send(request)` 후 `bridge.waitForResponse(id, timeout=10000)` 로 응답 대기
- 응답 `payload.success === false` 시 MCP 에러 반환
- `WsBridge`에 `waitForResponse(id, timeout)` 메서드 추가 (아래 참조)

### mcp-bridge/src/ws-bridge.ts (수정)
`waitForResponse(id: string, timeout: number): Promise<BridgeMessage>` 추가:
```typescript
waitForResponse(id: string, timeout = 10000): Promise<BridgeMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      this.pendingRequests.delete(id);
      reject(new Error(`Timeout waiting for response to ${id}`));
    }, timeout);
    this.pendingRequests.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
  });
}
```
- `pendingRequests: Map<string, (msg: BridgeMessage) => void>` 필드 추가
- `onmessage` 핸들러에서 `msg.type === 'RESPONSE'` 시 `pendingRequests`에서 콜백 찾아 호출

### figma-plugin/ui.html (수정)
`onmessage` (WS) 핸들러에 추가:
```js
case 'create_rectangle':
case 'create_text':
case 'create_frame':
  // WS REQUEST → canvas postMessage로 중계
  parent.postMessage({
    pluginMessage: {
      type: action === 'create_rectangle' ? 'DRAW_RECT'
          : action === 'create_text'      ? 'DRAW_TEXT'
          :                                 'DRAW_FRAME',
      id: msg.id,
      ...msg.payload
    }
  }, '*')
  break
```
canvas로부터 `DRAW_RESULT` 수신 시:
```js
case 'DRAW_RESULT':
  ws.send(JSON.stringify({
    id: data.id,
    type: 'RESPONSE',
    action: data.action || 'draw_result',
    payload: { nodeId: data.nodeId, success: data.success, error: data.error }
  }))
  break
```

### figma-plugin/code.ts (수정)
`figma.ui.onmessage` 핸들러에 추가:
```typescript
case 'DRAW_RECT': {
  const rect = figma.createRectangle()
  rect.x = msg.x; rect.y = msg.y
  rect.resize(msg.width, msg.height)
  if (msg.color) {
    const hex = msg.color.replace('#', '')
    const r = parseInt(hex.slice(0,2),16)/255
    const g = parseInt(hex.slice(2,4),16)/255
    const b = parseInt(hex.slice(4,6),16)/255
    rect.fills = [{ type: 'SOLID', color: { r, g, b } }]
  }
  figma.currentPage.appendChild(rect)
  figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, nodeId: rect.id, success: true })
  break
}
case 'DRAW_TEXT': {
  const text = figma.createText()
  await figma.loadFontAsync({ family: "Inter", style: "Regular" })
  text.x = msg.x; text.y = msg.y
  text.characters = msg.content
  text.fontSize = msg.fontSize ?? 16
  figma.currentPage.appendChild(text)
  figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, nodeId: text.id, success: true })
  break
}
case 'DRAW_FRAME': {
  const frame = figma.createFrame()
  frame.name = msg.name
  frame.x = msg.x; frame.y = msg.y
  frame.resize(msg.width, msg.height)
  figma.currentPage.appendChild(frame)
  figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, nodeId: frame.id, success: true })
  break
}
```

## HEX → RGB 변환 유틸
`code.ts`에 인라인으로 구현 (외부 의존성 없음):
```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  }
}
```

## UUID 생성
`index.ts`에서 Node.js 내장 `crypto.randomUUID()` 사용 (외부 의존성 없음):
```typescript
import { randomUUID } from 'crypto'
const id = randomUUID()
```

## 완료 기준
- `npm run build` 성공
- MCP 툴 `create_rectangle` 호출 시 Figma 캔버스에 사각형 생성
- 응답에 `nodeId` 포함

## 빌드 방법
```bash
cd /Users/yerinlee/figma/mcp-bridge && npm run build
```
