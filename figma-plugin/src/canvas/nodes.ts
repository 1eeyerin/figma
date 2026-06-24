import { colorToFill } from './utils/color'
import { loadFont } from './utils/font'
import { applyStroke, buildEffects } from './utils/effects'
import { getNodeById } from './nodeQuery'

function applyFrameLayout(frame: FrameNode, def: any): void {
  if (!def.layoutMode || def.layoutMode === 'NONE') return
  frame.layoutMode = def.layoutMode
  if (def.primaryAxisSizing) frame.primaryAxisSizingMode = def.primaryAxisSizing
  if (def.counterAxisSizing) frame.counterAxisSizingMode = def.counterAxisSizing
  if (typeof def.itemSpacing === 'number') frame.itemSpacing = def.itemSpacing
  if (typeof def.paddingTop === 'number') frame.paddingTop = def.paddingTop
  if (typeof def.paddingRight === 'number') frame.paddingRight = def.paddingRight
  if (typeof def.paddingBottom === 'number') frame.paddingBottom = def.paddingBottom
  if (typeof def.paddingLeft === 'number') frame.paddingLeft = def.paddingLeft
}

export function createRect(msg: any): RectangleNode {
  const rect = figma.createRectangle()
  if (msg.name) rect.name = msg.name
  rect.x = msg.x ?? 0
  rect.y = msg.y ?? 0
  rect.resize(msg.width ?? 100, msg.height ?? 100)

  const fill = colorToFill(msg.color)
  if (fill) rect.fills = [fill]
  if (typeof msg.opacity === 'number') rect.opacity = msg.opacity
  if (typeof msg.cornerRadius === 'number') rect.cornerRadius = msg.cornerRadius
  if (Array.isArray(msg.cornerRadii)) {
    rect.topLeftRadius = msg.cornerRadii[0]
    rect.topRightRadius = msg.cornerRadii[1]
    rect.bottomRightRadius = msg.cornerRadii[2]
    rect.bottomLeftRadius = msg.cornerRadii[3]
  }

  applyStroke(rect, msg)
  const effects = buildEffects(msg)
  if (effects.length) rect.effects = effects

  return rect
}

export async function createText(msg: any): Promise<TextNode> {
  const fontName = await loadFont(msg.fontFamily ?? 'Inter', msg.fontWeight ?? 'Regular')
  const text = figma.createText()
  if (msg.name) text.name = msg.name
  text.fontName = fontName
  text.x = msg.x ?? 0
  text.y = msg.y ?? 0
  text.characters = msg.content ?? ''

  if (typeof msg.fontSize === 'number') text.fontSize = msg.fontSize
  const fill = colorToFill(msg.color)
  if (fill) text.fills = [fill]
  if (typeof msg.opacity === 'number') text.opacity = msg.opacity
  if (msg.textAlign) text.textAlignHorizontal = msg.textAlign
  if (typeof msg.letterSpacing === 'number') {
    text.letterSpacing = { value: msg.letterSpacing, unit: 'PIXELS' }
  }
  if (msg.lineHeight && msg.lineHeight !== 'AUTO') text.lineHeight = msg.lineHeight
  if (msg.autoResize) {
    text.textAutoResize = msg.autoResize
  } else if (typeof msg.width === 'number') {
    text.textAutoResize = 'HEIGHT'
    text.resize(msg.width, text.height)
  }

  return text
}

export function createFrame(msg: any): FrameNode {
  const frame = figma.createFrame()
  frame.name = msg.name ?? 'Frame'
  frame.x = msg.x ?? 0
  frame.y = msg.y ?? 0
  frame.resize(msg.width ?? 100, msg.height ?? 100)

  const fill = colorToFill(msg.color)
  frame.fills = fill ? [fill] : []
  if (typeof msg.opacity === 'number') frame.opacity = msg.opacity
  if (typeof msg.cornerRadius === 'number') frame.cornerRadius = msg.cornerRadius

  applyFrameLayout(frame, msg)
  applyStroke(frame, msg)
  const effects = buildEffects(msg)
  if (effects.length) frame.effects = effects
  if (msg.clipContent !== undefined) frame.clipsContent = msg.clipContent

  return frame
}

export function appendToParent(node: SceneNode, parentId?: string): void {
  const parent = parentId ? getNodeById(parentId) : null
  if (parent && 'appendChild' in parent) {
    (parent as FrameNode).appendChild(node)
  } else {
    figma.currentPage.appendChild(node)
  }
}

export async function createNodeFromTree(
  def: any,
  parent: BaseNode & ChildrenMixin,
): Promise<SceneNode> {
  const type = def.type ?? 'rectangle'

  if (type === 'frame') {
    const frame = createFrame(def)
    parent.appendChild(frame)
    if (Array.isArray(def.children)) {
      for (const childDef of def.children) {
        await createNodeFromTree(childDef, frame)
      }
    }
    return frame
  }

  if (type === 'text') {
    const text = await createText(def)
    parent.appendChild(text)
    return text
  }

  const rect = createRect(def)
  parent.appendChild(rect)
  return rect
}
