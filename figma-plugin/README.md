# figma-plugin

Claude Code ↔ MCP 서버 ↔ Figma 캔버스를 잇는 브릿지 플러그인.
WebSocket으로 MCP 명령을 수신하고 Figma API로 실행한다.

전체 통신 흐름, 디렉토리 구조, 레이어 간 제약사항은 [../docs/architecture.md](../docs/architecture.md) 참고.
메시지 타입별 파라미터·응답 계약은 [../docs/protocol.md](../docs/protocol.md) 참고.

## 빌드

```bash
# 프로덕션 빌드 (타입체크 + minify)
npm run build

# 개발 중 watch (파일 저장 시 자동 재빌드)
npm run watch
```

빌드 결과로 `build/main.js`, `build/ui.js`, `manifest.json`이 갱신된다.
Figma에서 플러그인을 닫았다가 다시 열면 변경사항이 반영된다.
