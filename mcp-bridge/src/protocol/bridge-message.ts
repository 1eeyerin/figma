import type { McpAction } from '@figma-bridge/protocol';

export type BridgeMessageType = 'REQUEST' | 'RESPONSE' | 'EVENT';

export interface BridgeRequestMessage {
  id: string;
  type: 'REQUEST';
  action: McpAction;
  payload: Record<string, unknown>;
}

export interface BridgeEventMessage {
  id: string;
  type: 'EVENT';
  action: string;
  payload?: Record<string, unknown>;
}

export interface BridgeSuccessPayload {
  success: true;
  nodeId?: string;
  result?: unknown;
}

export interface BridgeFailurePayload {
  success: false;
  error: string;
}

export type BridgeResponsePayload = BridgeSuccessPayload | BridgeFailurePayload;

export interface BridgeResponseMessage {
  id: string;
  type: 'RESPONSE';
  action: McpAction;
  payload: BridgeResponsePayload;
}

export type BridgeMessage =
  | BridgeRequestMessage
  | BridgeResponseMessage
  | BridgeEventMessage;

export function isBridgeSuccess(
  payload: unknown,
): payload is BridgeSuccessPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    payload.success === true
  );
}

export function isBridgeFailure(
  payload: unknown,
): payload is BridgeFailurePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    payload.success === false &&
    'error' in payload &&
    typeof payload.error === 'string'
  );
}
