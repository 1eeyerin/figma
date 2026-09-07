import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleMessage } from '../dispatch';
import { observeSelection, publishSelection } from './observe-selection';

const page = {
  id: '0:1',
  name: '페이지',
  selection: [] as { id: string; name: string; type: string }[],
};
const listeners = new Map<string, (...args: never[]) => void>();
const postMessage = vi.fn();
let stop: (() => void) | undefined;

beforeEach(() => {
  listeners.clear();
  postMessage.mockClear();
  page.selection = [];
  vi.stubGlobal('figma', {
    currentPage: page,
    ui: { postMessage },
    on: (event: string, callback: (...args: never[]) => void) =>
      listeners.set(event, callback),
    off: (event: string) => listeners.delete(event),
  });
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
});

describe('선택 요약 이벤트', () => {
  it('초기 요청 ID를 유지하고 선택된 모든 레이어의 표시 정보만 반환한다', async () => {
    page.selection = [
      { id: '1:2', name: '화면', type: 'FRAME' },
      { id: '1:3', name: '텍스트', type: 'TEXT' },
    ];
    await handleMessage({ type: 'GET_SELECTION_SUMMARY', id: 'initial' });
    expect(postMessage).toHaveBeenCalledWith({
      type: 'SELECTION_CHANGED',
      id: 'initial',
      summary: { page: { id: '0:1', name: '페이지' }, nodes: page.selection },
    });
  });

  it('선택 변경 때마다 캔버스를 다시 읽고 빈 선택도 전달한다', () => {
    stop = observeSelection();
    page.selection = [{ id: '1:2', name: '화면', type: 'FRAME' }];
    listeners.get('selectionchange')?.();
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ nodes: page.selection }),
      }),
    );
    page.selection = [];
    listeners.get('selectionchange')?.();
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ nodes: [] }),
      }),
    );
    stop();
    expect(listeners.size).toBe(0);
  });

  it('페이지 전환 후 새 페이지의 선택을 반환한다', () => {
    stop = observeSelection();
    Object.defineProperty(figma, 'currentPage', {
      value: { id: '0:2', name: '다음 페이지', selection: [] },
    });
    listeners.get('selectionchange')?.();
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        summary: { page: { id: '0:2', name: '다음 페이지' }, nodes: [] },
      }),
    );
  });

  it('선택 레이어의 이름 변경만 갱신하고 관련 없는 변경은 무시한다', () => {
    stop = observeSelection();
    const node = { id: '1:2', name: '변경된 이름', type: 'FRAME' };
    page.selection = [node];
    const onChange = listeners.get('documentchange') as (
      event: Pick<DocumentChangeEvent, 'documentChanges'>,
    ) => void;
    const change = {
      type: 'PROPERTY_CHANGE',
      id: node.id,
      node,
      properties: ['name'],
    } as unknown as PropertyChange;
    onChange({ documentChanges: [change] });
    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ nodes: [node] }),
      }),
    );
    onChange({ documentChanges: [{ ...change, id: 'other' }] });
    onChange({ documentChanges: [{ ...change, properties: ['x'] }] });
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('요약 전송은 전체 디자인 속성을 포함하지 않는다', () => {
    page.selection = [
      Object.assign(
        { id: '1:2', name: '화면', type: 'FRAME' },
        { width: 300, children: ['자식'] },
      ),
    ];
    publishSelection('summary');
    expect(postMessage.mock.calls[0][0].summary.nodes[0]).toEqual({
      id: '1:2',
      name: '화면',
      type: 'FRAME',
    });
  });
});
