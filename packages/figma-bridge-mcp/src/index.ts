import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createMcpServer } from './mcp/create-server.js';
import { createDispatch } from './mcp/dispatch.js';
import { WsBridge } from './ws-bridge.js';

async function main(): Promise<void> {
  const bridge = new WsBridge();
  await bridge.start();

  const server = createMcpServer(createDispatch(bridge));
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
