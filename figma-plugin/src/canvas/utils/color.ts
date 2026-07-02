function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
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
        rgb: { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255 },
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
  if (parsed.a < 1) fill.opacity = parsed.a;
  return fill;
}
