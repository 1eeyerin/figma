import { getNodeById } from './nodeQuery';
import { colorToFill } from './utils/color';
import { applyStroke, buildEffects } from './utils/effects';
import { loadFont } from './utils/font';

// msg → 적용할 속성 dict 변환 (순수). figma 노드에 직접 쓰는 부분과 분리해 테스트 용이성을 확보한다.

export function rectPropsFrom(msg: any): Record<string, unknown> {
  const props: Record<string, unknown> = {
    x: msg.x ?? 0,
    y: msg.y ?? 0,
  };
  if (msg.name) props.name = msg.name;

  const fill = colorToFill(msg.color);
  if (fill) props.fills = [fill];
  if (typeof msg.opacity === 'number') props.opacity = msg.opacity;
  if (typeof msg.cornerRadius === 'number')
    props.cornerRadius = msg.cornerRadius;
  if (Array.isArray(msg.cornerRadii)) {
    props.topLeftRadius = msg.cornerRadii[0];
    props.topRightRadius = msg.cornerRadii[1];
    props.bottomRightRadius = msg.cornerRadii[2];
    props.bottomLeftRadius = msg.cornerRadii[3];
  }

  return props;
}

export function framePropsFrom(def: any): Record<string, unknown> {
  const props: Record<string, unknown> = {
    name: def.name ?? 'Frame',
    x: def.x ?? 0,
    y: def.y ?? 0,
  };

  const fill = colorToFill(def.color);
  props.fills = fill ? [fill] : [];
  if (typeof def.opacity === 'number') props.opacity = def.opacity;
  if (typeof def.cornerRadius === 'number')
    props.cornerRadius = def.cornerRadius;
  if (def.clipContent !== undefined) props.clipsContent = def.clipContent;

  return props;
}

export function frameLayoutPropsFrom(def: any): Record<string, unknown> | null {
  if (!def.layoutMode || def.layoutMode === 'NONE') return null;

  const props: Record<string, unknown> = { layoutMode: def.layoutMode };
  if (def.primaryAxisSizing)
    props.primaryAxisSizingMode = def.primaryAxisSizing;
  if (def.counterAxisSizing)
    props.counterAxisSizingMode = def.counterAxisSizing;
  if (typeof def.itemSpacing === 'number') props.itemSpacing = def.itemSpacing;
  if (typeof def.paddingTop === 'number') props.paddingTop = def.paddingTop;
  if (typeof def.paddingRight === 'number')
    props.paddingRight = def.paddingRight;
  if (typeof def.paddingBottom === 'number')
    props.paddingBottom = def.paddingBottom;
  if (typeof def.paddingLeft === 'number') props.paddingLeft = def.paddingLeft;

  return props;
}

function applyFrameLayout(frame: FrameNode, def: any): void {
  const layoutProps = frameLayoutPropsFrom(def);
  if (layoutProps) Object.assign(frame, layoutProps);
}

export function createRect(msg: any): RectangleNode {
  const rect = figma.createRectangle();
  Object.assign(rect, rectPropsFrom(msg));
  rect.resize(msg.width ?? 100, msg.height ?? 100);

  applyStroke(rect, msg);
  const effects = buildEffects(msg);
  if (effects.length) rect.effects = effects;

  return rect;
}

export function textPropsFrom(msg: any): Record<string, unknown> {
  const props: Record<string, unknown> = {
    x: msg.x ?? 0,
    y: msg.y ?? 0,
    characters: msg.content ?? '',
  };
  if (msg.name) props.name = msg.name;

  if (typeof msg.fontSize === 'number') props.fontSize = msg.fontSize;
  const fill = colorToFill(msg.color);
  if (fill) props.fills = [fill];
  if (typeof msg.opacity === 'number') props.opacity = msg.opacity;
  if (msg.textAlign) props.textAlignHorizontal = msg.textAlign;
  if (typeof msg.letterSpacing === 'number') {
    props.letterSpacing = { value: msg.letterSpacing, unit: 'PIXELS' };
  }
  if (msg.lineHeight && msg.lineHeight !== 'AUTO')
    props.lineHeight = msg.lineHeight;
  if (msg.autoResize) props.textAutoResize = msg.autoResize;

  return props;
}

export async function createText(msg: any): Promise<TextNode> {
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

export function createFrame(msg: any): FrameNode {
  const frame = figma.createFrame();
  Object.assign(frame, framePropsFrom(msg));
  frame.resize(msg.width ?? 100, msg.height ?? 100);

  applyFrameLayout(frame, msg);
  applyStroke(frame, msg);
  const effects = buildEffects(msg);
  if (effects.length) frame.effects = effects;

  return frame;
}

export function appendToParent(node: SceneNode, parentId?: string): void {
  const parent = parentId ? getNodeById(parentId) : null;
  if (parent && 'appendChild' in parent) {
    (parent as FrameNode).appendChild(node);
  } else {
    figma.currentPage.appendChild(node);
  }
}

export async function createNodeFromTree(
  def: any,
  parent: BaseNode & ChildrenMixin,
): Promise<SceneNode> {
  const type = def.type ?? 'rectangle';

  if (type === 'frame') {
    const frame = createFrame(def);
    parent.appendChild(frame);
    if (Array.isArray(def.children)) {
      for (const childDef of def.children) {
        await createNodeFromTree(childDef, frame);
      }
    }
    return frame;
  }

  if (type === 'text') {
    const text = await createText(def);
    parent.appendChild(text);
    return text;
  }

  const rect = createRect(def);
  parent.appendChild(rect);
  return rect;
}
