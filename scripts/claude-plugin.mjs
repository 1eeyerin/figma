import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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

function install() {
  run('claude', ['plugin', 'marketplace', 'add', ROOT]);
  run('claude', ['plugin', 'install', `${PLUGIN_NAME}@${MARKETPLACE_NAME}`]);
}

function update() {
  run('claude', ['plugin', 'marketplace', 'update', MARKETPLACE_NAME]);
  run('claude', ['plugin', 'update', PLUGIN_NAME]);
}

const command = process.argv[2];

if (!['install', 'update'].includes(command)) {
  console.error('사용법: node scripts/claude-plugin.mjs <install|update>');
  process.exit(1);
}

run('pnpm', ['install']);
run('pnpm', ['run', 'build']);

if (command === 'install') {
  install();
} else {
  update();
}

console.log('\nClaude Code 플러그인 등록이 완료되었습니다.');
console.log(
  'mcp-bridge 변경분을 반영하려면 Claude Code를 재시작하세요. 스킬만 변경됐다면 재시작 없이 반영됩니다.',
);
