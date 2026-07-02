import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import { builtinModules } from 'node:module';

const external = [
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];

const commonOptions = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'bundle',
  external,
  banner: {
    js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },
  sourcemap: false,
  logLevel: 'info',
};

await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });

await Promise.all([
  build({
    ...commonOptions,
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
  }),
  build({
    ...commonOptions,
    entryPoints: ['src/cli/daemon.ts'],
    outfile: 'dist/cli/daemon.js',
  }),
]);
