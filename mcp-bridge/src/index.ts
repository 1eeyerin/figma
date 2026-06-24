import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { WsBridge, BridgeMessage } from './ws-bridge.js';

const WS_PORT = 8765;

// 공통 색상 스키마
const colorSchema = z.string().optional().describe('HEX 색상 (예: #FF5733) 또는 rgba (예: rgba(255,87,51,0.5))');

// 공통 그림자 스키마
const shadowSchema = z.object({
  type: z.enum(['DROP_SHADOW', 'INNER_SHADOW']).optional().default('DROP_SHADOW'),
  color: colorSchema,
  offsetX: z.number().optional().default(0),
  offsetY: z.number().optional().default(4),
  blur: z.number().optional().default(8),
  spread: z.number().optional().default(0),
  opacity: z.number().min(0).max(1).optional().default(1),
}).optional();

async function main(): Promise<void> {
  const bridge = new WsBridge(WS_PORT);

  bridge.onMessage((message: BridgeMessage) => {
    if (message.action === 'connected') {
      console.error('[Bridge] Plugin reported connected event');
    } else if (message.action === 'pong') {
      console.error(`[Bridge] pong received for ${message.id}`);
    }
  });

  await bridge.start();

  const server = new McpServer({
    name: 'figma-bridge',
    version: '0.2.0',
  });

  async function dispatch(action: string, payload: Record<string, unknown>) {
    const id = randomUUID();
    const sent = bridge.send({ id, type: 'REQUEST', action, payload });
    if (!sent) {
      return {
        content: [{ type: 'text' as const, text: 'Figma 플러그인이 연결되지 않았습니다.' }],
        isError: true,
      };
    }

    let response: BridgeMessage;
    try {
      response = await bridge.waitForResponse(id);
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `오류: 응답 시간 초과 (${(err as Error).message})` }],
        isError: true,
      };
    }

    if (!response.payload?.success) {
      return {
        content: [{ type: 'text' as const, text: `오류: ${response.payload?.error}` }],
        isError: true,
      };
    }

    const data = response.payload;
    const parts: string[] = [];
    if (data.nodeId) parts.push(`nodeId: ${data.nodeId}`);
    if (data.result) parts.push(JSON.stringify(data.result, null, 2));

    return {
      content: [{ type: 'text' as const, text: parts.length ? parts.join('\n') : '완료' }],
    };
  }

  // ─── 노드 생성 ───────────────────────────────────────────────────────────

  server.tool(
    'create_rectangle',
    'Figma 캔버스에 사각형을 생성합니다',
    {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: colorSchema,
      opacity: z.number().min(0).max(1).optional().describe('전체 불투명도 (0~1)'),
      cornerRadius: z.number().optional().describe('모서리 반경 (전체)'),
      cornerRadii: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
        .describe('[topLeft, topRight, bottomRight, bottomLeft] 개별 모서리 반경'),
      strokeColor: colorSchema,
      strokeWeight: z.number().optional().describe('선 두께'),
      strokeAlign: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional().describe('선 정렬'),
      shadow: shadowSchema,
      blur: z.number().optional().describe('배경 블러 반경'),
      parentId: z.string().optional().describe('부모 노드 ID (없으면 현재 페이지에 추가)'),
      name: z.string().optional().describe('노드 이름'),
    },
    async (args) => dispatch('create_rectangle', args),
  );

  server.tool(
    'create_text',
    'Figma 캔버스에 텍스트를 생성합니다',
    {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      content: z.string().describe('텍스트 내용'),
      fontSize: z.number().optional().describe('폰트 크기 (px)'),
      fontFamily: z.string().optional().describe('폰트 패밀리 (예: Inter)'),
      fontWeight: z.enum(['Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'])
        .optional().describe('폰트 굵기'),
      color: colorSchema,
      opacity: z.number().min(0).max(1).optional().describe('전체 불투명도 (0~1)'),
      textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional().describe('텍스트 정렬'),
      lineHeight: z.union([
        z.object({ value: z.number(), unit: z.enum(['PIXELS', 'PERCENT']) }),
        z.literal('AUTO'),
      ]).optional().describe('줄 높이'),
      letterSpacing: z.number().optional().describe('자간 (px)'),
      width: z.number().optional().describe('텍스트 박스 너비 (설정 시 FIXED 모드)'),
      autoResize: z.enum(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'])
        .optional().describe('자동 크기 조정'),
      parentId: z.string().optional().describe('부모 노드 ID'),
      name: z.string().optional().describe('노드 이름'),
    },
    async (args) => dispatch('create_text', args),
  );

  server.tool(
    'create_frame',
    'Figma 캔버스에 프레임을 생성합니다',
    {
      name: z.string().describe('프레임 이름'),
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: colorSchema,
      opacity: z.number().min(0).max(1).optional().describe('전체 불투명도 (0~1)'),
      cornerRadius: z.number().optional().describe('모서리 반경'),
      layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).optional().describe('Auto Layout 방향'),
      primaryAxisSizing: z.enum(['FIXED', 'AUTO']).optional().describe('주축 크기 조정'),
      counterAxisSizing: z.enum(['FIXED', 'AUTO']).optional().describe('교차축 크기 조정'),
      itemSpacing: z.number().optional().describe('자식 간 간격'),
      paddingTop: z.number().optional(),
      paddingRight: z.number().optional(),
      paddingBottom: z.number().optional(),
      paddingLeft: z.number().optional(),
      strokeColor: colorSchema,
      strokeWeight: z.number().optional(),
      strokeAlign: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
      shadow: shadowSchema,
      clipContent: z.boolean().optional().describe('내용 잘라내기'),
      parentId: z.string().optional().describe('부모 노드 ID'),
    },
    async (args) => dispatch('create_frame', args),
  );

  // ─── 계층 관리 ───────────────────────────────────────────────────────────

  server.tool(
    'set_parent',
    '노드를 다른 부모(프레임 등)로 이동합니다',
    {
      nodeId: z.string().describe('이동할 노드 ID'),
      parentId: z.string().describe('새 부모 노드 ID'),
      index: z.number().optional().describe('삽입 위치 (없으면 마지막)'),
    },
    async (args) => dispatch('set_parent', args),
  );

  server.tool(
    'set_name',
    '노드 이름을 변경합니다',
    {
      nodeId: z.string().describe('노드 ID'),
      name: z.string().describe('새 이름'),
    },
    async (args) => dispatch('set_name', args),
  );

  server.tool(
    'remove_node',
    '노드를 삭제합니다',
    {
      nodeId: z.string().describe('삭제할 노드 ID'),
    },
    async (args) => dispatch('remove_node', args),
  );

  // ─── 읽기 / 검증 ─────────────────────────────────────────────────────────

  server.tool(
    'get_node',
    '노드의 속성(위치, 크기, 색상 등)을 조회합니다',
    {
      nodeId: z.string().optional().describe('노드 ID (없으면 현재 선택 노드)'),
    },
    async (args) => dispatch('get_node', args),
  );

  server.tool(
    'get_page',
    '현재 페이지의 최상위 노드 목록을 반환합니다',
    {},
    async () => dispatch('get_page', {}),
  );

  server.tool(
    'export_node',
    '노드를 PNG로 내보내고 base64를 반환합니다',
    {
      nodeId: z.string().optional().describe('노드 ID (없으면 현재 선택)'),
      scale: z.number().optional().default(1).describe('배율 (기본 1)'),
    },
    async (args) => dispatch('export_node', args),
  );

  // ─── 배치 생성 ───────────────────────────────────────────────────────────

  server.tool(
    'create_screen',
    `노드 트리를 한 번에 생성합니다. 부모-자식 관계와 스타일을 모두 포함.
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
    {
      tree: z.any().describe('노드 트리 JSON'),
      parentId: z.string().optional().describe('루트 노드를 붙일 부모 ID'),
    },
    async (args) => dispatch('create_screen', args),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] figma-bridge server v0.2.0 connected over stdio');
}

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

main().catch((err) => {
  console.error('[FATAL] Failed to start figma-bridge:', err);
  process.exit(1);
});
