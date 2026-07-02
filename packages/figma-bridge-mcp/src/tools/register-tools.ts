import { batchToolDefinitions } from './batch';
import { createToolDefinitions } from './create';
import { hierarchyToolDefinitions } from './hierarchy';
import { readToolDefinitions } from './read';
import type { ToolDispatch, ToolRegistrar } from './tool-definition';

const toolDefinitions = [
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
