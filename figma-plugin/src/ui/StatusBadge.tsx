import { h } from 'preact'
import type { ConnectionState } from '../bridge/types'
import styles from './StatusBadge.module.css'

const STATUS_TEXT: Record<ConnectionState, string> = {
  connecting: 'Connecting to MCP bridge...',
  connected: 'Connected to MCP bridge ✓',
  disconnected: 'Disconnected. Retrying...',
}

interface Props {
  state: ConnectionState
}

export function StatusBadge({ state }: Props) {
  return <div class={`${styles.badge} ${styles[state]}`}>{STATUS_TEXT[state]}</div>
}
