import type { ClientRequest, IncomingMessage } from 'http';

import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

import { DaemonClient } from './daemon-client';

function fakeIncomingMessage(statusCode: number) {
  const res = new EventEmitter() as EventEmitter & { statusCode: number };
  res.statusCode = statusCode;
  return res as unknown as IncomingMessage;
}

function fakeRequest() {
  const req = new EventEmitter() as EventEmitter & {
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    setTimeout: ReturnType<typeof vi.fn>;
  };
  req.write = vi.fn();
  req.end = vi.fn();
  req.destroy = vi.fn();
  req.setTimeout = vi.fn();
  return req as unknown as ClientRequest;
}

describe('DaemonClient (데몬 HTTP 클라이언트)', () => {
  it('/v1/status 응답을 파싱한다', async () => {
    const httpGet = vi.fn(
      (_url: string, cb: (res: IncomingMessage) => void) => {
        const req = fakeRequest();
        const res = fakeIncomingMessage(200);
        cb(res);
        queueMicrotask(() => {
          (res as unknown as EventEmitter).emit(
            'data',
            JSON.stringify({ pluginConnected: true }),
          );
          (res as unknown as EventEmitter).emit('end');
        });
        return req;
      },
    );

    const client = new DaemonClient({
      httpGet: httpGet as unknown as typeof import('http').get,
      httpRequest: vi.fn() as unknown as typeof import('http').request,
      httpPort: 8766,
    });

    await expect(client.getStatus()).resolves.toEqual({
      pluginConnected: true,
    });
    expect(httpGet.mock.calls[0][0]).toContain('/v1/status');
  });

  it('/v1/dispatch 성공 응답을 BridgeResponseMessage로 파싱한다', async () => {
    const req = fakeRequest();
    const httpRequest = vi.fn(
      (
        _opts: import('http').RequestOptions,
        cb: (res: IncomingMessage) => void,
      ) => {
        const res = fakeIncomingMessage(200);
        cb(res);
        queueMicrotask(() => {
          (res as unknown as EventEmitter).emit(
            'data',
            JSON.stringify({
              id: 'x',
              type: 'RESPONSE',
              action: 'get_page',
              payload: { success: true },
            }),
          );
          (res as unknown as EventEmitter).emit('end');
        });
        return req;
      },
    );

    const client = new DaemonClient({
      httpGet: vi.fn() as unknown as typeof import('http').get,
      httpRequest: httpRequest as unknown as typeof import('http').request,
      httpPort: 8766,
    });

    await expect(client.dispatch('get_page', {})).resolves.toMatchObject({
      type: 'RESPONSE',
      payload: { success: true },
    });
    expect(
      (httpRequest.mock.calls[0][0] as import('http').RequestOptions).path,
    ).toContain('/v1/dispatch');
  });
});
