import { useEffect, useRef, useState } from 'preact/hooks'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

const WS_URL = 'ws://localhost:8765'
const RECONNECT_DELAY = 3000

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const ACTION_MAP: Record<string, string> = {
  create_rectangle: 'DRAW_RECT',
  create_text: 'DRAW_TEXT',
  create_frame: 'DRAW_FRAME',
  set_parent: 'SET_PARENT',
  set_name: 'SET_NAME',
  remove_node: 'REMOVE_NODE',
  get_node: 'GET_NODE',
  get_page: 'GET_PAGE',
  export_node: 'EXPORT_NODE',
  create_screen: 'CREATE_SCREEN',
}

function sendToCanvas(message: object) {
  parent.postMessage({ pluginMessage: message }, '*')
}

function sendToBridge(ws: WebSocket, message: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

export function useWebSocket() {
  const [state, setState] = useState<ConnectionState>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function connect() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setState('connecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch {
      scheduleReconnect()
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      setState('connected')
      sendToBridge(ws, { id: uuid(), type: 'EVENT', action: 'connected', payload: {} })
      sendToCanvas({ type: 'LOG', message: 'Connected to MCP bridge' })
    }

    ws.onmessage = (event) => {
      let msg: any
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.action === 'ping') {
        sendToBridge(ws, { id: msg.id, type: 'RESPONSE', action: 'pong', payload: {} })
        return
      }

      const canvasType = ACTION_MAP[msg.action]
      if (canvasType) {
        sendToCanvas(Object.assign({ type: canvasType, id: msg.id, action: msg.action }, msg.payload ?? {}))
      }
    }

    ws.onclose = () => scheduleReconnect()
    ws.onerror = () => {
      try { ws.close() } catch { /* ignore */ }
    }
  }

  function scheduleReconnect() {
    setState('disconnected')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(connect, RECONNECT_DELAY)
  }

  useEffect(() => {
    connect()

    // canvas → UI 메시지 수신
    const handleMessage = (event: MessageEvent) => {
      const pm = event.data?.pluginMessage
      if (!pm) return
      if (pm.type === 'PONG') return

      if (pm.type === 'DRAW_RESULT' && wsRef.current) {
        sendToBridge(wsRef.current, {
          id: pm.id,
          type: 'RESPONSE',
          action: pm.action ?? 'draw_result',
          payload: { nodeId: pm.nodeId, success: pm.success, error: pm.error },
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [])

  return { state, reconnect: connect }
}
