import { BridgeMessage } from './ws-bridge.js';

export type ToolTextResult = {
  [x: string]: unknown;
  content: [{ type: 'text'; text: string }];
  isError?: true;
};

function textResult(text: string, isError?: true): ToolTextResult {
  return isError
    ? { content: [{ type: 'text', text }], isError }
    : { content: [{ type: 'text', text }] };
}

// bridge.sendAndWait()이 throw한 에러를 MCP 툴 응답 텍스트로 변환한다.
export function formatDispatchError(err: Error): ToolTextResult {
  const msg = err.message;
  if (msg.includes('plugin not connected')) {
    return textResult(
      'Figma 플러그인이 연결되지 않았습니다. Figma에서 플러그인을 실행해 주세요.',
      true,
    );
  }
  return textResult(`오류: ${msg}`, true);
}

// 플러그인으로부터 받은 BridgeMessage 응답을 MCP 툴 응답 텍스트로 변환한다.
export function formatDispatchResponse(
  response: BridgeMessage,
): ToolTextResult {
  if (!response.payload?.success) {
    return textResult(`오류: ${response.payload?.error}`, true);
  }

  const data = response.payload;
  const parts: string[] = [];
  if (data.nodeId) parts.push(`nodeId: ${data.nodeId}`);
  if (data.result) parts.push(JSON.stringify(data.result, null, 2));

  return textResult(parts.length ? parts.join('\n') : '완료');
}
