# figma-bridge 구현 명세 — 0단계

## 목표 단계
**0단계: 스캐폴딩 + WS 연결 확인**

최소 동작 가능한 브릿지를 구성한다:
- MCP 서버가 stdio로 Claude Code와 통신
- WS 서버가 포트 8765에서 Figma 플러그인 UI를 기다림
- Figma 플러그인 UI가 ws://localhost:8765에 연결
- 연결 성공 시 양쪽 모두 "connected" 로그 출력

## 범위 (0단계)
구현할 것:
- `mcp-bridge/package.json`
- `mcp-bridge/tsconfig.json`
- `mcp-bridge/src/index.ts` — MCP 서버 + WS 서버 통합 진입점
- `mcp-bridge/src/ws-bridge.ts` — WebSocket 브릿지 (연결 관리, ping, 메시지 라우팅 기반)
- `figma-plugin/manifest.json`
- `figma-plugin/code.ts`
- `figma-plugin/ui.html`

구현하지 않을 것 (1단계 이후):
- `create_rectangle`, `create_text`, `create_frame` MCP 툴
- 노드 읽기 (`get_selection`)

## 메시지 포맷

### WS 메시지 공통 봉투
```json
{
  "id": "uuid-v4",
  "type": "REQUEST | RESPONSE | EVENT",
  "action": "string",
  "payload": {}
}
```

### 0단계에서 사용하는 메시지
| 방향 | action | 설명 |
|------|--------|------|
| MCP→Plugin | `ping` | 연결 확인 |
| Plugin→MCP | `pong` | ping 응답 |
| Plugin→MCP | `connected` | 플러그인 연결 완료 이벤트 |

### UI ↔ canvas postMessage 포맷
```js
// UI → canvas
parent.postMessage({ pluginMessage: { type: 'PING' } }, '*')
// canvas → UI
figma.ui.postMessage({ type: 'PONG' })
```

## 파일 목록 및 역할

### mcp-bridge/
```
mcp-bridge/
├── package.json          # @modelcontextprotocol/sdk, ws, typescript, ts-node
├── tsconfig.json         # target: ES2020, module: commonjs, strict: true
└── src/
    ├── index.ts          # MCP StdioServerTransport 초기화 + WsBridge 시작
    └── ws-bridge.ts      # WebSocket.Server(port:8765), 클라이언트 관리, 메시지 라우팅
```

### figma-plugin/
```
figma-plugin/
├── manifest.json         # networkAccess.allowedDomains: ["ws://localhost:8765"]
├── code.ts               # figma.showUI + canvas↔UI postMessage 핸들러
└── ui.html               # WS 클라이언트, UI↔canvas postMessage, 상태 표시 UI
```

## 기술 스택
- **MCP SDK**: `@modelcontextprotocol/sdk` (최신)
- **WS 서버**: `ws` 패키지
- **TypeScript**: `^5.0`, `ts-node` for dev, `tsc` for build
- **빌드 결과물**: `mcp-bridge/dist/index.js`

## 실행 방법 (0단계 검증)
```bash
cd mcp-bridge && npm install && npm run build && node dist/index.js
```
Figma에서 플러그인 로드(figma-plugin/ 디렉토리) → 플러그인 실행 → "Plugin connected" 로그 확인.

## 완료 조건
- `npm run build` 성공 (TypeScript 컴파일 에러 없음)
- WS 서버 포트 8765에서 listen 시작 로그
- Figma 플러그인 UI에서 "Connected to MCP bridge" 텍스트 표시
