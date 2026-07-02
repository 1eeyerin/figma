import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createMcpServer } from './mcp/create-server.js';
import { createDispatch } from './mcp/dispatch.js';
import { formatPreflightReport, runStartupPreflight } from './preflight.js';
import { WsBridge } from './ws-bridge.js';

async function main(): Promise<void> {
  const preflight = await runStartupPreflight();
  console.error(formatPreflightReport(preflight));

  const bridge = new WsBridge();
  let startupFailure: string | undefined;

  if (!preflight.ok) {
    startupFailure = formatPreflightReport(preflight);
  } else {
    try {
      await bridge.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      startupFailure = `[Startup] figma-bridge daemon 시작 실패: ${message}`;
      console.error(startupFailure);
    }
  }

  const server = createMcpServer(createDispatch(bridge, startupFailure));
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] figma-bridge server v0.2.0 connected over stdio');
}

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

main().catch((err) => {
  console.error('[FATAL] Failed to start figma-bridge:', err);
  process.exit(1);
});
