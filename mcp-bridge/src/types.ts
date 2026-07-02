export interface BridgeMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;
  payload?: Record<string, unknown>;
}
