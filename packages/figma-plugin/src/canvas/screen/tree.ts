import type {
  FrameDef,
  NodeTreeDef,
  RectDef,
  TextDef,
} from 'figma-bridge-protocol';

import { createFrame, createRect, createText } from '../draw/nodes';

export async function createNodeFromTree(
  def: NodeTreeDef,
  parent: BaseNode & ChildrenMixin,
): Promise<SceneNode> {
  const type = def.type ?? 'rectangle';

  if (type === 'frame') {
    const frame = createFrame(def as FrameDef);
    parent.appendChild(frame);
    const children = (def as FrameDef).children;
    if (Array.isArray(children)) {
      for (const childDef of children) {
        await createNodeFromTree(childDef, frame);
      }
    }
    return frame;
  }

  if (type === 'text') {
    const text = await createText(def as TextDef);
    parent.appendChild(text);
    return text;
  }

  const rect = createRect(def as RectDef);
  parent.appendChild(rect);
  return rect;
}
