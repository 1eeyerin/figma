import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleExportNode,
  handleGetPage,
  handleGetSelectionContext,
} from './handler';

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

describe('handleExportNode (형식별 내보내기)', () => {
  it.each([undefined, 'PNG', 'SVG'] as const)(
    '요청 형식 %s를 반영하고 실제 형식을 회신한다',
    async (format) => {
      const exportAsync = vi.fn().mockResolvedValue(new Uint8Array([1]));
      Object.defineProperty(figma.currentPage, 'selection', {
        configurable: true,
        value: [{ id: 'logo', exportAsync }],
      });
      vi.mocked(figma.base64Encode).mockReturnValue('encoded');
      await handleExportNode({ id: 'export-1', type: 'EXPORT_NODE', format });
      expect(exportAsync).toHaveBeenCalledWith(
        expect.objectContaining({ format: format ?? 'PNG' }),
      );
      expect(figma.ui.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'export-1',
          success: true,
          result: {
            base64: 'encoded',
            nodeId: 'logo',
            format: format ?? 'PNG',
          },
        }),
      );
    },
  );
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

  it.each([false, true])(
    '여러 프레임과 하위 계층을 순서대로 조회한다 (ID 지정: %s)',
    async (useIds) => {
      const child = {
        id: 'child',
        name: '내용',
        type: 'TEXT',
        getCSSAsync: vi.fn().mockResolvedValue({ color: '#000000' }),
      };
      const frames = ['기본', '빈 상태'].map(
        (name, index) =>
          ({
            id: `frame-${index}`,
            name,
            type: 'FRAME',
            children: [child],
            getCSSAsync: vi.fn().mockResolvedValue({ width: '320px' }),
          }) as unknown as SceneNode,
      );
      Object.defineProperty(figma.currentPage, 'selection', {
        configurable: true,
        value: useIds ? [] : frames,
      });
      vi.mocked(figma.getNodeByIdAsync).mockImplementation(
        async (id) => frames.find((frame) => frame.id === id) ?? null,
      );
      await handleGetSelectionContext({
        id: 'multi',
        type: 'GET_SELECTION_CONTEXT',
        ...(useIds ? { nodeIds: ['frame-0', 'frame-1', 'frame-0'] } : {}),
      });
      expect(figma.ui.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: {
            selectionCount: 2,
            contexts: frames.map((frame) =>
              expect.objectContaining({
                serializedNodeCount: 2,
                root: expect.objectContaining({
                  id: frame.id,
                  name: frame.name,
                  children: [expect.objectContaining({ id: 'child' })],
                }),
              }),
            ),
          },
        }),
      );
    },
  );

  it('모든 선택 프레임에 깊이 제한을 적용한다', async () => {
    const frames = ['a', 'b'].map((id) => ({
      id,
      children: [{ id: 'child' }],
      getCSSAsync: vi.fn().mockResolvedValue({}),
    }));
    Object.defineProperty(figma.currentPage, 'selection', {
      configurable: true,
      value: frames,
    });
    await handleGetSelectionContext({
      id: 'depth',
      type: 'GET_SELECTION_CONTEXT',
      maxDepth: 0,
    });
    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        result: {
          selectionCount: 2,
          contexts: frames.map(({ id }) =>
            expect.objectContaining({
              maxDepth: 0,
              serializedNodeCount: 1,
              root: expect.objectContaining({ id, childrenTruncated: true }),
            }),
          ),
        },
      }),
    );
  });

  it.each([
    { nodeIds: [] },
    { nodeIds: [''] },
    { nodeId: 'a', nodeIds: ['b'] },
    { nodeIds: ['missing'] },
  ])('잘못된 ID 요청은 성공 결과 없이 오류를 반환한다: %j', async (params) => {
    vi.mocked(figma.getNodeByIdAsync).mockResolvedValue(null);
    await handleGetSelectionContext({
      id: 'invalid',
      type: 'GET_SELECTION_CONTEXT',
      ...params,
    });
    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.any(String) }),
    );
  });

  it('선택한 노드가 없으면 명확한 오류를 회신한다', async () => {
    await handleGetSelectionContext({
      id: 'context-2',
      type: 'GET_SELECTION_CONTEXT',
    });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'context-2',
        success: false,
        error: 'Figma에서 프레임 또는 노드를 하나 이상 선택해 주세요',
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
