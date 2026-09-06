import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { readToolDefinitions } from './read';

describe('export_node 스키마 (내보내기 형식)', () => {
  const definition = readToolDefinitions.find(
    (tool) => tool.name === 'export_node',
  )!;
  const schema = z.object(definition.schema);

  it('생략한 형식은 PNG로 유지한다', () => {
    expect(schema.parse({})).toEqual({ scale: 1, format: 'PNG' });
  });

  it('SVG를 허용하고 지원하지 않는 형식은 거부한다', () => {
    expect(schema.parse({ format: 'SVG' })).toEqual({
      scale: 1,
      format: 'SVG',
    });
    expect(schema.safeParse({ format: 'PDF' }).success).toBe(false);
  });
});
