import type { CreateScreenMsg } from 'figma-bridge-protocol';

import { runAction } from '../dispatch/run-action';
import { getNodeById } from '../shared';
import { createNodeFromTree } from './tree';

export async function handleCreateScreen(msg: CreateScreenMsg): Promise<void> {
  await runAction(msg, '스크린 생성', async () => {
    const parent = (msg.parentId ? await getNodeById(msg.parentId) : null) as
      | (BaseNode & ChildrenMixin)
      | null;
    const root = await createNodeFromTree(
      msg.tree,
      parent ?? figma.currentPage,
    );
    figma.currentPage.selection = [root];
    figma.viewport.scrollAndZoomIntoView([root]);
    return { nodeId: root.id };
  });
}
