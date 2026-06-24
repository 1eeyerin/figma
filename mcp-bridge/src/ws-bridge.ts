import { WebSocketServer, WebSocket } from 'ws';

/**
 * WS 메시지 공통 봉투
 * - id: UUID v4 (요청-응답 매칭용)
 * - type: REQUEST | RESPONSE | EVENT
 * - action: 'ping' | 'pong' | 'connected' 등
 * - payload: 임의 데이터
 */
export interface BridgeMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;
  payload?: Record<string, unknown>;
}

export type MessageHandler = (message: BridgeMessage) => void;

const DEFAULT_PORT = 8765;

/**
 * MCP 서버와 Figma 플러그인 UI를 잇는 WebSocket 브릿지.
 * 단일 플러그인 UI 클라이언트와의 연결을 관리한다.
 */
export class WsBridge {
  private readonly port: number;
  private server: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private readonly handlers: MessageHandler[] = [];

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
  }

  /** WS 서버를 기동하고 포트에서 listen 시작한다. */
  start(): void {
    this.server = new WebSocketServer({ port: this.port });

    this.server.on('listening', () => {
      console.error(`[WS] Listening on ws://localhost:${this.port}`);
    });

    this.server.on('connection', (socket: WebSocket) => {
      this.client = socket;
      console.error('[WS] Plugin connected');

      socket.on('message', (data) => this.handleRawMessage(data.toString()));

      socket.on('close', () => {
        console.error('[WS] Plugin disconnected');
        if (this.client === socket) {
          this.client = null;
        }
      });

      socket.on('error', (err) => {
        console.error('[WS] Socket error:', err.message);
      });
    });

    this.server.on('error', (err) => {
      console.error('[WS] Server error:', err.message);
    });
  }

  /** 연결된 플러그인 UI 클라이언트에게 JSON 메시지를 전송한다. */
  send(message: BridgeMessage): boolean {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) {
      console.error('[WS] Cannot send — no plugin connected');
      return false;
    }
    this.client.send(JSON.stringify(message));
    return true;
  }

  /** 플러그인 UI로부터 들어오는 메시지를 받을 핸들러를 등록한다. */
  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  /** 플러그인 UI 연결 여부. */
  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  /** WS 서버를 종료한다. */
  stop(): void {
    this.client?.close();
    this.client = null;
    this.server?.close();
    this.server = null;
  }

  private handleRawMessage(raw: string): void {
    let message: BridgeMessage;
    try {
      message = JSON.parse(raw) as BridgeMessage;
    } catch {
      console.error('[WS] Received invalid JSON:', raw);
      return;
    }

    console.error(`[WS] Received: ${message.type}/${message.action} (${message.id})`);

    // 0단계: ping에 대해 자동으로 pong... 은 플러그인이 응답하는 구조이므로
    // 여기서는 등록된 핸들러에게 라우팅만 한다.
    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('[WS] Handler error:', err);
      }
    }
  }
}
