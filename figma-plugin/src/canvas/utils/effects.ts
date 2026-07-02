import type { ShadowDef, StrokeAlign } from '../types';
import { colorToFill, parseColor } from './color';

interface WithShadow {
  shadow?: ShadowDef;
  blur?: number;
}

interface WithStroke {
  strokeColor?: string;
  strokeWeight?: number;
  strokeAlign?: StrokeAlign;
}

export function buildEffects(msg: WithShadow): Effect[] {
  const effects: Effect[] = [];
  if (msg.shadow) {
    const s = msg.shadow;
    const parsed = parseColor(s.color ?? '#000000');
    const rgb = parsed?.rgb ?? { r: 0, g: 0, b: 0 };
    const alpha = (parsed?.a ?? 1) * (s.opacity ?? 1);
    effects.push({
      type: s.type ?? 'DROP_SHADOW',
      color: { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha },
      offset: { x: s.offsetX ?? 0, y: s.offsetY ?? 4 },
      radius: s.blur ?? 8,
      spread: s.spread ?? 0,
      visible: true,
      blendMode: 'NORMAL',
    } as DropShadowEffect);
  }
  if (typeof msg.blur === 'number') {
    effects.push({
      type: 'LAYER_BLUR',
      radius: msg.blur,
      visible: true,
    } as BlurEffect);
  }
  return effects;
}

export function applyStroke(node: GeometryMixin, msg: WithStroke): void {
  const fill = colorToFill(msg.strokeColor);
  if (fill) node.strokes = [fill];
  if (typeof msg.strokeWeight === 'number')
    node.strokeWeight = msg.strokeWeight;
  if (msg.strokeAlign) node.strokeAlign = msg.strokeAlign;
}
