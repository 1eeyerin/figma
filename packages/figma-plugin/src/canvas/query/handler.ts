import type {
  ExportNodeMsg,
  GetNodeMsg,
  GetPageMsg,
  GetSelectionContextMsg,
} from 'figma-bridge-protocol';

import { runAction } from '../dispatch/run-action';
import { resolveSingleTargetNode, resolveTargetNode } from '../shared';
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
 * 지정 노드 또는 현재 단일 선택을 재귀 디자인 컨텍스트로 조회해 회신합니다.
 */
export async function handleGetSelectionContext(
  msg: GetSelectionContextMsg,
): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveSingleTargetNode(msg.nodeId);
    return { result: await createSelectionContext(node, msg.maxDepth) };
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
