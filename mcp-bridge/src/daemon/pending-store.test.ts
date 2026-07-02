import { describe, expect, it, vi } from 'vitest';

import { PendingRequestStore } from './pending-store';

describe('PendingRequestStore (대기 요청 저장소)', () => {
  it('id로 대기 요청을 완료하고 저장소에서 제거한다', () => {
    const store = new PendingRequestStore();
    const onTimeout = vi.fn();
    const resolve = vi.fn();

    store.add('id-1', {
      action: 'create_rectangle',
      timeoutMs: 1000,
      resolve,
      onTimeout,
    });
    const completed = store.resolve('id-1', {
      id: 'id-1',
      type: 'RESPONSE',
      action: 'create_rectangle',
      payload: { success: true },
    });

    expect(completed).toBe(true);
    expect(resolve).toHaveBeenCalledOnce();
    expect(store.size).toBe(0);
  });

  it('알 수 없는 id 응답은 false를 반환한다', () => {
    const store = new PendingRequestStore();

    expect(
      store.resolve('missing', {
        id: 'missing',
        type: 'RESPONSE',
        action: 'create_rectangle',
        payload: { success: true },
      }),
    ).toBe(false);
  });
});
