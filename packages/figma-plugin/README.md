# figma-plugin

AI 코딩 에이전트(Claude Code, Codex) ↔ MCP 서버 ↔ Figma 캔버스를 잇는 브릿지 플러그인.
WebSocket으로 MCP 명령을 수신하고 Figma API로 실행한다.

전체 통신 흐름, 디렉토리 구조, 레이어 간 제약사항은 [../../docs/architecture.md](../../docs/architecture.md) 참고.
메시지 타입별 파라미터·응답 계약은 [../../docs/protocol.md](../../docs/protocol.md) 참고.

## 빌드

```bash
# 프로덕션 빌드 (타입체크 + minify)
npm run build

# 개발 중 watch (파일 저장 시 자동 재빌드)
npm run watch
```

빌드 결과로 `build/main.js`, `build/ui.js`, `manifest.json`이 갱신된다.
Figma에서 플러그인을 닫았다가 다시 열면 변경사항이 반영된다.

## 상태 화면

브릿지의 응답을 주기적으로 확인하고 연결이 끊기면 자동으로 재연결합니다. 현재 페이지와 선택 레이어의 이름·종류·ID를 표시하며, 여러 레이어를 선택하면 첫 이름과 나머지 개수를 요약하고 전체 목록을 펼쳐 볼 수 있습니다. 선택 해제·페이지 전환·이름 변경도 자동 반영됩니다.

최초 업데이트는 저장소 루트에서 `pnpm run build`로 플러그인과 데몬을 함께 빌드한 뒤, 실행 중인 데몬과 Figma 플러그인을 한 번 재시작해야 합니다. 자세한 연결 확인 계약은 [메시지 프로토콜](../../docs/protocol.md#연결-확인과-선택-표시)을 참고하세요.
