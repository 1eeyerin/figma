import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import { PluginSocket } from './plugin-socket';

describe('PluginSocket (플러그인 연결 관리)', () => {
  it('마지막 연결된 소켓만 현재 연결로 유지한다', () => {
    const first = new EventEmitter() as WebSocket;
    const second = new EventEmitter() as WebSocket;
    Object.defineProperty(first, 'readyState', { value: WebSocket.OPEN });
    Object.defineProperty(second, 'readyState', { value: WebSocket.OPEN });

    const plugin = new PluginSocket();
    plugin.attach(first);
    plugin.attach(second);

    expect(plugin.isConnected()).toBe(true);
    expect(plugin.current).toBe(second);
  });

  it('열린 소켓이 없으면 send가 false를 반환한다', () => {
    const plugin = new PluginSocket();

    expect(
      plugin.send({
        id: 'id-1',
        type: 'REQUEST',
        action: 'get_page',
        payload: {},
      }),
    ).toBe(false);
  });

  it('열린 소켓에는 JSON 메시지를 전송한다', () => {
    const socket = new EventEmitter() as EventEmitter & {
      readyState: number;
      send: ReturnType<typeof vi.fn>;
    };
    Object.defineProperty(socket, 'readyState', { value: WebSocket.OPEN });
    socket.send = vi.fn();

    const plugin = new PluginSocket();
    plugin.attach(socket as unknown as WebSocket);

    expect(
      plugin.send({
        id: 'id-1',
        type: 'REQUEST',
        action: 'get_page',
        payload: {},
      }),
    ).toBe(true);
    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining('"action":"get_page"'),
    );
  });
});
