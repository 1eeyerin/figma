import { describe, expect, it, vi } from 'vitest';

import {
  formatPreflightReport,
  runStartupPreflight,
  type PreflightDeps,
} from './preflight';

function deps(override: Partial<PreflightDeps> = {}): Partial<PreflightDeps> {
  return {
    existsSync: () => true,
    nodeVersion: '22.22.0',
    runtimeDir: '/fake/dist',
    wsPort: 8765,
    httpPort: 8766,
    importModule: vi.fn(async (specifier: string) => {
      if (specifier === 'figma-bridge-protocol') {
        return { isMcpAction: () => true };
      }
      if (specifier === 'ws') {
        return { WebSocketServer: class WebSocketServer {} };
      }
      throw new Error(`unexpected import ${specifier}`);
    }),
    isPortOpen: vi.fn(async () => false),
    getDaemonStatus: vi.fn(async () => ({ pluginConnected: false })),
    ...override,
  };
}

describe('runStartupPreflight (MCP 시작 전 검사)', () => {
  it('dist와 import가 정상이고 포트가 비어 있으면 통과한다', async () => {
    const result = await runStartupPreflight(deps());

    expect(result.ok).toBe(true);
    expect(formatPreflightReport(result)).toContain('preflight passed');
  });

  it('daemon script가 없으면 실패한다', async () => {
    const result = await runStartupPreflight(
      deps({
        existsSync: (filePath: string) => !filePath.endsWith('/cli/daemon.js'),
      }),
    );

    expect(result.ok).toBe(false);
    expect(formatPreflightReport(result)).toContain('FAIL daemon script');
  });

  it('protocol import가 실패하면 실패 이유를 남긴다', async () => {
    const result = await runStartupPreflight(
      deps({
        importModule: vi.fn(async (specifier: string) => {
          if (specifier === 'figma-bridge-protocol') {
            throw new Error('Cannot find package');
          }
          return { WebSocketServer: class WebSocketServer {} };
        }),
      }),
    );

    expect(result.ok).toBe(false);
    expect(formatPreflightReport(result)).toContain('Cannot find package');
  });

  it('8765만 열려 있으면 포트 충돌로 실패한다', async () => {
    const result = await runStartupPreflight(
      deps({
        isPortOpen: vi.fn(async (port: number) => port === 8765),
      }),
    );

    expect(result.ok).toBe(false);
    expect(formatPreflightReport(result)).toContain(
      '8765 포트만 열려 있습니다',
    );
  });

  it('8766 status가 bridge daemon이면 기존 daemon 재사용으로 통과한다', async () => {
    const result = await runStartupPreflight(
      deps({
        isPortOpen: vi.fn(async () => true),
        getDaemonStatus: vi.fn(async () => ({ pluginConnected: true })),
      }),
    );

    expect(result.ok).toBe(true);
    expect(formatPreflightReport(result)).toContain('기존 bridge daemon');
  });
});
