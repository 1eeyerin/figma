import type {
  RemoveNodeMsg,
  SetNameMsg,
  SetParentMsg,
} from 'figma-bridge-protocol';

import { runAction } from '../dispatch/run-action';
import { getNodeById, requireSceneNode } from '../shared/node-lookup';

export async function handleSetParent(msg: SetParentMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await requireSceneNode(msg.nodeId);
    const newParent = (await getNodeById(msg.parentId)) as
      | (BaseNode & ChildrenMixin)
      | null;
    if (!newParent || !('appendChild' in newParent)) {
      throw new Error(
        `부모 노드가 없거나 자식을 가질 수 없음: ${msg.parentId}`,
      );
    }

    if (typeof msg.index === 'number') {
      newParent.insertChild(msg.index, node);
    } else {
      newParent.appendChild(node);
    }
    return { nodeId: node.id };
  });
}

export async function handleSetName(msg: SetNameMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await requireSceneNode(msg.nodeId);
    node.name = msg.name;
    return { nodeId: node.id };
  });
}

export async function handleRemoveNode(msg: RemoveNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    (await requireSceneNode(msg.nodeId)).remove();
    return {};
  });
}
