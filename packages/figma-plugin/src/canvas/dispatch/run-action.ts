import type { CanvasMessage } from '@figma-bridge/protocol';

import { reply } from './reply';

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runAction(
  msg: CanvasMessage,
  notifyLabel: string | null,
  fn: () => Promise<object> | object,
): Promise<void> {
  try {
    const extra = await fn();
    reply(msg, { success: true, ...extra });
  } catch (error) {
    const message = errorMessageOf(error);
    if (notifyLabel) {
      figma.notify(`${notifyLabel} 실패: ${message}`, { error: true });
    }
    reply(msg, { success: false, error: message });
  }
}
