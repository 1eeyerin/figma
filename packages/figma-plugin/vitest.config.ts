import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'canvas',
          environment: 'node',
          include: ['src/canvas/**/*.test.ts'],
          setupFiles: ['./src/canvas/test/setupFigmaGlobal.ts'],
        },
      },
      {
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/{bridge,ui,utils}/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
