import { describe, expect, it, vi } from 'vitest';

import { exportNode, serializeNode } from './serialize';

describe('serializeNode (노드 직렬화)', () => {
  it('공통 속성과 children 수를 직렬화한다', () => {
    const node: any = {
      id: 'a',
      name: 'A',
      type: 'FRAME',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      opacity: 0.5,
      children: [{ id: 'child' }],
    };

    expect(serializeNode(node)).toMatchObject({
      id: 'a',
      name: 'A',
      type: 'FRAME',
      childCount: 1,
    });
  });

  it('텍스트 속성이 있으면 characters와 fontSize를 포함한다', () => {
    const node: any = {
      id: 't',
      name: 'Text',
      type: 'TEXT',
      characters: 'Hello',
      fontSize: 16,
    };

    expect(serializeNode(node)).toMatchObject({
      characters: 'Hello',
      fontSize: 16,
    });
  });
});

describe('exportNode (노드 내보내기)', () => {
  it('PNG SCALE 제약으로 export하고 base64로 변환한다', async () => {
    const node: any = {
      exportAsync: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    };
    (figma.base64Encode as any).mockReturnValue('encoded');

    await expect(exportNode(node, 2)).resolves.toBe('encoded');
    expect(node.exportAsync).toHaveBeenCalledWith({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 },
    });
  });
});
