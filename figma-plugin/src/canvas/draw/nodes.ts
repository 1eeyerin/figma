import type { FrameDef, RectDef, TextDef } from '@figma-bridge/protocol';

import { applyStroke, buildEffects } from '../utils/effects';
import { loadFont } from '../utils/font';
import {
  frameLayoutPropsFrom,
  framePropsFrom,
  rectPropsFrom,
  textPropsFrom,
} from './props';

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
