import type {
  BridgeRequestMessage,
  BridgeResponseMessage,
} from 'figma-bridge-protocol';

import { DAEMON_HTTP } from '../protocol/daemon-http.js';
import type { PendingRequestStore } from './pending-store.js';
import type { PluginSocket } from './plugin-socket.js';

export interface HttpHandlerRequest {
  method: string;
  path: string;
  body: string;
  timeoutMs?: number;
}

export interface HttpHandlerResponse {
  statusCode: number;
  body: string;
}

export function createHttpHandler(deps: {
  plugin: PluginSocket;
  pending: PendingRequestStore;
}) {
  return async (request: HttpHandlerRequest): Promise<HttpHandlerResponse> => {
    if (request.method === 'GET' && request.path === DAEMON_HTTP.statusPath) {
      return {
        statusCode: 200,
        body: JSON.stringify({ pluginConnected: deps.plugin.isConnected() }),
      };
    }

    if (
      request.method === 'POST' &&
      request.path === DAEMON_HTTP.dispatchPath
    ) {
      let message: BridgeRequestMessage;
      try {
        message = JSON.parse(request.body) as BridgeRequestMessage;
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'invalid json' }),
        };
      }

      if (!deps.plugin.isConnected()) {
        return {
          statusCode: 503,
          body: JSON.stringify({ error: 'plugin not connected' }),
        };
      }

      return new Promise((resolve) => {
        const timeoutMs = request.timeoutMs ?? DAEMON_HTTP.defaultTimeoutMs;
        deps.pending.add(message.id, {
          action: message.action,
          timeoutMs,
          resolve: (response: BridgeResponseMessage) => {
            resolve({ statusCode: 200, body: JSON.stringify(response) });
          },
          onTimeout: () => {
            resolve({
              statusCode: 504,
              body: JSON.stringify({ error: `timeout after ${timeoutMs}ms` }),
            });
          },
        });

        const sent = deps.plugin.send(message);
        if (!sent) {
          deps.pending.resolve(message.id, {
            id: message.id,
            type: 'RESPONSE',
            action: message.action,
            payload: { success: false, error: 'plugin not connected' },
          });
        }
      });
    }

    return { statusCode: 404, body: '' };
  };
}
