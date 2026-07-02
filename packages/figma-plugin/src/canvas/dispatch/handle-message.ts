import type { CanvasMessage, CanvasMessageType } from 'figma-bridge-protocol';

import { handleDrawFrame, handleDrawRect, handleDrawText } from '../draw';
import { handleRemoveNode, handleSetName, handleSetParent } from '../mutation';
import { handleExportNode, handleGetNode, handleGetPage } from '../query';
import { handleCreateScreen } from '../screen';

const ACTION_HANDLERS: Partial<
  Record<CanvasMessageType, (msg: CanvasMessage) => Promise<void>>
> = {
  DRAW_RECT: handleDrawRect as (msg: CanvasMessage) => Promise<void>,
  DRAW_TEXT: handleDrawText as (msg: CanvasMessage) => Promise<void>,
  DRAW_FRAME: handleDrawFrame as (msg: CanvasMessage) => Promise<void>,
  SET_PARENT: handleSetParent as (msg: CanvasMessage) => Promise<void>,
  SET_NAME: handleSetName as (msg: CanvasMessage) => Promise<void>,
  REMOVE_NODE: handleRemoveNode as (msg: CanvasMessage) => Promise<void>,
  GET_NODE: handleGetNode as (msg: CanvasMessage) => Promise<void>,
  GET_PAGE: handleGetPage as (msg: CanvasMessage) => Promise<void>,
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
