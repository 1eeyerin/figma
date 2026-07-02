import { z } from 'zod';

import type { ToolDefinition } from './tool-definition';

export const hierarchyToolDefinitions: ToolDefinition[] = [
  {
    name: 'set_parent',
    description: '노드를 다른 부모로 이동합니다',
    schema: {
      nodeId: z.string().describe('이동할 노드 ID'),
      parentId: z.string().describe('새 부모 노드 ID'),
      index: z.number().optional().describe('삽입 위치'),
    },
  },
  {
    name: 'set_name',
    description: '노드 이름을 변경합니다',
    schema: {
      nodeId: z.string().describe('노드 ID'),
      name: z.string().describe('새 이름'),
    },
  },
  {
    name: 'remove_node',
    description: '노드를 삭제합니다',
    schema: {
      nodeId: z.string().describe('삭제할 노드 ID'),
    },
  },
];
