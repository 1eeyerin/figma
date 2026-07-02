export interface LogContext {
  id?: string;
  action?: string;
  direction?:
    | 'mcp->daemon'
    | 'daemon->plugin'
    | 'plugin->daemon'
    | 'daemon->mcp';
  success?: boolean;
}

export function log(message: string, context: LogContext = {}): void {
  const suffix = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  console.error(
    suffix
      ? `[figma-bridge] ${message} ${suffix}`
      : `[figma-bridge] ${message}`,
  );
}
