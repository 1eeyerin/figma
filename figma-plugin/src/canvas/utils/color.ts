/** 0~255 채널 값을 Figma의 0~1 RGB 스케일로 변환한다. */
function channelToUnit(value: number): number {
  return value / 255;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: channelToUnit(parseInt(clean.slice(0, 2), 16)),
    g: channelToUnit(parseInt(clean.slice(2, 4), 16)),
    b: channelToUnit(parseInt(clean.slice(4, 6), 16)),
  };
}

export function parseColor(
  colorStr: string | undefined,
): { rgb: RGB; a: number } | null {
  if (!colorStr) return null;
  if (colorStr.startsWith('rgba')) {
    const m = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (m) {
      return {
        rgb: {
          r: channelToUnit(+m[1]),
          g: channelToUnit(+m[2]),
          b: channelToUnit(+m[3]),
        },
        a: parseFloat(m[4]),
      };
    }
  }
  if (colorStr.startsWith('#')) {
    return { rgb: hexToRgb(colorStr), a: 1 };
  }
  return null;
}

export function colorToFill(colorStr: string | undefined): SolidPaint | null {
  const parsed = parseColor(colorStr);
  if (!parsed) return null;
  const fill: SolidPaint = { type: 'SOLID', color: parsed.rgb };
  if (parsed.a < 1) (fill as any).opacity = parsed.a;
  return fill;
}
