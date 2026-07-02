import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { DAEMON_HTTP } from '../protocol/daemon-http.js';
import type { DaemonClient } from './daemon-client.js';

export interface DaemonProcessDeps {
  spawn: typeof spawn;
  existsSync: typeof fs.existsSync;
  daemonScript: string;
}

function defaultDaemonScript(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, 'cli/daemon.js'),
    path.resolve(currentDir, '../cli/daemon.js'),
  ];

  return candidates.find(fs.existsSync) ?? candidates[0];
}

function defaultDeps(): DaemonProcessDeps {
  return {
    spawn,
    existsSync: fs.existsSync,
    daemonScript: defaultDaemonScript(),
  };
}

export class DaemonProcess {
  private daemonProc: ChildProcess | null = null;
  private readonly deps: DaemonProcessDeps;

  constructor(
    private readonly client: Pick<DaemonClient, 'getStatus'>,
    deps: Partial<DaemonProcessDeps> = {},
  ) {
    this.deps = { ...defaultDeps(), ...deps };
  }

  async isAlive(): Promise<boolean> {
    try {
      const status = await this.client.getStatus();
      return typeof status.pluginConnected === 'boolean';
    } catch {
      return false;
    }
  }

  async ensureStarted(): Promise<void> {
    if (!this.deps.existsSync(this.deps.daemonScript)) {
      console.error(
        `[Bridge] WARN: daemon script not found at ${this.deps.daemonScript} — degraded mode`,
      );
      return;
    }

    await this.spawnDaemon();
  }

  stop(): void {
    this.daemonProc?.kill('SIGTERM');
    this.daemonProc = null;
  }

  private spawnDaemon(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = this.deps.spawn('node', [this.deps.daemonScript], {
        detached: false,
        stdio: ['ignore', 'ignore', 'inherit'],
        env: { ...process.env },
      });

      proc.on('error', (err) => {
        console.error('[Bridge] Failed to spawn daemon:', err.message);
        reject(err);
      });

      this.daemonProc = proc;

      const deadline = Date.now() + DAEMON_HTTP.startupTimeoutMs;
      const poll = async () => {
        if (await this.isAlive()) {
          console.error('[Bridge] WS daemon started');
          resolve();
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Daemon did not start within 5s'));
          return;
        }
        setTimeout(poll, DAEMON_HTTP.startupPollMs);
      };
      setTimeout(poll, 300);
    });
  }
}
