import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleMessage } from './handlers';

// figma 전역은 setupFigmaGlobal.ts가 기본 stub을 제공한다.
// 여기서는 각 테스트에 필요한 동작만 개별적으로 덮어쓴다.

function makeRect(id: string) {
  return {
    id,
    name: '',
    x: 0,
    y: 0,
    resize: vi.fn(),
    fills: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (figma.ui.postMessage as any).mockClear?.();
});

describe('handleMessage (LOG/PING/CLOSE 처리)', () => {
  it('PING을 받으면 PONG으로 응답한다', async () => {
    await handleMessage({ type: 'PING' });
    expect(figma.ui.postMessage).toHaveBeenCalledWith({ type: 'PONG' });
  });

  it('CLOSE를 받으면 closePlugin을 호출한다', async () => {
    await handleMessage({ type: 'CLOSE' });
    expect(figma.closePlugin).toHaveBeenCalled();
  });

  it('msg가 없으면 아무 것도 하지 않는다', async () => {
    await handleMessage(null);
    expect(figma.ui.postMessage).not.toHaveBeenCalled();
  });

  it('알 수 없는 type이면 아무 것도 하지 않는다', async () => {
    await handleMessage({ type: 'UNKNOWN' });
    expect(figma.ui.postMessage).not.toHaveBeenCalled();
  });
});

describe('handleMessage (DRAW_RECT 처리)', () => {
  it('성공하면 nodeId와 함께 success:true를 회신한다', async () => {
    const rect = makeRect('rect-1');
    (figma.createRectangle as any).mockReturnValue(rect);
    (figma.currentPage.appendChild as any) = vi.fn();

    await handleMessage({
      id: 'm1',
      action: 'create_rectangle',
      type: 'DRAW_RECT',
      width: 10,
      height: 10,
    });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', success: true, nodeId: 'rect-1' }),
    );
  });

  it('생성 중 예외가 나면 success:false와 에러 메시지를 회신하고 notify한다', async () => {
    (figma.createRectangle as any).mockImplementation(() => {
      throw new Error('boom');
    });

    await handleMessage({
      id: 'm2',
      action: 'create_rectangle',
      type: 'DRAW_RECT',
    });

    expect(figma.notify).toHaveBeenCalledWith('사각형 생성 실패: boom', {
      error: true,
    });
    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2', success: false, error: 'boom' }),
    );
  });
});

describe('handleMessage (SET_NAME 처리)', () => {
  it('노드를 찾을 수 없으면 success:false를 회신하고 notify는 하지 않는다', async () => {
    (figma.getNodeByIdAsync as any).mockResolvedValue(null);

    await handleMessage({
      id: 'm3',
      type: 'SET_NAME',
      nodeId: 'missing',
      name: 'x',
    });

    expect(figma.notify).not.toHaveBeenCalled();
    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm3', success: false }),
    );
  });

  it('노드를 찾으면 이름을 바꾸고 성공을 회신한다', async () => {
    const node: any = { id: 'n1', name: 'old' };
    (figma.getNodeByIdAsync as any).mockResolvedValue(node);

    await handleMessage({
      id: 'm4',
      type: 'SET_NAME',
      nodeId: 'n1',
      name: 'new',
    });

    expect(node.name).toBe('new');
    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm4', success: true, nodeId: 'n1' }),
    );
  });
});

describe('handleMessage (GET_PAGE 처리)', () => {
  it('현재 페이지 children을 직렬화해 회신한다', async () => {
    (figma.currentPage as any).children = [
      {
        id: 'a',
        name: 'A',
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        opacity: 1,
      },
    ];

    await handleMessage({ id: 'm5', type: 'GET_PAGE' });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'm5',
        success: true,
        result: [expect.objectContaining({ id: 'a' })],
      }),
    );
  });
});
