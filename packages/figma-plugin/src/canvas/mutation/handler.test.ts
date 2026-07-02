import { beforeEach, describe, expect, it } from 'vitest';

import { handleSetName } from './handler';

beforeEach(() => {
  (figma.ui.postMessage as any).mockClear?.();
});

describe('handleSetName (노드 이름 변경)', () => {
  it('노드를 찾을 수 없으면 success:false를 회신하고 notify는 하지 않는다', async () => {
    (figma.getNodeByIdAsync as any).mockResolvedValue(null);

    await handleSetName({
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

    await handleSetName({
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
