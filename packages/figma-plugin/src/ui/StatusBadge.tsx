import { h } from 'preact';

import type { ConnectionState } from '../bridge';
import styles from './StatusBadge.module.css';

const STATUS_TEXT: Record<ConnectionState, string> = {
  connecting: '브릿지 응답 확인 중…',
  connected: '브릿지 연결됨 ✓',
  disconnected: '연결 끊김 · 자동 재연결 대기 중…',
};

interface Props {
  state: ConnectionState;
}

/** 연결 상태의 변화와 자동 재시도 여부를 표시합니다. */
export function StatusBadge({ state }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      class={`${styles.badge} ${styles[state]}`}
    >
      {STATUS_TEXT[state]}
    </div>
  );
}
