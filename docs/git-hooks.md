# Git Hooks

husky로 관리하는 Git 훅 (`.husky/`). oxlint/oxfmt 기반.

## pre-commit

다음을 순서대로 검사하며, 하나라도 실패하면 커밋이 취소된다.

1. **절대경로 검사**: 스테이징된 파일에 `/Users/<사용자명>`, `/home/<사용자명>` 같은 로컬 환경 종속 경로가 포함되어 있으면 차단. ([절대경로 금지](#절대경로-금지) 참고)
2. **테스트 제목 한글 검사**: 스테이징된 `*.test.ts`/`*.test.tsx` 파일에서 `describe`/`it`/`test` 제목에 한글이 전혀 없으면 차단. (자세한 규칙은 [testing.md](testing.md) 참고)
3. **린트**: `pnpm run lint` (oxlint) 통과해야 함.
4. **포맷**: `pnpm run format:check` (oxfmt) 통과해야 함. 실패 시 `pnpm run format`으로 자동 정리 후 재커밋.

## pre-push

루트 `pnpm run build` (plugin + packages/mcp-bridge 빌드)와 `pnpm run test` 통과해야 push 가능.

- 스킵: `SKIP_PRE_PUSH=1 git push`

## commit-msg

커밋 메시지 형식을 강제한다: `type(scope): 한글 메시지`

- scope 필수
- 타입: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `build`

## 절대경로 금지

- 스크립트·문서·설정에 `/Users/<사용자명>`, `/home/<사용자명>` 같은 로컬 환경 종속 절대경로를 **하드코딩 금지**. 다른 사용자/머신에서 깨진다.
- 셸 스크립트는 `SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"` 패턴으로 자기 위치 기준 경로를 구하라.
- 문서의 안내 명령어는 프로젝트 루트 기준 상대경로(`cd packages/mcp-bridge`)로 작성하라.
- `pre-commit` 훅이 이를 자동 검사한다 (위 pre-commit 참고).
