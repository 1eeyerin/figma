export const WS_URL = 'ws://localhost:8765';

export const RECONNECT_DELAY = 3000;

// MCP bridge action → canvas 메시지 타입 매핑
export const ACTION_MAP: Record<string, string> = {
  create_rectangle: 'DRAW_RECT',
  create_text: 'DRAW_TEXT',
  create_frame: 'DRAW_FRAME',
  set_parent: 'SET_PARENT',
  set_name: 'SET_NAME',
  remove_node: 'REMOVE_NODE',
  get_node: 'GET_NODE',
  get_page: 'GET_PAGE',
  export_node: 'EXPORT_NODE',
  create_screen: 'CREATE_SCREEN',
};
