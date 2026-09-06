import type { CanvasMessageType } from './canvas-messages.js';

export type McpAction =
  | 'create_rectangle'
  | 'create_text'
  | 'create_frame'
  | 'set_parent'
  | 'set_name'
  | 'remove_node'
  | 'get_node'
  | 'get_page'
  | 'get_selection_context'
  | 'export_node'
  | 'create_screen';

export const ACTION_MAP: Record<McpAction, CanvasMessageType> = {
  create_rectangle: 'DRAW_RECT',
  create_text: 'DRAW_TEXT',
  create_frame: 'DRAW_FRAME',
  set_parent: 'SET_PARENT',
  set_name: 'SET_NAME',
  remove_node: 'REMOVE_NODE',
  get_node: 'GET_NODE',
  get_page: 'GET_PAGE',
  get_selection_context: 'GET_SELECTION_CONTEXT',
  export_node: 'EXPORT_NODE',
  create_screen: 'DRAW_SCREEN',
};

export function isMcpAction(action: string): action is McpAction {
  return action in ACTION_MAP;
}
