// figma-bridge 플러그인 메인 코드 (canvas 측)
//
// 제약사항:
// - 이 파일에서 WebSocket/fetch를 직접 사용하지 않는다. 네트워크는 ui.html iframe 전담.
// - canvas ↔ UI 통신은 postMessage 기반.
// - UI는 { pluginMessage: ... }로 래핑하므로 여기서는 래핑이 풀린 본문을 수신한다.
figma.showUI(__html__, { width: 300, height: 220 });
// ─── 색상 유틸 ──────────────────────────────────────────────────────────────
function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.slice(0, 2), 16) / 255,
        g: parseInt(clean.slice(2, 4), 16) / 255,
        b: parseInt(clean.slice(4, 6), 16) / 255,
    };
}
function parseColor(colorStr) {
    if (!colorStr)
        return null;
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
function colorToFill(colorStr) {
    const parsed = parseColor(colorStr);
    if (!parsed)
        return null;
    const fill = { type: 'SOLID', color: parsed.rgb };
    if (parsed.a < 1)
        fill.opacity = parsed.a;
    return fill;
}
// ─── 폰트 로딩 ──────────────────────────────────────────────────────────────
const WEIGHT_MAP = {
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
async function loadFont(family, weight) {
    var _a;
    const style = (_a = WEIGHT_MAP[weight]) !== null && _a !== void 0 ? _a : 'Regular';
    const fontName = { family, style };
    try {
        await figma.loadFontAsync(fontName);
        return fontName;
    }
    catch (_b) {
        // 폴백: Inter Regular
        const fallback = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(fallback);
        return fallback;
    }
}
// ─── 효과 빌더 ──────────────────────────────────────────────────────────────
function buildEffects(msg) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const effects = [];
    if (msg.shadow) {
        const s = msg.shadow;
        const parsed = parseColor((_a = s.color) !== null && _a !== void 0 ? _a : '#000000');
        const rgb = (_b = parsed === null || parsed === void 0 ? void 0 : parsed.rgb) !== null && _b !== void 0 ? _b : { r: 0, g: 0, b: 0 };
        const alpha = ((_c = parsed === null || parsed === void 0 ? void 0 : parsed.a) !== null && _c !== void 0 ? _c : 1) * ((_d = s.opacity) !== null && _d !== void 0 ? _d : 1);
        effects.push({
            type: (_e = s.type) !== null && _e !== void 0 ? _e : 'DROP_SHADOW',
            color: { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha },
            offset: { x: (_f = s.offsetX) !== null && _f !== void 0 ? _f : 0, y: (_g = s.offsetY) !== null && _g !== void 0 ? _g : 4 },
            radius: (_h = s.blur) !== null && _h !== void 0 ? _h : 8,
            spread: (_j = s.spread) !== null && _j !== void 0 ? _j : 0,
            visible: true,
            blendMode: 'NORMAL',
        });
    }
    if (typeof msg.blur === 'number') {
        effects.push({ type: 'LAYER_BLUR', radius: msg.blur, visible: true });
    }
    return effects;
}
// ─── 스트로크 적용 ──────────────────────────────────────────────────────────
function applyStroke(node, msg) {
    const fill = colorToFill(msg.strokeColor);
    if (fill)
        node.strokes = [fill];
    if (typeof msg.strokeWeight === 'number')
        node.strokeWeight = msg.strokeWeight;
    if (msg.strokeAlign)
        node.strokeAlign = msg.strokeAlign;
}
// ─── 노드 조회 ──────────────────────────────────────────────────────────────
function getNodeById(id) {
    if (!id)
        return null;
    return figma.getNodeById(id);
}
function serializeNode(node) {
    const base = {
        id: node.id,
        name: node.name,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
    };
    if ('fills' in node)
        base.fills = node.fills;
    if ('strokes' in node)
        base.strokes = node.strokes;
    if ('effects' in node)
        base.effects = node.effects;
    if ('children' in node)
        base.childCount = node.children.length;
    if ('characters' in node)
        base.characters = node.characters;
    if ('fontSize' in node)
        base.fontSize = node.fontSize;
    return base;
}
// ─── 재귀 트리 생성 ─────────────────────────────────────────────────────────
async function createNodeFromTree(def, parent) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const type = (_a = def.type) !== null && _a !== void 0 ? _a : 'rectangle';
    if (type === 'frame') {
        const frame = figma.createFrame();
        frame.name = (_b = def.name) !== null && _b !== void 0 ? _b : 'Frame';
        frame.resize((_c = def.width) !== null && _c !== void 0 ? _c : 100, (_d = def.height) !== null && _d !== void 0 ? _d : 100);
        if (typeof def.x === 'number')
            frame.x = def.x;
        if (typeof def.y === 'number')
            frame.y = def.y;
        const fill = colorToFill(def.color);
        frame.fills = fill ? [fill] : [];
        if (typeof def.opacity === 'number')
            frame.opacity = def.opacity;
        if (typeof def.cornerRadius === 'number')
            frame.cornerRadius = def.cornerRadius;
        if (def.layoutMode && def.layoutMode !== 'NONE') {
            frame.layoutMode = def.layoutMode;
            if (def.primaryAxisSizing)
                frame.primaryAxisSizingMode = def.primaryAxisSizing;
            if (def.counterAxisSizing)
                frame.counterAxisSizingMode = def.counterAxisSizing;
            if (typeof def.itemSpacing === 'number')
                frame.itemSpacing = def.itemSpacing;
            if (typeof def.paddingTop === 'number')
                frame.paddingTop = def.paddingTop;
            if (typeof def.paddingRight === 'number')
                frame.paddingRight = def.paddingRight;
            if (typeof def.paddingBottom === 'number')
                frame.paddingBottom = def.paddingBottom;
            if (typeof def.paddingLeft === 'number')
                frame.paddingLeft = def.paddingLeft;
        }
        applyStroke(frame, def);
        const effects = buildEffects(def);
        if (effects.length)
            frame.effects = effects;
        if (def.clipContent !== undefined)
            frame.clipsContent = def.clipContent;
        parent.appendChild(frame);
        if (Array.isArray(def.children)) {
            for (const childDef of def.children) {
                await createNodeFromTree(childDef, frame);
            }
        }
        return frame;
    }
    if (type === 'text') {
        const fontName = await loadFont((_e = def.fontFamily) !== null && _e !== void 0 ? _e : 'Inter', (_f = def.fontWeight) !== null && _f !== void 0 ? _f : 'Regular');
        const text = figma.createText();
        text.fontName = fontName;
        text.characters = (_g = def.content) !== null && _g !== void 0 ? _g : '';
        if (typeof def.fontSize === 'number')
            text.fontSize = def.fontSize;
        if (typeof def.x === 'number')
            text.x = def.x;
        if (typeof def.y === 'number')
            text.y = def.y;
        const fill = colorToFill(def.color);
        if (fill)
            text.fills = [fill];
        if (typeof def.opacity === 'number')
            text.opacity = def.opacity;
        if (def.textAlign)
            text.textAlignHorizontal = def.textAlign;
        if (typeof def.letterSpacing === 'number') {
            text.letterSpacing = { value: def.letterSpacing, unit: 'PIXELS' };
        }
        if (def.lineHeight && def.lineHeight !== 'AUTO') {
            text.lineHeight = def.lineHeight;
        }
        if (def.autoResize) {
            text.textAutoResize = def.autoResize;
        }
        else if (typeof def.width === 'number') {
            text.textAutoResize = 'HEIGHT';
            text.resize(def.width, text.height);
        }
        parent.appendChild(text);
        return text;
    }
    // default: rectangle
    const rect = figma.createRectangle();
    if (def.name)
        rect.name = def.name;
    rect.resize((_h = def.width) !== null && _h !== void 0 ? _h : 100, (_j = def.height) !== null && _j !== void 0 ? _j : 100);
    if (typeof def.x === 'number')
        rect.x = def.x;
    if (typeof def.y === 'number')
        rect.y = def.y;
    const fill = colorToFill(def.color);
    if (fill)
        rect.fills = [fill];
    if (typeof def.opacity === 'number')
        rect.opacity = def.opacity;
    if (typeof def.cornerRadius === 'number')
        rect.cornerRadius = def.cornerRadius;
    if (Array.isArray(def.cornerRadii)) {
        rect.topLeftRadius = def.cornerRadii[0];
        rect.topRightRadius = def.cornerRadii[1];
        rect.bottomRightRadius = def.cornerRadii[2];
        rect.bottomLeftRadius = def.cornerRadii[3];
    }
    applyStroke(rect, def);
    const effects = buildEffects(def);
    if (effects.length)
        rect.effects = effects;
    parent.appendChild(rect);
    return rect;
}
// ─── 메인 메시지 핸들러 ─────────────────────────────────────────────────────
figma.ui.onmessage = async (msg) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    if (!msg || typeof msg.type !== 'string')
        return;
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
                if (msg.name)
                    rect.name = msg.name;
                rect.x = (_a = msg.x) !== null && _a !== void 0 ? _a : 0;
                rect.y = (_b = msg.y) !== null && _b !== void 0 ? _b : 0;
                rect.resize((_c = msg.width) !== null && _c !== void 0 ? _c : 100, (_d = msg.height) !== null && _d !== void 0 ? _d : 100);
                const fill = colorToFill(msg.color);
                if (fill)
                    rect.fills = [fill];
                if (typeof msg.opacity === 'number')
                    rect.opacity = msg.opacity;
                if (typeof msg.cornerRadius === 'number')
                    rect.cornerRadius = msg.cornerRadius;
                if (Array.isArray(msg.cornerRadii)) {
                    rect.topLeftRadius = msg.cornerRadii[0];
                    rect.topRightRadius = msg.cornerRadii[1];
                    rect.bottomRightRadius = msg.cornerRadii[2];
                    rect.bottomLeftRadius = msg.cornerRadii[3];
                }
                applyStroke(rect, msg);
                const effects = buildEffects(msg);
                if (effects.length)
                    rect.effects = effects;
                const parent = msg.parentId ? getNodeById(msg.parentId) : null;
                if (parent && 'appendChild' in parent) {
                    parent.appendChild(rect);
                }
                else {
                    figma.currentPage.appendChild(rect);
                }
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: rect.id, success: true });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.notify('사각형 생성 실패: ' + error, { error: true });
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        // ── 텍스트 생성 ────────────────────────────────────────────────────────
        case 'DRAW_TEXT': {
            try {
                const fontName = await loadFont((_e = msg.fontFamily) !== null && _e !== void 0 ? _e : 'Inter', (_f = msg.fontWeight) !== null && _f !== void 0 ? _f : 'Regular');
                const text = figma.createText();
                if (msg.name)
                    text.name = msg.name;
                text.fontName = fontName;
                text.x = (_g = msg.x) !== null && _g !== void 0 ? _g : 0;
                text.y = (_h = msg.y) !== null && _h !== void 0 ? _h : 0;
                text.characters = (_j = msg.content) !== null && _j !== void 0 ? _j : '';
                if (typeof msg.fontSize === 'number')
                    text.fontSize = msg.fontSize;
                const fill = colorToFill(msg.color);
                if (fill)
                    text.fills = [fill];
                if (typeof msg.opacity === 'number')
                    text.opacity = msg.opacity;
                if (msg.textAlign)
                    text.textAlignHorizontal = msg.textAlign;
                if (typeof msg.letterSpacing === 'number') {
                    text.letterSpacing = { value: msg.letterSpacing, unit: 'PIXELS' };
                }
                if (msg.lineHeight && msg.lineHeight !== 'AUTO') {
                    text.lineHeight = msg.lineHeight;
                }
                if (msg.autoResize) {
                    text.textAutoResize = msg.autoResize;
                }
                else if (typeof msg.width === 'number') {
                    text.textAutoResize = 'HEIGHT';
                    text.resize(msg.width, text.height);
                }
                const parent = msg.parentId ? getNodeById(msg.parentId) : null;
                if (parent && 'appendChild' in parent) {
                    parent.appendChild(text);
                }
                else {
                    figma.currentPage.appendChild(text);
                }
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: text.id, success: true });
            }
            catch (e) {
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
                frame.name = (_k = msg.name) !== null && _k !== void 0 ? _k : 'Frame';
                frame.x = (_l = msg.x) !== null && _l !== void 0 ? _l : 0;
                frame.y = (_m = msg.y) !== null && _m !== void 0 ? _m : 0;
                frame.resize((_o = msg.width) !== null && _o !== void 0 ? _o : 100, (_p = msg.height) !== null && _p !== void 0 ? _p : 100);
                const fill = colorToFill(msg.color);
                frame.fills = fill ? [fill] : [];
                if (typeof msg.opacity === 'number')
                    frame.opacity = msg.opacity;
                if (typeof msg.cornerRadius === 'number')
                    frame.cornerRadius = msg.cornerRadius;
                if (msg.layoutMode && msg.layoutMode !== 'NONE') {
                    frame.layoutMode = msg.layoutMode;
                    if (msg.primaryAxisSizing)
                        frame.primaryAxisSizingMode = msg.primaryAxisSizing;
                    if (msg.counterAxisSizing)
                        frame.counterAxisSizingMode = msg.counterAxisSizing;
                    if (typeof msg.itemSpacing === 'number')
                        frame.itemSpacing = msg.itemSpacing;
                    if (typeof msg.paddingTop === 'number')
                        frame.paddingTop = msg.paddingTop;
                    if (typeof msg.paddingRight === 'number')
                        frame.paddingRight = msg.paddingRight;
                    if (typeof msg.paddingBottom === 'number')
                        frame.paddingBottom = msg.paddingBottom;
                    if (typeof msg.paddingLeft === 'number')
                        frame.paddingLeft = msg.paddingLeft;
                }
                applyStroke(frame, msg);
                const effects = buildEffects(msg);
                if (effects.length)
                    frame.effects = effects;
                if (msg.clipContent !== undefined)
                    frame.clipsContent = msg.clipContent;
                const parent = msg.parentId ? getNodeById(msg.parentId) : null;
                if (parent && 'appendChild' in parent) {
                    parent.appendChild(frame);
                }
                else {
                    figma.currentPage.appendChild(frame);
                }
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: frame.id, success: true });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.notify('프레임 생성 실패: ' + error, { error: true });
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        // ── 계층 관리 ──────────────────────────────────────────────────────────
        case 'SET_PARENT': {
            try {
                const node = getNodeById(msg.nodeId);
                const newParent = getNodeById(msg.parentId);
                if (!node)
                    throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`);
                if (!newParent || !('appendChild' in newParent))
                    throw new Error(`부모 노드가 없거나 자식을 가질 수 없음: ${msg.parentId}`);
                if (typeof msg.index === 'number') {
                    newParent.insertChild(msg.index, node);
                }
                else {
                    newParent.appendChild(node);
                }
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: node.id, success: true });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        case 'SET_NAME': {
            try {
                const node = getNodeById(msg.nodeId);
                if (!node)
                    throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`);
                node.name = msg.name;
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: node.id, success: true });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        case 'REMOVE_NODE': {
            try {
                const node = getNodeById(msg.nodeId);
                if (!node)
                    throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`);
                node.remove();
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        // ── 읽기 / 검증 ────────────────────────────────────────────────────────
        case 'GET_NODE': {
            try {
                let node = null;
                if (msg.nodeId) {
                    node = getNodeById(msg.nodeId);
                }
                else {
                    node = (_q = figma.currentPage.selection[0]) !== null && _q !== void 0 ? _q : null;
                }
                if (!node)
                    throw new Error('노드를 찾을 수 없습니다');
                const result = serializeNode(node);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true, result });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        case 'GET_PAGE': {
            try {
                const nodes = figma.currentPage.children.map(serializeNode);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true, result: nodes });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        case 'EXPORT_NODE': {
            try {
                let node = null;
                if (msg.nodeId) {
                    node = getNodeById(msg.nodeId);
                }
                else {
                    node = (_r = figma.currentPage.selection[0]) !== null && _r !== void 0 ? _r : null;
                }
                if (!node)
                    throw new Error('노드를 찾을 수 없습니다');
                const bytes = await node.exportAsync({
                    format: 'PNG',
                    constraint: { type: 'SCALE', value: (_s = msg.scale) !== null && _s !== void 0 ? _s : 1 },
                });
                const base64 = figma.base64Encode(bytes);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: true, result: { base64, nodeId: node.id } });
            }
            catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, success: false, error });
            }
            break;
        }
        // ── 배치 생성 ──────────────────────────────────────────────────────────
        case 'CREATE_SCREEN': {
            try {
                const parent = msg.parentId
                    ? (_t = getNodeById(msg.parentId)) !== null && _t !== void 0 ? _t : figma.currentPage
                    : figma.currentPage;
                const root = await createNodeFromTree(msg.tree, parent);
                figma.currentPage.selection = [root];
                figma.viewport.scrollAndZoomIntoView([root]);
                figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, nodeId: root.id, success: true });
            }
            catch (e) {
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
