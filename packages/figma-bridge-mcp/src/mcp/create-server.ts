import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerTools, type ToolDispatch } from '../tools';

export function createMcpServer(dispatch: ToolDispatch): McpServer {
  const server = new McpServer({
    name: 'figma-bridge',
    version: '0.2.0',
  });

  registerTools(server, dispatch);

  return server;
}
