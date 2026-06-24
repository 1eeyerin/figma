---
name: orchestrate
description: "figma-bridge 전체 구현을 단계별로 조율하는 오케스트레이터 스킬. 'MCP 구현', 'Figma 플러그인 만들어', '브릿지 구현', '0단계', '1단계', '2단계 구현', '다시 실행', '재실행', '업데이트', '수정', '보완' 등 figma-bridge 관련 구현/재실행 요청 시 반드시 이 스킬을 사용할 것."
---

# figma-bridge 오케스트레이터

## 실행 모드
**파이프라인 패턴** (순차 의존): bridge-builder → plugin-crafter → qa-tester  
에이전트 팀 + 파일 기반 데이터 전달

## Phase 0: 컨텍스트 확인
`_workspace/` 디렉토리 상태를 확인한다:
- `_workspace/` 미존재 또는 비어있음 → **초기 실행** (Phase 1부터)
- `_workspace/02_bridge_done.md` 있음 + 부분 수정 요청 → **부분 재실행** (해당 단계만)
- 전체 재실행 요청 → `_workspace/`를 `_workspace_prev/`로 이동 후 새 실행

현재 구현 목표 단계를 사용자에게 확인한다:
- **0단계**: WS 연결 확인만 (가장 단순)
- **1단계**: Claude→Figma 사각형 그리기
- **2단계**: Figma→Claude 노드 전송

## Phase 1: 명세 작성
`_workspace/01_spec.md`에 구현 명세를 작성한다:
- 목표 단계 및 범위
- 메시지 포맷 확정
- 파일 목록 및 각 파일 역할

## Phase 2: bridge-builder 실행
bridge-builder 에이전트에게 `_workspace/01_spec.md`를 기반으로 `mcp-bridge/` 구현을 위임한다.  
완료 조건: `_workspace/02_bridge_done.md` 생성

## Phase 3: plugin-crafter 실행
`_workspace/02_bridge_done.md`를 읽은 후 plugin-crafter 에이전트에게 `figma-plugin/` 구현을 위임한다.  
완료 조건: `_workspace/03_plugin_done.md` 생성

## Phase 4: qa-tester 실행
`_workspace/02_bridge_done.md`와 `_workspace/03_plugin_done.md`를 기반으로 qa-tester 에이전트가 통합 검증을 수행한다.  
완료 조건: `_workspace/04_qa_report.md` 생성

## Phase 5: 결과 종합
- `_workspace/04_qa_report.md`의 CRITICAL 버그가 있으면 해당 에이전트에게 수정 요청 후 Phase 4 재실행
- 버그 없으면 사용자에게 실행 방법 안내:
  ```bash
  cd mcp-bridge && npm install && npm run build && npm start
  # 그 후 Figma에서 플러그인 로드 (figma-plugin/ 디렉토리)
  ```

## 데이터 전달
```
_workspace/
├── 01_spec.md          # 오케스트레이터 → bridge-builder
├── 02_bridge_done.md   # bridge-builder → plugin-crafter, qa-tester
├── 03_plugin_done.md   # plugin-crafter → qa-tester
└── 04_qa_report.md     # qa-tester → 오케스트레이터
```

## 에러 핸들링
- 에이전트 실패 시 1회 재시도
- 재실패 시 해당 Phase를 건너뛰고 보고서에 누락 명시

## 테스트 시나리오
- **정상**: 0단계 스캐폴딩 전체 실행 → WS 연결 로그 확인 지침 출력
- **에러**: qa-tester가 CRITICAL 버그 발견 → 해당 에이전트 수정 후 재검증
