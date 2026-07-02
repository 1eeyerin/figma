import { describe, expect, it } from 'vitest';

import { isBridgeFailure, isBridgeSuccess } from './bridge-message';

describe('BridgeMessage (브릿지 메시지 타입 가드)', () => {
  it('성공 payload를 success 응답으로 판별한다', () => {
    expect(isBridgeSuccess({ success: true, nodeId: '1:2' })).toBe(true);
    expect(isBridgeFailure({ success: true, nodeId: '1:2' })).toBe(false);
  });

  it('실패 payload를 failure 응답으로 판별한다', () => {
    expect(isBridgeFailure({ success: false, error: '노드 없음' })).toBe(true);
    expect(isBridgeSuccess({ success: false, error: '노드 없음' })).toBe(false);
  });
});
