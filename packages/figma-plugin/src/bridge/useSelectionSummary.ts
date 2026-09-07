import type {
  SelectionChangedMessage,
  SelectionSummary,
} from 'figma-bridge-protocol';

import { useEffect, useState } from 'preact/hooks';

import { uuid } from '../utils/uuid';
import { sendToCanvas } from './canvasChannel';

/** UI가 준비된 뒤 초기 선택을 요청하고 캔버스의 변경 이벤트를 표시합니다. */
export function useSelectionSummary() {
  const [selection, setSelection] = useState<SelectionSummary | null>(null);

  useEffect(() => {
    const onMessage = (
      event: MessageEvent<{ pluginMessage?: SelectionChangedMessage }>,
    ) => {
      const message = event.data?.pluginMessage;
      if (message?.type === 'SELECTION_CHANGED') setSelection(message.summary);
    };
    window.addEventListener('message', onMessage);
    sendToCanvas({ type: 'GET_SELECTION_SUMMARY', id: uuid() });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return selection;
}
