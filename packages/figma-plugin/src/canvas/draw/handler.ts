import type {
  DrawFrameMsg,
  DrawRectMsg,
  DrawTextMsg,
} from 'figma-bridge-protocol';

import { runAction } from '../dispatch/run-action';
import { appendToParent } from '../shared';
import { createFrame, createRect, createText } from './nodes';

/**
 * 사각형 생성 메시지를 실행하고 생성된 노드를 지정된 부모에 붙입니다.
 */
export async function handleDrawRect(msg: DrawRectMsg): Promise<void> {
  await runAction(msg, '사각형 생성', async () => {
    const rect = createRect(msg);
    await appendToParent(rect, msg.parentId);
    return { nodeId: rect.id };
  });
}

/**
 * 텍스트 생성 메시지를 실행하고 생성된 노드를 지정된 부모에 붙입니다.
 */
export async function handleDrawText(msg: DrawTextMsg): Promise<void> {
  await runAction(msg, '텍스트 생성', async () => {
    const text = await createText(msg);
    await appendToParent(text, msg.parentId);
    return { nodeId: text.id };
  });
}

/**
 * 프레임 생성 메시지를 실행하고 생성된 노드를 지정된 부모에 붙입니다.
 */
export async function handleDrawFrame(msg: DrawFrameMsg): Promise<void> {
  await runAction(msg, '프레임 생성', async () => {
    const frame = createFrame(msg);
    await appendToParent(frame, msg.parentId);
    return { nodeId: frame.id };
  });
}
