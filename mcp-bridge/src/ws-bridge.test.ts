import { describe, expect, it } from 'vitest';

import { WsBridge } from './ws-bridge';

describe('WsBridge (WebSocket 브릿지)', () => {
  it('프로세스나 연결을 시작하지 않고 생성된다', () => {
    const bridge = new WsBridge();
    expect(bridge).toBeInstanceOf(WsBridge);
  });
});
