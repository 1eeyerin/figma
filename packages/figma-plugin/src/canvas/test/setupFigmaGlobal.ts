// canvas(figma sandbox) 테스트 전용 — 전역 `figma` 객체의 최소 stub.
// 실제 Plugin API 동작이 필요한 테스트는 각 테스트 파일에서 vi.fn()으로 개별 오버라이드한다.
import { vi } from 'vitest';

(globalThis as any).figma = {
  createRectangle: vi.fn(),
  createText: vi.fn(),
  createFrame: vi.fn(),
  getNodeById: vi.fn(),
  getNodeByIdAsync: vi.fn().mockResolvedValue(null),
  loadFontAsync: vi.fn().mockResolvedValue(undefined),
  notify: vi.fn(),
  closePlugin: vi.fn(),
  currentPage: {
    selection: [],
    children: [],
    appendChild: vi.fn(),
  },
  viewport: {
    scrollAndZoomIntoView: vi.fn(),
  },
  ui: {
    postMessage: vi.fn(),
  },
  base64Encode: vi.fn(),
};
