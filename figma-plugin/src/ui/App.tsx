import { h } from 'preact'
import { StatusBadge } from './StatusBadge'
import { useBridgeConnection } from '../bridge/useBridgeConnection'
import { WS_URL } from '../bridge/constants'
import styles from './App.module.css'

export function App() {
  const { connState: state, reconnect } = useBridgeConnection()

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>figma-bridge</h1>
      <StatusBadge state={state} />
      <p class={styles.meta}>{WS_URL}</p>
      {state === 'disconnected' && (
        <button class={styles.button} onClick={reconnect}>
          Reconnect
        </button>
      )}
    </div>
  )
}
