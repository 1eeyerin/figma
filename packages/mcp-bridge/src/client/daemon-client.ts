import type {
  BridgeRequestMessage,
  BridgeResponseMessage,
  McpAction,
} from '@figma-bridge/protocol';

import { randomUUID } from 'crypto';
import * as http from 'http';

import { BridgeError } from '../errors.js';
import {
  DAEMON_HTTP,
  type DaemonStatusResponse,
} from '../protocol/daemon-http.js';

export interface DaemonClientDeps {
  httpRequest: typeof http.request;
  httpGet: typeof http.get;
  httpPort: number;
}

function defaultDeps(): DaemonClientDeps {
  return {
    httpRequest: http.request,
    httpGet: http.get,
    httpPort: Number(process.env.HTTP_PORT ?? 8766),
  };
}

function parseErrorMessage(data: string, fallback: string): string {
  try {
    return (JSON.parse(data) as { error?: string }).error ?? fallback;
  } catch {
    return fallback;
  }
}

export class DaemonClient {
  private readonly deps: DaemonClientDeps;

  constructor(deps: Partial<DaemonClientDeps> = {}) {
    this.deps = { ...defaultDeps(), ...deps };
  }

  dispatch(
    action: McpAction,
    payload: Record<string, unknown>,
    timeout: number = DAEMON_HTTP.defaultTimeoutMs,
  ): Promise<BridgeResponseMessage> {
    const message: BridgeRequestMessage = {
      id: randomUUID(),
      type: 'REQUEST',
      action,
      payload,
    };

    return new Promise((resolve, reject) => {
      const body = JSON.stringify(message);
      const req = this.deps.httpRequest(
        {
          hostname: 'localhost',
          port: this.deps.httpPort,
          path: `${DAEMON_HTTP.dispatchPath}?timeout=${timeout}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data) as BridgeResponseMessage);
              } catch {
                reject(
                  new BridgeError('Invalid JSON from daemon', 'BAD_RESPONSE'),
                );
              }
              return;
            }

            const message = parseErrorMessage(data, `HTTP ${res.statusCode}`);
            if (res.statusCode === 503) {
              reject(new BridgeError(message, 'PLUGIN_NOT_CONNECTED'));
              return;
            }
            if (res.statusCode === 504) {
              reject(new BridgeError(message, 'TIMEOUT'));
              return;
            }
            reject(new Error(message));
          });
        },
      );

      req.on('error', (err) =>
        reject(
          new BridgeError(
            `Daemon unreachable: ${err.message}`,
            'DAEMON_UNREACHABLE',
          ),
        ),
      );
      req.setTimeout(timeout + 2000, () => {
        req.destroy();
        reject(new BridgeError('HTTP request timeout', 'TIMEOUT'));
      });
      req.write(body);
      req.end();
    });
  }

  getStatus(): Promise<DaemonStatusResponse> {
    return new Promise((resolve, reject) => {
      const req = this.deps.httpGet(
        `http://localhost:${this.deps.httpPort}${DAEMON_HTTP.statusPath}`,
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data) as DaemonStatusResponse);
            } catch {
              reject(new BridgeError('bad json', 'BAD_RESPONSE'));
            }
          });
        },
      );
      req.on('error', reject);
      req.setTimeout(1500, () => {
        req.destroy();
        reject(new BridgeError('timeout', 'TIMEOUT'));
      });
    });
  }
}
