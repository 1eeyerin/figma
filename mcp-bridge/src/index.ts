import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

  bridge.start();

  // 2) MCP 서버 기동 (0단계: 빈 서버, 툴 없음)
  const server = new McpServer({
    name: 'figma-bridge',
    version: '0.1.0',
  });

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
