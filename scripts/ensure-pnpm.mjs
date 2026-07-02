const userAgent = process.env.npm_config_user_agent ?? '';

if (userAgent.startsWith('pnpm/')) {
  process.exit(0);
}

console.error('\n이 레포는 pnpm만 지원합니다.');
console.error(
  '`pnpm install`을 사용하세요. pnpm이 없다면 `corepack enable && corepack prepare pnpm@10.30.3 --activate`를 먼저 실행하세요.\n',
);

process.exit(1);
