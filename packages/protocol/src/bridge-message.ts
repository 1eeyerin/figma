export interface BridgeMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;
  payload?: Record<string, unknown>;
}

export type ActionResult<T extends object = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

export function createBridgeMessage(
  id: string,
  type: BridgeMessage['type'],
  action: string,
  payload: Record<string, unknown> = {},
): BridgeMessage {
  return { id, type, action, payload };
}
