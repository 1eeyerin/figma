import { copyIfPresent } from './utils/props';

export async function getNodeById(id: string): Promise<BaseNode | null> {
  if (!id) return null;
  return figma.getNodeByIdAsync(id);
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
  };
  copyIfPresent(base, node, [
    'fills',
    'strokes',
    'effects',
    'characters',
    'fontSize',
  ]);
  if ('children' in node) base.childCount = (node as any).children.length;
  return base;
}

export async function exportNode(node: SceneNode, scale = 1): Promise<string> {
  const bytes = await (node as any).exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  });
  return figma.base64Encode(bytes);
}
