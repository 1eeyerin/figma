# 사용 방법

## 실행 책임

MCP stdio 서버는 매니페스트의 `mcpServers` 설정에 따라 Codex/Claude 세션에서 자동 실행된다.

Figma 캔버스 작업에는 별도 bridge daemon 프로세스가 필요하다. 이 daemon 하나가 Figma 플러그인용 WebSocket(`ws://localhost:8765`)과 MCP 내부 진단/전달용 HTTP 엔드포인트(`http://localhost:8766`)를 함께 연다. 정상 상태에서는 MCP 서버가 daemon 상태를 확인하고, 실행 중이 아니면 직접 실행한다.

에이전트는 Figma 작업 전 bridge daemon이 응답하지 않으면 사용자에게 맡기지 말고 직접 daemon 실행 또는 진단을 수행한다.

사용자가 직접 해야 하는 것은 Figma 앱에서 `figma-bridge` 플러그인을 열어 `Connected ✓` 상태로 만드는 것뿐이다.

## 작업 절차

1. Codex/Claude 세션에서 `figma-bridge` MCP 도구가 노출되어 있는지 확인한다.
2. bridge daemon 상태를 확인한다. 응답하지 않으면 에이전트가 daemon 프로세스를 실행하거나 원인을 진단한다.
3. 사용자에게 Figma 앱에서 `figma-bridge` 플러그인을 실행해 `Connected ✓` 상태를 확인해 달라고 안내한다.
4. 연결이 확인되면 `create_rectangle`, `create_text`, `create_frame` 등 MCP 도구로 캔버스 작업을 수행한다.

## 선택 프레임을 코드 구현에 활용

1. Figma에서 구현할 프레임 또는 노드를 정확히 하나 선택한다.
2. `get_selection_context`를 호출해 선택 노드와 전체 자식 계층의 Inspect CSS와 디자인 속성을 조회한다.
3. 응답이 너무 크면 `maxDepth`로 깊이를 제한하고, 필요한 하위 노드 ID를 `nodeId`로 다시 조회한다.
4. `export_node`는 PNG로 시각 비교하거나, `format: "SVG"`로 로고·아이콘 원본을 추출할 때 사용한다. 이미지에서 수치나 색상을 추정하지 않는다. SVG 응답의 `format`을 확인하고 `base64`를 디코딩해 저장한다. 응답에 형식이 없으면 Figma 플러그인을 재실행한다.
5. 코드에는 `get_selection_context`가 반환한 값만 사용하며, `MIXED`이거나 누락된 필수 값은 임의로 대체하지 않는다.

예시 요청:

```text
Figma에서 현재 선택한 프레임을 get_selection_context로 조회하고,
응답에서 확인한 값만 사용해 현재 저장소의 기존 컴포넌트와 토큰에 맞춰 구현해 주세요.
필수 값이 MIXED이거나 누락되면 추정하지 말고 중단해 주세요.
```

## 수동 진단

MCP 서버는 시작 시 preflight를 실행한다. 검사 항목은 Node 버전, `dist/index.js`, daemon 스크립트, `figma-bridge-protocol`/`ws` 로드 가능 여부, `8765`/`8766` 포트 상태다. 실패하면 MCP stderr에 상세 결과를 출력하고, MCP 도구 호출 시 같은 내용을 에러 응답으로 반환한다.

bridge daemon의 HTTP 진단 엔드포인트를 직접 확인해야 할 때는 아래를 사용한다.

```bash
curl http://localhost:8766/v1/status
```

daemon을 직접 실행해야 할 때는 아래를 사용한다.

```bash
node packages/figma-bridge-mcp/dist/cli/daemon.js
```
