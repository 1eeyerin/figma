/**
 * 독립 실행 WS 데몬.
 * - ws://localhost:WS_PORT  : Figma 플러그인과 연결
 * - http://localhost:HTTP_PORT : MCP 프로세스가 명령/응답을 주고받는 내부 API
 *
 * 실행: node dist/ws-server.js
 * MCP(index.ts)가 자동으로 spawn하거나, 수동으로 먼저 띄워도 된다.
 */

import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { BridgeMessage } from './types.js';

export interface BridgeDaemonOptions {
  wsPort: number;
  httpPort: number;
}

export interface BridgeDaemon {
  wss: WebSocketServer;
  httpServer: http.Server;
  close: () => void;
}

// WS+HTTP 데몬을 호출 시점에 띄운다. import만으로는 어떤 포트도 점유하지 않는다 —
// 모듈 최상위에서 즉시 listen()하던 기존 구조를 함수로 감싸 테스트 시 임의 포트로 격리 실행 가능하게 한다.
export function createBridgeDaemon(options: BridgeDaemonOptions): BridgeDaemon {
  const { wsPort, httpPort } = options;

  // ── 상태 ────────────────────────────────────────────────────────────────

  let pluginSocket: WebSocket | null = null;

  // id → { resolve, timer } : MCP 프로세스가 응답을 기다리는 요청
  const pending = new Map<
    string,
    {
      resolve: (msg: BridgeMessage) => void;
      reject: (e: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  // ── WebSocket 서버 (플러그인 ↔ 데몬) ───────────────────────────────────────

  const wss = new WebSocketServer({ port: wsPort });

  wss.on('listening', () => {
    console.error(
      `[WS-daemon] Plugin WS listening on ws://localhost:${wsPort}`,
    );
  });

  wss.on('connection', (socket) => {
    pluginSocket = socket;
    console.error('[WS-daemon] Plugin connected');

    socket.on('message', (raw) => {
      let msg: BridgeMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      console.error(
        `[WS-daemon] ← plugin: ${msg.type}/${msg.action} (${msg.id})`,
      );

      if (msg.type === 'RESPONSE') {
        const entry = pending.get(msg.id);
        if (entry) {
          clearTimeout(entry.timer);
          pending.delete(msg.id);
          entry.resolve(msg);
        }
      }
    });

    socket.on('close', () => {
      console.error('[WS-daemon] Plugin disconnected');
      if (pluginSocket === socket) pluginSocket = null;
    });

    socket.on('error', (err) => {
      console.error('[WS-daemon] Socket error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[WS-daemon] WS server error:', err.message);
    process.exit(1);
  });

  // ── HTTP API 서버 (MCP → 데몬) ──────────────────────────────────────────────
  //
  // POST /send  body: BridgeMessage JSON
  //   → 플러그인에 메시지 전달, RESPONSE를 기다려 JSON으로 반환
  //   → timeout(ms) 쿼리 파라미터 지원 (기본 15000)
  //
  // GET /status
  //   → { pluginConnected: boolean }

  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${httpPort}`);

    if (req.method === 'GET' && url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          pluginConnected: pluginSocket?.readyState === WebSocket.OPEN,
        }),
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/send') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let msg: BridgeMessage;
        try {
          msg = JSON.parse(body);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'invalid json' }));
          return;
        }

        if (!pluginSocket || pluginSocket.readyState !== WebSocket.OPEN) {
          res.writeHead(503);
          res.end(JSON.stringify({ error: 'plugin not connected' }));
          return;
        }

        const timeoutMs = Number(url.searchParams.get('timeout') ?? 15000);

        const timer = setTimeout(() => {
          pending.delete(msg.id);
          res.writeHead(504);
          res.end(JSON.stringify({ error: `timeout after ${timeoutMs}ms` }));
        }, timeoutMs);

        pending.set(msg.id, {
          resolve: (response) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          },
          reject: (err) => {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          },
          timer,
        });

        pluginSocket.send(JSON.stringify(msg));
        console.error(
          `[WS-daemon] → plugin: ${msg.type}/${msg.action} (${msg.id})`,
        );
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  httpServer.listen(httpPort, () => {
    console.error(
      `[WS-daemon] HTTP API listening on http://localhost:${httpPort}`,
    );
  });

  httpServer.on('error', (err) => {
    console.error('[WS-daemon] HTTP server error:', err.message);
    process.exit(1);
  });

  return {
    wss,
    httpServer,
    close: () => {
      wss.close();
      httpServer.close();
    },
  };
}

// CLI 진입점: 이 파일이 직접 실행될 때만(예: node dist/ws-server.js) 데몬을 띄운다.
// require.main !== module인 경우(테스트에서 import 등)는 createBridgeDaemon 호출 없이 모듈만 로드된다.
if (require.main === module) {
  const daemon = createBridgeDaemon({
    wsPort: Number(process.env.WS_PORT ?? 8765),
    httpPort: Number(process.env.HTTP_PORT ?? 8766),
  });

  process.on('SIGTERM', () => {
    daemon.close();
    process.exit(0);
  });
}
