import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

import { DaemonProcess } from './daemon-process';

describe('DaemonProcess (데몬 프로세스 관리)', () => {
  it('데몬이 이미 살아 있으면 isAlive가 true를 반환한다', async () => {
    const client = {
      getStatus: vi.fn().mockResolvedValue({ pluginConnected: false }),
    };
    const daemon = new DaemonProcess(client);

    await expect(daemon.isAlive()).resolves.toBe(true);
  });

  it('데몬 스크립트가 없으면 spawn하지 않고 degraded mode로 빠진다', async () => {
    const client = {
      getStatus: vi.fn().mockRejectedValue(new Error('down')),
    };
    const spawnFn = vi.fn();
    const daemon = new DaemonProcess(client, {
      spawn: spawnFn as any,
      existsSync: () => false,
      daemonScript: 'missing.js',
    });

    await daemon.ensureStarted();

    expect(spawnFn).not.toHaveBeenCalled();
  });

  it('데몬 스크립트가 있으면 node 프로세스를 spawn한다', async () => {
    let statusCount = 0;
    const client = {
      getStatus: vi.fn().mockImplementation(() => {
        statusCount += 1;
        if (statusCount === 1) return Promise.reject(new Error('down'));
        return Promise.resolve({ pluginConnected: false });
      }),
    };
    const fakeProc = new EventEmitter();
    const spawnFn = vi.fn(() => fakeProc);
    const daemon = new DaemonProcess(client, {
      spawn: spawnFn as any,
      existsSync: () => true,
      daemonScript: 'daemon.js',
    });

    await daemon.ensureStarted();

    expect(spawnFn).toHaveBeenCalledWith(
      'node',
      ['daemon.js'],
      expect.any(Object),
    );
  });
});
