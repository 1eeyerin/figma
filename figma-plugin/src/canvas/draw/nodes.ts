import type { FrameDef, RectDef, TextDef } from '@figma-bridge/protocol';

import { applyStroke, buildEffects } from '../utils/effects';
import { loadFont } from '../utils/font';
import {
  frameLayoutPropsFrom,
  framePropsFrom,
  rectPropsFrom,
  textPropsFrom,
} from './props';

/**
 * 프레임 정의에 자동 레이아웃 속성이 있으면 Figma 프레임에 적용합니다.
 */
function applyFrameLayout(frame: FrameNode, def: FrameDef): void {
  const layoutProps = frameLayoutPropsFrom(def);
  if (layoutProps) Object.assign(frame, layoutProps);
}

/**
 * 사각형 정의를 Figma RectangleNode로 생성하고 도형 스타일을 적용합니다.
 */
export function createRect(msg: RectDef): RectangleNode {
  const rect = figma.createRectangle();
  Object.assign(rect, rectPropsFrom(msg));
  rect.resize(msg.width ?? 100, msg.height ?? 100);

  applyStroke(rect, msg);
  const effects = buildEffects(msg);
  if (effects.length) rect.effects = effects;

  return rect;
}

/**
 * 텍스트 정의를 Figma TextNode로 생성하고 필요한 폰트를 로드합니다.
 */
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

/**
 * 프레임 정의를 Figma FrameNode로 생성하고 레이아웃과 스타일을 적용합니다.
 */
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
