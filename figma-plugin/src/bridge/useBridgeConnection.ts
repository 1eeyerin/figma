import { useEffect, useReducer, useRef } from 'preact/hooks';

import { sendToCanvas, subscribeCanvasMessages } from './canvasChannel';
import type { ConnectionState, ConnectionEvent } from './types';
import { createWsClient } from './wsClient';

function transition(
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
      if (event.type === 'RECONNECT') return 'connecting';
      return state;
  }
}

export function useBridgeConnection() {
  const [connState, dispatch] = useReducer(transition, 'connecting');

  // wsClient는 렌더 사이클 밖에서 살아있어야 하므로 ref로 관리
  const clientRef = useRef<ReturnType<typeof createWsClient> | null>(null);

  function reconnect() {
    dispatch({ type: 'RECONNECT' });
    clientRef.current?.connect();
  }

  useEffect(() => {
    const client = createWsClient({
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
