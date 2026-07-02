export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export type ConnectionEvent =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'RECONNECT' };
