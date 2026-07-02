import { z } from 'zod';

import type { ToolDefinition } from './tool-definition';

export const readToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_node',
    description: '노드의 속성을 조회합니다',
    schema: {
      nodeId: z.string().optional().describe('노드 ID'),
    },
  },
  {
    name: 'get_page',
    description: '현재 페이지의 최상위 노드 목록을 반환합니다',
    schema: {},
  },
  {
    name: 'export_node',
    description: '노드를 PNG로 내보내고 base64를 반환합니다',
    schema: {
      nodeId: z.string().optional().describe('노드 ID'),
      scale: z.number().optional().default(1).describe('배율'),
    },
  },
];
