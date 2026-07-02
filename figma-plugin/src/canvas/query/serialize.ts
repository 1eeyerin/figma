import { copyIfPresent } from '../utils/props';

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  x: number | undefined;
  y: number | undefined;
  width: number | undefined;
  height: number | undefined;
  opacity: number | undefined;
  fills?: readonly unknown[];
  strokes?: readonly unknown[];
  effects?: readonly unknown[];
  childCount?: number;
  characters?: string;
  fontSize?: number | symbol;
}

function numberProp(node: SceneNode, key: string): number | undefined {
  const value = Reflect.get(node, key);
  return typeof value === 'number' ? value : undefined;
}

function childrenCount(node: SceneNode): number | undefined {
  if (!('children' in node)) return undefined;

  const children = Reflect.get(node, 'children');
  return Array.isArray(children) ? children.length : undefined;
}

/**
 * Figma SceneNode에서 외부 응답에 필요한 기본 속성과 표시 속성만 추려냅니다.
 */
export function serializeNode(node: SceneNode): SerializedNode {
  const base: SerializedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: numberProp(node, 'x'),
    y: numberProp(node, 'y'),
    width: numberProp(node, 'width'),
    height: numberProp(node, 'height'),
    opacity: numberProp(node, 'opacity'),
  };
  copyIfPresent(base, node, [
    'fills',
    'strokes',
    'effects',
    'characters',
    'fontSize',
  ]);
  const childCount = childrenCount(node);
  if (childCount !== undefined) base.childCount = childCount;
  return base;
}

/**
 * SceneNode를 PNG로 내보내고 MCP 응답에 실을 base64 문자열로 변환합니다.
 */
export async function exportNode(node: SceneNode, scale = 1): Promise<string> {
  const bytes = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  });
  return figma.base64Encode(bytes);
}
