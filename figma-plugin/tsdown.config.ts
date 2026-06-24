import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { code: 'code.ts' },
  format: 'iife',
  outDir: 'dist',
  target: 'es2017',
  minify: true,
  dts: false,
  clean: true,
})
