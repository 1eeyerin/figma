import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetPage, handleGetSelectionContext } from './handler';

interface SerializableSceneNode {
  id: string;
  name: string;
  type: SceneNode['type'];
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

function sceneNode(node: SerializableSceneNode): SceneNode {
  return node as unknown as SceneNode;
}

beforeEach(() => {
  vi.mocked(figma.ui.postMessage).mockClear();
  Object.defineProperty(figma.currentPage, 'selection', {
    configurable: true,
    value: [],
  });
});

describe('handleGetSelectionContext (선택 디자인 컨텍스트 조회)', () => {
  it('현재 선택한 단일 노드의 디자인 컨텍스트를 회신한다', async () => {
    const selected = {
      id: 'frame-1',
      name: 'Frame',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 320,
      height: 160,
      opacity: 1,
      visible: true,
      locked: false,
      children: [],
      getCSSAsync: vi.fn().mockResolvedValue({ width: '320px' }),
    } as unknown as SceneNode;
    Object.defineProperty(figma.currentPage, 'selection', {
      configurable: true,
      value: [selected],
    });

    await handleGetSelectionContext({
      id: 'context-1',
      type: 'GET_SELECTION_CONTEXT',
    });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'context-1',
        success: true,
        result: expect.objectContaining({
          serializedNodeCount: 1,
          root: expect.objectContaining({ id: 'frame-1' }),
        }),
      }),
    );
  });

  it('선택한 노드가 하나가 아니면 명확한 오류를 회신한다', async () => {
    await handleGetSelectionContext({
      id: 'context-2',
      type: 'GET_SELECTION_CONTEXT',
    });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'context-2',
        success: false,
        error: 'Figma에서 프레임 또는 노드를 정확히 하나 선택해 주세요',
      }),
    );
  });
});

describe('handleGetPage (페이지 조회)', () => {
  it('현재 페이지 children을 직렬화해 회신한다', async () => {
    const child = {
      id: 'a',
      name: 'A',
      type: 'RECTANGLE',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      opacity: 1,
    } satisfies SerializableSceneNode;
    Object.defineProperty(figma.currentPage, 'children', {
      configurable: true,
      value: [sceneNode(child)],
    });

    await handleGetPage({ id: 'm5', type: 'GET_PAGE' });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'm5',
        success: true,
        result: [expect.objectContaining({ id: 'a' })],
      }),
    );
  });
});
