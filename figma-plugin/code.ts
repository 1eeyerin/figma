// figma-bridge 플러그인 메인 코드 (canvas 측)
//
// 제약사항:
// - 이 파일에서 WebSocket/fetch를 직접 사용하지 않는다. 네트워크는 ui.html iframe 전담.
// - canvas ↔ UI 통신은 postMessage 기반.
// - UI는 { pluginMessage: ... }로 래핑하므로 여기서는 래핑이 풀린 본문을 수신한다.

figma.showUI(__html__, { width: 300, height: 220 });

// ─── 색상 유틸 ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function parseColor(colorStr: string | undefined): { rgb: RGB; a: number } | null {
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

function colorToFill(colorStr: string | undefined): SolidPaint | null {
  const parsed = parseColor(colorStr);
  if (!parsed) return null;
  const fill: SolidPaint = { type: 'SOLID', color: parsed.rgb };
  if (parsed.a < 1) (fill as any).opacity = parsed.a;
  return fill;
}

// ─── 폰트 로딩 ──────────────────────────────────────────────────────────────

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

async function loadFont(family: string, weight: string): Promise<FontName> {
  const style = WEIGHT_MAP[weight] ?? 'Regular';
  const fontName: FontName = { family, style };
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch {
    // 폴백: Inter Regular
    const fallback: FontName = { family: 'Inter', style: 'Regular' };
    await figma.loadFontAsync(fallback);
    return fallback;
  }
}

// ─── 효과 빌더 ──────────────────────────────────────────────────────────────

function buildEffects(msg: any): Effect[] {
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
    effects.push({ type: 'LAYER_BLUR', radius: msg.blur, visible: true } as BlurEffect);
  }
  return effects;
}

// ─── 스트로크 적용 ──────────────────────────────────────────────────────────

function applyStroke(node: GeometryMixin, msg: any): void {
  const fill = colorToFill(msg.strokeColor);
  if (fill) node.strokes = [fill];
  if (typeof msg.strokeWeight === 'number') node.strokeWeight = msg.strokeWeight;
  if (msg.strokeAlign) node.strokeAlign = msg.strokeAlign;
}

// ─── 노드 조회 ──────────────────────────────────────────────────────────────

function getNodeById(id: string): BaseNode | null {
  if (!id) return null;
  return figma.getNodeById(id);
}

function serializeNode(node: SceneNode): object {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: (node as any).x,
    y: (node as any).y,
    width: (node as any).width,
    height: (node as any).height,
    opacity: (node as any).opacity,
  };
  if ('fills' in node) base.fills = (node as any).fills;
  if ('strokes' in node) base.strokes = (node as any).strokes;
  if ('effects' in node) base.effects = (node as any).effects;
  if ('children' in node) base.childCount = (node as any).children.length;
  if ('characters' in node) base.characters = (node as any).characters;
  if ('fontSize' in node) base.fontSize = (node as any).fontSize;
  return base;
}

// ─── 재귀 트리 생성 ─────────────────────────────────────────────────────────

async function createNodeFromTree(def: any, parent: BaseNode & ChildrenMixin): Promise<SceneNode> {
  const type = def.type ?? 'rectangle';

  if (type === 'frame') {
    const frame = figma.createFrame();
    frame.name = def.name ?? 'Frame';
    frame.resize(def.width ?? 100, def.height ?? 100);
    if (typeof def.x === 'number') frame.x = def.x;
    if (typeof def.y === 'number') frame.y = def.y;

    const fill = colorToFill(def.color);
    frame.fills = fill ? [fill] : [];

    if (typeof def.opacity === 'number') frame.opacity = def.opacity;
    if (typeof def.cornerRadius === 'number') frame.cornerRadius = def.cornerRadius;

    if (def.layoutMode && def.layoutMode !== 'NONE') {
      frame.layoutMode = def.layoutMode;
      if (def.primaryAxisSizing) frame.primaryAxisSizingMode = def.primaryAxisSizing;
      if (def.counterAxisSizing) frame.counterAxisSizingMode = def.counterAxisSizing;
      if (typeof def.itemSpacing === 'number') frame.itemSpacing = def.itemSpacing;
      if (typeof def.paddingTop === 'number') frame.paddingTop = def.paddingTop;
      if (typeof def.paddingRight === 'number') frame.paddingRight = def.paddingRight;
      if (typeof def.paddingBottom === 'number') frame.paddingBottom = def.paddingBottom;
      if (typeof def.paddingLeft === 'number') frame.paddingLeft = def.paddingLeft;
    }

    applyStroke(frame, def);
    const effects = buildEffects(def);
    if (effects.length) frame.effects = effects;
    if (def.clipContent !== undefined) frame.clipsContent = def.clipContent;

    parent.appendChild(frame);

    if (Array.isArray(def.children)) {
      for (const childDef of def.children) {
        await createNodeFromTree(childDef, frame);
      }
    }

    return frame;
  }

  if (type === 'text') {
    const fontName = await loadFont(def.fontFamily ?? 'Inter', def.fontWeight ?? 'Regular');
    const text = figma.createText();
    text.fontName = fontName;
    text.characters = def.content ?? '';
    if (typeof def.fontSize === 'number') text.fontSize = def.fontSize;
    if (typeof def.x === 'number') text.x = def.x;
    if (typeof def.y === 'number') text.y = def.y;

    const fill = colorToFill(def.color);
    if (fill) text.fills = [fill];

    if (typeof def.opacity === 'number') text.opacity = def.opacity;
    if (def.textAlign) text.textAlignHorizontal = def.textAlign;
    if (typeof def.letterSpacing === 'number') {
      text.letterSpacing = { value: def.letterSpacing, unit: 'PIXELS' };
    }
    if (def.lineHeight && def.lineHeight !== 'AUTO') {
      text.lineHeight = def.lineHeight;
    }
    if (def.autoResize) {
      text.textAutoResize = def.autoResize;
    } else if (typeof def.width === 'number') {
      text.textAutoResize = 'HEIGHT';
      text.resize(def.width, text.height);
    }

    parent.appendChild(text);
    return text;
  }

  // default: rectangle
  const rect = figma.createRectangle();
  if (def.name) rect.name = def.name;
  rect.resize(def.width ?? 100, def.height ?? 100);
  if (typeof def.x === 'number') rect.x = def.x;
  if (typeof def.y === 'number') rect.y = def.y;

  const fill = colorToFill(def.color);
  if (fill) rect.fills = [fill];

  if (typeof def.opacity === 'number') rect.opacity = def.opacity;
  if (typeof def.cornerRadius === 'number') rect.cornerRadius = def.cornerRadius;
  if (Array.isArray(def.cornerRadii)) {
    rect.topLeftRadius = def.cornerRadii[0];
    rect.topRightRadius = def.cornerRadii[1];
    rect.bottomRightRadius = def.cornerRadii[2];
    rect.bottomLeftRadius = def.cornerRadii[3];
  }

  applyStroke(rect, def);
  const effects = buildEffects(def);
  if (effects.length) rect.effects = effects;

  parent.appendChild(rect);
  return rect;
}

// ─── 메인 메시지 핸들러 ─────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (!msg || typeof msg.type !== 'string') return;

  switch (msg.type) {
    case 'LOG':
      console.log('[Plugin]', msg.message);
      break;

    case 'PING':
      figma.ui.postMessage({ type: 'PONG' });
      break;

    case 'CLOSE':
      figma.closePlugin();
      break;

    // ── 사각형 생성 ────────────────────────────────────────────────────────
    case 'DRAW_RECT': {
      try {
        const rect = figma.createRectangle();
        if (msg.name) rect.name = msg.name;
        rect.x = msg.x ?? 0;
        rect.y = msg.y ?? 0;
        rect.resize(msg.width ?? 100, msg.height ?? 100);

        const fill = colorToFill(msg.color);
        if (fill) rect.fills = [fill];
        if (typeof msg.opacity === 'number') rect.opacity = msg.opacity;

        if (typeof msg.cornerRadius === 'number') rect.cornerRadius = msg.cornerRadius;
        if (Array.isArray(msg.cornerRadii)) {
          rect.topLeftRadius = msg.cornerRadii[0];
          rect.topRightRadius = msg.cornerRadii[1];
          rect.bottomRightRadius = msg.cornerRadii[2];
          rect.bottomLeftRadius = msg.cornerRadii[3];
        }

        applyStroke(rect, msg);
        const effects = buildEffects(msg);
        if (effects.length) rect.effects = effects;

        const parent = msg.parentId ? getNodeById(msg.parentId) : null;
        if (parent && 'appendChild' in parent) {
          (parent as FrameNode).appendChild(rect);
        } else {
          figma.currentPage.appendChild(rect);
        }

        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: rect.id, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('사각형 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    // ── 텍스트 생성 ────────────────────────────────────────────────────────
    case 'DRAW_TEXT': {
      try {
        const fontName = await loadFont(msg.fontFamily ?? 'Inter', msg.fontWeight ?? 'Regular');
        const text = figma.createText();
        if (msg.name) text.name = msg.name;
        text.fontName = fontName;
        text.x = msg.x ?? 0;
        text.y = msg.y ?? 0;
        text.characters = msg.content ?? '';
        if (typeof msg.fontSize === 'number') text.fontSize = msg.fontSize;

        const fill = colorToFill(msg.color);
        if (fill) text.fills = [fill];
        if (typeof msg.opacity === 'number') text.opacity = msg.opacity;

        if (msg.textAlign) text.textAlignHorizontal = msg.textAlign;
        if (typeof msg.letterSpacing === 'number') {
          text.letterSpacing = { value: msg.letterSpacing, unit: 'PIXELS' };
        }
        if (msg.lineHeight && msg.lineHeight !== 'AUTO') {
          text.lineHeight = msg.lineHeight;
        }
        if (msg.autoResize) {
          text.textAutoResize = msg.autoResize;
        } else if (typeof msg.width === 'number') {
          text.textAutoResize = 'HEIGHT';
          text.resize(msg.width, text.height);
        }

        const parent = msg.parentId ? getNodeById(msg.parentId) : null;
        if (parent && 'appendChild' in parent) {
          (parent as FrameNode).appendChild(text);
        } else {
          figma.currentPage.appendChild(text);
        }

        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: text.id, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('텍스트 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    // ── 프레임 생성 ────────────────────────────────────────────────────────
    case 'DRAW_FRAME': {
      try {
        const frame = figma.createFrame();
        frame.name = msg.name ?? 'Frame';
        frame.x = msg.x ?? 0;
        frame.y = msg.y ?? 0;
        frame.resize(msg.width ?? 100, msg.height ?? 100);

        const fill = colorToFill(msg.color);
        frame.fills = fill ? [fill] : [];
        if (typeof msg.opacity === 'number') frame.opacity = msg.opacity;
        if (typeof msg.cornerRadius === 'number') frame.cornerRadius = msg.cornerRadius;

        if (msg.layoutMode && msg.layoutMode !== 'NONE') {
          frame.layoutMode = msg.layoutMode;
          if (msg.primaryAxisSizing) frame.primaryAxisSizingMode = msg.primaryAxisSizing;
          if (msg.counterAxisSizing) frame.counterAxisSizingMode = msg.counterAxisSizing;
          if (typeof msg.itemSpacing === 'number') frame.itemSpacing = msg.itemSpacing;
          if (typeof msg.paddingTop === 'number') frame.paddingTop = msg.paddingTop;
          if (typeof msg.paddingRight === 'number') frame.paddingRight = msg.paddingRight;
          if (typeof msg.paddingBottom === 'number') frame.paddingBottom = msg.paddingBottom;
          if (typeof msg.paddingLeft === 'number') frame.paddingLeft = msg.paddingLeft;
        }

        applyStroke(frame, msg);
        const effects = buildEffects(msg);
        if (effects.length) frame.effects = effects;
        if (msg.clipContent !== undefined) frame.clipsContent = msg.clipContent;

        const parent = msg.parentId ? getNodeById(msg.parentId) : null;
        if (parent && 'appendChild' in parent) {
          (parent as FrameNode).appendChild(frame);
        } else {
          figma.currentPage.appendChild(frame);
        }

        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: frame.id, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('프레임 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    // ── 계층 관리 ──────────────────────────────────────────────────────────
    case 'SET_PARENT': {
      try {
        const node = getNodeById(msg.nodeId) as SceneNode | null;
        const newParent = getNodeById(msg.parentId) as BaseNode & ChildrenMixin | null;
        if (!node) throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`);
        if (!newParent || !('appendChild' in newParent)) throw new Error(`부모 노드가 없거나 자식을 가질 수 없음: ${msg.parentId}`);

        if (typeof msg.index === 'number') {
          newParent.insertChild(msg.index, node);
        } else {
          newParent.appendChild(node);
        }
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: node.id, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    case 'SET_NAME': {
      try {
        const node = getNodeById(msg.nodeId) as SceneNode | null;
        if (!node) throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`);
        node.name = msg.name;
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: node.id, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    case 'REMOVE_NODE': {
      try {
        const node = getNodeById(msg.nodeId) as SceneNode | null;
        if (!node) throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`);
        node.remove();
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    // ── 읽기 / 검증 ────────────────────────────────────────────────────────
    case 'GET_NODE': {
      try {
        let node: SceneNode | null = null;
        if (msg.nodeId) {
          node = getNodeById(msg.nodeId) as SceneNode | null;
        } else {
          node = figma.currentPage.selection[0] ?? null;
        }
        if (!node) throw new Error('노드를 찾을 수 없습니다');
        const result = serializeNode(node);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true, result });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    case 'GET_PAGE': {
      try {
        const nodes = figma.currentPage.children.map(serializeNode);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true, result: nodes });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    case 'EXPORT_NODE': {
      try {
        let node: SceneNode | null = null;
        if (msg.nodeId) {
          node = getNodeById(msg.nodeId) as SceneNode | null;
        } else {
          node = figma.currentPage.selection[0] ?? null;
        }
        if (!node) throw new Error('노드를 찾을 수 없습니다');
        const bytes = await (node as any).exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: msg.scale ?? 1 },
        });
        const base64 = figma.base64Encode(bytes);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true, result: { base64, nodeId: node.id } });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    // ── 배치 생성 ──────────────────────────────────────────────────────────
    case 'CREATE_SCREEN': {
      try {
        const parent = msg.parentId
          ? (getNodeById(msg.parentId) as BaseNode & ChildrenMixin) ?? figma.currentPage
          : figma.currentPage;
        const root = await createNodeFromTree(msg.tree, parent);
        figma.currentPage.selection = [root];
        figma.viewport.scrollAndZoomIntoView([root]);
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: root.id, success: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        figma.notify('스크린 생성 실패: ' + error, { error: true });
        figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
      }
      break;
    }

    default:
      break;
  }
};
