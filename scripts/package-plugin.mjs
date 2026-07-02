import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_ROOT = join(ROOT, 'dist/plugin-package/figma-bridge');

const requiredPaths = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.codex-plugin/plugin.json',
  'skills',
  'docs',
  'README.md',
  'CLAUDE.md',
  'AGENTS.md',
  'packages/figma-bridge-mcp/package.json',
  'packages/figma-bridge-mcp/dist/index.js',
  'packages/figma-bridge-mcp/dist/cli/daemon.js',
  'packages/figma-plugin/manifest.json',
  'packages/figma-plugin/build/main.js',
  'packages/figma-plugin/build/ui.js',
];

const optionalPaths = ['.claude/commands'];

async function assertExists(relativePath) {
  await stat(join(ROOT, relativePath)).catch(() => {
    throw new Error(`패키징 필수 파일이 없습니다: ${relativePath}`);
  });
}

async function copyPath(relativePath) {
  const from = join(ROOT, relativePath);
  const to = join(PACKAGE_ROOT, relativePath);
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}

for (const relativePath of requiredPaths) {
  await assertExists(relativePath);
}

await rm(PACKAGE_ROOT, { recursive: true, force: true });
await mkdir(PACKAGE_ROOT, { recursive: true });

for (const relativePath of requiredPaths) {
  await copyPath(relativePath);
}

for (const relativePath of optionalPaths) {
  const exists = await stat(join(ROOT, relativePath))
    .then(() => true)
    .catch(() => false);
  if (exists) {
    await copyPath(relativePath);
  }
}

console.log(`플러그인 패키지 생성 완료: ${PACKAGE_ROOT}`);
