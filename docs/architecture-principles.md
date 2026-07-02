# 아키텍처 원칙

## 1. 상태 배치 (State Placement)

원칙: 상태를 저장하기 전에 Source of Truth가 어디인지 먼저 정한다.

| 상태 | Source of Truth | 규칙 |
|---|---|---|
| Figma 노드 데이터 (위치, 크기, 색상 등) | Figma 캔버스 자체 (`canvas/` 레이어) | UI/bridge 레이어에 노드 데이터를 캐싱·복제 **금지**. 조회는 항상 `GET_NODE`/`GET_PAGE`로 canvas에 재질의한다. |
| WS 연결 상태 (`connecting`/`connected`/`disconnected`) | `useBridgeConnection`의 FSM | 다른 곳(전역 변수, 별도 `useState`)으로 이중 관리 금지 — 파생 필요 시 FSM에서 파생한다. |
| in-flight 요청 상태 (REQUEST↔RESPONSE 매칭) | `BridgeMessage.id` | id 없는 요청/응답 매칭 로직 추가 금지. 새 메시지 타입도 반드시 id로 왕복을 추적한다. |

금지: "나중에 편하려고" 캔버스 노드 정보를 UI 쪽 state에 복제하는 것. 이 시스템은 서버 상태 캐시(query key, staleness)가 필요한 규모가 아니므로 그 복잡도를 끌어오지 않는다 — 캐시가 생기는 순간 Figma 캔버스 실제 상태와 어긋날 위험(stale)이 생긴다.

## 2. FSM 우선 원칙

원칙: 상태가 3개 이상이고 서로 배타적이며 비동기 이벤트로 전이한다면, boolean 플래그 조합이 아니라 FSM으로 모델링한다.

현재 적용 예: `bridge/types.ts`의 `ConnectionState`(`connecting`/`connected`/`disconnected`)가 `useReducer` 기반 transition 함수로 관리된다.

규칙:
- 새로운 상태를 `isLoading`/`isError`/`isRetrying` 같은 boolean 여러 개로 늘리지 않는다. 상태가 3개 이상 배타적으로 늘어나면 transition 함수 기반 FSM으로 옮긴다.
- 허용되지 않는 전이는 transition 함수에서 명시적으로 막는다 (현재 `disconnected` 상태에서 `OPEN` 이벤트는 무시되는 것처럼).
- canvas 스레드에 장시간 작업(예: `create_screen`의 대량 트리 생성)의 진행 상태가 필요해지면 별도 boolean이 아니라 FSM으로 설계한다.

## 3. 통신 프로토콜 선택 기준

원칙: REST/WebSocket/SSE/gRPC는 취향이 아니라 "누가, 언제, 어느 방향으로, 얼마나 자주 말해야 하는가"로 고른다.

현재 선택과 근거 (변경 시 이 근거를 깨지 않아야 한다):

- **WebSocket (8765, WS 데몬 ↔ Figma 플러그인)**: Claude가 임의 시점에 캔버스에 명령을 보내고 플러그인도 임의 시점에 응답/이벤트를 보내야 하는 양방향·저지연 관계 → WebSocket이 맞다.
- **HTTP (8766, MCP 프로세스 ↔ WS 데몬)**: 도구 호출이 들어올 때만 요청하면 되는 request/response 관계 → REST가 맞다. 상시 연결이 필요 없는데 WebSocket으로 바꾸지 않는다.
- **stdio (Claude ↔ MCP 프로세스)**: MCP 프로토콜 표준을 따른다. 변경 대상 아님.

규칙:
- 새 통신 경로를 추가할 때는 "한 번만 필요한가 / 계속 갱신되어야 하는가", "누가 먼저 말하는가"를 먼저 답하고 프로토콜을 고른다.
- WebSocket 사용 시 재연결(`wsClient.ts`)·순서 보장(id 매칭)·backpressure(데몬은 마지막 연결 1개만 유지, 다중 UI 인스턴스 미지원)를 항상 문서화한다. 이 제약이 바뀌면 [architecture.md](architecture.md)도 함께 갱신한다.
- canvas 스레드는 네트워크를 직접 열지 않는다 — thin/thick 경계(4번)와 연결된 기존 규칙을 유지한다.

## 4. Thin/Thick 경계

원칙: 어떤 레이어가 "데이터를 보여주기만" 하는지, 어떤 레이어가 "복잡한 로컬 로직과 상태를 직접 운영"하는지 구분한다.

레이어 성격:

- **UI iframe (`ui/`, `bridge/`)**: thin — WS 연결/재연결, 메시지 중계만 담당. Figma 도메인 로직(노드 생성 규칙, 색상 변환, 폰트 처리 등)을 넣지 않는다.
- **Canvas 스레드 (`canvas/`)**: thick — Figma API를 직접 쥐고 도형/텍스트/프레임 생성, 노드 조회/직렬화, 색상·폰트·이펙트 변환 같은 실질적 로직을 갖는다.

규칙:
- `bridge/`, `ui/`에 figma 전역 타입이나 노드 생성/변환 로직을 넣지 않는다 (기존 규칙과 일치: `canvas/utils/`는 반대로 UI에서 import 금지).
- 새 MCP action을 추가할 때 "이 로직이 UI에서 처리 가능한가, canvas에서만 가능한가"를 먼저 판단한다. Figma API에 닿는 로직은 예외 없이 `canvas/`에 둔다.

## 5. Agentic UI 설계 원칙

이 프로젝트 자체가 "AI가 도구를 호출해 외부 시스템(Figma 캔버스)을 조작"하는 agentic 구조다. 이를 이 레포 규모에 맞게 규칙화한다.

- **작업 위험도 분류**
  - read only (`GET_NODE`, `GET_PAGE`, `EXPORT_NODE`, `PING`): 승인 없이 자동 실행.
  - write-but-reversible (`DRAW_RECT`, `DRAW_TEXT`, `DRAW_FRAME`, `CREATE_SCREEN`, `SET_PARENT`, `SET_NAME`): 자동 실행 허용 — Figma 자체 Undo(Cmd+Z)로 되돌릴 수 있다.
  - **destructive** (`REMOVE_NODE`): 되돌리기 비용이 상대적으로 크다. 향후 단일 노드 삭제 범위를 넘는 destructive action(예: 다중 삭제, 페이지 초기화)을 추가할 때는 확인 단계 없이 자동 실행하지 않는다.
- **에러는 실패한 단계를 구체적으로 알린다**: `success: false, error: string` 응답에서 `error`는 "실패했습니다" 같은 뭉뚱그린 문구가 아니라 어떤 액션의 어떤 파라미터가 왜 실패했는지 담는다.
- **부분 실패를 구분한다**: `create_screen`처럼 여러 노드를 한 번에 만드는 재귀 액션은 일부 노드 생성이 실패해도 전체를 롤백하지 않고, 성공한 노드와 실패한 노드를 구분해 응답에 담는다.
- **감사 추적**: `BridgeMessage.id`를 요청-액션-결과의 상관관계 키로 취급한다. 로그에 id, action, 성공 여부를 남겨 어떤 Claude 호출이 어떤 캔버스 변경을 만들었는지 추적 가능하게 한다.

## 6. 관측성 최소 기준

원칙: 문제를 "내 컴퓨터에서는 잘 되는데요"로 끝내지 않으려면 무엇을 언제 기록할지 미리 정한다. 이 레포는 RUM/샘플링 인프라가 필요한 규모가 아니므로 핵심만 축소 적용한다.

- 에러 로그에는 최소한 `action`, `id`, 실패 원인을 함께 남긴다 — id 없는 에러 로그 금지.
- PII(개인정보)를 로그에 남기지 않는다. 이 시스템은 디자인 데이터만 다뤄 현재 위험은 낮지만, 향후 사용자 인증/계정 정보가 추가되면 이 규칙을 재확인한다.

## 해당 없음 (검토했으나 이 레포에 적용하지 않는 원칙)

- **RADIO 프레임워크, 자동완성 케이스**: 특정 신규 기능(검색창 등) 설계 프로세스이지 상시 아키텍처 규칙이 아니다. 새 기능 설계 시 참고 자료로만 남긴다.
- **Micro Frontend**: 단일 팀·단일 배포 단위 프로젝트라 Shell/Remote 분리가 주는 이득보다 runtime 조합 비용이 크다. 조직/배포가 여러 팀으로 쪼개지기 전까지 도입하지 않는다.
- **렌더링 전략 (CSR/SSR/SSG/RSC)**: Figma 플러그인 UI는 iframe 내 완전한 CSR이며 서버 렌더링 대상이 아니다.

---

이 문서는 [architecture.md](architecture.md)(현재 구조)·[protocol.md](protocol.md)(메시지 계약)를 보완하는, "왜 이렇게 설계했고 무엇을 지켜야 하는가"에 대한 규칙집이다.
