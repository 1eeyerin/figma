import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = homedir();
const PLUGIN_NAME = 'figma-bridge';
const PLUGIN_JSON = join(ROOT, '.claude-plugin/plugin.json');
const PACKAGE_PLUGIN_JSON = join(
  ROOT,
  'dist/plugin-package/figma-bridge/.claude-plugin/plugin.json',
);
const CODEX_PLUGIN_LINK = join(HOME, 'plugins', PLUGIN_NAME);
const CODEX_MARKETPLACE_JSON = join(HOME, '.agents/plugins/marketplace.json');

/**
 * 명령을 실행하고 실패 시 프로세스를 종료합니다.
 */
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

/**
 * JSON 파일을 읽어 파싱한 값을 반환하고, 파일이 없으면 fallback을 반환합니다.
 */
function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * 명령 실행이 성공하는지 여부로 해당 CLI가 존재하는지 확인합니다.
 */
function commandExists(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'ignore',
    env: process.env,
  });
  return result.status === 0;
}

/**
 * plugin.json에서 version 필드를 읽어 반환합니다.
 */
function readPluginVersion(path) {
  return readJson(path, {}).version;
}

/**
 * Codex에 figma-bridge 플러그인이 설치되어 있는지 확인합니다.
 */
function isCodexInstalled() {
  if (existsSync(CODEX_PLUGIN_LINK)) return true;

  const marketplace = readJson(CODEX_MARKETPLACE_JSON, { plugins: [] });
  return marketplace.plugins?.some((plugin) => plugin.name === PLUGIN_NAME);
}

/**
 * Claude Code CLI가 설치되어 있는지 확인합니다.
 */
function isClaudeCodeInstalled() {
  return commandExists('claude', ['--version']);
}

const packagedVersion = readPluginVersion(PACKAGE_PLUGIN_JSON);
const currentVersion = readPluginVersion(PLUGIN_JSON);

run('pnpm', ['install']);
run('pnpm', ['run', 'build']);

if (packagedVersion === currentVersion) {
  console.log('\n플러그인 버전 변경 없음 — 전역 업데이트를 건너뜁니다.');
  process.exit(0);
}

console.log(
  `\n플러그인 버전 변경 감지: ${packagedVersion ?? '없음'} → ${currentVersion}`,
);

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
