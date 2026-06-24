// figma-bridge 플러그인 메인 코드 (canvas 측)
//
// 제약사항:
// - 이 파일에서 WebSocket/fetch를 직접 사용하지 않는다. 네트워크는 ui.html iframe 전담.
// - canvas ↔ UI 통신은 postMessage 기반. UI로 보낼 때는 figma.ui.postMessage,
//   UI에서 받을 때는 figma.ui.onmessage 핸들러를 사용한다.
// - UI는 자신이 보내는 메시지를 { pluginMessage: ... }로 래핑하므로,
//   여기서는 래핑이 풀린 본문(msg)을 그대로 수신한다.

// UI(iframe)를 띄운다. __html__ 는 빌드 시 ui.html 내용으로 치환된다.
figma.showUI(__html__, { width: 300, height: 200 });

// UI에서 올라오는 메시지 처리
figma.ui.onmessage = (msg) => {
  if (!msg || typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
    case 'LOG':
      // UI에서 전달한 로그를 plugin 콘솔에 출력
      console.log('[Plugin]', msg.message);
      break;

    case 'PING':
      // UI의 헬스체크 요청에 PONG으로 응답
      figma.ui.postMessage({ type: 'PONG' });
      break;

    case 'CLOSE':
      // 플러그인 종료
      figma.closePlugin();
      break;

    default:
      // 0단계 범위 밖의 메시지는 무시
      break;
  }
};
