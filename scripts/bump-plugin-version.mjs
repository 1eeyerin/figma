import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_JSON = join(ROOT, '.claude-plugin/plugin.json');
const CODEX_PLUGIN_JSON = join(ROOT, '.codex-plugin/plugin.json');
const MARKETPLACE_JSON = join(ROOT, '.claude-plugin/marketplace.json');
const HASH_CACHE = join(ROOT, 'node_modules/.cache/plugin-dist-hash.json');
const DIST_DIRS = [
  join(ROOT, 'packages/figma-bridge-mcp/dist'),
  join(ROOT, 'packages/figma-plugin/build'),
];

function bumpPatch(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(full) : [full];
  });
}

function hashDistDirs() {
  const hash = createHash('sha256');
  const files = DIST_DIRS.flatMap(collectFiles).sort((a, b) =>
    relative(ROOT, a).localeCompare(relative(ROOT, b)),
  );
  for (const file of files) {
    hash.update(relative(ROOT, file));
    hash.update(readFileSync(file));
  }
  return hash.digest('hex');
}

const currentHash = hashDistDirs();
const previousHash = existsSync(HASH_CACHE)
  ? JSON.parse(readFileSync(HASH_CACHE, 'utf-8')).hash
  : null;

if (currentHash === previousHash) {
  console.log('📦 빌드 산출물 변경 없음 — 버전 갱신 스킵');
  process.exit(0);
}

const plugin = JSON.parse(readFileSync(PLUGIN_JSON, 'utf-8'));
const nextVersion = bumpPatch(plugin.version);
plugin.version = nextVersion;
writeFileSync(PLUGIN_JSON, `${JSON.stringify(plugin, null, 2)}\n`);

if (existsSync(CODEX_PLUGIN_JSON)) {
  const codexPlugin = JSON.parse(readFileSync(CODEX_PLUGIN_JSON, 'utf-8'));
  codexPlugin.version = nextVersion;
  writeFileSync(CODEX_PLUGIN_JSON, `${JSON.stringify(codexPlugin, null, 2)}\n`);
}

const marketplace = JSON.parse(readFileSync(MARKETPLACE_JSON, 'utf-8'));
const entry = marketplace.plugins.find((p) => p.name === plugin.name);
if (entry) {
  entry.version = nextVersion;
  writeFileSync(MARKETPLACE_JSON, `${JSON.stringify(marketplace, null, 2)}\n`);
}

mkdirSync(dirname(HASH_CACHE), { recursive: true });
writeFileSync(HASH_CACHE, JSON.stringify({ hash: currentHash }));

console.log(`📦 plugin 버전 갱신: ${plugin.name}@${nextVersion}`);
console.log('⚠️  설치된 에이전트에 반영하려면 아래 명령을 실행하세요:');
console.log('   pnpm run plugins:update');
