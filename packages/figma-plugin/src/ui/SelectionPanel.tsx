import type { SelectionSummary } from 'figma-bridge-protocol';

import { h } from 'preact';

import styles from './App.module.css';

/** 현재 선택의 요약과 펼쳐 볼 수 있는 전체 레이어 목록을 표시합니다. */
export function SelectionPanel({
  selection,
}: {
  selection: SelectionSummary | null;
}) {
  if (!selection)
    return (
      <p class={styles.meta} role="status">
        선택 정보를 확인하는 중…
      </p>
    );

  const { nodes, page } = selection;
  const [first] = nodes;
  return (
    <section aria-label="현재 선택">
      <p class={styles.meta}>페이지: {page.name}</p>
      <div role="status" aria-live="polite">
        {!first && <p>선택한 레이어가 없습니다.</p>}
        {first && nodes.length === 1 && (
          <div>
            <strong class={styles.layerName}>{first.name}</strong>
            <p class={styles.meta}>
              {first.type} · {first.id}
            </p>
          </div>
        )}
        {first && nodes.length > 1 && (
          <details>
            <summary class={styles.layerName}>
              {first.name} 외 {nodes.length - 1}건
            </summary>
            <ul class={styles.selectionList}>
              {nodes.map((node) => (
                <li key={node.id}>
                  <span class={styles.layerName}>{node.name}</span>
                  <p class={styles.meta}>
                    {node.type} · {node.id}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
