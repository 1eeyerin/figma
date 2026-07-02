import type { McpAction } from '../protocol/actions.js';
import {
  isBridgeFailure,
  isBridgeSuccess,
  type BridgeResponseMessage,
  type BridgeSuccessPayload,
} from '../protocol/bridge-message.js';
import type { ToolTextResult } from '../protocol/tool-result.js';

export interface DispatchBridge {
  sendAndWait(
    action: McpAction,
    payload: Record<string, unknown>,
  ): Promise<BridgeResponseMessage>;
}

function textResult(text: string, isError?: true): ToolTextResult {
  return isError
    ? { content: [{ type: 'text', text }], isError }
    : { content: [{ type: 'text', text }] };
}

function formatSuccess(payload: BridgeSuccessPayload): ToolTextResult {
  const parts: string[] = [];
  if (payload.nodeId) parts.push(`nodeId: ${payload.nodeId}`);
  if (payload.result) parts.push(JSON.stringify(payload.result, null, 2));

  return textResult(parts.length ? parts.join('\n') : '완료');
}

export function createDispatch(bridge: DispatchBridge) {
  return async (
    action: McpAction,
    payload: Record<string, unknown>,
  ): Promise<ToolTextResult> => {
    try {
      const response = await bridge.sendAndWait(action, payload);
      if (isBridgeSuccess(response.payload)) {
        return formatSuccess(response.payload);
      }
      if (isBridgeFailure(response.payload)) {
        return textResult(`오류: ${response.payload.error}`, true);
      }
      return textResult('오류: 응답 payload 형식이 올바르지 않습니다', true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('plugin not connected')) {
        return textResult(
          'Figma 플러그인이 연결되지 않았습니다. Figma에서 플러그인을 실행해 주세요.',
          true,
        );
      }
      return textResult(`오류: ${message}`, true);
    }
  };
}
