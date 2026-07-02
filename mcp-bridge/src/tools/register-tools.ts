import { batchToolDefinitions } from './batch.js';
import { createToolDefinitions } from './create.js';
import { hierarchyToolDefinitions } from './hierarchy.js';
import { readToolDefinitions } from './read.js';
import type { ToolDispatch, ToolRegistrar } from './tool-definition.js';

export const toolDefinitions = [
  ...createToolDefinitions,
  ...hierarchyToolDefinitions,
  ...readToolDefinitions,
  ...batchToolDefinitions,
];

export function registerTools(
  server: ToolRegistrar,
  dispatch: ToolDispatch,
): void {
  for (const definition of toolDefinitions) {
    server.tool(
      definition.name,
      definition.description,
      definition.schema,
      (args) => dispatch(definition.name, args),
    );
  }
}
