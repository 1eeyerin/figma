# figma-bridge 구현 플랜

> 이 파일은 훅(`PostToolUse`)에 의해 자동 업데이트됩니다.
> 에이전트가 `_workspace/0N_*.md` 완료 파일을 생성하면 해당 항목이 자동으로 체크됩니다.

---

## 0단계: 스캐폴딩 + WS 연결 확인

### mcp-bridge 설정
- [ ] `mcp-bridge/package.json` 생성 (`@modelcontextprotocol/sdk`, `ws`, TypeScript 의존성)
- [ ] `mcp-bridge/tsconfig.json` 생성
- [ ] `mcp-bridge/src/index.ts` 진입점 작성 (MCP + WS 서버 통합)
- [ ] `mcp-bridge/src/ws-bridge.ts` WebSocket 브릿지 구현

### figma-plugin 설정
- [ ] `figma-plugin/manifest.json` 생성 (`networkAccess.allowedDomains` 포함)
- [ ] `figma-plugin/code.ts` 플러그인 메인 코드 작성
- [ ] `figma-plugin/ui.html` UI iframe (WS 클라이언트) 작성

### 검증
- [ ] 0단계 통합 검증 완료 (`_workspace/04_qa_report.md`)
- [ ] WS 연결 성공 로그 확인 방법 문서화

---

## 1단계: Claude → Figma (방향 A: 그리기)

### MCP 툴 정의
- [ ] `create_rectangle` 툴 구현 (x, y, width, height, color)
- [ ] `create_text` 툴 구현 (x, y, content, fontSize)
- [ ] `create_frame` 툴 구현 (name, x, y, width, height)

### 플러그인 핸들러
- [ ] `code.ts`에 `DRAW_RECT` / `DRAW_TEXT` / `DRAW_FRAME` 메시지 핸들러 추가
- [ ] 캔버스에 실제로 노드 생성 확인

### 검증
- [ ] Claude Code에서 `create_rectangle` 호출 → Figma 캔버스에 사각형 생성 E2E 확인

---

## 2단계: Figma → Claude (방향 B: 노드 읽기)

### 플러그인 UI
- [ ] "선택한 노드 전송" 버튼 추가
- [ ] `figma.currentPage.selection` 직렬화 구현
- [ ] WS로 노드 데이터 전송

### MCP 리소스/툴
- [ ] `get_selection` 툴 구현 (Figma에서 선택된 노드 반환)
- [ ] 노드 데이터를 Claude가 읽어 React 컴포넌트 생성

### 검증
- [ ] Figma에서 노드 선택 → 버튼 클릭 → Claude Code에서 데이터 수신 → 컴포넌트 파일 생성 E2E 확인

---

## 3단계 (디벨롭): 고도화
- [ ] 노드 트리 재귀 직렬화 (children 포함)
- [ ] Auto Layout → flex/grid CSS 매핑
- [ ] 디자인 토큰 추출 (색상, 타이포그래피)
- [ ] 이미지/벡터 `exportAsync` → base64 전송
- [ ] WS 재연결 로직 강화
- [ ] MCP 에러 핸들링 고도화

---

## 완료 기준
| 단계 | 완료 조건 |
|------|----------|
| 0단계 | `mcp-bridge` 빌드 성공 + Figma 플러그인 로드 후 WS "connected" 로그 |
| 1단계 | Claude Code 명령 → Figma 캔버스에 사각형 실제 생성 |
| 2단계 | Figma 노드 선택 → Claude Code에서 노드 데이터 수신 → 파일 생성 |
