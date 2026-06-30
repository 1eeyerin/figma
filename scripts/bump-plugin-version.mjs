import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_JSON = join(ROOT, '.claude-plugin/plugin.json');
const MARKETPLACE_JSON = join(ROOT, '.claude-plugin/marketplace.json');

function bumpPatch(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

const plugin = JSON.parse(readFileSync(PLUGIN_JSON, 'utf-8'));
const nextVersion = bumpPatch(plugin.version);
plugin.version = nextVersion;
writeFileSync(PLUGIN_JSON, `${JSON.stringify(plugin, null, 2)}\n`);

const marketplace = JSON.parse(readFileSync(MARKETPLACE_JSON, 'utf-8'));
const entry = marketplace.plugins.find((p) => p.name === plugin.name);
if (entry) {
  entry.version = nextVersion;
  writeFileSync(MARKETPLACE_JSON, `${JSON.stringify(marketplace, null, 2)}\n`);
}

console.log(`📦 plugin 버전 갱신: ${plugin.name}@${nextVersion}`);
console.log('⚠️  Claude Code에서 아래 명령을 실행해야 반영됩니다:');
console.log('   /plugin marketplace update figma-bridge-marketplace');
console.log('   /plugin update figma-bridge');
