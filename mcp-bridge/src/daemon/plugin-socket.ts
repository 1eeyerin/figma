import { WebSocket } from 'ws';

import type { BridgeRequestMessage } from '../protocol/bridge-message.js';

export class PluginSocket {
  private socket: WebSocket | null = null;

  get current(): WebSocket | null {
    return this.socket;
  }

  attach(socket: WebSocket): void {
    this.socket = socket;
    socket.on('close', () => {
      if (this.socket === socket) this.socket = null;
    });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(message: BridgeRequestMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  detach(): void {
    this.socket = null;
  }
}
