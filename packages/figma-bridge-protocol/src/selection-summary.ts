/** UI 표시 전용 선택 요약이며 디자인 컨텍스트로 재사용하지 않습니다. */
export interface SelectionSummary {
  page: { id: string; name: string };
  nodes: { id: string; name: string; type: string }[];
}

export interface SelectionChangedMessage {
  type: 'SELECTION_CHANGED';
  id: string;
  summary: SelectionSummary;
}
