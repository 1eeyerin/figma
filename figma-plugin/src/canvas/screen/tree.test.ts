import { describe, expect, it, vi } from 'vitest';

import { createNodeFromTree } from './tree';

describe('createNodeFromTree (노드 트리 생성)', () => {
  it('프레임 자식 노드를 순서대로 생성해 append한다', async () => {
    const rootAppendChild = vi.fn();
    const frameAppendChild = vi.fn();
    const frame: any = {
      id: 'frame',
      resize: vi.fn(),
      appendChild: frameAppendChild,
    };
    const rect: any = { id: 'rect', resize: vi.fn() };

    (figma.createFrame as any).mockReturnValue(frame);
    (figma.createRectangle as any).mockReturnValue(rect);

    const root = await createNodeFromTree(
      {
        type: 'frame',
        children: [{ type: 'rectangle', width: 10, height: 10 }],
      },
      { appendChild: rootAppendChild } as any,
    );

    expect(root).toBe(frame);
    expect(rootAppendChild).toHaveBeenCalledWith(frame);
    expect(frameAppendChild).toHaveBeenCalledWith(rect);
  });
});
