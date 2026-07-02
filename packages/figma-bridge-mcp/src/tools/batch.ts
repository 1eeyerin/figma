import { z } from 'zod';

import type { ToolDefinition } from './tool-definition';

export const batchToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_screen',
    description: `노드 트리를 한 번에 생성합니다. 부모-자식 관계와 스타일을 모두 포함.
예시:
{
  "type": "frame",
  "name": "Card",
  "x": 0, "y": 0, "width": 320, "height": 200,
  "color": "#1E1E1E",
  "layoutMode": "VERTICAL",
  "paddingTop": 16, "paddingRight": 16, "paddingBottom": 16, "paddingLeft": 16,
  "itemSpacing": 8,
  "children": [
    { "type": "text", "content": "Title", "fontSize": 18, "color": "#FFFFFF", "fontWeight": "Bold" },
    { "type": "rectangle", "width": 288, "height": 1, "color": "#FFFFFF", "opacity": 0.1 }
  ]
}`,
    schema: {
      tree: z.record(z.string(), z.unknown()).describe('노드 트리 JSON'),
      parentId: z.string().optional().describe('루트 노드를 붙일 부모 ID'),
    },
  },
];
