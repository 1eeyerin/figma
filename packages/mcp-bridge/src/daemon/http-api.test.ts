import { describe, expect, it } from 'vitest';

import { createHttpHandler } from './http-api';
import { PendingRequestStore } from './pending-store';
import { PluginSocket } from './plugin-socket';

describe('createHttpHandler (데몬 HTTP API)', () => {
  it('/v1/status는 플러그인 연결 상태를 반환한다', async () => {
    const plugin = new PluginSocket();
    const pending = new PendingRequestStore();
    const handler = createHttpHandler({ plugin, pending });

    const response = await handler({
      method: 'GET',
      path: '/v1/status',
      body: '',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ pluginConnected: false });
  });

  it('플러그인 미연결 상태의 /v1/dispatch는 503을 반환한다', async () => {
    const plugin = new PluginSocket();
    const pending = new PendingRequestStore();
    const handler = createHttpHandler({ plugin, pending });

    const response = await handler({
      method: 'POST',
      path: '/v1/dispatch',
      body: JSON.stringify({
        id: 'id-1',
        type: 'REQUEST',
        action: 'get_page',
        payload: {},
      }),
    });

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({
      error: 'plugin not connected',
    });
  });
});
