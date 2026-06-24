export function getNodeById(id: string): BaseNode | null {
  if (!id) return null
  return figma.getNodeById(id)
}

export function serializeNode(node: SceneNode): object {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: (node as any).x,
    y: (node as any).y,
    width: (node as any).width,
    height: (node as any).height,
    opacity: (node as any).opacity,
  }
  if ('fills' in node) base.fills = (node as any).fills
  if ('strokes' in node) base.strokes = (node as any).strokes
  if ('effects' in node) base.effects = (node as any).effects
  if ('children' in node) base.childCount = (node as any).children.length
  if ('characters' in node) base.characters = (node as any).characters
  if ('fontSize' in node) base.fontSize = (node as any).fontSize
  return base
}

export async function exportNode(node: SceneNode, scale = 1): Promise<string> {
  const bytes = await (node as any).exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  })
  return figma.base64Encode(bytes)
}
