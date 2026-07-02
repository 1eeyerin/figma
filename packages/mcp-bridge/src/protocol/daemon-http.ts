import type {
  BridgeRequestMessage,
  BridgeResponseMessage,
} from '@figma-bridge/protocol';

export const DAEMON_HTTP = {
  statusPath: '/v1/status',
  dispatchPath: '/v1/dispatch',
  defaultTimeoutMs: 15000,
  startupTimeoutMs: 5000,
  startupPollMs: 200,
} as const;

export interface DaemonStatusResponse {
  pluginConnected: boolean;
}

export interface DaemonErrorResponse {
  error: string;
}

export type DaemonDispatchRequest = BridgeRequestMessage;
export type DaemonDispatchResponse =
  | BridgeResponseMessage
  | DaemonErrorResponse;
