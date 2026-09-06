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
    name: 'get_selection_context',
    description:
      '현재 선택한 단일 노드와 자식 계층의 Figma Inspect CSS, 레이아웃, 스타일, 타이포그래피, 변수 바인딩을 반환합니다',
    schema: {
      nodeId: z
        .string()
        .optional()
        .describe('생략하면 현재 선택한 단일 노드를 사용합니다'),
      maxDepth: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('재귀 조회 최대 깊이입니다. 생략하면 전체 계층을 조회합니다'),
    },
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
