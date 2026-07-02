import { isMcpAction, type BridgeResponseMessage } from 'figma-bridge-protocol';
import * as http from 'http';
import { WebSocketServer, type RawData } from 'ws';

import { createHttpHandler } from './http-api';
import { PendingRequestStore } from './pending-store';
import { PluginSocket } from './plugin-socket';

export interface BridgeDaemonOptions {
  wsPort: number;
  httpPort: number;
}

export interface BridgeDaemon {
  wss: WebSocketServer;
  httpServer: http.Server;
  close: () => void;
}

function parsePluginResponse(raw: RawData): BridgeResponseMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    parsed.type !== 'RESPONSE' ||
    !('action' in parsed) ||
    typeof parsed.action !== 'string' ||
    !isMcpAction(parsed.action)
  ) {
    return null;
  }

  return parsed as BridgeResponseMessage;
}

export function createBridgeDaemon(options: BridgeDaemonOptions): BridgeDaemon {
  const { wsPort, httpPort } = options;
  const plugin = new PluginSocket();
  const pending = new PendingRequestStore();
  const handleHttp = createHttpHandler({ plugin, pending });

  const wss = new WebSocketServer({ port: wsPort });

  wss.on('listening', () => {
    console.error(
      `[WS-daemon] Plugin WS listening on ws://localhost:${wsPort}`,
    );
  });

  wss.on('connection', (socket) => {
    plugin.attach(socket);
    console.error('[WS-daemon] Plugin connected');

    socket.on('message', (raw) => {
      const message = parsePluginResponse(raw);
      if (!message) return;

      console.error(
        `[WS-daemon] ← plugin: ${message.type}/${message.action} (${message.id})`,
      );
      pending.resolve(message.id, message);
    });

    socket.on('close', () => {
      console.error('[WS-daemon] Plugin disconnected');
    });

    socket.on('error', (err) => {
      console.error('[WS-daemon] Socket error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[WS-daemon] WS server error:', err.message);
    process.exit(1);
  });

  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${httpPort}`);
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      const timeoutParam = url.searchParams.get('timeout');
      const timeoutMs =
        timeoutParam === null ? undefined : Number(timeoutParam);
      const response = await handleHttp({
        method: req.method ?? 'GET',
        path: url.pathname,
        body,
        timeoutMs,
      });

      const headers = response.body
        ? { 'Content-Type': 'application/json' }
        : undefined;
      res.writeHead(response.statusCode, headers);
      res.end(response.body);
    });
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
      pending.clear();
      plugin.detach();
      wss.close();
      httpServer.close();
    },
  };
}
