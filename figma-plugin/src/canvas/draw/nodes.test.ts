import { describe, expect, it } from 'vitest';

import {
  frameLayoutPropsFrom,
  framePropsFrom,
  rectPropsFrom,
  textPropsFrom,
} from './props';

describe('rectPropsFrom (사각형 속성 변환)', () => {
  it('기본 좌표만 있으면 x/y만 채운다', () => {
    expect(rectPropsFrom({})).toEqual({ x: 0, y: 0 });
  });

  it('name이 있을 때만 name 키를 포함한다', () => {
    expect(rectPropsFrom({ name: 'Box' })).toMatchObject({ name: 'Box' });
    expect(rectPropsFrom({})).not.toHaveProperty('name');
  });

  it('cornerRadii 배열을 4개 모서리에 순서대로 매핑한다', () => {
    const props = rectPropsFrom({ cornerRadii: [1, 2, 3, 4] });
    expect(props).toMatchObject({
      topLeftRadius: 1,
      topRightRadius: 2,
      bottomRightRadius: 3,
      bottomLeftRadius: 4,
    });
  });

  it('color가 있으면 fills를 채운다', () => {
    const props = rectPropsFrom({ color: '#FFFFFF' });
    expect(props.fills).toEqual([
      { type: 'SOLID', color: { r: 1, g: 1, b: 1 } },
    ]);
  });
});

describe('textPropsFrom (텍스트 속성 변환)', () => {
  it('content가 없으면 빈 문자열로 채운다', () => {
    expect(textPropsFrom({})).toMatchObject({ characters: '' });
  });

  it('autoResize가 없으면 textAutoResize 키를 포함하지 않는다', () => {
    expect(textPropsFrom({})).not.toHaveProperty('textAutoResize');
  });

  it('letterSpacing은 PIXELS 단위 객체로 변환한다', () => {
    const props = textPropsFrom({ letterSpacing: 2 });
    expect(props.letterSpacing).toEqual({ value: 2, unit: 'PIXELS' });
  });

  it('lineHeight가 AUTO면 적용하지 않는다', () => {
    expect(textPropsFrom({ lineHeight: 'AUTO' })).not.toHaveProperty(
      'lineHeight',
    );
  });
});

describe('framePropsFrom (프레임 속성 변환)', () => {
  it('name이 없으면 기본값 Frame을 사용한다', () => {
    expect(framePropsFrom({})).toMatchObject({ name: 'Frame' });
  });

  it('color가 없으면 fills를 빈 배열로 만든다', () => {
    expect(framePropsFrom({})).toMatchObject({ fills: [] });
  });

  it('clipContent가 명시적으로 false여도 적용한다', () => {
    expect(framePropsFrom({ clipContent: false })).toMatchObject({
      clipsContent: false,
    });
  });
});

describe('frameLayoutPropsFrom (프레임 레이아웃 속성 변환)', () => {
  it('layoutMode가 없으면 null을 반환한다', () => {
    expect(frameLayoutPropsFrom({})).toBeNull();
  });

  it('layoutMode가 NONE이면 null을 반환한다', () => {
    expect(frameLayoutPropsFrom({ layoutMode: 'NONE' })).toBeNull();
  });

  it('layoutMode가 있으면 패딩/간격을 함께 채운다', () => {
    const props = frameLayoutPropsFrom({
      layoutMode: 'VERTICAL',
      itemSpacing: 8,
      paddingTop: 16,
    });
    expect(props).toEqual({
      layoutMode: 'VERTICAL',
      itemSpacing: 8,
      paddingTop: 16,
    });
  });
});
