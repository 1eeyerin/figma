import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === 'object' && address !== null) {
          resolve(address.port);
        } else {
          reject(new Error('포트를 할당받지 못했습니다.'));
        }
      });
    });
    server.on('error', reject);
  });
}

async function waitForStatus(httpPort, child, logFile) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const log = await readFile(logFile, 'utf-8').catch(() => '');
      throw new Error(`프로세스가 먼저 종료되었습니다.\n${log}`);
    }

    const status = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${httpPort}/v1/status`, (res) => {
        let body = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve(res.statusCode === 200 ? body : null);
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(null);
      });
    });

    if (status !== null) {
      const parsed = JSON.parse(status);
      if (typeof parsed.pluginConnected === 'boolean') return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const log = await readFile(logFile, 'utf-8').catch(() => '');
  throw new Error(`status 응답을 받지 못했습니다.\n${log}`);
}

function stopProcess(child) {
  if (child.exitCode !== null) return;

  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGTERM');
      return;
    } catch {
      // 아래 단일 프로세스 종료로 보정합니다.
    }
  }

  child.kill('SIGTERM');
}

async function runEntry({ entry, tmpRoot, wsPort, httpPort, logFile }) {
  const child = spawn('node', [join(tmpRoot, entry)], {
    cwd: tmpRoot,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      WS_PORT: String(wsPort),
      HTTP_PORT: String(httpPort),
    },
  });

  child.stderr.on('data', async (chunk) => {
    await import('node:fs/promises').then(({ appendFile }) =>
      appendFile(logFile, chunk),
    );
  });

  try {
    await waitForStatus(httpPort, child, logFile);
  } finally {
    stopProcess(child);
  }
}

const tmpRoot = await mkdtemp(join(tmpdir(), 'figma-bridge-bundle-'));
const packageDir = join(tmpRoot, 'packages/figma-bridge-mcp');

try {
  await mkdir(packageDir, { recursive: true });
  await cp('dist', join(packageDir, 'dist'), { recursive: true });
  await cp('package.json', join(packageDir, 'package.json'));

  const daemonWsPort = await getFreePort();
  const daemonHttpPort = await getFreePort();
  await runEntry({
    entry: 'packages/figma-bridge-mcp/dist/cli/daemon.js',
    tmpRoot,
    wsPort: daemonWsPort,
    httpPort: daemonHttpPort,
    logFile: join(tmpRoot, 'daemon.log'),
  });

  const indexWsPort = await getFreePort();
  const indexHttpPort = await getFreePort();
  await runEntry({
    entry: 'packages/figma-bridge-mcp/dist/index.js',
    tmpRoot,
    wsPort: indexWsPort,
    httpPort: indexHttpPort,
    logFile: join(tmpRoot, 'index.log'),
  });

  console.log('번들 smoke test 통과');
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
