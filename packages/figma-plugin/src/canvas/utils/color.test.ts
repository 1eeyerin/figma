import { describe, expect, it } from 'vitest';

import { colorToFill, parseColor } from './color';

describe('parseColor (색상 문자열 파싱)', () => {
  it('hex 색상을 파싱한다', () => {
    expect(parseColor('#FF5733')).toEqual({
      rgb: { r: 255 / 255, g: 87 / 255, b: 51 / 255 },
      a: 1,
    });
  });

  it('rgba 색상을 파싱한다', () => {
    expect(parseColor('rgba(255, 87, 51, 0.5)')).toEqual({
      rgb: { r: 1, g: 87 / 255, b: 51 / 255 },
      a: 0.5,
    });
  });

  it('입력값이 undefined면 null을 반환한다', () => {
    expect(parseColor(undefined)).toBeNull();
  });

  it('인식할 수 없는 포맷이면 null을 반환한다', () => {
    expect(parseColor('hsl(0, 0%, 0%)')).toBeNull();
  });
});

describe('colorToFill (색상을 Fill로 변환)', () => {
  it('alpha가 1이면 opacity 없이 SolidPaint를 반환한다', () => {
    const fill = colorToFill('#000000');
    expect(fill).toEqual({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } });
  });

  it('alpha가 1 미만이면 opacity를 포함한다', () => {
    const fill = colorToFill('rgba(0,0,0,0.3)') as any;
    expect(fill.opacity).toBe(0.3);
  });

  it('color가 undefined면 null을 반환한다', () => {
    expect(colorToFill(undefined)).toBeNull();
  });
});
