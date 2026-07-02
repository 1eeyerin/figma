import type { FrameDef, RectDef, TextDef } from '@figma-bridge/protocol';

import { colorToFill } from '../utils/color';
import { setIfNumber } from '../utils/props';

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
    cornerRadiusKeys.forEach((key, index) => {
      props[key] = cornerRadii[index];
    });
  }

  return props;
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
  if (msg.lineHeight && msg.lineHeight !== 'AUTO') {
    props.lineHeight = msg.lineHeight;
  }
  if (msg.autoResize) props.textAutoResize = msg.autoResize;

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
  if (def.primaryAxisSizing) {
    props.primaryAxisSizingMode = def.primaryAxisSizing;
  }
  if (def.counterAxisSizing) {
    props.counterAxisSizingMode = def.counterAxisSizing;
  }
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
