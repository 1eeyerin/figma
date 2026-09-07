import { useEffect, useReducer, useRef } from 'preact/hooks';

import { sendToCanvas, subscribeCanvasMessages } from './canvasChannel';
import type { ConnectionState, ConnectionEvent } from './types';
import { createWsClient } from './wsClient';

/** 연결 시도와 소켓 이벤트를 화면의 단일 연결 상태로 반영합니다. */
export function transition(
  state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  switch (state) {
    case 'connecting':
      if (event.type === 'OPEN') return 'connected';
      if (event.type === 'CLOSE') return 'disconnected';
      return state;
    case 'connected':
      if (event.type === 'CLOSE') return 'disconnected';
      return state;
    case 'disconnected':
      if (event.type === 'CONNECT') return 'connecting';
      return state;
  }
}

/** 브릿지 연결의 수명과 화면 상태를 관리합니다. */
export function useBridgeConnection() {
  const [connState, dispatch] = useReducer(transition, 'connecting');

  // wsClient는 렌더 사이클 밖에서 살아있어야 하므로 ref로 관리
  const clientRef = useRef<ReturnType<typeof createWsClient> | null>(null);

  /** 예약된 재시도를 기다리지 않고 즉시 연결합니다. */
  function reconnect() {
    clientRef.current?.connect();
  }

  useEffect(() => {
    const client = createWsClient({
      onConnecting: () => dispatch({ type: 'CONNECT' }),
      onOpen: () => {
        dispatch({ type: 'OPEN' });
        sendToCanvas({ type: 'LOG', message: 'Connected to MCP bridge' });
      },
      onClose: () => dispatch({ type: 'CLOSE' }),
      onCanvasMessage: (canvasType, msg) => {
        sendToCanvas(
          Object.assign(
            { type: canvasType, id: msg.id, action: msg.action },
            msg.payload ?? {},
          ),
        );
      },
    });

    clientRef.current = client;
    const unsubscribe = subscribeCanvasMessages(client);
    client.connect();

    return () => {
      unsubscribe();
      client.destroy();
    };
  }, []);

  return { connState, reconnect };
}
