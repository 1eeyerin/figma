# bridge-builder 1단계 완료 보고

## 수정된 파일
- mcp-bridge/src/index.ts
- mcp-bridge/src/ws-bridge.ts

## 추가된 MCP 툴
- create_rectangle (x, y, width, height, color?)
- create_text (x, y, content, fontSize?)
- create_frame (name, x, y, width, height)

## 빌드 결과
```
> figma-bridge@0.1.0 build
> tsc
```
오류 없이 성공. `dist/index.js`, `dist/ws-bridge.js` 생성 확인.

## WS REQUEST payload 확정값
plugin-crafter는 ui.html에서 `msg.action`으로 분기하고, `msg.payload`를 그대로 canvas postMessage로 중계하면 됩니다.
모든 REQUEST 봉투: `{ id, type: 'REQUEST', action, payload }`

### action: "create_rectangle"
payload 필드:
- `x: number`
- `y: number`
- `width: number`
- `height: number`
- `color: string` — **항상 존재** (MCP 서버에서 미지정 시 `"#000000"` 기본값 주입). HEX 형식 (예: `#FF5733`)

### action: "create_text"
payload 필드:
- `x: number`
- `y: number`
- `content: string` — 텍스트 내용
- `fontSize: number` — **항상 존재** (MCP 서버에서 미지정 시 `16` 기본값 주입)

### action: "create_frame"
payload 필드:
- `name: string` — 프레임 이름
- `x: number`
- `y: number`
- `width: number`
- `height: number`

## RESPONSE 봉투 (플러그인 → MCP, 반드시 이 형식으로 회신)
```json
// 성공
{ "id": "동일 uuid", "type": "RESPONSE", "action": "<동일 action>", "payload": { "nodeId": "...", "success": true } }

// 실패
{ "id": "동일 uuid", "type": "RESPONSE", "action": "<동일 action>", "payload": { "success": false, "error": "에러 메시지" } }
```

## 주의사항 (plugin-crafter 전달)
1. **`type: 'RESPONSE'` 필수** — MCP의 `waitForResponse`는 `msg.type === 'RESPONSE'`이고 `id`가 일치할 때만 매칭합니다. type이 다르면 응답이 영원히 대기하다 10초 후 타임아웃 에러가 납니다.
2. **`id` echo 필수** — REQUEST의 `id`를 RESPONSE에 그대로 되돌려줘야 매칭됩니다. canvas(code.ts)까지 id를 전달했다가 DRAW_RESULT로 echo하는 흐름(01_spec_step1.md 참조)을 지키세요.
3. **성공 판정 기준** — MCP는 `payload.success`가 truthy일 때만 성공으로 봅니다. `success: true`를 명시적으로 넣으세요. 실패 시 `payload.error` 문자열을 채워야 사용자에게 표시됩니다(`오류: <error>`).
4. **타임아웃 10초** — canvas 처리(폰트 로딩 등)가 10초를 넘기면 타임아웃됩니다. `create_text`의 `figma.loadFontAsync`는 보통 빠르지만 주의.
5. **color는 항상 옴** — `create_rectangle`에서 color를 옵셔널로 다룰 필요 없음. 항상 HEX 문자열이 들어옵니다.

## MCP 측 동작 요약
- `dispatch(action, payload)` 헬퍼가 `randomUUID()`로 id 생성 → `bridge.send` → `bridge.waitForResponse(id, 10000)`.
- 플러그인 미연결(`send` 실패) 시: `"Figma 플러그인이 연결되지 않았습니다."` (isError).
- 타임아웃 시: `"오류: 응답 시간 초과 (...)"` (isError).
- `payload.success` falsy 시: `"오류: <payload.error>"` (isError).
- 성공 시: `"생성 완료. nodeId: <payload.nodeId>"`.
