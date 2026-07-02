import type { BridgeMessage } from './types';

// BridgeMessage 계약(id/type/action/payload)에 맞춰 메시지 객체를 조립한다.
// wsClient.ts(전송용)와 canvasChannel.ts(canvas → WS 중계용) 양쪽에서 공유한다.
export function createBridgeMessage(
  id: string,
  type: BridgeMessage['type'],
  action: string,
  payload: Record<string, unknown> = {},
): BridgeMessage {
  return { id, type, action, payload };
}
