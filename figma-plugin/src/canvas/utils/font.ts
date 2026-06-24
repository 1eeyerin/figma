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
}

export async function loadFont(family: string, weight: string): Promise<FontName> {
  const style = WEIGHT_MAP[weight] ?? 'Regular'
  const fontName: FontName = { family, style }
  try {
    await figma.loadFontAsync(fontName)
    return fontName
  } catch {
    const fallback: FontName = { family: 'Inter', style: 'Regular' }
    await figma.loadFontAsync(fallback)
    return fallback
  }
}
