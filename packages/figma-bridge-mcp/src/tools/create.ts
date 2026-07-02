import { z } from 'zod';

import {
  colorSchema,
  opacitySchema,
  shadowSchema,
  strokeAlignSchema,
} from './schemas';
import type { ToolDefinition } from './tool-definition';

export const createToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_rectangle',
    description: 'Figma 캔버스에 사각형을 생성합니다',
    schema: {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: colorSchema,
      opacity: opacitySchema,
      cornerRadius: z.number().optional().describe('모서리 반경 (전체)'),
      cornerRadii: z
        .tuple([z.number(), z.number(), z.number(), z.number()])
        .optional()
        .describe(
          '[topLeft, topRight, bottomRight, bottomLeft] 개별 모서리 반경',
        ),
      strokeColor: colorSchema,
      strokeWeight: z.number().optional().describe('선 두께'),
      strokeAlign: strokeAlignSchema.optional().describe('선 정렬'),
      shadow: shadowSchema,
      blur: z.number().optional().describe('배경 블러 반경'),
      parentId: z.string().optional().describe('부모 노드 ID'),
      name: z.string().optional().describe('노드 이름'),
    },
  },
  {
    name: 'create_text',
    description: 'Figma 캔버스에 텍스트를 생성합니다',
    schema: {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      content: z.string().describe('텍스트 내용'),
      fontSize: z.number().optional().describe('폰트 크기 (px)'),
      fontFamily: z.string().optional().describe('폰트 패밀리'),
      fontWeight: z
        .enum([
          'Thin',
          'ExtraLight',
          'Light',
          'Regular',
          'Medium',
          'SemiBold',
          'Bold',
          'ExtraBold',
          'Black',
        ])
        .optional()
        .describe('폰트 굵기'),
      color: colorSchema,
      opacity: opacitySchema,
      textAlign: z
        .enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'])
        .optional()
        .describe('텍스트 정렬'),
      lineHeight: z
        .union([
          z.object({ value: z.number(), unit: z.enum(['PIXELS', 'PERCENT']) }),
          z.literal('AUTO'),
        ])
        .optional()
        .describe('줄 높이'),
      letterSpacing: z.number().optional().describe('자간 (px)'),
      width: z.number().optional().describe('텍스트 박스 너비'),
      autoResize: z
        .enum(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'])
        .optional()
        .describe('자동 크기 조정'),
      parentId: z.string().optional().describe('부모 노드 ID'),
      name: z.string().optional().describe('노드 이름'),
    },
  },
  {
    name: 'create_frame',
    description: 'Figma 캔버스에 프레임을 생성합니다',
    schema: {
      name: z.string().describe('프레임 이름'),
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: colorSchema,
      opacity: opacitySchema,
      cornerRadius: z.number().optional().describe('모서리 반경'),
      layoutMode: z
        .enum(['NONE', 'HORIZONTAL', 'VERTICAL'])
        .optional()
        .describe('Auto Layout 방향'),
      primaryAxisSizing: z
        .enum(['FIXED', 'AUTO'])
        .optional()
        .describe('주축 크기 조정'),
      counterAxisSizing: z
        .enum(['FIXED', 'AUTO'])
        .optional()
        .describe('교차축 크기 조정'),
      itemSpacing: z.number().optional().describe('자식 간 간격'),
      paddingTop: z.number().optional(),
      paddingRight: z.number().optional(),
      paddingBottom: z.number().optional(),
      paddingLeft: z.number().optional(),
      strokeColor: colorSchema,
      strokeWeight: z.number().optional(),
      strokeAlign: strokeAlignSchema.optional(),
      shadow: shadowSchema,
      clipContent: z.boolean().optional().describe('내용 잘라내기'),
      parentId: z.string().optional().describe('부모 노드 ID'),
    },
  },
];
