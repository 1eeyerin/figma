import type {
  CloseMsg,
  DrawRectMsg,
  GetSelectionContextMsg,
  McpAction,
  PingMsg,
} from 'figma-bridge-protocol';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleMessage } from './handle-message';

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
    const msg = { id: 'ping-1', type: 'PING' } satisfies PingMsg;

    await handleMessage(msg);
    expect(figma.ui.postMessage).toHaveBeenCalledWith({ type: 'PONG' });
  });

  it('CLOSE를 받으면 closePlugin을 호출한다', async () => {
    const msg = { id: 'close-1', type: 'CLOSE' } satisfies CloseMsg;

    await handleMessage(msg);
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

describe('handleMessage (DRAW_RECT 라우팅)', () => {
  it('성공하면 nodeId와 함께 success:true를 회신한다', async () => {
    const rect = makeRect('rect-1');
    const msg = {
      id: 'm1',
      action: 'create_rectangle',
      type: 'DRAW_RECT',
      width: 10,
      height: 10,
    } satisfies DrawRectMsg & { action: McpAction };

    (figma.createRectangle as any).mockReturnValue(rect);
    (figma.currentPage.appendChild as any) = vi.fn();

    await handleMessage(msg);

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', success: true, nodeId: 'rect-1' }),
    );
  });

  it('생성 중 예외가 나면 success:false와 에러 메시지를 회신하고 notify한다', async () => {
    const msg = {
      id: 'm2',
      action: 'create_rectangle',
      type: 'DRAW_RECT',
    } satisfies DrawRectMsg & { action: McpAction };

    (figma.createRectangle as any).mockImplementation(() => {
      throw new Error('boom');
    });

    await handleMessage(msg);

    expect(figma.notify).toHaveBeenCalledWith('사각형 생성 실패: boom', {
      error: true,
    });
    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2', success: false, error: 'boom' }),
    );
  });
});

describe('handleMessage (GET_SELECTION_CONTEXT 라우팅)', () => {
  it('현재 선택 노드의 디자인 컨텍스트를 조회한다', async () => {
    const selected = {
      id: 'frame-1',
      name: 'Frame',
      type: 'FRAME',
      visible: true,
      locked: false,
      children: [],
      getCSSAsync: vi.fn().mockResolvedValue({ display: 'flex' }),
    } as unknown as SceneNode;
    Object.defineProperty(figma.currentPage, 'selection', {
      configurable: true,
      value: [selected],
    });
    const msg = {
      id: 'context-1',
      action: 'get_selection_context',
      type: 'GET_SELECTION_CONTEXT',
    } satisfies GetSelectionContextMsg & { action: McpAction };

    await handleMessage(msg);

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'context-1',
        success: true,
        result: expect.objectContaining({
          root: expect.objectContaining({ id: 'frame-1' }),
        }),
      }),
    );
  });
});
