import { getNodeById, serializeNode, exportNode } from './nodeQuery';
import {
  createRect,
  createText,
  createFrame,
  appendToParent,
  createNodeFromTree,
} from './nodes';
import type {
  CanvasMessage,
  DrawRectMsg,
  DrawTextMsg,
  DrawFrameMsg,
  SetParentMsg,
  SetNameMsg,
  RemoveNodeMsg,
  GetNodeMsg,
  ExportNodeMsg,
  CreateScreenMsg,
} from './types';

function reply(msg: CanvasMessage, extra: object) {
  figma.ui.postMessage({
    type: 'DRAW_RESULT',
    id: msg.id,
    action: (msg as { action?: string }).action,
    ...extra,
  });
}

function errorMessageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// 액션 핸들러 공통 wrapper: 성공 시 extra를 success:true와 합쳐 reply, 실패 시 error를 reply.
// notifyLabel이 있으면 실패 시 figma.notify로도 사용자에게 알린다 (생성류 액션 전용).
async function runAction(
  msg: CanvasMessage,
  notifyLabel: string | null,
  fn: () => Promise<object> | object,
): Promise<void> {
  try {
    const extra = await fn();
    reply(msg, { success: true, ...extra });
  } catch (e) {
    const error = errorMessageOf(e);
    if (notifyLabel)
      figma.notify(`${notifyLabel} 실패: ${error}`, { error: true });
    reply(msg, { success: false, error });
  }
}

async function requireNode(nodeId: string): Promise<SceneNode> {
  const node = (await getNodeById(nodeId)) as SceneNode | null;
  if (!node) throw new Error(`노드를 찾을 수 없음: ${nodeId}`);
  return node;
}

async function resolveTargetNode(
  nodeId: string | undefined,
): Promise<SceneNode> {
  const node = (
    nodeId ? await getNodeById(nodeId) : figma.currentPage.selection[0]
  ) as SceneNode | null;
  if (!node) throw new Error('노드를 찾을 수 없습니다');
  return node;
}

async function handleDrawRect(msg: DrawRectMsg): Promise<void> {
  await runAction(msg, '사각형 생성', async () => {
    const rect = createRect(msg);
    await appendToParent(rect, msg.parentId);
    return { nodeId: rect.id };
  });
}

async function handleDrawText(msg: DrawTextMsg): Promise<void> {
  await runAction(msg, '텍스트 생성', async () => {
    const text = await createText(msg);
    await appendToParent(text, msg.parentId);
    return { nodeId: text.id };
  });
}

async function handleDrawFrame(msg: DrawFrameMsg): Promise<void> {
  await runAction(msg, '프레임 생성', async () => {
    const frame = createFrame(msg);
    await appendToParent(frame, msg.parentId);
    return { nodeId: frame.id };
  });
}

async function handleSetParent(msg: SetParentMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await requireNode(msg.nodeId);
    const newParent = (await getNodeById(msg.parentId)) as
      | (BaseNode & ChildrenMixin)
      | null;
    if (!newParent || !('appendChild' in newParent))
      throw new Error(
        `부모 노드가 없거나 자식을 가질 수 없음: ${msg.parentId}`,
      );

    if (typeof msg.index === 'number') {
      newParent.insertChild(msg.index, node);
    } else {
      newParent.appendChild(node);
    }
    return { nodeId: node.id };
  });
}

async function handleSetName(msg: SetNameMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await requireNode(msg.nodeId);
    node.name = msg.name;
    return { nodeId: node.id };
  });
}

async function handleRemoveNode(msg: RemoveNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    (await requireNode(msg.nodeId)).remove();
    return {};
  });
}

async function handleGetNode(msg: GetNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    return { result: serializeNode(node) };
  });
}

async function handleGetPage(msg: CanvasMessage): Promise<void> {
  await runAction(msg, null, () => ({
    result: figma.currentPage.children.map(serializeNode),
  }));
}

async function handleExportNode(msg: ExportNodeMsg): Promise<void> {
  await runAction(msg, null, async () => {
    const node = await resolveTargetNode(msg.nodeId);
    const base64 = await exportNode(node, msg.scale);
    return { result: { base64, nodeId: node.id } };
  });
}

async function handleCreateScreen(msg: CreateScreenMsg): Promise<void> {
  await runAction(msg, '스크린 생성', async () => {
    const parent = (msg.parentId ? await getNodeById(msg.parentId) : null) as
      | (BaseNode & ChildrenMixin)
      | null;
    const root = await createNodeFromTree(
      msg.tree,
      parent ?? figma.currentPage,
    );
    figma.currentPage.selection = [root];
    figma.viewport.scrollAndZoomIntoView([root]);
    return { nodeId: root.id };
  });
}

const ACTION_HANDLERS: Record<string, (msg: CanvasMessage) => Promise<void>> = {
  DRAW_RECT: handleDrawRect as (msg: CanvasMessage) => Promise<void>,
  DRAW_TEXT: handleDrawText as (msg: CanvasMessage) => Promise<void>,
  DRAW_FRAME: handleDrawFrame as (msg: CanvasMessage) => Promise<void>,
  SET_PARENT: handleSetParent as (msg: CanvasMessage) => Promise<void>,
  SET_NAME: handleSetName as (msg: CanvasMessage) => Promise<void>,
  REMOVE_NODE: handleRemoveNode as (msg: CanvasMessage) => Promise<void>,
  GET_NODE: handleGetNode as (msg: CanvasMessage) => Promise<void>,
  GET_PAGE: handleGetPage,
  EXPORT_NODE: handleExportNode as (msg: CanvasMessage) => Promise<void>,
  DRAW_SCREEN: handleCreateScreen as (msg: CanvasMessage) => Promise<void>,
};

export async function handleMessage(msg: unknown): Promise<void> {
  if (!msg || typeof (msg as Record<string, unknown>).type !== 'string') return;

  const canvasMsg = msg as CanvasMessage;

  if (canvasMsg.type === 'LOG') {
    console.log('[Plugin]', canvasMsg.message);
    return;
  }

  if (canvasMsg.type === 'PING') {
    figma.ui.postMessage({ type: 'PONG' });
    return;
  }

  if (canvasMsg.type === 'CLOSE') {
    figma.closePlugin();
    return;
  }

  const handler = ACTION_HANDLERS[canvasMsg.type];
  if (handler) await handler(canvasMsg);
}
