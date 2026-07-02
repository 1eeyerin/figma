import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

import { WsBridge } from './ws-bridge';

// http.get/http.request가 콜백으로 넘기는 res 객체와, 반환하는 req 객체를 흉내내는 fake.
// 실제 네트워크 없이 'data'/'end'/'error' 이벤트만 직접 emit해 분기를 검증한다.
function fakeIncomingMessage(statusCode: number) {
  const res = new EventEmitter() as EventEmitter & { statusCode: number };
  res.statusCode = statusCode;
  return res;
}

function fakeClientRequest() {
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
  return req;
}

describe('WsBridge (WebSocket 브릿지)', () => {
  it('프로세스나 연결을 시작하지 않고 생성된다', () => {
    const bridge = new WsBridge();
    expect(bridge).toBeInstanceOf(WsBridge);
  });

  describe('start (데몬 기동)', () => {
    it('데몬이 이미 떠 있으면 spawn하지 않고 재사용한다', async () => {
      const spawnFn = vi.fn();
      const httpGet = vi.fn((_url: string, cb: any) => {
        const req = fakeClientRequest();
        const res = fakeIncomingMessage(200);
        cb(res);
        queueMicrotask(() => {
          res.emit('data', JSON.stringify({ pluginConnected: true }));
          res.emit('end');
        });
        return req as any;
      });

      const bridge = new WsBridge({ httpGet, spawn: spawnFn });
      await bridge.start();

      expect(spawnFn).not.toHaveBeenCalled();
    });

    it('데몬 스크립트가 없으면 degraded mode로 빠지고 spawn하지 않는다', async () => {
      const spawnFn = vi.fn();
      const httpGet = vi.fn((_url: string, _cb: any) => {
        const req = fakeClientRequest();
        queueMicrotask(() => req.emit('error', new Error('ECONNREFUSED')));
        return req as any;
      });

      const bridge = new WsBridge({
        httpGet,
        spawn: spawnFn,
        existsSync: () => false,
      });
      await bridge.start();

      expect(spawnFn).not.toHaveBeenCalled();
    });

    it('데몬이 없고 스크립트는 있으면 spawn한다', async () => {
      let pingCount = 0;
      const httpGet = vi.fn((_url: string, cb: any) => {
        const req = fakeClientRequest();
        pingCount += 1;
        if (pingCount === 1) {
          // start()의 최초 pingDaemon: 연결 실패
          queueMicrotask(() => req.emit('error', new Error('ECONNREFUSED')));
        } else {
          // spawnDaemon()의 폴링: 즉시 성공
          const res = fakeIncomingMessage(200);
          cb(res);
          queueMicrotask(() => {
            res.emit('data', JSON.stringify({ pluginConnected: false }));
            res.emit('end');
          });
        }
        return req as any;
      });

      const fakeProc = new EventEmitter();
      const spawnFn = vi.fn(() => fakeProc as any);

      const bridge = new WsBridge({
        httpGet,
        spawn: spawnFn,
        existsSync: () => true,
        daemonScript: '/fake/daemon.js',
      });
      await bridge.start();

      expect(spawnFn).toHaveBeenCalledWith(
        'node',
        ['/fake/daemon.js'],
        expect.any(Object),
      );
    }, 10000);
  });

  describe('sendAndWait (요청/응답)', () => {
    it('200 응답을 BridgeMessage로 파싱해 반환한다', async () => {
      const req = fakeClientRequest();
      const httpRequest = vi.fn((_opts: any, cb: any) => {
        const res = fakeIncomingMessage(200);
        cb(res);
        queueMicrotask(() => {
          res.emit(
            'data',
            JSON.stringify({
              id: 'x',
              type: 'RESPONSE',
              action: 'a',
              payload: { success: true },
            }),
          );
          res.emit('end');
        });
        return req as any;
      });

      const bridge = new WsBridge({ httpRequest });
      const result = await bridge.sendAndWait('create_rectangle', {});

      expect(result.payload).toEqual({ success: true });
    });

    it('200이 아닌 응답이면 payload의 error 메시지로 reject한다', async () => {
      const req = fakeClientRequest();
      const httpRequest = vi.fn((_opts: any, cb: any) => {
        const res = fakeIncomingMessage(503);
        cb(res);
        queueMicrotask(() => {
          res.emit('data', JSON.stringify({ error: 'plugin not connected' }));
          res.emit('end');
        });
        return req as any;
      });

      const bridge = new WsBridge({ httpRequest });
      await expect(bridge.sendAndWait('create_rectangle', {})).rejects.toThrow(
        'plugin not connected',
      );
    });

    it('요청 자체가 에러나면 Daemon unreachable로 reject한다', async () => {
      const req = fakeClientRequest();
      const httpRequest = vi.fn(() => {
        queueMicrotask(() => req.emit('error', new Error('ECONNREFUSED')));
        return req as any;
      });

      const bridge = new WsBridge({ httpRequest });
      await expect(bridge.sendAndWait('create_rectangle', {})).rejects.toThrow(
        'Daemon unreachable',
      );
    });
  });

  describe('isPluginConnected (플러그인 연결 확인)', () => {
    it('status 조회가 실패하면 false를 반환한다', async () => {
      const httpGet = vi.fn((_url: string, _cb: any) => {
        const req = fakeClientRequest();
        queueMicrotask(() => req.emit('error', new Error('down')));
        return req as any;
      });

      const bridge = new WsBridge({ httpGet });
      await expect(bridge.isPluginConnected()).resolves.toBe(false);
    });

    it('status가 정상이면 pluginConnected 값을 그대로 반환한다', async () => {
      const httpGet = vi.fn((_url: string, cb: any) => {
        const req = fakeClientRequest();
        const res = fakeIncomingMessage(200);
        cb(res);
        queueMicrotask(() => {
          res.emit('data', JSON.stringify({ pluginConnected: true }));
          res.emit('end');
        });
        return req as any;
      });

      const bridge = new WsBridge({ httpGet });
      await expect(bridge.isPluginConnected()).resolves.toBe(true);
    });
  });
});
