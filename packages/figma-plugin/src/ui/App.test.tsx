import type { SelectionSummary } from 'figma-bridge-protocol';

import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WsClientCallbacks } from '../bridge/wsClient';
import { App } from './App';

let callbacks: WsClientCallbacks;
const destroy = vi.fn();
vi.mock('../bridge/wsClient', () => ({
  createWsClient: (value: WsClientCallbacks) => {
    callbacks = value;
    return { connect: () => callbacks.onConnecting(), destroy, send: vi.fn() };
  },
}));
let container: HTMLDivElement;

function showSelection(nodes: SelectionSummary['nodes']) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'SELECTION_CHANGED',
            id: 'selection-1',
            summary: { page: { id: '0:1', name: '작업 페이지' }, nodes },
          },
        },
      }),
    );
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
});
afterEach(() => {
  act(() => render(null, container));
  container.remove();
  vi.restoreAllMocks();
});

describe('App (연결 상태와 현재 선택)', () => {
  it('자동 재연결 후 버튼 클릭 없이 연결됨으로 돌아온다', () => {
    act(() => render(<App />, container));
    act(() => callbacks.onOpen());
    expect(container.textContent).toContain('브릿지 연결됨');
    act(() => callbacks.onClose());
    expect(container.textContent).toContain('자동 재연결 대기');
    expect(container.querySelector('button')).not.toBeNull();
    act(() => callbacks.onConnecting());
    act(() => callbacks.onOpen());
    expect(container.textContent).toContain('브릿지 연결됨');
    expect(container.querySelector('button')).toBeNull();
  });

  it('UI 준비 후 초기 선택을 요청하고 연결이 없어도 선택·해제를 갱신한다', () => {
    const post = vi.spyOn(parent, 'postMessage');
    act(() => render(<App />, container));
    expect(post).toHaveBeenCalledWith(
      {
        pluginMessage: {
          type: 'GET_SELECTION_SUMMARY',
          id: expect.any(String),
        },
      },
      '*',
    );
    act(() => callbacks.onClose());
    showSelection([{ id: '1:2', name: '로그인 화면', type: 'FRAME' }]);
    expect(container.textContent).toContain('작업 페이지');
    expect(container.textContent).toContain('로그인 화면');
    expect(container.textContent).toContain('FRAME · 1:2');
    showSelection([
      { id: '1:2', name: '로그인 화면', type: 'FRAME' },
      { id: '1:3', name: '버튼', type: 'INSTANCE' },
    ]);
    expect(container.querySelector('summary')?.textContent).toBe(
      '로그인 화면 외 1건',
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    showSelection([]);
    expect(container.textContent).toContain('선택한 레이어가 없습니다');
    expect(container.querySelector('details')).toBeNull();
  });
});
