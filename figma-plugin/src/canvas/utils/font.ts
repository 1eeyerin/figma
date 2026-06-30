const WEIGHT_MAP: Record<string, string> = {
  Thin: 'Thin',
  ExtraLight: 'ExtraLight',
  Light: 'Light',
  Regular: 'Regular',
  Medium: 'Medium',
  SemiBold: 'SemiBold',
  Bold: 'Bold',
  ExtraBold: 'ExtraBold',
  Black: 'Black',
};

export function resolveFontStyle(weight: string): string {
  return WEIGHT_MAP[weight] ?? 'Regular';
}

export async function loadFont(
  family: string,
  weight: string,
  loadFontAsync: (fontName: FontName) => Promise<void> = figma.loadFontAsync,
): Promise<FontName> {
  const fontName: FontName = { family, style: resolveFontStyle(weight) };
  try {
    await loadFontAsync(fontName);
    return fontName;
  } catch {
    const fallback: FontName = { family: 'Inter', style: 'Regular' };
    await loadFontAsync(fallback);
    return fallback;
  }
}
