import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWsClient } from './wsClient';

describe('createWsClient (WebSocket 클라이언트 생성)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('send/connect/destroy를 노출하고, 서버가 없어도 connect+destroy를 견딘다', () => {
    const client = createWsClient({
      onOpen: vi.fn(),
      onClose: vi.fn(),
      onCanvasMessage: vi.fn(),
    });

    expect(() => {
      client.connect();
      client.destroy();
    }).not.toThrow();
  });

  it('메시지를 받기 전에는 onCanvasMessage를 호출하지 않는다', () => {
    const onCanvasMessage = vi.fn();
    createWsClient({
      onOpen: vi.fn(),
      onClose: vi.fn(),
      onCanvasMessage,
    });
    expect(onCanvasMessage).not.toHaveBeenCalled();
  });
});
