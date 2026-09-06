---
name: figma-bridge
description: "figma-bridge를 사용해 Figma 캔버스를 조작하는 스킬. MCP 서버 실행, 플러그인 연결 확인, 툴 호출로 도형/텍스트/프레임 생성. 'MCP 실행', '사각형 그려줘', 'Figma에 만들어줘', '연결 확인' 요청 시 이 스킬을 사용할 것."
---

# figma-bridge 사용 스킬

## MCP 서버 실행

```bash
cd packages/figma-bridge-mcp   # 프로젝트 루트 기준
npm run build && node dist/index.js
```

- 포트: `ws://localhost:8765`
- Figma에서 플러그인 로드 후 UI에 "Connected ✓" 표시되면 준비 완료

## 버전업 후 업데이트

버전이 올라가면 설치된 에이전트만 갱신한다.

```bash
pnpm run plugins:update
```

Codex와 Claude Code가 모두 설치되어 있으면 둘 다 갱신하고, 하나만 설치되어 있으면 그 하나만 갱신한다.

## 사용 가능한 MCP 툴

### create_rectangle
Figma 캔버스에 사각형 생성

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| x | number | ✓ | X 좌표 |
| y | number | ✓ | Y 좌표 |
| width | number | ✓ | 너비 |
| height | number | ✓ | 높이 |
| color | string | - | HEX 색상 (기본 `#000000`) |

### create_text
Figma 캔버스에 텍스트 생성

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| x | number | ✓ | X 좌표 |
| y | number | ✓ | Y 좌표 |
| content | string | ✓ | 텍스트 내용 |
| fontSize | number | - | 폰트 크기 px (기본 16) |

### create_frame
Figma 캔버스에 프레임 생성

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| name | string | ✓ | 프레임 이름 |
| x | number | ✓ | X 좌표 |
| y | number | ✓ | Y 좌표 |
| width | number | ✓ | 너비 |
| height | number | ✓ | 높이 |

### get_selection_context

현재 선택한 단일 노드와 자식 계층의 코드 구현용 디자인 컨텍스트를 조회한다.

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| nodeId | string | - | 생략하면 현재 선택한 단일 노드 사용 |
| maxDepth | number | - | 재귀 조회 최대 깊이. 생략하면 전체 계층 조회 |

- Figma Inspect CSS와 레이아웃, 스타일, 타이포그래피, 컴포넌트 속성, 변수 바인딩을 반환한다.
- 응답이 너무 크면 `maxDepth`를 지정하고 필요한 하위 노드를 `nodeId`로 다시 조회한다.
- `{ "type": "MIXED" }` 또는 누락된 필수 값은 임의 값으로 대체하지 않는다.
- `export_node` 이미지는 시각 검증에만 사용하고 디자인 값을 추정하는 근거로 사용하지 않는다.

### export_node

노드를 PNG 또는 SVG로 내보내고 `{ base64, nodeId, format }`을 반환한다.

- `nodeId`: 생략하면 현재 선택 노드를 사용한다.
- `format`: `PNG`(기본값) 또는 `SVG`를 지정한다.
- `scale`: PNG 배율이며 SVG에서는 무시한다.
- 로고·아이콘 원본은 `format: "SVG"`로 호출한 뒤 `base64`를 디코딩해 `.svg`로 저장한다. 텍스트는 윤곽선으로 내보낸다.
- SVG 요청 응답의 `format`이 `SVG`가 아니면 구버전 플러그인이므로 재실행을 요청한다. PNG를 SVG로 간주하거나 경로를 추정하지 않는다.

## 통신 흐름 (참고)

```
AI 코딩 에이전트 → MCP 툴 호출 → WS(8765) → Figma UI iframe → postMessage → Canvas API
                                                                   ↓
AI 코딩 에이전트 ← MCP 응답(nodeId) ← WS RESPONSE ← postMessage(DRAW_RESULT)
```

응답에는 생성된 노드의 `nodeId`가 포함된다.
전체 메시지 타입(조작/조회/시스템 포함)과 파라미터 상세는 `docs/protocol.md` 참고.

## 트러블슈팅

- **"Figma 플러그인이 연결되지 않았습니다"** → Figma에서 플러그인 실행 후 UI의 상태 확인
- **응답 시간 초과** → 플러그인 UI와 MCP 서버가 같은 포트(8765)를 바라보는지 확인
- **포트 충돌** → `lsof -i :8765` 로 점유 프로세스 확인 후 종료
