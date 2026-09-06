import { describe, expect, it, vi } from 'vitest';

import { createSelectionContext, serializeDesignValue } from './design-context';

interface DesignNodeStub {
  id: string;
  name: string;
  type: SceneNode['type'];
  visible: boolean;
  locked: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  getCSSAsync: () => Promise<Record<string, string>>;
  children?: SceneNode[];
  [key: string]: unknown;
}

function sceneNode(node: DesignNodeStub): SceneNode {
  return node as unknown as SceneNode;
}

function textNode(): SceneNode {
  return sceneNode({
    id: 'text-1',
    name: '제목',
    type: 'TEXT',
    visible: true,
    locked: false,
    x: 16,
    y: 20,
    width: 120,
    height: 24,
    characters: '할 일',
    fontSize: 18,
    fontName: { family: 'Pretendard', style: 'Bold' },
    fontWeight: 700,
    lineHeight: { unit: 'PIXELS', value: 24 },
    letterSpacing: { unit: 'PERCENT', value: 0 },
    fills: figma.mixed,
    getCSSAsync: vi.fn().mockResolvedValue({
      color: '#111111',
      'font-size': '18px',
      'line-height': '24px',
    }),
  });
}

describe('createSelectionContext (선택 디자인 컨텍스트 생성)', () => {
  it('자식 계층과 Inspect CSS 및 디자인 속성을 재귀 직렬화한다', async () => {
    const root = sceneNode({
      id: 'frame-1',
      name: '할 일 카드',
      type: 'FRAME',
      visible: true,
      locked: false,
      x: 100,
      y: 200,
      width: 320,
      height: 160,
      layoutMode: 'VERTICAL',
      paddingTop: 16,
      paddingRight: 20,
      paddingBottom: 16,
      paddingLeft: 20,
      itemSpacing: 8,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      boundVariables: { paddingTop: { type: 'VARIABLE_ALIAS', id: 'v-1' } },
      children: [textNode()],
      getCSSAsync: vi.fn().mockResolvedValue({
        display: 'flex',
        padding: '16px 20px',
        gap: '8px',
      }),
    });

    const result = await createSelectionContext(root);

    expect(result).toMatchObject({
      serializedNodeCount: 2,
      maxDepth: null,
      root: {
        id: 'frame-1',
        width: 320,
        height: 160,
        childCount: 1,
        css: { display: 'flex', padding: '16px 20px', gap: '8px' },
        properties: {
          layoutMode: 'VERTICAL',
          paddingTop: 16,
          boundVariables: {
            paddingTop: { type: 'VARIABLE_ALIAS', id: 'v-1' },
          },
        },
        children: [
          {
            id: 'text-1',
            css: {
              color: '#111111',
              'font-size': '18px',
              'line-height': '24px',
            },
            properties: {
              characters: '할 일',
              fontSize: 18,
              fontName: { family: 'Pretendard', style: 'Bold' },
              fills: { type: 'MIXED' },
            },
          },
        ],
      },
    });
  });

  it('최대 깊이에 도달하면 자식 생략 여부를 명시한다', async () => {
    const root = sceneNode({
      id: 'frame-1',
      name: '프레임',
      type: 'FRAME',
      visible: true,
      locked: false,
      children: [textNode()],
      getCSSAsync: vi.fn().mockResolvedValue({}),
    });

    const result = await createSelectionContext(root, 0);

    expect(result.serializedNodeCount).toBe(1);
    expect(result.root).toMatchObject({
      childCount: 1,
      childrenTruncated: true,
    });
    expect(result.root.children).toBeUndefined();
  });

  it('유효하지 않은 최대 깊이를 거부한다', async () => {
    await expect(createSelectionContext(textNode(), -1)).rejects.toThrow(
      'maxDepth는 0 이상의 정수여야 합니다',
    );
  });
});

describe('serializeDesignValue (디자인 속성값 직렬화)', () => {
  it('혼합값과 중첩 객체를 JSON 호환 값으로 변환한다', () => {
    expect(
      serializeDesignValue({ fontSize: figma.mixed, color: { r: 0.5 } }),
    ).toEqual({
      fontSize: { type: 'MIXED' },
      color: { r: 0.5 },
    });
  });
});
