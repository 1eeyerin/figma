import { getNodeById } from './node-lookup';

export async function appendToParent(
  node: SceneNode,
  parentId?: string,
): Promise<void> {
  const parent = parentId ? await getNodeById(parentId) : null;
  if (parent && 'appendChild' in parent) {
    (parent as FrameNode).appendChild(node);
  } else {
    figma.currentPage.appendChild(node);
  }
}
