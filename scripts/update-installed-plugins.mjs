import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = homedir();
const PLUGIN_NAME = 'figma-bridge';
const PLUGIN_JSON = join(ROOT, '.claude-plugin/plugin.json');
const CODEX_PLUGIN_LINK = join(HOME, 'plugins', PLUGIN_NAME);
const CODEX_MARKETPLACE_JSON = join(HOME, '.agents/plugins/marketplace.json');

function run(command, args) {
  console.log(`\n$ ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function commandExists(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'ignore',
    env: process.env,
  });
  return result.status === 0;
}

function readPluginVersion() {
  return readJson(PLUGIN_JSON, {}).version;
}

function isCodexInstalled() {
  if (existsSync(CODEX_PLUGIN_LINK)) return true;

  const marketplace = readJson(CODEX_MARKETPLACE_JSON, { plugins: [] });
  return marketplace.plugins?.some((plugin) => plugin.name === PLUGIN_NAME);
}

function isClaudeCodeInstalled() {
  return commandExists('claude', ['--version']);
}

const previousVersion = readPluginVersion();

run('pnpm', ['install']);
run('pnpm', ['run', 'build']);

const nextVersion = readPluginVersion();

if (previousVersion === nextVersion) {
  console.log('\n플러그인 버전 변경 없음 — 전역 업데이트를 건너뜁니다.');
  process.exit(0);
}

console.log(`\n플러그인 버전 변경 감지: ${previousVersion} → ${nextVersion}`);

const codexInstalled = isCodexInstalled();
const claudeInstalled = isClaudeCodeInstalled();

if (!codexInstalled && !claudeInstalled) {
  console.log('설치된 Codex/Claude Code가 없습니다.');
  process.exit(0);
}

if (codexInstalled) {
  run('node', ['scripts/codex-plugin.mjs', 'update', '--skip-build']);
} else {
  console.log('\nCodex figma-bridge 플러그인이 없어 건너뜁니다.');
}

if (claudeInstalled) {
  run('node', ['scripts/claude-plugin.mjs', 'update', '--skip-build']);
} else {
  console.log('\nClaude Code가 설치되어 있지 않아 건너뜁니다.');
}
