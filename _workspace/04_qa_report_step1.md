# QA 검증 보고서 — 1단계

## 검증 결과 요약
- 빌드: **PASS** (`npm run build` 종료 코드 0, `dist/index.js`·`dist/ws-bridge.js` 생성)
- MCP 툴 3개 등록: **PASS** (`create_rectangle`, `create_text`, `create_frame`)
- 메시지 흐름 일치: **PASS** (REQUEST payload ↔ DRAW_* 필드, RESPONSE id echo 매칭 모두 일치)
- 전반적 상태: **READY**

## CRITICAL 버그
없음

## MAJOR 버그
없음

## MINOR 이슈

### M-1. WS 포트 하드코딩 (환경변수 미사용)
- 체크리스트 0단계 항목("WS 서버 포트 하드코딩이 아닌 환경변수로 관리")과 불일치.
- 현재 포트 8765가 3곳에 상수로 박혀 있음:
  - `mcp-bridge/src/index.ts:19` → `const WS_PORT = 8765;`
  - `mcp-bridge/src/ws-bridge.ts:19` → `const DEFAULT_PORT = 8765;`
  - `figma-plugin/ui.html:64` → `var WS_URL = 'ws://localhost:8765';`
- 영향: 1단계 동작에는 문제 없음. 다만 포트 충돌 시 코드 수정이 필요하고, 플러그인 측 URL은 `manifest.json`의 `devAllowedDomains`와도 묶여 있어 변경 시 3~4곳을 함께 고쳐야 함.
- 제안: `process.env.WS_PORT ?? 8765` 형태로 서버 측만이라도 외부화. (플러그인 ui.html은 빌드 타임 치환이 없어 환경변수화가 어려우므로 1단계 범위에서는 보류 가능 — 후속 단계 권장 사항으로 기록.)

### M-2. RESPONSE payload에 항상 `error` 키 포함 (성공 시 undefined)
- `figma-plugin/ui.html:221` → 성공 케이스에서도 `payload: { nodeId, success, error }`로 `error: undefined`가 들어감.
- 영향: 없음. MCP의 `index.ts:73`은 `response.payload?.success`만 성공 판정에 사용하고, 실패 시에만 `payload.error`를 읽으므로 성공 시 `error: undefined`는 무해. JSON 직렬화 시 `undefined` 키는 누락되어 와이어에도 영향 없음.
- 분류: 정보성 관찰. 수정 불필요.

## 검증 로그

### 1. 빌드 검증 — PASS
```
$ cd mcp-bridge && npm run build
> figma-bridge@0.1.0 build
> tsc
---EXIT:0---
```
- `dist/index.js` (5330B), `dist/ws-bridge.js` (4291B) 생성 확인 (17:43 갱신).

### 2. 정적 분석 — PASS

**ws-bridge.ts**
- [x] `pendingRequests: Map<string, (msg) => void>` 필드 존재 (L32)
- [x] `waitForResponse(id, timeout = 10000)` 메서드 존재, 타임아웃 시 Map 삭제 후 reject (L89~101)
- [x] RESPONSE 수신 시 `pendingRequests.get(id)` → 삭제 → 콜백 호출 (L128~136). 미매칭 시 경고 로그.

**index.ts**
- [x] `create_rectangle`, `create_text`, `create_frame` 3개 `server.tool()` 등록 (L88, L110, L130)
- [x] 각 툴이 `dispatch()` 경유 → `bridge.send()` (L50) + `bridge.waitForResponse(id)` (L60) 패턴 사용
- [x] `randomUUID` import (L3) 및 `dispatch` 내 id 생성에 사용 (L49)
- [x] color 미지정 시 `'#000000'`, fontSize 미지정 시 `16` 기본값 주입 — 보고서 명세대로 항상 존재 보장 (L104, L124)

**ui.html**
- [x] WS onmessage `switch(msg.action)`에서 `create_rectangle`/`create_text`/`create_frame` → `DRAW_RECT`/`DRAW_TEXT`/`DRAW_FRAME` 매핑 (L157~170)
- [x] canvas 중계 시 `{ type: drawType, id: msg.id, action: msg.action, ...msg.payload }` 전달 — id·action·payload 필드 모두 canvas로 전파 (L165~168)
- [x] `DRAW_RESULT` 수신 → WS RESPONSE 전송, `id` echo + `success` + `nodeId` 포함 (L216~224)
- [x] 모든 canvas 전송이 `sendToCanvas()` → `{ pluginMessage: ... }` 래핑 (L92~94)

**code.ts**
- [x] `figma.ui.onmessage = async (msg) => {...}` — async 함수 (L25)
- [x] `DRAW_RECT`(L46) / `DRAW_TEXT`(L68) / `DRAW_FRAME`(L89) 케이스 존재
- [x] `DRAW_TEXT`에 `await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })`가 `characters` 설정 전에 위치 (L71~75)
- [x] WebSocket/fetch 직접 사용 없음 (grep 결과 주석 1줄만 매칭, 실제 호출 없음)
- [x] 각 케이스에서 `figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId, success })` 전송, try/catch로 실패 시 `{ success: false, error }` 회신 (L57, L63, L78, L84, L98, L104)

**manifest.json**
- [x] `networkAccess.devAllowedDomains`에 `ws://localhost:8765` 등록됨 (`allowedDomains: ["none"]`은 프로덕션 기본값, dev 연결은 devAllowedDomains로 허용 — 정상)

### 3. 메시지 흐름 경계면 교차 검증 — PASS

방향 A (Claude → Figma): MCP가 보내는 payload 필드 ↔ code.ts가 읽는 msg 필드

| action | MCP payload (index.ts) | canvas 수신 필드 (code.ts) | 일치 |
|--------|------------------------|----------------------------|------|
| create_rectangle | x, y, width, height, color | msg.x, msg.y, msg.width, msg.height, msg.color | ✓ |
| create_text | x, y, content, fontSize | msg.x, msg.y, msg.content, msg.fontSize | ✓ |
| create_frame | name, x, y, width, height | msg.name, msg.x, msg.y, msg.width, msg.height | ✓ |

- ui.html이 `...msg.payload`를 펼쳐 그대로 중계하므로 필드명 변형 없이 1:1 전달됨. 누락·오타 없음.

방향 B (Figma → Claude): RESPONSE id 매칭 체인

```
code.ts: postMessage({ type:'DRAW_RESULT', id: msg.id, ... })   ← REQUEST id를 canvas까지 echo
  → ui.html: ws.send({ id: pm.id, type:'RESPONSE', action, payload:{ nodeId, success, error } })
    → ws-bridge.ts: message.type==='RESPONSE' && pendingRequests.get(message.id) → resolve
      → index.ts: waitForResponse(id) resolve → payload.success 판정 → "생성 완료. nodeId: ..."
```
- id가 REQUEST 생성(randomUUID) → ui.html → code.ts → ui.html → ws-bridge 매칭까지 변형 없이 echo됨. 매칭 로직 정확.
- `type: 'RESPONSE'` 봉투 일치 (bridge-builder 명세의 필수 조건 충족).
- `action` echo는 매칭에 무관(type+id로만 매칭)하며 명세 봉투 형식과도 일치.
- 실패 경로: code.ts try/catch → `success:false`+`error` → ui.html 중계 → index.ts L73에서 `payload.success` falsy 감지 → `"오류: <error>"` (isError). 정상 동작.
- 플러그인 미연결: `bridge.send()`가 false 반환 → index.ts L51 `"Figma 플러그인이 연결되지 않았습니다."` (isError). 정상.

## 서버 재시작 방법 (1단계 적용)

현재 구버전 `dist/index.js`(빌드 17:43 이전 기동)가 PID 17734로 실행 중이다. 1단계 툴(create_*)을 적용하려면 **재빌드된 dist로 프로세스를 재시작**해야 한다.

```bash
# 1) 기존 브릿지 프로세스 종료 (포트 8765 점유 node)
lsof -ti tcp:8765 | xargs kill 2>/dev/null

# 2) 재빌드 (이미 빌드됨 — 안전하게 한 번 더)
cd mcp-bridge && npm run build

# 3) 서버 재기동
node ./mcp-bridge/dist/index.js
```

- MCP 서버가 Claude Code의 stdio MCP 클라이언트로 등록돼 있다면, 재기동 대신 **MCP 서버를 reconnect/reload** 해야 새 dist가 로드된다 (Claude Code 측에서 MCP 재연결).
- 재기동 후 Figma에서 플러그인을 다시 실행하면 ui.html이 `ws://localhost:8765`로 재연결되고 `connected` 이벤트가 로깅된다 (`[WS] Plugin connected`).
