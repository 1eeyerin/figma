# QA 검증 보고서 — 0단계

## 검증 결과 요약
- 빌드 (tsc --noEmit): **PASS** (에러 0, exit 0)
- dist 산출물: **PASS** (`dist/index.js`, `dist/ws-bridge.js` 존재)
- 포트 8765 LISTEN: **PASS** (lsof + nc + 실제 WS 핸드쉐이크 확인)
- WS connected 이벤트 라우팅: **PASS** (봉투 파싱 → 핸들러 호출 확인)
- 제약사항 준수: **PASS** (code.ts 네트워크 직접사용 없음, manifest 등록, pluginMessage 래핑)
- 인터페이스 일치 (브릿지 ↔ 플러그인): **PASS** (BridgeMessage 4필드, ping/pong id echo)
- 전반적 상태: **READY**

## CRITICAL 버그
없음

## MAJOR 버그
없음

## MINOR 이슈
1. **WS 포트 하드코딩** — `src/index.ts:17`의 `WS_PORT = 8765`와 `figma-plugin/ui.html:64`,
   `manifest.json:9`이 모두 상수 하드코딩이다. QA 체크리스트의 "포트를 환경변수로 관리" 권고를 충족하지 못한다.
   다만 플러그인 측(ui.html/manifest)은 Figma가 빌드타임에 주입할 수단이 없어 어차피 정적값이어야 하므로,
   서버 측만 `process.env.WS_PORT ?? 8765`로 바꾸는 정도면 충분. **0단계 진행 차단 요소 아님.**
2. **package.json 산출물 누락 없음 / 단일 클라이언트 한계** — 브릿지가 마지막 연결 1개만 보관(`ws-bridge.ts:44`).
   재연결 시 이전 소켓 교체. 두 보고서 모두 이를 0단계 범위로 명시했으므로 의도된 동작. 테스트 시 단일 인스턴스 사용 권고.
3. **manifest `main: "code.ts"`** — Figma는 TS 직접 로드를 가정하나, 별도 tsc 파이프라인 환경에서는
   `code.js`로 교체 필요. plugin-crafter가 이미 명시함. 0단계 가정 하에서는 문제 없음.

## 인터페이스 교차 검증 (경계면 일치)
| 항목 | 브릿지(기대) | 플러그인(구현) | 일치 |
|------|------|------|------|
| connected 봉투 | `{id,type:'EVENT',action:'connected',payload}` | ui.html:125-130 동일 | O |
| pong 응답 | REQUEST `id` echo, `type:'RESPONSE',action:'pong'` | ui.html:146-153 `id: msg.id` echo | O |
| WS 주소 | ws://localhost:8765 | ui.html:64 / manifest:9 동일 | O |
| canvas postMessage | — | `{ pluginMessage: ... }` 래핑 (ui.html:93) | O |
| code.ts 네트워크 | 금지 | WebSocket/fetch 없음 (grep CLEAN) | O |

## 검증 로그 (실제 출력)
```
=== tsc --noEmit ===
TSC_EXIT=0

=== dist/ ===
index.js
ws-bridge.js

=== 정적 분석 ===
code.ts WebSocket/fetch: CLEAN_NO_VIOLATION
ui.html ws://localhost:8765: 발견 (line 64)
manifest allowedDomains: 발견 (line 9)
ui.html pluginMessage 래핑: 발견 (line 93, 185)

=== WS 서버 구동 ===
[WS] Listening on ws://localhost:8765
[MCP] figma-bridge server connected over stdio
PORT_OK / CONNECTION_OK

=== 실제 WS 핸드쉐이크 (ws 클라이언트) ===
WS_OPEN_OK
[WS] Plugin connected
[WS] Received: EVENT/connected (test-uuid-1)
[Bridge] Plugin reported connected event
[WS] Plugin disconnected
WS_CLOSE_OK
```

## 0단계 실행 가이드 (사용자 테스트 방법)
1. **브릿지 기동**
   ```
   cd mcp-bridge
   npm install        # 최초 1회
   npm run build      # dist/ 생성
   node dist/index.js # [WS] Listening on ws://localhost:8765 확인
   ```
   (실사용 시에는 Claude Code MCP 설정에 stdio 서버로 등록 — 위 직접 실행은 검증용)
2. **Figma 데스크톱 앱**에서 플러그인 로드 (브라우저판은 로컬 플러그인 미지원)
   - 메뉴 → Plugins → Development → Import plugin from manifest...
   - `figma-plugin/manifest.json` 선택
3. **플러그인 실행**: Plugins → Development → figma-bridge
4. **연결 확인 3종**
   - 플러그인 UI: "Connected to MCP bridge ✓" (녹색)
   - 브릿지 stderr: `[WS] Plugin connected` + `[Bridge] Plugin reported connected event`
   - 플러그인 콘솔(Plugins → Development → Open console): `[Plugin] Connected to MCP bridge`
5. **재연결 검증**: 브릿지 종료 → UI "Disconnected. Retrying..." (3초 주기) → 브릿지 재기동 → 자동 "Connected ✓"
   (수동 Reconnect 버튼도 노출됨)

## 결론
0단계(WS 연결 스캐폴딩)는 빌드/실행/인터페이스 일치 모두 통과. **READY.**
CRITICAL/MAJOR 버그 없음. MINOR 이슈는 1단계 이전 선택적 개선 사항이며 진행을 막지 않는다.
실제 Figma 캔버스 내 연결/상태 표시는 데스크톱 앱에서만 최종 검증 가능(코드 레벨 검증 완료).
