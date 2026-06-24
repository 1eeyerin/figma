export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

export type ConnectionEvent = 'OPEN' | 'CLOSE' | 'ERROR' | 'RECONNECT'

export interface BridgeMessage {
  id: string
  type: 'EVENT' | 'REQUEST' | 'RESPONSE'
  action: string
  payload: Record<string, unknown>
}
