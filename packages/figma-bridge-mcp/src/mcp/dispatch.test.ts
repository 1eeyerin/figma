import { describe, expect, it, vi } from 'vitest';

import { createDispatch } from './dispatch';

describe('createDispatch (MCP 디스패치)', () => {
  it('브릿지 성공 응답을 텍스트 결과로 변환한다', async () => {
    const bridge = {
      sendAndWait: vi.fn().mockResolvedValue({
        id: 'id-1',
        type: 'RESPONSE',
        action: 'create_rectangle',
        payload: { success: true, nodeId: 'rect-1' },
      }),
    };

    const dispatch = createDispatch(bridge);
    const result = await dispatch('create_rectangle', { width: 10 });

    expect(result).toEqual({
      content: [{ type: 'text', text: 'nodeId: rect-1' }],
    });
  });

  it('플러그인 미연결 에러를 사용자 안내 문구로 변환한다', async () => {
    const bridge = {
      sendAndWait: vi.fn().mockRejectedValue(new Error('plugin not connected')),
    };

    const dispatch = createDispatch(bridge);
    const result = await dispatch('create_rectangle', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Figma 플러그인이 연결되지 않았습니다',
    );
  });
});
