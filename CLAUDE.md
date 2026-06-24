# figma-bridge 프로젝트

## 프로젝트 개요
Claude Code ↔ MCP 서버 ↔ Figma 플러그인 양방향 디자인 브릿지.

- **mcp-bridge/**: TypeScript MCP 서버 + WebSocket 브릿지 서버 (단일 프로세스)
- **figma-plugin/**: Figma 플러그인 (`manifest.json` + `code.ts` + `ui.html`)

## 아키텍처
```
Claude Code --[stdio/MCP]--> MCP 서버 --[WebSocket]--> Figma 플러그인 UI --[postMessage]--> 플러그인 코드(canvas)
```

## 하네스: figma-bridge

**목표:** Claude Code에서 명령을 내려 Figma 캔버스를 조작하고, 반대로 Figma 노드를 코드로 변환하는 자동화 에이전트 팀.

**트리거:** MCP 서버 구현, Figma 플러그인 개발, WebSocket 브릿지, 테스트/통합 작업 요청 시 `orchestrate` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

## 핵심 제약사항
- Figma 플러그인 메인 코드(`code.ts`)에서 `fetch`/`WebSocket` 직접 사용 **금지** → 반드시 UI iframe(`ui.html`) 경유
- `manifest.json`의 `networkAccess.allowedDomains`에 WS 주소 등록 필수
- 메시지는 항상 `{ pluginMessage: ... }` 래핑 (UI ↔ canvas postMessage 규칙)
- MCP 툴 응답은 비동기: WS 왕복을 Promise + `id` 매칭으로 처리

## 변경 이력
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-24 | 초기 하네스 구성 | 전체 | - |
