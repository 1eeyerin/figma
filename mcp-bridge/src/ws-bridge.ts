/**
 * MCP 프로세스 내부에서 WS 데몬(ws-server.ts)과 통신하는 HTTP 클라이언트.
 *
 * - WS 데몬이 없으면 자동 spawn (SIGTERM으로 부모 프로세스 종료 시 같이 종료)
 * - 이미 데몬이 떠 있으면 재사용
 * - 포트 바인딩 경쟁 없음: MCP 프로세스가 여러 개 떠도 데몬은 하나
 */

import * as http from 'http';
import { randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface BridgeMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;
  payload?: Record<string, unknown>;
}

const HTTP_PORT = Number(process.env.HTTP_PORT ?? 8766);
const DAEMON_SCRIPT = path.resolve(__dirname, 'ws-server.js');

export class WsBridge {
  private daemonProc: ChildProcess | null = null;

  /** 데몬이 살아있는지 확인. 없으면 spawn. */
  async start(): Promise<void> {
    const alive = await this.pingDaemon();
    if (alive) {
      console.error('[Bridge] WS daemon already running — reusing');
      return;
    }

    if (!fs.existsSync(DAEMON_SCRIPT)) {
      console.error(`[Bridge] WARN: ws-server.js not found at ${DAEMON_SCRIPT} — degraded mode`);
      return;
    }

    await this.spawnDaemon();
  }

  /** 플러그인 UI에 메시지를 보내고 RESPONSE를 기다린다. */
  async sendAndWait(action: string, payload: Record<string, unknown>, timeout = 15000): Promise<BridgeMessage> {
    const msg: BridgeMessage = {
      id: randomUUID(),
      type: 'REQUEST',
      action,
      payload,
    };

    return new Promise((resolve, reject) => {
      const body = JSON.stringify(msg);
      const req = http.request(
        {
          hostname: 'localhost',
          port: HTTP_PORT,
          path: `/send?timeout=${timeout}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try { resolve(JSON.parse(data) as BridgeMessage); } catch { reject(new Error('Invalid JSON from daemon')); }
            } else {
              let errMsg = `HTTP ${res.statusCode}`;
              try { errMsg = (JSON.parse(data) as { error: string }).error ?? errMsg; } catch { /* ignore */ }
              reject(new Error(errMsg));
            }
          });
        },
      );
      req.on('error', (err) => reject(new Error(`Daemon unreachable: ${err.message}`)));
      req.setTimeout(timeout + 2000, () => { req.destroy(); reject(new Error('HTTP request timeout')); });
      req.write(body);
      req.end();
    });
  }

  /** 플러그인이 데몬에 연결되어 있는지 확인. */
  async isPluginConnected(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.pluginConnected;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.daemonProc?.kill('SIGTERM');
    this.daemonProc = null;
  }

  // ── private ──────────────────────────────────────────────────────────────

  private async pingDaemon(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return typeof status.pluginConnected === 'boolean';
    } catch {
      return false;
    }
  }

  private getStatus(): Promise<{ pluginConnected: boolean }> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${HTTP_PORT}/status`, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(data) as { pluginConnected: boolean }); } catch { reject(new Error('bad json')); }
        });
      });
      req.on('error', reject);
      req.setTimeout(1500, () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  private spawnDaemon(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [DAEMON_SCRIPT], {
        detached: false,
        stdio: ['ignore', 'ignore', 'inherit'],
        env: { ...process.env },
      });

      proc.on('error', (err) => {
        console.error('[Bridge] Failed to spawn daemon:', err.message);
        reject(err);
      });

      this.daemonProc = proc;

      // 데몬이 HTTP API를 열 때까지 폴링 (최대 5초)
      const deadline = Date.now() + 5000;
      const poll = async () => {
        if (await this.pingDaemon()) {
          console.error('[Bridge] WS daemon started');
          resolve();
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Daemon did not start within 5s'));
          return;
        }
        setTimeout(poll, 200);
      };
      setTimeout(poll, 300);
    });
  }
}
