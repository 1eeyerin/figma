import * as protocolModule from 'figma-bridge-protocol';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as wsModule from 'ws';

import {
  DAEMON_HTTP,
  type DaemonStatusResponse,
} from './protocol/daemon-http.js';

export type PreflightStatus = 'pass' | 'fail';

export interface PreflightCheck {
  name: string;
  status: PreflightStatus;
  detail: string;
}

export interface PreflightResult {
  ok: boolean;
  checks: PreflightCheck[];
}

export interface PreflightDeps {
  existsSync: typeof fs.existsSync;
  nodeVersion: string;
  importModule: (specifier: string) => Promise<unknown>;
  isPortOpen: (port: number) => Promise<boolean>;
  getDaemonStatus: (port: number) => Promise<DaemonStatusResponse>;
  runtimeDir: string;
  wsPort: number;
  httpPort: number;
}

function defaultRuntimeDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function defaultDeps(): PreflightDeps {
  return {
    existsSync: fs.existsSync,
    nodeVersion: process.versions.node,
    importModule: async (specifier) => {
      if (specifier === 'figma-bridge-protocol') return protocolModule;
      if (specifier === 'ws') return wsModule;
      return import(specifier);
    },
    isPortOpen,
    getDaemonStatus,
    runtimeDir: defaultRuntimeDir(),
    wsPort: Number(process.env.WS_PORT ?? 8765),
    httpPort: Number(process.env.HTTP_PORT ?? 8766),
  };
}

function pass(name: string, detail: string): PreflightCheck {
  return { name, status: 'pass', detail };
}

function fail(name: string, detail: string): PreflightCheck {
  return { name, status: 'fail', detail };
}

function parseNodeMajor(version: string): number {
  return Number(version.split('.')[0] ?? 0);
}

function runtimePath(runtimeDir: string, relativePath: string): string {
  return path.resolve(runtimeDir, relativePath);
}

async function checkImport(
  deps: PreflightDeps,
  specifier: string,
  validate: (mod: unknown) => boolean,
): Promise<PreflightCheck> {
  try {
    const mod = await deps.importModule(specifier);
    if (!validate(mod)) {
      return fail(
        `${specifier} import`,
        `${specifier} 모듈이 로드됐지만 필요한 export가 없습니다.`,
      );
    }
    return pass(`${specifier} import`, `${specifier} 모듈 로드 성공`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`${specifier} import`, message);
  }
}

async function checkPorts(deps: PreflightDeps): Promise<PreflightCheck[]> {
  const [wsOpen, httpOpen] = await Promise.all([
    deps.isPortOpen(deps.wsPort),
    deps.isPortOpen(deps.httpPort),
  ]);

  if (!wsOpen && !httpOpen) {
    return [
      pass(
        'port state',
        `${deps.wsPort}/${deps.httpPort} 포트가 비어 있어 daemon을 시작할 수 있습니다.`,
      ),
    ];
  }

  if (!httpOpen && wsOpen) {
    return [
      fail(
        'port state',
        `${deps.wsPort} 포트만 열려 있습니다. bridge daemon이 아니라 다른 프로세스가 점유했을 가능성이 큽니다.`,
      ),
    ];
  }

  try {
    const status = await deps.getDaemonStatus(deps.httpPort);
    const hasValidStatus = typeof status.pluginConnected === 'boolean';
    if (!hasValidStatus) {
      return [
        fail(
          'port state',
          `${deps.httpPort} 포트가 열려 있지만 figma-bridge daemon status 형식이 아닙니다.`,
        ),
      ];
    }
    if (!wsOpen) {
      return [
        fail(
          'port state',
          `${deps.httpPort} daemon HTTP는 응답하지만 ${deps.wsPort} WebSocket 포트가 닫혀 있습니다.`,
        ),
      ];
    }
    return [
      pass(
        'port state',
        `${deps.wsPort}/${deps.httpPort} 포트에서 기존 bridge daemon을 재사용할 수 있습니다. pluginConnected=${status.pluginConnected}`,
      ),
    ];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [
      fail(
        'port state',
        `${deps.httpPort} 포트가 열려 있지만 /v1/status 확인 실패: ${message}`,
      ),
    ];
  }
}

export async function runStartupPreflight(
  depsOverride: Partial<PreflightDeps> = {},
): Promise<PreflightResult> {
  const deps = { ...defaultDeps(), ...depsOverride };
  const checks: PreflightCheck[] = [];

  const nodeMajor = parseNodeMajor(deps.nodeVersion);
  checks.push(
    nodeMajor >= 20
      ? pass('node version', `Node ${deps.nodeVersion}`)
      : fail(
          'node version',
          `Node ${deps.nodeVersion}. 최소 Node 20 이상이 필요합니다.`,
        ),
  );

  const indexPath = runtimePath(deps.runtimeDir, 'index.js');
  checks.push(
    deps.existsSync(indexPath)
      ? pass('dist index', indexPath)
      : fail('dist index', `${indexPath} 파일이 없습니다.`),
  );

  const daemonPath = runtimePath(deps.runtimeDir, 'cli/daemon.js');
  checks.push(
    deps.existsSync(daemonPath)
      ? pass('daemon script', daemonPath)
      : fail('daemon script', `${daemonPath} 파일이 없습니다.`),
  );

  checks.push(
    await checkImport(
      deps,
      'figma-bridge-protocol',
      (mod) =>
        typeof (mod as { isMcpAction?: unknown }).isMcpAction === 'function',
    ),
  );
  checks.push(
    await checkImport(
      deps,
      'ws',
      (mod) =>
        typeof (mod as { WebSocketServer?: unknown }).WebSocketServer ===
        'function',
    ),
  );
  checks.push(...(await checkPorts(deps)));

  return {
    ok: checks.every((check) => check.status === 'pass'),
    checks,
  };
}

export function formatPreflightReport(result: PreflightResult): string {
  const title = result.ok
    ? '[Preflight] figma-bridge MCP startup preflight passed'
    : '[Preflight] figma-bridge MCP startup preflight failed';
  const lines = result.checks.map((check) => {
    const marker = check.status === 'pass' ? 'PASS' : 'FAIL';
    return `- ${marker} ${check.name}: ${check.detail}`;
  });

  return [title, ...lines].join('\n');
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: 'localhost', port });
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

function getDaemonStatus(port: number): Promise<DaemonStatusResponse> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://localhost:${port}${DAEMON_HTTP.statusPath}`,
      (res) => {
        let data = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as DaemonStatusResponse);
          } catch {
            reject(new Error('daemon status JSON 파싱 실패'));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(1000, () => {
      req.destroy();
      reject(new Error('daemon status timeout'));
    });
  });
}
