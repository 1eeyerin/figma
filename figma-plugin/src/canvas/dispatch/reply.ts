import type { CanvasMessage } from '@figma-bridge/protocol';

export function reply(msg: CanvasMessage, extra: object): void {
  figma.ui.postMessage({
    type: 'DRAW_RESULT',
    id: msg.id,
    action: msg.action,
    ...extra,
  });
}
