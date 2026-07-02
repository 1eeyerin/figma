# 프론트엔드 리팩토링 작업 지시서

`/refactor-structure` 커맨드가 참조하는 실행 지시서다. 이 문서 자체가 작업 원칙·범위·제약사항·보고 형식의 단일 소스이며, 커맨드 파일은 이 문서를 가리키기만 한다.

이 작업을 수행하기 전에 [architecture-principles.md](architecture-principles.md)(상태 배치·FSM 우선·thin/thick 경계 등 필수 아키텍처 규칙)를 반드시 먼저 읽어라. 이번 리팩토링은 그 규칙을 어기지 않는 선에서만 구조를 바꾼다.

## 제1원칙 (최우선, 위반 불가)

**기존 동작과 UI 디자인의 완전한 보존.**

- 모든 변경은 외부에서 관찰 가능한 동작·렌더링 결과가 리팩토링 전과 동일해야 함
- 동작 변경이 불가피하다고 판단되는 지점은 수정하지 말고 보고서에 기록만 할 것
- 확신이 없는 변경은 수행하지 않음 (보수적 접근)

## 목표

코드베이스를 "더 직관적으로 찾고, 더 빠르게 수정할 수 있는" 구조로 개선한다.

## 작업 범위

### 1. 구조 체계 고도화

규칙은 작업 시작 시 기존 코드베이스를 분석해 먼저 정의하고, 전체에 일관 적용한다. 정의 시 아래 항목을 반드시 포함할 것.

- **디렉토리 구조**: `packages/figma-plugin/src`는 계층 단위(layer-based: `ui/` `bridge/` `canvas/` `utils/`)로 구성되어 있고, `packages/figma-bridge-mcp/src`는 평면 구조다. 최상위 레이어 구분(`ui/` `bridge/` `canvas/`)은 유지하되, `canvas/` 내부는 action 그룹별 하위 디렉토리(feature-based)로 나눈다 — 세부 목표 구조는 [frontend-guidelines.md](frontend-guidelines.md)의 "응집도" 섹션 참고.
- **파일 네이밍 컨벤션**: 컴포넌트(PascalCase), 훅(`use-` 접두사), 유틸/상수/타입 파일명 규칙을 확정. 현재 `useBridgeConnection.ts`, `StatusBadge.tsx` 등 기존 컨벤션을 기준선으로 삼는다.
- **배럴 export(`index.ts`) 사용 기준**: 현재 레포에는 재수출용 배럴이 하나도 없다(`index.ts`/`index.tsx`는 번들 엔트리포인트 전용). 새로 배럴을 도입할지 말지, 순환 참조 유발 가능성이 있는 곳(예: `bridge/` ↔ `canvas/` 상호 참조 지점)은 배럴 사용을 금지하는 기준을 문서로 남긴다. 없는 것을 정리하는 게 아니라 **앞으로의 기준을 세우는 작업**임에 유의.
- **~~라우트 경로 네이밍~~ → 메시지/액션 타입 네이밍**: 이 프로젝트는 URL 라우팅이 없는 Figma 플러그인(단일 UI iframe) + MCP stdio 서버다. 대신 `canvas` 메시지 타입(`DRAW_RECT`, `GET_NODE` 등, [protocol.md](protocol.md) 참고)과 MCP action 이름(`create_rectangle` 등)의 네이밍 규칙을 확정하고 혼재를 통일한다.
- **~~API 클라이언트 레이어 네이밍~~ → WS 액션 핸들러/브릿지 콜백 네이밍**: 이 프로젝트에는 REST/GraphQL fetcher나 `useXxxQuery` 훅이 없다. 대신 실제 수정·탐색 빈도가 가장 높은 지점은 `canvas/<action-group>/handler.ts`의 액션별 핸들러 함수, `canvas/dispatch/handle-message.ts`의 dispatch 맵, `bridge/wsClient.ts`의 콜백(`onOpen`/`onClose`/`onCanvasMessage`), `packages/figma-bridge-protocol/src/actions.ts`의 `ACTION_MAP`이다. 이 지점의 네이밍 규칙을 최우선으로 통일한다.
- **스타일 정의 위치**: 이미 컴포넌트-스타일 co-location이 지켜지고 있다(`App.tsx`+`App.module.css`). 이 원칙을 확인하고 예외가 있으면 통일한다.
- **~~상태관리 슬라이스/스토어 간 중복~~ → FSM 중복 로직**: Redux/Zustand 같은 전역 스토어는 없다. `useBridgeConnection`의 FSM(`ConnectionState`) 하나뿐이므로 이 항목은 현재 낮은 우선순위다 — 다만 향후 FSM이 늘어날 경우를 대비해 transition 함수 네이밍/위치 기준만 정의해 둔다.

### 2. 중복 제거 및 통합

아래 대상을 우선 식별한다.

- 중복/유사 컴포넌트
- 중복 커스텀 훅
- 중복 유틸 함수
- 중복 타입/인터페이스 정의 (`BridgeMessage`, `ConnectionState` 등이 여러 곳에 재정의되어 있는지 포함)
- 중복 WS 액션 핸들러 로직 (fetcher 대응)
- 중복 상수·enum (`ACTION_MAP`류)
- 유사한 검증(validation) 로직 (색상/폰트 파싱 등 `canvas/utils/`)
- FSM transition 로직 간 중복

통합 시 기존 사용처 전부를 추적하여 누락 없이 교체한다 (import 경로 변경 포함, `tsc`로 누락 여부 최종 검증 — 아래 제약사항 참고).

### 3. UI 코드 가시성 개선 (선택 사항)

- 수정 빈도가 높은 UI(`ui/`, `bridge/` 중 액션별 로직)와 수정 빈도가 낮은 고정 UI(`App.tsx` 레이아웃, `StatusBadge.tsx` 셸)를 구분하여 배치
- 자주 수정되는 부분이 파일 구조상 먼저 눈에 띄도록 구성
- Props가 지나치게 많은 컴포넌트는 하위 컴포넌트로 분리 여부만 메모 (실행은 별도 승인 후)

## 제약 사항

- **허용**: 타입체크 — 이 레포는 패키지별 `tsconfig.json`이 분리되어 있어 단일 `tsc --noEmit` 명령이 없다. 아래 두 명령을 각 단계마다 모두 통과시킨다.
  ```bash
  tsc -p packages/figma-plugin/tsconfig.json --noEmit
  tsc -p packages/figma-bridge-mcp/tsconfig.json --noEmit
  ```
- **허용(선택)**: 정적 분석 — 이 레포는 ESLint가 아니라 **oxlint**를 쓴다. `pnpm run lint`(검출 전용)만 사용하고 `pnpm run lint:fix`, `pnpm run format`(자동 수정)은 **금지**. 포맷 검사가 필요하면 `pnpm run format:check`(검출 전용)까지만 허용.
- **금지**: 빌드 실행(`pnpm run build`), Playwright 등 실행 기반 검증
- **제외**: 기기 성능·앱 최적화 작업은 수행하지 않음. 단, 작업 중 발견한 최적화 권장사항은 별도 메모로만 축적
- **테스트 파일 이동/분리 시**: `describe`/`it`/`test` 제목의 한글 규칙([testing.md](testing.md))을 반드시 유지한다 — `pre-commit` 훅이 한글 없는 테스트 제목을 자동 차단한다.
- **파일 이동 시**: 로컬 절대경로(`/Users/<사용자명>` 등)를 코드·문서에 하드코딩하지 않는다 — `pre-commit` 훅이 차단한다 ([git-hooks.md](git-hooks.md)).
- **자동 커밋 훅 인지**: 이 세션은 턴 종료(Stop)마다 `.claude/hooks/auto-commit.sh`가 변경사항을 자동 커밋한다. 별도로 수동 `git commit`을 하지 말 것 — 단계별 작업 종료 자체가 곧 커밋 단위가 된다. 한 턴 안에서 너무 많은 무관한 변경을 한꺼번에 몰아넣지 말고, 의미 단위(예: "타입 통합", "핸들러 네이밍 정리")로 턴을 나눠 커밋 히스토리가 읽히게 한다.

## 실행 방식

- 서브에이전트는 Opus 모델로 지정하여 사용 (Agent 도구 호출 시 `model: "opus"`)
- 대규모 변경은 단계별로 분할하고, 각 단계마다 위 두 `tsc --noEmit` 명령 통과를 확인 후 다음 단계로 진행

## 결과 보고 (작업 완료 시)

- 변경 요약: 통합·이동·삭제된 항목 목록
- 구조 Before / After 트리
- 최적화 권장사항 메모 (미수행 항목)
- 동작 보존이 불확실하여 보류한 지점 (있는 경우)
