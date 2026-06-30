import { describe, expect, it } from 'vitest';

import { formatDispatchError, formatDispatchResponse } from './dispatch-format';
import { BridgeMessage } from './ws-bridge';

describe('formatDispatchError (디스패치 에러 포맷팅)', () => {
  it('plugin not connected 에러는 안내 문구로 변환한다', () => {
    const result = formatDispatchError(new Error('plugin not connected'));
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Figma 플러그인이 연결되지 않았습니다. Figma에서 플러그인을 실행해 주세요.',
        },
      ],
      isError: true,
    });
  });

  it('그 외 에러는 메시지를 그대로 오류: 접두사로 감싼다', () => {
    const result = formatDispatchError(new Error('timeout after 15000ms'));
    expect(result).toEqual({
      content: [{ type: 'text', text: '오류: timeout after 15000ms' }],
      isError: true,
    });
  });
});

describe('formatDispatchResponse (디스패치 응답 포맷팅)', () => {
  function makeResponse(payload: BridgeMessage['payload']): BridgeMessage {
    return {
      id: 'id-1',
      type: 'RESPONSE',
      action: 'create_rectangle',
      payload,
    };
  }

  it('success가 false면 error 메시지를 오류: 접두사로 반환한다', () => {
    const result = formatDispatchResponse(
      makeResponse({ success: false, error: '노드를 찾을 수 없음' }),
    );
    expect(result).toEqual({
      content: [{ type: 'text', text: '오류: 노드를 찾을 수 없음' }],
      isError: true,
    });
  });

  it('nodeId만 있으면 nodeId 텍스트만 반환한다', () => {
    const result = formatDispatchResponse(
      makeResponse({ success: true, nodeId: 'rect-1' }),
    );
    expect(result).toEqual({
      content: [{ type: 'text', text: 'nodeId: rect-1' }],
    });
  });

  it('result만 있으면 JSON으로 직렬화해 반환한다', () => {
    const result = formatDispatchResponse(
      makeResponse({ success: true, result: { id: 'a' } }),
    );
    expect(result.content[0].text).toBe(JSON.stringify({ id: 'a' }, null, 2));
  });

  it('nodeId와 result가 모두 있으면 줄바꿈으로 합친다', () => {
    const result = formatDispatchResponse(
      makeResponse({ success: true, nodeId: 'n1', result: { ok: true } }),
    );
    expect(result.content[0].text).toBe(
      `nodeId: n1\n${JSON.stringify({ ok: true }, null, 2)}`,
    );
  });

  it('nodeId도 result도 없으면 완료를 반환한다', () => {
    const result = formatDispatchResponse(makeResponse({ success: true }));
    expect(result.content[0].text).toBe('완료');
  });
});
