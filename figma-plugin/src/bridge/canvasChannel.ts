import type { WsClient } from './wsClient';

// canvas(code.ts)로 메시지 발신
export function sendToCanvas(message: object) {
  parent.postMessage({ pluginMessage: message }, '*');
}

// canvas → UI 메시지 수신 후 WS로 중계
export function subscribeCanvasMessages(wsClient: WsClient): () => void {
  function handleMessage(event: MessageEvent) {
    const pm = event.data?.pluginMessage;
    if (!pm) return;
    if (pm.type === 'PONG') return;

    if (pm.type === 'DRAW_RESULT') {
      wsClient.send({
        id: pm.id,
        type: 'RESPONSE',
        action: pm.action ?? 'draw_result',
        payload: {
          nodeId: pm.nodeId,
          success: pm.success,
          error: pm.error,
          result: pm.result,
        },
      });
    }
  }

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}
