# plugin-crafter 완료 보고

## 구현된 파일
- figma-plugin/manifest.json
- figma-plugin/code.ts
- figma-plugin/ui.html

## 플러그인 로드 방법
1. Figma 데스크톱 앱 실행 (브라우저 버전은 로컬 플러그인 개발 미지원)
2. 메뉴 → `Plugins` → `Development` → `Import plugin from manifest...`
3. `figma-plugin/manifest.json` 파일 선택
4. 메뉴 → `Plugins` → `Development` → `figma-bridge` 실행
5. 실행 전 `mcp-bridge`가 먼저 떠 있어야 함:
   `cd mcp-bridge && npm install && npm run build && node dist/index.js`
   → `[WS] Listening on ws://localhost:8765` 로그 확인 후 플러그인 실행

## 검증 체크리스트
- [x] manifest.json networkAccess 설정 완료 (`ws://localhost:8765` 등록)
- [x] code.ts fetch/WebSocket 직접 사용 없음 (네트워크는 ui.html 전담)
- [x] ui.html WS 연결 + 재연결 로직 구현 (onclose 시 3초 후 자동 재연결, 수동 Reconnect 버튼)
- [x] postMessage 래핑 (`{ pluginMessage: ... }`) 준수

## 메시지 흐름 구현 요약
- WS `onopen`:
  1. `{ id: uuid, type: 'EVENT', action: 'connected', payload: {} }` → 브릿지로 송신
  2. `{ pluginMessage: { type: 'LOG', message: 'Connected to MCP bridge' } }` → canvas로 송신
- WS `onmessage`: `action === 'ping'` 수신 시 `{ id: 동일 id, type: 'RESPONSE', action: 'pong', payload: {} }` 응답 (id echo)
- canvas(`code.ts`) `figma.ui.onmessage`:
  - `LOG` → `console.log('[Plugin]', message)`
  - `PING` → `figma.ui.postMessage({ type: 'PONG' })`
  - `CLOSE` → `figma.closePlugin()`
- UI `window.onmessage`: canvas의 `PONG` 수신 시 콘솔 로그

## 상태 UI
- 연결 중: "Connecting to MCP bridge..." (노란색)
- 연결 성공: "Connected to MCP bridge ✓" (녹색)
- 끊김: "Disconnected. Retrying..." (빨간색) + Reconnect 버튼 노출

## qa-tester에게 전달할 주의사항
1. `code.ts`는 TypeScript 원본이다. Figma는 `manifest.json`의 `"main": "code.ts"`를 통해
   TS를 직접 로드하지만, 별도 빌드 파이프라인(tsconfig + tsc → code.js)을 쓰는 환경이라면
   `main`을 `code.js`로 바꾸고 컴파일 산출물을 로드해야 한다. 현 0단계는 TS 직접 로드 가정.
2. 브릿지는 **마지막 연결 클라이언트 1개만** 보관한다. 플러그인을 두 번 띄우면 이전 인스턴스 소켓이
   교체되므로, 테스트는 단일 인스턴스로 진행할 것.
3. 연결 검증 포인트:
   - 브릿지 stderr: `connected` EVENT 수신 로그
   - 플러그인 콘솔(Figma → Plugins → Development → Open console): `[Plugin] Connected to MCP bridge`
   - 플러그인 UI: "Connected to MCP bridge ✓" 녹색 표시
4. ping/pong 검증: 브릿지가 `ping` REQUEST를 보내면 UI가 동일 `id`로 `pong` RESPONSE를 echo하는지 확인.
5. 재연결 검증: 브릿지를 종료하면 UI가 "Disconnected. Retrying..."로 바뀌고 3초 주기로 재시도,
   브릿지 재기동 시 자동으로 다시 "Connected"가 되는지 확인.
6. UI는 라이브 미리보기 패널에서도 렌더되지만, 실제 WS 연결/Figma API 동작은 Figma 데스크톱 앱에서만 검증 가능.
