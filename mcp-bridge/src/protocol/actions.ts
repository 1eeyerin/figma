export const MCP_ACTIONS = [
  'create_rectangle',
  'create_text',
  'create_frame',
  'set_parent',
  'set_name',
  'remove_node',
  'get_node',
  'get_page',
  'export_node',
  'create_screen',
] as const;

export type McpAction = (typeof MCP_ACTIONS)[number];

export function isMcpAction(action: string): action is McpAction {
  return (MCP_ACTIONS as readonly string[]).includes(action);
}
