import * as http from 'http';
import { AddressInfo } from 'net';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { BridgeDaemon, createBridgeDaemon } from './ws-server';

// port: 0 → OS가 빈 포트를 자동 할당. 테스트마다 격리된 포트에서 실제 WS/HTTP로 통신한다.
let daemon: BridgeDaemon | null = null;

afterEach(() => {
  daemon?.close();
  daemon = null;
});

function startDaemon(): { wsPort: number; httpPort: number } {
  daemon = createBridgeDaemon({ wsPort: 0, httpPort: 0 });
  return {
    wsPort: (daemon.wss.address() as AddressInfo).port,
    httpPort: (daemon.httpServer.address() as AddressInfo).port,
  };
}

function httpRequest(
  port: number,
  options: http.RequestOptions,
  body?: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port, ...options },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () =>
          resolve({ statusCode: res.statusCode ?? 0, body: data }),
        );
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('createBridgeDaemon (브릿지 데몬)', () => {
  it('GET /status는 플러그인 미연결 시 pluginConnected:false를 반환한다', async () => {
    const { httpPort } = startDaemon();

    const res = await httpRequest(httpPort, { path: '/status', method: 'GET' });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ pluginConnected: false });
  });

  it('플러그인이 WS로 연결되면 /status가 pluginConnected:true가 된다', async () => {
    const { wsPort, httpPort } = startDaemon();

    const plugin = new WebSocket(`ws://localhost:${wsPort}`);
    await new Promise((resolve) => plugin.on('open', resolve));

    const res = await httpRequest(httpPort, { path: '/status', method: 'GET' });
    expect(JSON.parse(res.body)).toEqual({ pluginConnected: true });

    plugin.close();
  });

  it('플러그인 미연결 상태에서 POST /send는 503을 반환한다', async () => {
    const { httpPort } = startDaemon();

    const res = await httpRequest(
      httpPort,
      {
        path: '/send',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ id: 'm1', type: 'REQUEST', action: 'noop' }),
    );

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body)).toEqual({ error: 'plugin not connected' });
  });

  it('플러그인이 RESPONSE로 응답하면 POST /send가 그 메시지를 그대로 반환한다', async () => {
    const { wsPort, httpPort } = startDaemon();

    const plugin = new WebSocket(`ws://localhost:${wsPort}`);
    await new Promise((resolve) => plugin.on('open', resolve));

    plugin.on('message', (raw) => {
      const received = JSON.parse(raw.toString());
      plugin.send(
        JSON.stringify({
          id: received.id,
          type: 'RESPONSE',
          action: received.action,
          payload: { success: true, nodeId: 'n1' },
        }),
      );
    });

    const res = await httpRequest(
      httpPort,
      {
        path: '/send',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ id: 'm2', type: 'REQUEST', action: 'create_rectangle' }),
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      id: 'm2',
      type: 'RESPONSE',
      action: 'create_rectangle',
      payload: { success: true, nodeId: 'n1' },
    });

    plugin.close();
  });

  it('응답이 timeout 안에 오지 않으면 504를 반환한다', async () => {
    const { wsPort, httpPort } = startDaemon();

    const plugin = new WebSocket(`ws://localhost:${wsPort}`);
    await new Promise((resolve) => plugin.on('open', resolve));
    // 플러그인이 메시지를 받고도 응답하지 않는 상황을 흉내낸다.

    const res = await httpRequest(
      httpPort,
      {
        path: '/send?timeout=200',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ id: 'm3', type: 'REQUEST', action: 'create_rectangle' }),
    );

    expect(res.statusCode).toBe(504);
    expect(JSON.parse(res.body).error).toContain('timeout after 200ms');

    plugin.close();
  });

  it('알 수 없는 경로는 404를 반환한다', async () => {
    const { httpPort } = startDaemon();

    const res = await httpRequest(httpPort, {
      path: '/unknown',
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });
});
