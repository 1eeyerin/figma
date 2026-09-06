import type {
  SelectionContextResult,
  SerializedDesignNode,
  SerializedDesignObject,
  SerializedDesignValue,
} from 'figma-bridge-protocol';

const DESIGN_PROPERTY_KEYS = [
  'opacity',
  'blendMode',
  'rotation',
  'relativeTransform',
  'absoluteTransform',
  'absoluteRenderBounds',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'constraints',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutAlign',
  'layoutGrow',
  'layoutPositioning',
  'layoutMode',
  'layoutWrap',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'counterAxisAlignContent',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'itemSpacing',
  'counterAxisSpacing',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
  'clipsContent',
  'fills',
  'fillStyleId',
  'strokes',
  'strokeStyleId',
  'strokeWeight',
  'strokeAlign',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
  'dashPattern',
  'effects',
  'effectStyleId',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'cornerSmoothing',
  'isMask',
  'maskType',
  'isAsset',
  'characters',
  'fontSize',
  'fontName',
  'fontWeight',
  'textAutoResize',
  'textAlignHorizontal',
  'textAlignVertical',
  'lineHeight',
  'letterSpacing',
  'paragraphSpacing',
  'paragraphIndent',
  'textCase',
  'textDecoration',
  'textTruncation',
  'maxLines',
  'hasMissingFont',
  'componentProperties',
  'componentPropertyReferences',
  'variantProperties',
  'overrides',
  'boundVariables',
  'explicitVariableModes',
  'resolvedVariableModes',
  'layoutGrids',
  'gridStyleId',
  'exportSettings',
] as const;

interface SerializedNodeWithCount {
  node: SerializedDesignNode;
  count: number;
}

/**
 * Figma 속성값을 MCP 응답에서 손실 없이 전달할 수 있는 JSON 값으로 변환합니다.
 */
export function serializeDesignValue(
  value: unknown,
): SerializedDesignValue | undefined {
  if (value === figma.mixed) return { type: 'MIXED' };
  if (value === null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map(serializeDesignValue)
      .filter((item): item is SerializedDesignValue => item !== undefined);
  }
  if (typeof value !== 'object') return undefined;

  const result: SerializedDesignObject = {};
  for (const [key, child] of Object.entries(value)) {
    const serialized = serializeDesignValue(child);
    if (serialized !== undefined) result[key] = serialized;
  }
  return result;
}

/**
 * 노드 타입이 제공하는 디자인 속성만 선별해 JSON 객체로 직렬화합니다.
 */
function serializeProperties(node: SceneNode): SerializedDesignObject {
  const properties: SerializedDesignObject = {};
  for (const key of DESIGN_PROPERTY_KEYS) {
    if (!(key in node)) continue;
    const serialized = serializeDesignValue(Reflect.get(node, key));
    if (serialized !== undefined) properties[key] = serialized;
  }
  return properties;
}

/**
 * 노드에서 숫자 속성이 제공되는 경우에만 값을 반환합니다.
 */
function numberProperty(node: SceneNode, key: string): number | undefined {
  const value = Reflect.get(node, key);
  return typeof value === 'number' ? value : undefined;
}

/**
 * 자식 노드를 가진 Figma 노드에서 현재 순서대로 자식 목록을 반환합니다.
 */
function childNodes(node: SceneNode): readonly SceneNode[] {
  if (!('children' in node)) return [];
  const children = Reflect.get(node, 'children');
  return Array.isArray(children) ? (children as readonly SceneNode[]) : [];
}

/**
 * Figma 노드와 자식 계층을 Inspect CSS를 포함한 디자인 컨텍스트로 변환합니다.
 */
async function serializeDesignNode(
  source: SceneNode,
  depth: number,
  maxDepth: number | undefined,
): Promise<SerializedNodeWithCount> {
  const children = childNodes(source);
  const childrenTruncated =
    maxDepth !== undefined && depth >= maxDepth && children.length > 0;
  const serializedChildren = childrenTruncated
    ? []
    : await Promise.all(
        children.map((child) =>
          serializeDesignNode(child, depth + 1, maxDepth),
        ),
      );
  const node: SerializedDesignNode = {
    id: source.id,
    name: source.name,
    type: source.type,
    visible: source.visible,
    locked: source.locked,
    css: await source.getCSSAsync(),
    properties: serializeProperties(source),
  };

  const x = numberProperty(source, 'x');
  const y = numberProperty(source, 'y');
  const width = numberProperty(source, 'width');
  const height = numberProperty(source, 'height');
  if (x !== undefined) node.x = x;
  if (y !== undefined) node.y = y;
  if (width !== undefined) node.width = width;
  if (height !== undefined) node.height = height;
  if (children.length > 0) node.childCount = children.length;
  if (childrenTruncated) node.childrenTruncated = true;
  if (serializedChildren.length > 0) {
    node.children = serializedChildren.map((child) => child.node);
  }

  return {
    node,
    count: 1 + serializedChildren.reduce((sum, child) => sum + child.count, 0),
  };
}

/**
 * 선택한 루트 노드를 코드 구현에 필요한 재귀 디자인 컨텍스트로 직렬화합니다.
 */
export async function createSelectionContext(
  source: SceneNode,
  maxDepth?: number,
): Promise<SelectionContextResult> {
  if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 0)) {
    throw new Error('maxDepth는 0 이상의 정수여야 합니다');
  }

  const serialized = await serializeDesignNode(source, 0, maxDepth);
  return {
    root: serialized.node,
    serializedNodeCount: serialized.count,
    maxDepth: maxDepth ?? null,
  };
}
