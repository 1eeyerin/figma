import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_NAME = 'figma-bridge';
const MARKETPLACE_NAME = 'personal';
const HOME = homedir();
const PLUGINS_DIR = join(HOME, 'plugins');
const PERSONAL_MARKETPLACE = join(HOME, '.agents/plugins/marketplace.json');
const PERSONAL_PLUGIN_LINK = join(PLUGINS_DIR, PLUGIN_NAME);

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

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function ensurePluginLink() {
  mkdirSync(PLUGINS_DIR, { recursive: true });

  if (existsSync(PERSONAL_PLUGIN_LINK)) {
    const stat = lstatSync(PERSONAL_PLUGIN_LINK);
    const target = realpathSync(PERSONAL_PLUGIN_LINK);

    if (target === realpathSync(ROOT)) {
      return;
    }

    if (stat.isSymbolicLink()) {
      unlinkSync(PERSONAL_PLUGIN_LINK);
    } else {
      console.error(
        `${PERSONAL_PLUGIN_LINK} 경로가 이미 다른 디렉터리를 가리킵니다.`,
      );
      console.error('기존 경로를 확인한 뒤 다시 실행하세요.');
      process.exit(1);
    }
  }

  symlinkSync(ROOT, PERSONAL_PLUGIN_LINK, 'dir');
}

function ensurePersonalMarketplace() {
  const marketplace = readJson(PERSONAL_MARKETPLACE, {
    name: MARKETPLACE_NAME,
    interface: {
      displayName: 'Personal',
    },
    plugins: [],
  });

  marketplace.name ??= MARKETPLACE_NAME;
  marketplace.interface ??= { displayName: 'Personal' };
  marketplace.plugins ??= [];

  const entry = {
    name: PLUGIN_NAME,
    source: {
      source: 'local',
      path: `./plugins/${PLUGIN_NAME}`,
    },
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
    },
    category: 'Productivity',
  };

  const index = marketplace.plugins.findIndex(
    (plugin) => plugin.name === PLUGIN_NAME,
  );
  if (index >= 0) {
    marketplace.plugins[index] = { ...marketplace.plugins[index], ...entry };
  } else {
    marketplace.plugins.push(entry);
  }

  writeJson(PERSONAL_MARKETPLACE, marketplace);
}

function registerCodexPlugin() {
  ensurePluginLink();
  ensurePersonalMarketplace();
  run('codex', ['plugin', 'add', `${PLUGIN_NAME}@${MARKETPLACE_NAME}`]);
}

const command = process.argv[2];

if (!['install', 'update'].includes(command)) {
  console.error('사용법: node scripts/codex-plugin.mjs <install|update>');
  process.exit(1);
}

run('pnpm', ['install']);
run('pnpm', ['run', 'build']);
registerCodexPlugin();

console.log('\nCodex 플러그인 등록이 완료되었습니다.');
console.log(
  '새 스킬과 MCP 서버 반영을 확인하려면 새 Codex 세션에서 테스트하세요.',
);
