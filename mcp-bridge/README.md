# mcp-bridge

Claude Code ↔ Figma 플러그인을 잇는 MCP 서버.
MCP 툴 호출을 받아 WebSocket으로 Figma 플러그인에 중계한다.

전체 통신 흐름, 프로세스 구조, 레이어 간 제약사항은 [../docs/architecture.md](../docs/architecture.md) 참고.
메시지 타입별 파라미터·응답 계약은 [../docs/protocol.md](../docs/protocol.md) 참고.

## 빌드

```bash
# 프로덕션 빌드
npm run build

# 개발 중 watch (파일 저장 시 자동 재빌드)
npm run watch
```

빌드 결과로 `dist/`가 갱신된다. `npm run start`로 MCP 프로세스를 직접 실행할 수 있다.
