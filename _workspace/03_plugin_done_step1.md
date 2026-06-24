# plugin-crafter 1단계 완료 보고

## 수정된 파일
- figma-plugin/ui.html
- figma-plugin/code.ts

## 추가된 핸들러
- ui.html: `create_rectangle`/`create_text`/`create_frame` WS REQUEST → canvas postMessage 중계
  (action별로 `DRAW_RECT`/`DRAW_TEXT`/`DRAW_FRAME` 매핑, `id`와 원본 `action`을 canvas까지 전달)
- ui.html: `DRAW_RESULT` postMessage → WS `RESPONSE` 중계 (`{ id, type:'RESPONSE', action, payload:{ nodeId, success, error } }`)
- code.ts: `DRAW_RECT` / `DRAW_TEXT` / `DRAW_FRAME` 캔버스 노드 생성
- code.ts: `hexToRgb()` 인라인 유틸 추가 (외부 의존성 없음)

## 검증 체크리스트
- [x] code.ts에 fetch/WebSocket 직접 사용 없음 (네트워크는 ui.html iframe 전담 유지)
- [x] DRAW_RESULT에 id echo 포함 (REQUEST id를 canvas까지 전달 후 그대로 echo)
- [x] DRAW_TEXT에 `await figma.loadFontAsync({ family:'Inter', style:'Regular' })` 포함 (characters 설정 전)
- [x] onmessage 핸들러가 async (`figma.ui.onmessage = async (msg) => {...}`)
- [x] 각 DRAW 케이스를 try/catch로 감싸 실패 시 `{ success:false, error }` 전송 + `figma.notify(..., { error:true })`
- [x] manifest.json `devAllowedDomains`에 `ws://localhost:8765` 이미 등록됨 (변경 불필요)
- [x] 모든 canvas postMessage는 `{ pluginMessage: ... }` 래핑 (`sendToCanvas` 경유)

## 메시지 흐름 (확정)
```
WS REQUEST { id, type:'REQUEST', action:'create_rectangle', payload:{x,y,width,height,color} }
  → ui.html: sendToCanvas({ type:'DRAW_RECT', id, action:'create_rectangle', ...payload })
    → code.ts: figma.createRectangle() 등 → figma.ui.postMessage({ type:'DRAW_RESULT', id, action, nodeId, success:true })
      → ui.html: ws.send({ id, type:'RESPONSE', action, payload:{ nodeId, success, error } })
```

## qa-tester 주의사항
1. **빌드 파이프라인 없음**: figma-plugin/ 에는 tsconfig/package.json이 없습니다. `code.ts`는 Figma 플러그인 빌드 시점에 `@figma/plugin-typings`로 `figma`/`__html__` 전역이 해소됩니다. 독립 tsc 실행 시 나오는 `Cannot find name 'figma'` 류 오류는 정상이며(타이핑 미설치), 그 외 로직/문법 오류는 없음을 확인했습니다.
2. **action echo 추가됨**: RESPONSE의 `action`은 원본 action(`create_rectangle` 등)을 echo합니다. MCP의 `waitForResponse`는 `type==='RESPONSE'` + `id` 일치로 매칭하므로 action 값 자체는 매칭에 영향 없음 (spec의 RESPONSE 봉투 형식 준수).
3. **폰트 의존**: `create_text`는 'Inter Regular' 로딩을 전제로 합니다. 테스트 환경(Figma)에 Inter가 없으면 loadFontAsync가 실패하고 `success:false`로 회신됩니다 — 표준 Figma 데스크탑/웹에는 기본 포함.
4. **color 처리**: bridge-builder 보고대로 `create_rectangle`의 color는 항상 HEX 문자열로 도착하므로 옵셔널 분기는 방어용으로만 둠.
5. **통합 테스트 시**: WS 브릿지 + MCP 서버 기동 → Figma에서 플러그인 실행 → ui.html이 `ws://localhost:8765` 연결 → MCP 툴 `create_rectangle/text/frame` 호출 → 캔버스에 노드 생성 + nodeId 회신 확인.
