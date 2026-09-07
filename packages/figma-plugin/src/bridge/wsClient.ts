import {
  ACTION_MAP,
  createBridgeMessage,
  isMcpAction,
} from 'figma-bridge-protocol';

import { uuid } from '../utils/uuid';
import {
  WS_URL,
  RECONNECT_DELAY,
  HEARTBEAT_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
} from './constants';

export interface WsClientCallbacks {
  onConnecting: () => void;
  onOpen: () => void;
  onClose: () => void;
  onCanvasMessage: (canvasType: string, msg: Record<string, unknown>) => void;
}

export interface WsClient {
  send: (message: object) => void;
  connect: () => void;
  destroy: () => void;
}

/** 소켓 수명과 응답 확인, 자동 재연결을 관리하고 상태 변화를 알립니다. */
export function createWsClient(callbacks: WsClientCallbacks): WsClient {
  let ws: WebSocket | null = null;
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatId: string | null = null;

  /** 열려 있는 현재 소켓으로 메시지를 보냅니다. */
  function send(message: object) {
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        disconnect(ws);
      }
    }
  }

  /** 현재 연결에 속한 타이머와 이벤트를 해제한 뒤 소켓을 닫습니다. */
  function releaseSocket() {
    if (heartbeatTimer !== null) clearTimeout(heartbeatTimer);
    if (timeoutTimer !== null) clearTimeout(timeoutTimer);
    heartbeatTimer = null;
    timeoutTimer = null;
    heartbeatId = null;
    const socket = ws;
    ws = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }

  /** 한 번의 재시도만 예약합니다. */
  function scheduleReconnect() {
    if (destroyed || reconnectTimer !== null) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY);
  }

  /** 현재 연결의 실패만 반영하고 자동 재연결을 예약합니다. */
  function disconnect(socket: WebSocket) {
    if (destroyed || socket !== ws) return;
    releaseSocket();
    callbacks.onClose();
    scheduleReconnect();
  }

  /** 같은 ID의 pong 응답으로 브릿지의 실제 응답 여부를 확인합니다. */
  function ping(socket: WebSocket) {
    if (destroyed || socket !== ws) return;
    heartbeatId = uuid();
    timeoutTimer = setTimeout(() => disconnect(socket), CONNECTION_TIMEOUT_MS);
    send(createBridgeMessage(heartbeatId, 'EVENT', 'ping'));
  }

  /** 이전 소켓을 정리하고 새 연결을 시도합니다. */
  function connect() {
    if (destroyed) return;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    releaseSocket();
    callbacks.onConnecting();

    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      callbacks.onClose();
      scheduleReconnect();
      return;
    }
    ws = socket;
    let confirmed = false;
    timeoutTimer = setTimeout(() => disconnect(socket), CONNECTION_TIMEOUT_MS);

    socket.onopen = () => {
      if (socket !== ws || destroyed) return;
      if (timeoutTimer !== null) clearTimeout(timeoutTimer);
      send(createBridgeMessage(uuid(), 'EVENT', 'connected'));
      if (socket !== ws) return;
      ping(socket);
    };

    socket.onmessage = (event) => {
      if (socket !== ws || destroyed) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      )
        return;
      const msg = parsed as Record<string, unknown>;

      if (msg.type === 'EVENT' && msg.action === 'pong') {
        if (heartbeatId === null || msg.id !== heartbeatId) return;
        if (timeoutTimer !== null) clearTimeout(timeoutTimer);
        timeoutTimer = null;
        heartbeatId = null;
        if (!confirmed) {
          confirmed = true;
          callbacks.onOpen();
        }
        heartbeatTimer = setTimeout(() => ping(socket), HEARTBEAT_INTERVAL_MS);
        return;
      }
      if (msg.action === 'ping') {
        send(createBridgeMessage(String(msg.id), 'EVENT', 'pong'));
        return;
      }

      const action = String(msg.action);
      if (isMcpAction(action))
        callbacks.onCanvasMessage(ACTION_MAP[action], msg);
    };

    socket.onclose = () => disconnect(socket);
    socket.onerror = () => disconnect(socket);
  }

  /** 종료 후 늦게 도착한 이벤트나 타이머가 다시 연결하지 못하게 합니다. */
  function destroy() {
    destroyed = true;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    releaseSocket();
  }

  return { send, connect, destroy };
}
