import { getNodeById } from './nodeQuery';
import type { RectDef, TextDef, FrameDef, NodeTreeDef } from './types';
import { colorToFill } from './utils/color';
import { applyStroke, buildEffects } from './utils/effects';
import { loadFont } from './utils/font';
import { setIfNumber } from './utils/props';

// msg → 적용할 속성 dict 변환 (순수). figma 노드에 직접 쓰는 부분과 분리해 테스트 용이성을 확보한다.

// 세 props 변환 함수가 공통으로 쓰는 base: x/y 기본값 + 조건부 opacity.
// name/fills는 함수마다 규칙이 미묘하게 달라(항상 세팅 vs 조건부) 여기서 다루지 않는다.
function basePropsFrom(
  def: RectDef | TextDef | FrameDef,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    x: def.x ?? 0,
    y: def.y ?? 0,
  };
  setIfNumber(props, 'opacity', def.opacity);
  return props;
}

export function rectPropsFrom(msg: RectDef): Record<string, unknown> {
  const props = basePropsFrom(msg);
  if (msg.name) props.name = msg.name;

  const fill = colorToFill(msg.color);
  if (fill) props.fills = [fill];
  setIfNumber(props, 'cornerRadius', msg.cornerRadius);
  if (Array.isArray(msg.cornerRadii)) {
    const cornerRadii = msg.cornerRadii;
    const cornerRadiusKeys = [
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius',
    ] as const;
    cornerRadiusKeys.forEach((key, i) => {
      props[key] = cornerRadii[i];
    });
  }

  return props;
}

export function framePropsFrom(def: FrameDef): Record<string, unknown> {
  const props = basePropsFrom(def);
  props.name = def.name ?? 'Frame';

  const fill = colorToFill(def.color);
  props.fills = fill ? [fill] : [];
  setIfNumber(props, 'cornerRadius', def.cornerRadius);
  if (def.clipContent !== undefined) props.clipsContent = def.clipContent;

  return props;
}

export function frameLayoutPropsFrom(
  def: FrameDef,
): Record<string, unknown> | null {
  if (!def.layoutMode || def.layoutMode === 'NONE') return null;

  const props: Record<string, unknown> = { layoutMode: def.layoutMode };
  if (def.primaryAxisSizing)
    props.primaryAxisSizingMode = def.primaryAxisSizing;
  if (def.counterAxisSizing)
    props.counterAxisSizingMode = def.counterAxisSizing;
  if (typeof def.itemSpacing === 'number') props.itemSpacing = def.itemSpacing;

  const paddingKeys = [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ] as const;
  for (const key of paddingKeys) {
    setIfNumber(props, key, def[key]);
  }

  return props;
}

function applyFrameLayout(frame: FrameNode, def: FrameDef): void {
  const layoutProps = frameLayoutPropsFrom(def);
  if (layoutProps) Object.assign(frame, layoutProps);
}

export function createRect(msg: RectDef): RectangleNode {
  const rect = figma.createRectangle();
  Object.assign(rect, rectPropsFrom(msg));
  rect.resize(msg.width ?? 100, msg.height ?? 100);

  applyStroke(rect, msg);
  const effects = buildEffects(msg);
  if (effects.length) rect.effects = effects;

  return rect;
}

export function textPropsFrom(msg: TextDef): Record<string, unknown> {
  const props = basePropsFrom(msg);
  props.characters = msg.content ?? '';
  if (msg.name) props.name = msg.name;

  setIfNumber(props, 'fontSize', msg.fontSize);
  const fill = colorToFill(msg.color);
  if (fill) props.fills = [fill];
  if (msg.textAlign) props.textAlignHorizontal = msg.textAlign;
  if (typeof msg.letterSpacing === 'number') {
    props.letterSpacing = { value: msg.letterSpacing, unit: 'PIXELS' };
  }
  if (msg.lineHeight && msg.lineHeight !== 'AUTO')
    props.lineHeight = msg.lineHeight;
  if (msg.autoResize) props.textAutoResize = msg.autoResize;

  return props;
}

export async function createText(msg: TextDef): Promise<TextNode> {
  const fontName = await loadFont(
    msg.fontFamily ?? 'Inter',
    msg.fontWeight ?? 'Regular',
  );
  const text = figma.createText();
  text.fontName = fontName;
  Object.assign(text, textPropsFrom(msg));

  if (!msg.autoResize && typeof msg.width === 'number') {
    text.textAutoResize = 'HEIGHT';
    text.resize(msg.width, text.height);
  }

  return text;
}

export function createFrame(msg: FrameDef): FrameNode {
  const frame = figma.createFrame();
  Object.assign(frame, framePropsFrom(msg));
  frame.resize(msg.width ?? 100, msg.height ?? 100);

  applyFrameLayout(frame, msg);
  applyStroke(frame, msg);
  const effects = buildEffects(msg);
  if (effects.length) frame.effects = effects;

  return frame;
}

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

export async function createNodeFromTree(
  def: NodeTreeDef,
  parent: BaseNode & ChildrenMixin,
): Promise<SceneNode> {
  const type = def.type ?? 'rectangle';

  if (type === 'frame') {
    const frame = createFrame(def as FrameDef);
    parent.appendChild(frame);
    const children = (def as FrameDef).children;
    if (Array.isArray(children)) {
      for (const childDef of children) {
        await createNodeFromTree(childDef, frame);
      }
    }
    return frame;
  }

  if (type === 'text') {
    const text = await createText(def as TextDef);
    parent.appendChild(text);
    return text;
  }

  const rect = createRect(def as RectDef);
  parent.appendChild(rect);
  return rect;
}
