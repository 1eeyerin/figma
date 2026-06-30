import { describe, expect, it, vi } from 'vitest';

import { loadFont, resolveFontStyle } from './font';

describe('resolveFontStyle (폰트 스타일 매핑)', () => {
  it('알려진 weight를 동일한 style 문자열로 매핑한다', () => {
    expect(resolveFontStyle('Bold')).toBe('Bold');
    expect(resolveFontStyle('ExtraLight')).toBe('ExtraLight');
  });

  it('알 수 없는 weight는 Regular로 폴백한다', () => {
    expect(resolveFontStyle('Unknown')).toBe('Regular');
  });
});

describe('loadFont (폰트 로드)', () => {
  it('로드에 성공하면 요청한 family/style을 그대로 반환한다', async () => {
    const loadFontAsync = vi.fn().mockResolvedValue(undefined);
    const result = await loadFont('Pretendard', 'Bold', loadFontAsync);

    expect(result).toEqual({ family: 'Pretendard', style: 'Bold' });
    expect(loadFontAsync).toHaveBeenCalledWith({
      family: 'Pretendard',
      style: 'Bold',
    });
  });

  it('로드에 실패하면 Inter/Regular로 재시도하고 폴백 값을 반환한다', async () => {
    const loadFontAsync = vi
      .fn()
      .mockRejectedValueOnce(new Error('font not found'))
      .mockResolvedValueOnce(undefined);

    const result = await loadFont('Unknown Font', 'Bold', loadFontAsync);

    expect(result).toEqual({ family: 'Inter', style: 'Regular' });
    expect(loadFontAsync).toHaveBeenNthCalledWith(1, {
      family: 'Unknown Font',
      style: 'Bold',
    });
    expect(loadFontAsync).toHaveBeenNthCalledWith(2, {
      family: 'Inter',
      style: 'Regular',
    });
  });
});
