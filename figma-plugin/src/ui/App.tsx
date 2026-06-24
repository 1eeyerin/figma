import { h } from 'preact'
import { StatusBadge } from './StatusBadge'
import { useWebSocket } from './useWebSocket'
import styles from './App.module.css'

export function App() {
  const { state, reconnect } = useWebSocket()

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>figma-bridge</h1>
      <StatusBadge state={state} />
      <p class={styles.meta}>ws://localhost:8765</p>
      {state === 'disconnected' && (
        <button class={styles.button} onClick={reconnect}>
          Reconnect
        </button>
      )}
    </div>
  )
}
