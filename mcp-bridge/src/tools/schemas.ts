import { z } from 'zod';

export const colorSchema = z
  .string()
  .optional()
  .describe('HEX 색상 (예: #FF5733) 또는 rgba (예: rgba(255,87,51,0.5))');

export const shadowSchema = z
  .object({
    type: z
      .enum(['DROP_SHADOW', 'INNER_SHADOW'])
      .optional()
      .default('DROP_SHADOW'),
    color: colorSchema,
    offsetX: z.number().optional().default(0),
    offsetY: z.number().optional().default(4),
    blur: z.number().optional().default(8),
    spread: z.number().optional().default(0),
    opacity: z.number().min(0).max(1).optional().default(1),
  })
  .optional();

export const opacitySchema = z
  .number()
  .min(0)
  .max(1)
  .optional()
  .describe('전체 불투명도 (0~1)');

export const strokeAlignSchema = z.enum(['INSIDE', 'OUTSIDE', 'CENTER']);
