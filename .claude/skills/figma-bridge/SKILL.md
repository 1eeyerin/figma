---
name: figma-bridge
description: "MCP 서버와 Figma 플러그인 간 WebSocket 브릿지 구현 스킬. mcp-bridge/ TypeScript 코드 작성, Figma Plugin API 연동, 양방향 메시지 통신 구현. 'MCP 구현', '브릿지 만들어', 'Figma 플러그인 코드', 'WebSocket 연결'이 포함된 요청 시 반드시 이 스킬을 사용할 것."
---

# figma-bridge 구현 스킬

## 디렉토리 구조
```
figma/
├── mcp-bridge/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts        # 진입점 (MCP + WS 서버 통합)
│       ├── mcp-server.ts   # MCP 툴 정의
│       └── ws-bridge.ts    # WebSocket 브릿지 + 메시지 라우팅
└── figma-plugin/
    ├── manifest.json
    ├── code.ts             # 플러그인 메인 코드 (canvas)
    └── ui.html             # UI iframe (WS 클라이언트)
```

## 핵심 패턴: 메시지 흐름

### 방향 A (Claude → Figma)
```
Claude Code --[MCP 툴 호출]--> mcp-server.ts
  --> ws-bridge.ts --[WS send { id, type, payload }]--> ui.html
  --> parent.postMessage({ pluginMessage: ... })
  --> code.ts --[figma.createRectangle() 등 API]--> Figma 캔버스
  <-- 응답 역방향으로 반환 --> MCP 툴 응답
```

### 방향 B (Figma → Claude)
```
플러그인 UI 버튼 클릭
  --> code.ts --[figma.currentPage.selection 직렬화]--> ui.html
  --> ui.html --[WS send]--> ws-bridge.ts
  --> MCP 리소스/툴로 보관
  --> Claude Code가 읽어 코드 생성
```

## 메시지 포맷
```typescript
// 공통 메시지 구조
interface BridgeMessage {
  id: string       // UUID, 요청-응답 매칭용
  type: MessageType
  payload: unknown
}

type MessageType = 
  | 'DRAW_RECT' | 'DRAW_TEXT' | 'DRAW_FRAME'  // 방향 A
  | 'GET_SELECTION' | 'NODE_DATA'               // 방향 B
  | 'ACK' | 'ERROR'                             // 응답
```

## MCP 툴 최소 스펙 (0단계)
```typescript
// create_rectangle 툴
{
  name: 'create_rectangle',
  description: 'Figma 캔버스에 사각형을 그린다',
  inputSchema: {
    x: number, y: number, width: number, height: number,
    color: { r: number, g: number, b: number }  // 0-1 범위
  }
}
```

## manifest.json 필수 설정
```json
{
  "networkAccess": {
    "allowedDomains": ["ws://localhost:3055"],
    "reasoning": "WebSocket 브릿지 서버와 통신"
  }
}
```

## WS 브릿지 요청-응답 패턴
```typescript
// ws-bridge.ts 핵심 패턴
const pending = new Map<string, { resolve, reject }>()

function sendToPlugin(msg: BridgeMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    pending.set(msg.id, { resolve, reject })
    ws.send(JSON.stringify(msg))
    setTimeout(() => {
      pending.delete(msg.id)
      reject(new Error('timeout'))
    }, 10_000)
  })
}

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())
  const handler = pending.get(msg.id)
  if (handler) {
    msg.type === 'ACK' ? handler.resolve(msg.payload) : handler.reject(msg.payload)
    pending.delete(msg.id)
  }
})
```

## 참고
- Figma Plugin API 타입: `@figma/plugin-typings`
- MCP SDK: `@modelcontextprotocol/sdk`
- WS: `ws` npm 패키지
- 포트 기본값: 3055 (환경변수 `BRIDGE_PORT`로 오버라이드 가능)
