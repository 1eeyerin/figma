import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetPage } from './handler';

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
