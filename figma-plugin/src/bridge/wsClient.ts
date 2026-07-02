import { uuid } from '../utils/uuid';
import { WS_URL, RECONNECT_DELAY, ACTION_MAP } from './constants';
import { createBridgeMessage } from './createBridgeMessage';
import type { BridgeMessage } from './types';

export interface WsClientCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onCanvasMessage: (canvasType: string, msg: Record<string, unknown>) => void;
}

export interface WsClient {
  send: (message: object) => void;
  connect: () => void;
  destroy: () => void;
}

// UI 상태를 모름 — 콜백으로만 외부에 알림
export function createWsClient(callbacks: WsClientCallbacks): WsClient {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function send(message: object) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // BridgeMessage 계약(id/type/action/payload)에 맞춰 조립 후 전송한다.
  function sendBridgeMessage(
    id: string,
    type: BridgeMessage['type'],
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    send(createBridgeMessage(id, type, action, payload));
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  }

  function connect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    try {
      ws = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      sendBridgeMessage(uuid(), 'EVENT', 'connected');
      callbacks.onOpen();
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.action === 'ping') {
        sendBridgeMessage(msg.id as string, 'RESPONSE', 'pong');
        return;
      }

      const canvasType = ACTION_MAP[msg.action as string];
      if (canvasType) {
        callbacks.onCanvasMessage(canvasType, msg);
      }
    };

    ws.onclose = () => {
      callbacks.onClose();
      scheduleReconnect();
    };

    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }

  function destroy() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
  }

  return { send, connect, destroy };
}
