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

/**
 * nodeId가 없으면 현재 선택이 정확히 하나인지 확인한 뒤 대상 노드를 반환합니다.
 */
export async function resolveSingleTargetNode(
  nodeId: string | undefined,
): Promise<SceneNode> {
  if (nodeId) return requireSceneNode(nodeId);

  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new Error('Figma에서 프레임 또는 노드를 정확히 하나 선택해 주세요');
  }
  return selection[0];
}
