# figma-bridge 구현 플랜

## 0단계: 스캐폴딩 + WS 연결 확인 ✅

### mcp-bridge 설정
- [x] `packages/mcp-bridge/package.json` 생성 (`@modelcontextprotocol/sdk`, `ws`, TypeScript 의존성)
- [x] `packages/mcp-bridge/tsconfig.json` 생성
- [x] `packages/mcp-bridge/src/index.ts` 진입점 작성 (MCP + WS 서버 통합)
- [x] `packages/mcp-bridge/src/ws-bridge.ts` WebSocket 브릿지 구현

### figma-plugin 설정
- [x] `packages/figma-plugin/manifest.json` 생성 (`networkAccess.allowedDomains` 포함)
- [x] `packages/figma-plugin/src/canvas/main.ts` 플러그인 메인 코드 작성
- [x] Preact UI 컴포넌트 구조 (`src/ui/`, `src/bridge/`)

### 검증
- [x] 0단계 통합 검증 완료 (`_workspace/04_qa_report.md`)
- [x] WS 연결 성공 로그 확인 방법 문서화 (qa_report 5번 항목)

---

## 1단계: Claude → Figma (방향 A: 그리기) ✅

### MCP 툴 정의
- [x] `create_rectangle` 툴 구현 (x, y, width, height, color, cornerRadius, stroke, shadow 등)
- [x] `create_text` 툴 구현 (x, y, content, fontSize, fontFamily, fontWeight, textAlign 등)
- [x] `create_frame` 툴 구현 (name, x, y, width, height, Auto Layout, padding 등)

### 플러그인 핸들러
- [x] `canvas/handlers.ts`에 `DRAW_RECT` / `DRAW_TEXT` / `DRAW_FRAME` 핸들러 구현
- [x] `canvas/nodes.ts`에 실제 노드 생성 로직 구현

### 검증
- [ ] Claude Code에서 `create_rectangle` 호출 → Figma 캔버스에 사각형 생성 E2E 확인 (실Figma 연결 필요)

---

## 2단계: Figma → Claude (방향 B: 노드 읽기) ✅ (코드 완료)

### 플러그인 핸들러
- [x] `GET_NODE` 핸들러 — `figma.currentPage.selection[0]` 또는 nodeId로 조회
- [x] `GET_PAGE` 핸들러 — 현재 페이지 최상위 노드 목록 반환
- [x] `canvas/nodeQuery.ts` — `serializeNode` (fills, strokes, effects, children 등 직렬화)

### MCP 툴
- [x] `get_node` 툴 구현 (선택 노드 또는 nodeId 기반 조회)
- [x] `get_page` 툴 구현 (페이지 전체 노드 목록)
- [x] `export_node` 툴 구현 (PNG base64 반환)

### 검증
- [ ] Figma에서 노드 선택 → `get_node` 호출 → Claude에서 데이터 수신 E2E 확인 (실Figma 연결 필요)

---

## 3단계 (디벨롭): 고도화

- [x] 노드 트리 재귀 생성 (`createNodeFromTree` — children 포함, `create_screen` 툴)
- [x] Auto Layout → `layoutMode` / `itemSpacing` / padding CSS 매핑
- [x] 이미지 `exportAsync` → base64 전송 (`export_node` 툴)
- [ ] 디자인 토큰 추출 (색상, 타이포그래피 일괄 수집)
- [ ] WS 재연결 로직 강화 (현재 단일 클라이언트, 멀티 탭 대응)
- [ ] MCP 에러 핸들링 고도화

### 추가 구현된 툴 (플랜 외)
- [x] `set_parent` — 노드를 다른 부모로 이동
- [x] `set_name` — 노드 이름 변경
- [x] `remove_node` — 노드 삭제
- [x] `create_screen` — 노드 트리 일괄 생성 (배치 생성)

---

## 완료 기준
| 단계 | 완료 조건 | 상태 |
|------|----------|------|
| 0단계 | `mcp-bridge` 빌드 성공 + Figma 플러그인 로드 후 WS "connected" 로그 | ✅ 코드 완료 |
| 1단계 | Claude Code 명령 → Figma 캔버스에 사각형 실제 생성 | ✅ 코드 완료 / E2E 미확인 |
| 2단계 | Figma 노드 선택 → Claude Code에서 노드 데이터 수신 | ✅ 코드 완료 / E2E 미확인 |
| 3단계 | 트리 재귀, Auto Layout, export | 부분 완료 |
