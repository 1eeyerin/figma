import type { FrameDef, RectDef, TextDef } from '@figma-bridge/protocol';

import { colorToFill } from '../utils/color';
import { setIfNumber } from '../utils/props';
import { CORNER_RADIUS_KEYS, FRAME_PADDING_KEYS } from './constants';

/**
 * 도형 정의에서 모든 draw 노드가 공유하는 기본 위치와 투명도 속성을 만듭니다.
 */
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

/**
 * 사각형 정의를 Figma RectangleNode에 할당할 수 있는 속성 객체로 변환합니다.
 */
export function rectPropsFrom(msg: RectDef): Record<string, unknown> {
  const props = basePropsFrom(msg);
  if (msg.name) props.name = msg.name;

  const fill = colorToFill(msg.color);
  if (fill) props.fills = [fill];
  setIfNumber(props, 'cornerRadius', msg.cornerRadius);
  if (Array.isArray(msg.cornerRadii)) {
    const cornerRadii = msg.cornerRadii;
    CORNER_RADIUS_KEYS.forEach((key, index) => {
      props[key] = cornerRadii[index];
    });
  }

  return props;
}

/**
 * 텍스트 정의를 Figma TextNode에 할당할 수 있는 속성 객체로 변환합니다.
 */
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

/**
 * 프레임 정의를 Figma FrameNode에 할당할 수 있는 기본 속성 객체로 변환합니다.
 */
export function framePropsFrom(def: FrameDef): Record<string, unknown> {
  const props = basePropsFrom(def);
  props.name = def.name ?? 'Frame';

  const fill = colorToFill(def.color);
  props.fills = fill ? [fill] : [];
  setIfNumber(props, 'cornerRadius', def.cornerRadius);
  if (def.clipContent !== undefined) props.clipsContent = def.clipContent;

  return props;
}

/**
 * 프레임 정의의 자동 레이아웃 설정을 Figma 레이아웃 속성 객체로 변환합니다.
 */
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

  for (const key of FRAME_PADDING_KEYS) {
    setIfNumber(props, key, def[key]);
  }

  return props;
}
