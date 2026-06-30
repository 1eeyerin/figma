---
name: figma-bridge
description: "figma-bridge를 사용해 Figma 캔버스를 조작하는 스킬. MCP 서버 실행, 플러그인 연결 확인, 툴 호출로 도형/텍스트/프레임 생성. 'MCP 실행', '사각형 그려줘', 'Figma에 만들어줘', '연결 확인' 요청 시 이 스킬을 사용할 것."
---

# figma-bridge 사용 스킬

## MCP 서버 실행

```bash
cd mcp-bridge   # 프로젝트 루트 기준
npm run build && node dist/index.js
```

- 포트: `ws://localhost:8765`
- Figma에서 플러그인 로드 후 UI에 "Connected ✓" 표시되면 준비 완료

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

## 통신 흐름 (참고)

```
Claude → MCP 툴 호출 → WS(8765) → Figma UI iframe → postMessage → Canvas API
                                                                   ↓
Claude ← MCP 응답(nodeId) ← WS RESPONSE ← postMessage(DRAW_RESULT)
```

응답에는 생성된 노드의 `nodeId`가 포함된다.
전체 메시지 타입(조작/조회/시스템 포함)과 파라미터 상세는 `docs/protocol.md` 참고.

## 트러블슈팅

- **"Figma 플러그인이 연결되지 않았습니다"** → Figma에서 플러그인 실행 후 UI의 상태 확인
- **응답 시간 초과** → 플러그인 UI와 MCP 서버가 같은 포트(8765)를 바라보는지 확인
- **포트 충돌** → `lsof -i :8765` 로 점유 프로세스 확인 후 종료
