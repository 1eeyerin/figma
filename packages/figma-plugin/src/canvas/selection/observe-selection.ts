import type { SelectionChangedMessage } from 'figma-bridge-protocol';

import { uuid } from '../../utils/uuid';

/** 캔버스에서 현재 페이지와 선택 레이어의 표시 정보만 읽어 전달합니다. */
export function publishSelection(id: string) {
  const page = figma.currentPage;
  const message: SelectionChangedMessage = {
    id,
    type: 'SELECTION_CHANGED',
    summary: {
      page: { id: page.id, name: page.name },
      nodes: page.selection.map(({ id, name, type }) => ({ id, name, type })),
    },
  };
  figma.ui.postMessage(message);
}

/** 선택·페이지 전환과 이름 변경을 관찰하고 종료 시 구독을 해제합니다. */
export function observeSelection(): () => void {
  const publish = () => publishSelection(uuid());
  const onDocumentChange = ({ documentChanges }: DocumentChangeEvent) => {
    const page = figma.currentPage;
    const displayedIds = new Set([
      page.id,
      ...page.selection.map((node) => node.id),
    ]);
    if (
      documentChanges.some(
        (change) =>
          change.type === 'PROPERTY_CHANGE' &&
          displayedIds.has(change.id) &&
          change.properties.includes('name'),
      )
    )
      publish();
  };
  // 페이지 전환과 선택 노드 삭제도 selectionchange를 발생시킵니다.
  figma.on('selectionchange', publish);
  figma.on('documentchange', onDocumentChange);
  return () => {
    figma.off('selectionchange', publish);
    figma.off('documentchange', onDocumentChange);
  };
}
