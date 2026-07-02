import {
  ACTION_MAP,
  createBridgeMessage,
  isMcpAction,
} from 'figma-bridge-protocol';

import { uuid } from '../utils/uuid';
import { WS_URL, RECONNECT_DELAY } from './constants';

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
      send(createBridgeMessage(uuid(), 'EVENT', 'connected'));
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
        send(createBridgeMessage(String(msg.id), 'EVENT', 'pong'));
        return;
      }

      const action = String(msg.action);
      if (isMcpAction(action)) {
        const canvasType = ACTION_MAP[action];
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
