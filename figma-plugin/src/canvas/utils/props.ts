// props dict 조립용 공용 헬퍼.
// "값이 있을 때만 세팅" 패턴이 여러 변환 함수에 반복되어 이곳으로 추출한다.

/** value가 undefined/null이 아닐 때만 target[key]에 세팅한다. */
export function setIfDefined<T extends object>(
  target: T,
  key: keyof T | string,
  value: unknown,
): void {
  if (value !== undefined && value !== null) {
    (target as Record<string, unknown>)[key as string] = value;
  }
}

/** value가 number일 때만 target[key]에 세팅한다. (typeof x === 'number' 체크와 동일) */
export function setIfNumber<T extends object>(
  target: T,
  key: keyof T | string,
  value: unknown,
): void {
  if (typeof value === 'number') {
    (target as Record<string, unknown>)[key as string] = value;
  }
}

/**
 * source에 key가 존재하면(값이 undefined여도) target[key]에 그대로 복사한다.
 * `'key' in source` 체크로 존재 여부를 판단하는 패턴 전용 — 값 유무로 판단하는
 * setIfDefined와는 의미가 다르므로 혼용하지 않는다.
 */
export function copyIfPresent<T extends object>(
  target: T,
  source: object,
  keys: readonly (keyof T | string)[],
): void {
  for (const key of keys) {
    if (key in source) {
      (target as Record<string, unknown>)[key as string] = (
        source as Record<string, unknown>
      )[key as string];
    }
  }
}
