import type { z } from 'zod';

import type { McpAction } from '../protocol/actions.js';
import type { ToolTextResult } from '../protocol/tool-result.js';

export type ToolDispatch = (
  action: McpAction,
  payload: Record<string, unknown>,
) => Promise<ToolTextResult>;

export interface ToolDefinition {
  name: McpAction;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
}

export interface ToolRegistrar {
  tool(
    name: string,
    description: string,
    schema: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<ToolTextResult>,
  ): void;
}
