export async function getNodeById(id: string): Promise<BaseNode | null> {
  if (!id) return null;
  return figma.getNodeByIdAsync(id);
}

export async function requireSceneNode(nodeId: string): Promise<SceneNode> {
  const node = (await getNodeById(nodeId)) as SceneNode | null;
  if (!node) throw new Error(`노드를 찾을 수 없음: ${nodeId}`);
  return node;
}

export async function resolveTargetNode(
  nodeId: string | undefined,
): Promise<SceneNode> {
  const node = (
    nodeId ? await getNodeById(nodeId) : figma.currentPage.selection[0]
  ) as SceneNode | null;
  if (!node) throw new Error('노드를 찾을 수 없습니다');
  return node;
}
