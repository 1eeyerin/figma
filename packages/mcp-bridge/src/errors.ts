export class BridgeError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'DAEMON_UNREACHABLE'
      | 'PLUGIN_NOT_CONNECTED'
      | 'TIMEOUT'
      | 'BAD_RESPONSE',
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}
