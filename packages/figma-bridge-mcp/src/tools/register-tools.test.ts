import { describe, expect, it, vi } from 'vitest';

import { registerTools } from './register-tools';

describe('registerTools (MCP 툴 등록)', () => {
  it('정의된 MCP 액션을 모두 서버에 등록한다', () => {
    const tool = vi.fn();
    const server = { tool };
    const dispatch = vi.fn();

    registerTools(server, dispatch);

    expect(tool).toHaveBeenCalledTimes(10);
    expect(tool.mock.calls.map((call) => call[0])).toEqual([
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
    ]);
  });
});
