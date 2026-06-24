// figma-bridge 플러그인 메인 코드 (canvas 측)
//
// 제약사항:
// - 이 파일에서 WebSocket/fetch를 직접 사용하지 않는다. 네트워크는 ui.html iframe 전담.
// - canvas ↔ UI 통신은 postMessage 기반. UI로 보낼 때는 figma.ui.postMessage,
//   UI에서 받을 때는 figma.ui.onmessage 핸들러를 사용한다.
// - UI는 자신이 보내는 메시지를 { pluginMessage: ... }로 래핑하므로,
//   여기서는 래핑이 풀린 본문(msg)을 그대로 수신한다.

// UI(iframe)를 띄운다. __html__ 는 빌드 시 ui.html 내용으로 치환된다.
figma.showUI(__html__, { width: 300, height: 200, position: { x: 100, y: 100 } });

// HEX(#RRGGBB) → Figma RGB(0~1) 변환. 외부 의존성 없이 인라인 구현.
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

// UI에서 올라오는 메시지 처리.
// await figma.loadFontAsync 를 쓰기 위해 async 핸들러로 선언한다.
figma.ui.onmessage = async (msg) => {
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

    case 'DRAW_RECT': {
      // 사각형 생성 (방향 A)
      try {
        const rect = figma.createRectangle();
        rect.x = msg.x;
        rect.y = msg.y;
        rect.resize(msg.width, msg.height);
        if (msg.color) {
          rect.fills = [{ type: 'SOLID', color: hexToRgb(msg.color) }];
        }
        figma.currentPage.appendChild(rect);
        figma.ui.postMessage({
          type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: rect.id, success: true,
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('사각형 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    case 'DRAW_TEXT': {
      // 텍스트 생성 (방향 A). 폰트 로딩 후 characters 설정 필수.
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        const text = figma.createText();
        text.x = msg.x;
        text.y = msg.y;
        text.characters = msg.content;
        text.fontSize = msg.fontSize || 16;
        figma.currentPage.appendChild(text);
        figma.ui.postMessage({
          type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: text.id, success: true,
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('텍스트 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    case 'DRAW_FRAME': {
      // 프레임 생성 (방향 A)
      try {
        const frame = figma.createFrame();
        frame.name = msg.name;
        frame.x = msg.x;
        frame.y = msg.y;
        frame.resize(msg.width, msg.height);
        figma.currentPage.appendChild(frame);
        figma.ui.postMessage({
          type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: frame.id, success: true,
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('프레임 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    default:
      // 알 수 없는 메시지는 무시
      break;
  }
};
