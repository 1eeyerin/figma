import type { McpAction } from '../protocol/actions.js';
import type { BridgeResponseMessage } from '../protocol/bridge-message.js';
import { DaemonClient, type DaemonClientDeps } from './daemon-client.js';
import { DaemonProcess, type DaemonProcessDeps } from './daemon-process.js';

export type WsBridgeDeps = Partial<DaemonClientDeps & DaemonProcessDeps>;

export class WsBridge {
  private readonly client: DaemonClient;
  private readonly daemonProcess: DaemonProcess;

  constructor(deps: WsBridgeDeps = {}) {
    this.client = new DaemonClient(deps);
    this.daemonProcess = new DaemonProcess(this.client, deps);
  }

  async start(): Promise<void> {
    if (await this.daemonProcess.isAlive()) {
      console.error('[Bridge] WS daemon already running — reusing');
      return;
    }

    await this.daemonProcess.ensureStarted();
  }

  sendAndWait(
    action: McpAction,
    payload: Record<string, unknown>,
    timeout?: number,
  ): Promise<BridgeResponseMessage> {
    return this.client.dispatch(action, payload, timeout);
  }

  async isPluginConnected(): Promise<boolean> {
    try {
      const status = await this.client.getStatus();
      return status.pluginConnected;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.daemonProcess.stop();
  }
}
