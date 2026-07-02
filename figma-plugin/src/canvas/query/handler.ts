import type {
  ExportNodeMsg,
  GetNodeMsg,
  GetPageMsg,
} from '@figma-bridge/protocol';

import { runAction } from '../dispatch/run-action';
import { resolveTargetNode } from '../shared/node-lookup';
import { exportNode, serializeNode } from './serialize';

export async function handleGetNode(msg: GetNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    return { result: serializeNode(node) };
  });
}

export async function handleGetPage(msg: GetPageMsg): Promise<void> {
  await runAction(msg, null, () => ({
    result: figma.currentPage.children.map(serializeNode),
  }));
}

export async function handleExportNode(msg: ExportNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    const base64 = await exportNode(node, msg.scale);
    return { result: { base64, nodeId: node.id } };
  });
}
