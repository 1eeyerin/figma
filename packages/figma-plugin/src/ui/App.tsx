import { h } from 'preact';

import { WS_URL, useBridgeConnection, useSelectionSummary } from '../bridge';
import styles from './App.module.css';
import { SelectionPanel } from './SelectionPanel';
import { StatusBadge } from './StatusBadge';

/** 브릿지 연결 상태와 현재 캔버스 선택을 표시합니다. */
export function App() {
  const { connState: state, reconnect } = useBridgeConnection();
  const selection = useSelectionSummary();

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>figma-bridge</h1>
      <StatusBadge state={state} />
      <p class={styles.meta}>{WS_URL}</p>
      {state === 'disconnected' && (
        <button class={styles.button} onClick={reconnect}>
          지금 다시 연결
        </button>
      )}
      <SelectionPanel selection={selection} />
    </div>
  );
}
