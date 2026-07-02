import type {
  ExportNodeMsg,
  GetNodeMsg,
  GetPageMsg,
} from '@figma-bridge/protocol';

import { runAction } from '../dispatch/run-action';
import { resolveTargetNode } from '../shared/node-lookup';
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
 * 지정한 노드 또는 현재 선택 노드를 PNG로 export한 base64 결과를 회신합니다.
 */
export async function handleExportNode(msg: ExportNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    const base64 = await exportNode(node, msg.scale);
    return { result: { base64, nodeId: node.id } };
  });
}
