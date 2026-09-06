import type {
  ExportNodeMsg,
  GetNodeMsg,
  GetPageMsg,
  GetSelectionContextMsg,
} from 'figma-bridge-protocol';

import { runAction } from '../dispatch/run-action';
import { requireSceneNode, resolveTargetNode } from '../shared';
import { createSelectionContext } from './design-context';
import { exportNode, serializeNode } from './serialize';

/**
 * 지정한 노드 또는 현재 선택 노드를 조회해 직렬화 결과를 회신합니다.
 */
export async function handleGetNode(msg: GetNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    return { result: serializeNode(node) };
  });
}

/**
 * 현재 페이지의 최상위 자식 노드 목록을 직렬화해 회신합니다.
 */
export async function handleGetPage(msg: GetPageMsg): Promise<void> {
  await runAction(msg, null, () => ({
    result: figma.currentPage.children.map(serializeNode),
  }));
}

/**
 * 지정한 노드 목록 또는 현재 선택 전체를 재귀 디자인 컨텍스트로 조회해 회신합니다.
 */
export async function handleGetSelectionContext(
  msg: GetSelectionContextMsg,
): Promise<void> {
  await runAction(msg, null, async () => {
    if (msg.nodeId !== undefined && msg.nodeIds !== undefined) {
      throw new Error('nodeId와 nodeIds는 함께 지정할 수 없습니다');
    }
    const ids =
      msg.nodeIds ?? (msg.nodeId !== undefined ? [msg.nodeId] : undefined);
    if (
      ids !== undefined &&
      (ids.length === 0 || ids.some((id) => !id.trim()))
    ) {
      throw new Error('노드 ID 목록에는 하나 이상의 유효한 ID가 필요합니다');
    }
    const nodes =
      ids === undefined
        ? [...figma.currentPage.selection]
        : await Promise.all([...new Set(ids)].map(requireSceneNode));
    if (nodes.length === 0) {
      throw new Error('Figma에서 프레임 또는 노드를 하나 이상 선택해 주세요');
    }
    const contexts = await Promise.all(
      nodes.map((node) => createSelectionContext(node, msg.maxDepth)),
    );
    return {
      result:
        contexts.length === 1
          ? contexts[0]
          : { selectionCount: contexts.length, contexts },
    };
  });
}

/**
 * 지정한 노드 또는 현재 선택 노드를 내보낸 base64와 형식을 회신합니다.
 */
export async function handleExportNode(msg: ExportNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    const format = msg.format ?? 'PNG';
    const base64 = await exportNode(node, msg.scale, format);
    return { result: { base64, nodeId: node.id, format } };
  });
}
