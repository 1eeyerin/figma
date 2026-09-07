import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONNECTION_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_DELAY,
} from './constants';
import { createWsClient, type WsClient } from './wsClient';

class MockWebSocket {
  static OPEN = 1;
  static sockets: MockWebSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });

  constructor() {
    MockWebSocket.sockets.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  pong() {
    const ping = JSON.parse(
      this.send.mock.calls[this.send.mock.calls.length - 1][0],
    );
    this.receive({ id: ping.id, type: 'EVENT', action: 'pong' });
  }
}

let client: WsClient;
let callbacks: Parameters<typeof createWsClient>[0];

beforeEach(() => {
  vi.useFakeTimers();
  MockWebSocket.sockets = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  callbacks = {
    onConnecting: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onCanvasMessage: vi.fn(),
  };
  client = createWsClient(callbacks);
});
afterEach(() => {
  client.destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createWsClient (실시간 연결 감지)', () => {
  it('소켓이 열려도 응답을 확인한 뒤에 연결됨을 알린다', () => {
    client.connect();
    const socket = MockWebSocket.sockets[0];
    socket.open();
    expect(callbacks.onOpen).not.toHaveBeenCalled();
    socket.pong();
    expect(callbacks.onOpen).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    socket.pong();
    expect(callbacks.onOpen).toHaveBeenCalledOnce();
    expect(callbacks.onClose).not.toHaveBeenCalled();
  });

  it('닫힌 연결을 자동 복구하며 재시도 시작과 성공을 모두 알린다', () => {
    client.connect();
    const socket = MockWebSocket.sockets[0];
    socket.open();
    socket.pong();
    socket.onclose?.();
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(RECONNECT_DELAY);
    expect(callbacks.onConnecting).toHaveBeenCalledTimes(2);
    const retry = MockWebSocket.sockets[1];
    retry.open();
    retry.pong();
    expect(callbacks.onOpen).toHaveBeenCalledTimes(2);
  });

  it('pong이 없거나 ID가 다르면 연결 끊김을 감지하고 재시도한다', () => {
    client.connect();
    const socket = MockWebSocket.sockets[0];
    socket.open();
    socket.pong();
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    socket.receive({ id: '다른 요청', type: 'EVENT', action: 'pong' });
    vi.advanceTimersByTime(CONNECTION_TIMEOUT_MS);
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(socket.close).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(RECONNECT_DELAY);
    expect(MockWebSocket.sockets).toHaveLength(2);
  });

  it('연결 시작 후 open 이벤트가 오지 않아도 재시도한다', () => {
    client.connect();
    vi.advanceTimersByTime(CONNECTION_TIMEOUT_MS + RECONNECT_DELAY);
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(MockWebSocket.sockets).toHaveLength(2);
  });

  it('생성 실패를 연결 끊김으로 알리고 재시도한다', () => {
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor() {
          throw new Error('실패');
        }
      },
    );
    client.connect();
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.advanceTimersByTime(RECONNECT_DELAY);
    expect(MockWebSocket.sockets).toHaveLength(1);
  });

  it('수동 재시도는 이전 소켓을 닫고 늦은 이벤트를 무시한다', () => {
    client.connect();
    const previous = MockWebSocket.sockets[0];
    const lateClose = previous.onclose;
    const lateOpen = previous.onopen;
    client.connect();
    lateOpen?.();
    lateClose?.();
    expect(previous.close).toHaveBeenCalledOnce();
    expect(callbacks.onClose).not.toHaveBeenCalled();
    const current = MockWebSocket.sockets[1];
    current.open();
    current.pong();
    expect(callbacks.onOpen).toHaveBeenCalledOnce();
  });

  it('종료 후 close 이벤트와 예약된 재시도가 연결을 되살리지 않는다', () => {
    client.connect();
    const socket = MockWebSocket.sockets[0];
    const lateClose = socket.onclose;
    socket.onclose?.();
    client.destroy();
    lateClose?.();
    client.connect();
    vi.advanceTimersByTime(RECONNECT_DELAY * 3);
    expect(MockWebSocket.sockets).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('잘못된 메시지는 무시하고 MCP 요청과 기존 ping은 중계한다', () => {
    client.connect();
    const socket = MockWebSocket.sockets[0];
    socket.open();
    socket.pong();
    socket.onmessage?.({ data: '{' });
    socket.receive(null);
    socket.receive([]);
    socket.receive({ id: 'server-ping', type: 'EVENT', action: 'ping' });
    expect(
      JSON.parse(socket.send.mock.calls[socket.send.mock.calls.length - 1][0]),
    ).toMatchObject({ id: 'server-ping', action: 'pong' });
    const request = {
      id: 'read-1',
      type: 'REQUEST',
      action: 'get_node',
      payload: { nodeId: '1:2' },
    };
    socket.receive(request);
    expect(callbacks.onCanvasMessage).toHaveBeenCalledWith('GET_NODE', request);
  });
});
