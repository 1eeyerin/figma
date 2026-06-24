import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { WsBridge, BridgeMessage } from './ws-bridge.js';

/**
 * figma-bridge 진입점 (0단계: 스캐폴딩 + WS 연결 확인)
 *
 * - MCP 서버: stdio로 Claude Code와 통신 (현재 툴 없음)
 * - WS 서버: 포트 8765에서 Figma 플러그인 UI를 대기
 *
 * 단일 프로세스에서 MCP 서버와 WS 브릿지를 함께 구동한다.
 *
 * 주의: MCP는 stdout을 JSON-RPC 채널로 사용하므로
 * 모든 로그는 stderr(console.error)로 출력한다.
 */

const WS_PORT = 8765;

async function main(): Promise<void> {
  // 1) WS 브릿지 기동
  const bridge = new WsBridge(WS_PORT);

  // 플러그인 UI로부터 들어오는 메시지 라우팅 (0단계: connected / pong 로깅)
  bridge.onMessage((message: BridgeMessage) => {
    if (message.action === 'connected') {
      console.error('[Bridge] Plugin reported connected event');
    } else if (message.action === 'pong') {
      console.error(`[Bridge] pong received for ${message.id}`);
    }
  });

  await bridge.start();

  // 2) MCP 서버 기동 (0단계: 빈 서버, 툴 없음)
  const server = new McpServer({
    name: 'figma-bridge',
    version: '0.1.0',
  });

  /**
   * 공통 헬퍼: WS REQUEST를 전송하고 RESPONSE를 기다려 MCP 결과로 변환한다.
   * - 플러그인 미연결 시: 명확한 에러 메시지 반환
   * - payload.success !== true 시: 에러 메시지 반환
   * - 성공 시: nodeId 포함 메시지 반환
   */
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
        content: [
          {
            type: 'text' as const,
            text: `오류: 응답 시간 초과 (${(err as Error).message})`,
          },
        ],
        isError: true,
      };
    }

    if (!response.payload?.success) {
      return {
        content: [{ type: 'text' as const, text: `오류: ${response.payload?.error}` }],
        isError: true,
      };
    }

    return {
      content: [
        { type: 'text' as const, text: `생성 완료. nodeId: ${response.payload.nodeId}` },
      ],
    };
  }

  // create_rectangle: 사각형 생성
  server.tool(
    'create_rectangle',
    'Figma 캔버스에 사각형을 생성합니다',
    {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: z.string().optional().describe('HEX 색상 코드 (예: #FF5733)'),
    },
    async (args) => {
      return dispatch('create_rectangle', {
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        color: args.color ?? '#000000',
      });
    },
  );

  // create_text: 텍스트 생성
  server.tool(
    'create_text',
    'Figma 캔버스에 텍스트를 생성합니다',
    {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      content: z.string().describe('텍스트 내용'),
      fontSize: z.number().optional().describe('폰트 크기 (px)'),
    },
    async (args) => {
      return dispatch('create_text', {
        x: args.x,
        y: args.y,
        content: args.content,
        fontSize: args.fontSize ?? 16,
      });
    },
  );

  // create_frame: 프레임 생성
  server.tool(
    'create_frame',
    'Figma 캔버스에 프레임을 생성합니다',
    {
      name: z.string().describe('프레임 이름'),
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
    },
    async (args) => {
      return dispatch('create_frame', {
        name: args.name,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
      });
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] figma-bridge server connected over stdio');
}

// 진입점 호출 + 전역 에러 처리
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
