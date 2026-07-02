import type { BridgeResponseMessage, McpAction } from 'figma-bridge-protocol';

interface PendingRequest {
  action: McpAction;
  timeoutMs: number;
  resolve: (message: BridgeResponseMessage) => void;
  onTimeout: () => void;
}

interface PendingEntry extends PendingRequest {
  timer: NodeJS.Timeout;
}

export class PendingRequestStore {
  private readonly entries = new Map<string, PendingEntry>();

  get size(): number {
    return this.entries.size;
  }

  add(id: string, request: PendingRequest): void {
    const timer = setTimeout(() => {
      this.entries.delete(id);
      request.onTimeout();
    }, request.timeoutMs);

    this.entries.set(id, { ...request, timer });
  }

  resolve(id: string, message: BridgeResponseMessage): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.entries.delete(id);
    entry.resolve(message);
    return true;
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      clearTimeout(entry.timer);
    }
    this.entries.clear();
  }
}
