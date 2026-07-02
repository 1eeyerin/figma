import { copyIfPresent } from './utils/props';

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

export async function getNodeById(id: string): Promise<BaseNode | null> {
  if (!id) return null;
  return figma.getNodeByIdAsync(id);
}

export function serializeNode(node: SceneNode): SerializedNode {
  // SceneNode가 레이아웃 속성을 공통으로 가지지 않는 union이므로 타입 단언으로 접근한다.
  const n = node as SceneNode & {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
    fills?: readonly unknown[];
    strokes?: readonly unknown[];
    effects?: readonly unknown[];
    children?: readonly SceneNode[];
    characters?: string;
    fontSize?: number | symbol;
  };

  const base: SerializedNode = {
    id: n.id,
    name: n.name,
    type: n.type,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    opacity: n.opacity,
  };
  copyIfPresent(base, n, [
    'fills',
    'strokes',
    'effects',
    'characters',
    'fontSize',
  ]);
  if ('children' in node) base.childCount = n.children?.length;
  return base;
}

export async function exportNode(node: SceneNode, scale = 1): Promise<string> {
  const bytes = await (node as ExportMixin).exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  });
  return figma.base64Encode(bytes);
}
