import { describe, expect, it, vi } from 'vitest';

import { exportNode, serializeNode } from './serialize';

interface SerializableSceneNode {
  id: string;
  name: string;
  type: SceneNode['type'];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  children?: readonly SceneNode[];
  characters?: string;
  fontSize?: number;
}

interface ExportableSceneNode extends SerializableSceneNode {
  exportAsync: ExportMixin['exportAsync'];
}

function sceneNode(node: SerializableSceneNode): SceneNode {
  return node as unknown as SceneNode;
}

describe('serializeNode (노드 직렬화)', () => {
  it('공통 속성과 children 수를 직렬화한다', () => {
    const child = sceneNode({
      id: 'child',
      name: 'Child',
      type: 'RECTANGLE',
    });
    const node = {
      id: 'a',
      name: 'A',
      type: 'FRAME',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      opacity: 0.5,
      children: [child],
    } satisfies SerializableSceneNode;

    expect(serializeNode(sceneNode(node))).toMatchObject({
      id: 'a',
      name: 'A',
      type: 'FRAME',
      childCount: 1,
    });
  });

  it('텍스트 속성이 있으면 characters와 fontSize를 포함한다', () => {
    const node = {
      id: 't',
      name: 'Text',
      type: 'TEXT',
      characters: 'Hello',
      fontSize: 16,
    } satisfies SerializableSceneNode;

    expect(serializeNode(sceneNode(node))).toMatchObject({
      characters: 'Hello',
      fontSize: 16,
    });
  });
});

describe('exportNode (노드 내보내기)', () => {
  it('PNG SCALE 제약으로 export하고 base64로 변환한다', async () => {
    const node = {
      id: 'export',
      name: 'Export',
      type: 'RECTANGLE',
      exportAsync: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    } satisfies ExportableSceneNode;
    vi.mocked(figma.base64Encode).mockReturnValue('encoded');

    await expect(exportNode(sceneNode(node), 2)).resolves.toBe('encoded');
    expect(node.exportAsync).toHaveBeenCalledWith({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 },
    });
  });
});
