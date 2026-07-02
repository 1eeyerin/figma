import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_ROOT = join(ROOT, 'dist/plugin-package/figma-bridge');
const PLUGIN_NAME = 'figma-bridge';
const MARKETPLACE_NAME = 'figma-bridge-marketplace';

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

function getOutput(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    env: process.env,
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function hasMarketplace() {
  const result = getOutput('claude', ['plugin', 'marketplace', 'list']);
  return result.ok && result.output.includes(MARKETPLACE_NAME);
}

function hasPlugin() {
  return getOutput('claude', ['plugin', 'details', PLUGIN_NAME]).ok;
}

function configureMarketplace() {
  if (hasMarketplace()) {
    run('claude', ['plugin', 'marketplace', 'remove', MARKETPLACE_NAME]);
  }
  run('claude', ['plugin', 'marketplace', 'add', PACKAGE_ROOT]);
}

function install() {
  configureMarketplace();
  run('claude', ['plugin', 'install', `${PLUGIN_NAME}@${MARKETPLACE_NAME}`]);
}

function update() {
  configureMarketplace();

  if (hasPlugin()) {
    run('claude', ['plugin', 'update', PLUGIN_NAME]);
  } else {
    run('claude', ['plugin', 'install', `${PLUGIN_NAME}@${MARKETPLACE_NAME}`]);
  }
}

const command = process.argv[2];
const skipBuild = process.argv.includes('--skip-build');

if (!['install', 'update'].includes(command)) {
  console.error(
    '사용법: node scripts/claude-plugin.mjs <install|update> [--skip-build]',
  );
  process.exit(1);
}

if (!skipBuild) {
  run('pnpm', ['install']);
  run('pnpm', ['run', 'build:package']);
} else {
  run('node', ['scripts/package-plugin.mjs']);
}

if (command === 'install') {
  install();
} else {
  update();
}

console.log('\nClaude Code 플러그인 등록이 완료되었습니다.');
console.log(
  'figma-bridge-mcp 변경분을 반영하려면 Claude Code를 재시작하세요. 스킬만 변경됐다면 재시작 없이 반영됩니다.',
);
