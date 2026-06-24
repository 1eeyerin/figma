# bridge-builder 완료 보고

## 구현된 파일
- mcp-bridge/package.json
- mcp-bridge/tsconfig.json
- mcp-bridge/src/index.ts
- mcp-bridge/src/ws-bridge.ts

## 빌드 결과
```
> figma-bridge@0.1.0 build
> tsc
```
- `npm install`: 115 packages, 0 vulnerabilities
- `npm run build`: TypeScript 컴파일 에러 없음 (성공)
- 산출물: `dist/index.js`, `dist/ws-bridge.js`

### 스모크 테스트 (node dist/index.js)
```
[WS] Listening on ws://localhost:8765
[MCP] figma-bridge server connected over stdio
```
- 포트 8765에서 LISTEN 확인됨 (lsof 검증 완료)

## WS 메시지 포맷 확정 (plugin-crafter 필독)

### 공통 봉투 (BridgeMessage)
```typescript
interface BridgeMessage {
  id: string;        // UUID v4 — 요청/응답 매칭
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;    // 'ping' | 'pong' | 'connected' 등
  payload?: Record<string, unknown>;
}
```
플러그인 UI는 **반드시 이 4개 필드를 가진 JSON 문자열**을 WS로 송신해야 한다.
JSON 파싱 실패 시 브릿지는 메시지를 무시하고 stderr에 로그만 남긴다.

### 0단계 메시지 흐름
| 방향 | type | action | 비고 |
|------|------|--------|------|
| MCP→Plugin | REQUEST | `ping` | 연결 확인 (브릿지가 send) |
| Plugin→MCP | RESPONSE | `pong` | ping의 `id`를 그대로 echo |
| Plugin→MCP | EVENT | `connected` | UI가 WS 연결 직후 1회 송신 |

플러그인 UI는 WS `onopen` 시점에 다음을 보내야 함:
```json
{ "id": "<uuid>", "type": "EVENT", "action": "connected", "payload": {} }
```

## 주의사항 (plugin-crafter 전달)
1. **연결 주소**: `ws://localhost:8765` — `manifest.json`의 `networkAccess.allowedDomains`에 등록 필수.
2. **WS는 UI(ui.html)에서만** — `code.ts`(canvas)에서 WebSocket 직접 사용 금지. UI↔canvas는 `{ pluginMessage: ... }` 래핑된 postMessage로 통신.
3. **로그 채널**: 브릿지는 stdout을 MCP JSON-RPC 전용으로 쓰므로 모든 로그를 stderr로 출력한다. 플러그인 측 로그는 무관.
4. **단일 클라이언트**: 현재 브릿지는 마지막에 연결된 클라이언트 1개만 보관한다. 재연결 시 이전 소켓은 교체됨. (다중 UI 인스턴스 동시 연결 미지원 — 0단계 범위)
5. **id 매칭**: RESPONSE는 대응하는 REQUEST의 `id`를 그대로 돌려줘야 함. (1단계 툴 응답 매칭의 기반)
6. **disconnect 처리**: UI가 닫히면 브릿지는 `[WS] Plugin disconnected` 로그 후 client를 null 처리. 미연결 상태에서 send 호출 시 `false` 반환 + 경고 로그.
