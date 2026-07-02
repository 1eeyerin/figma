import { describe, expect, it } from 'vitest';

import { applyStroke, buildEffects } from './effects';

describe('buildEffects (이펙트 빌드)', () => {
  it('shadow가 없으면 빈 배열을 반환한다', () => {
    expect(buildEffects({})).toEqual([]);
  });

  it('shadow 기본값으로 DROP_SHADOW 효과를 만든다', () => {
    const effects = buildEffects({ shadow: {} });
    expect(effects).toEqual([
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 1 },
        offset: { x: 0, y: 4 },
        radius: 8,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
      },
    ]);
  });

  it('shadow.opacity와 색상 alpha를 곱해 최종 alpha를 계산한다', () => {
    const effects = buildEffects({
      shadow: { color: 'rgba(255,0,0,0.5)', opacity: 0.4 },
    });
    expect((effects[0] as any).color.a).toBeCloseTo(0.2);
  });

  it('blur가 숫자면 LAYER_BLUR 효과를 추가한다', () => {
    const effects = buildEffects({ blur: 12 });
    expect(effects).toEqual([
      { type: 'LAYER_BLUR', radius: 12, visible: true },
    ]);
  });

  it('shadow와 blur가 모두 있으면 두 효과를 모두 반환한다', () => {
    const effects = buildEffects({ shadow: {}, blur: 5 });
    expect(effects).toHaveLength(2);
  });
});

describe('applyStroke (스트로크 적용)', () => {
  it('strokeColor가 있으면 strokes를 설정한다', () => {
    const node: any = {};
    applyStroke(node, { strokeColor: '#FFFFFF' });
    expect(node.strokes).toEqual([
      { type: 'SOLID', color: { r: 1, g: 1, b: 1 } },
    ]);
  });

  it('strokeColor가 없으면 strokes를 건드리지 않는다', () => {
    const node: any = {};
    applyStroke(node, {});
    expect(node.strokes).toBeUndefined();
  });

  it('strokeWeight와 strokeAlign을 설정한다', () => {
    const node: any = {};
    applyStroke(node, { strokeWeight: 2, strokeAlign: 'CENTER' });
    expect(node.strokeWeight).toBe(2);
    expect(node.strokeAlign).toBe('CENTER');
  });
});
