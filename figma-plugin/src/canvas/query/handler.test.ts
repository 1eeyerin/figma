import { beforeEach, describe, expect, it } from 'vitest';

import { handleGetPage } from './handler';

beforeEach(() => {
  (figma.ui.postMessage as any).mockClear?.();
});

describe('handleGetPage (페이지 조회)', () => {
  it('현재 페이지 children을 직렬화해 회신한다', async () => {
    (figma.currentPage as any).children = [
      {
        id: 'a',
        name: 'A',
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        opacity: 1,
      },
    ];

    await handleGetPage({ id: 'm5', type: 'GET_PAGE' });

    expect(figma.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'm5',
        success: true,
        result: [expect.objectContaining({ id: 'a' })],
      }),
    );
  });
});
