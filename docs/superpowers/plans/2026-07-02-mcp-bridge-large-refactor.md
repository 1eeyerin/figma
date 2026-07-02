# MCP Bridge Large Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mcp-bridge`를 툴 등록, 프로토콜 계약, 데몬 HTTP/WS 처리, 데몬 프로세스 관리가 분리된 구조로 재작성합니다.

**Architecture:** 현재 `index.ts`, `ws-server.ts`, `ws-bridge.ts`에 섞인 책임을 `protocol/`, `tools/`, `mcp/`, `daemon/`, `client/`로 나눕니다. 이전 MCP 툴 구현과 내부 HTTP 계약은 호환되지 않아도 되며, 새 계약을 명시 타입과 테스트로 고정합니다.

**Tech Stack:** TypeScript 6, MCP SDK, zod, Node `http`, `child_process`, `ws`, Vitest

---

## 기준 문서

- `docs/architecture-principles.md`: 상태 배치, FSM 우선, 통신 프로토콜 선택, 감사 로그 기준
- `docs/architecture.md`: MCP 프로세스와 WS 데몬 분리 구조
- `docs/protocol.md`: MCP action과 canvas 메시지 타입 계약
- `docs/testing.md`: 테스트 제목 한글 규칙
- `docs/git-hooks.md`: 절대경로 금지, lint/format/build 훅
- `mcp-bridge/README.md`: 빌드와 실행 방식

## 현재 문제

- `mcp-bridge/src/index.ts`가 MCP 서버 생성, zod 스키마, 툴 설명, dispatch 포맷팅을 모두 담당합니다.
- `mcp-bridge/src/ws-server.ts`가 플러그인 WS 연결, pending 요청 저장소, HTTP 라우팅, CLI 진입점을 모두 담당합니다.
- `mcp-bridge/src/ws-bridge.ts`가 데몬 상태 조회, 데몬 spawn, HTTP 요청, 에러 문자열 해석을 모두 담당합니다.
- `BridgeMessage.payload`가 `Record<string, unknown>`이라 성공/실패 응답 타입이 약하고, `dispatch-format.ts`가 런타임 shape에 의존합니다.
- HTTP 내부 API가 `/send`, `/status` 두 엔드포인트 문자열에 흩어져 있어 계약 변경 시 테스트 외에는 보호 장치가 약합니다.

## 목표 파일 구조

```text
mcp-bridge/src/
├── index.ts
├── cli/
│   └── daemon.ts
├── client/
│   ├── daemon-client.ts
│   ├── daemon-client.test.ts
│   ├── daemon-process.ts
│   ├── daemon-process.test.ts
│   └── ws-bridge.ts
├── daemon/
│   ├── create-daemon.ts
│   ├── create-daemon.test.ts
│   ├── http-api.ts
│   ├── http-api.test.ts
│   ├── pending-store.ts
│   ├── pending-store.test.ts
│   ├── plugin-socket.ts
│   └── plugin-socket.test.ts
├── mcp/
│   ├── create-server.ts
│   ├── dispatch.ts
│   └── dispatch.test.ts
├── protocol/
│   ├── actions.ts
│   ├── bridge-message.ts
│   ├── daemon-http.ts
│   └── tool-result.ts
├── tools/
│   ├── register-tools.ts
│   ├── tool-definition.ts
│   ├── batch.ts
│   ├── create.ts
│   ├── hierarchy.ts
│   ├── read.ts
│   └── schemas.ts
├── errors.ts
└── logger.ts
```

## 리팩터링 규칙

- `index.ts`는 `createMcpServer()`, `WsBridge.start()`, stdio 연결만 수행합니다.
- `ws-server.ts`는 제거하고 `cli/daemon.ts`를 `dist/cli/daemon.js`로 실행합니다.
- `BridgeMessage`는 성공/실패 응답 payload를 구분 가능한 union 타입으로 바꿉니다.
- 데몬 내부 HTTP API는 `/v1/status`, `/v1/dispatch`로 변경합니다. 기존 `/status`, `/send` 호환은 제공하지 않습니다.
- 로그에는 `id`, `action`, `방향`, `성공 여부`를 남깁니다.
- `daemon/`은 MCP SDK를 import하지 않습니다.
- `tools/`는 HTTP, WS, child process를 import하지 않습니다.
- 테스트 제목은 모두 한글을 포함합니다.

---

### Task 1: 프로토콜 타입을 명시 union으로 교체

**Files:**
- Create: `mcp-bridge/src/protocol/actions.ts`
- Create: `mcp-bridge/src/protocol/bridge-message.ts`
- Create: `mcp-bridge/src/protocol/daemon-http.ts`
- Create: `mcp-bridge/src/protocol/tool-result.ts`
- Modify: `mcp-bridge/src/types.ts`
- Test: `mcp-bridge/src/protocol/bridge-message.test.ts`

- [ ] **Step 1: 프로토콜 테스트 작성**

```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/protocol/bridge-message.test.ts`

Expected: FAIL with module resolution errors for `./bridge-message`.

- [ ] **Step 3: 프로토콜 파일 추가**

```ts
// mcp-bridge/src/protocol/actions.ts
export const MCP_ACTIONS = [
  'create_rectangle',
  'create_text',
  'create_frame',
  'set_parent',
  'set_name',
  'remove_node',
  'get_node',
  'get_page',
  'export_node',
  'create_screen',
] as const;

export type McpAction = (typeof MCP_ACTIONS)[number];
```

```ts
// mcp-bridge/src/protocol/bridge-message.ts
import type { McpAction } from './actions.js';

export type BridgeMessageType = 'REQUEST' | 'RESPONSE' | 'EVENT';

export interface BridgeRequestMessage {
  id: string;
  type: 'REQUEST';
  action: McpAction;
  payload: Record<string, unknown>;
}

export interface BridgeEventMessage {
  id: string;
  type: 'EVENT';
  action: string;
  payload?: Record<string, unknown>;
}

export interface BridgeSuccessPayload {
  success: true;
  nodeId?: string;
  result?: unknown;
}

export interface BridgeFailurePayload {
  success: false;
  error: string;
}

export type BridgeResponsePayload = BridgeSuccessPayload | BridgeFailurePayload;

export interface BridgeResponseMessage {
  id: string;
  type: 'RESPONSE';
  action: McpAction;
  payload: BridgeResponsePayload;
}

export type BridgeMessage =
  | BridgeRequestMessage
  | BridgeResponseMessage
  | BridgeEventMessage;

export function isBridgeSuccess(
  payload: unknown,
): payload is BridgeSuccessPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    payload.success === true
  );
}

export function isBridgeFailure(
  payload: unknown,
): payload is BridgeFailurePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    payload.success === false &&
    'error' in payload &&
    typeof payload.error === 'string'
  );
}
```

```ts
// mcp-bridge/src/protocol/daemon-http.ts
import type { BridgeRequestMessage, BridgeResponseMessage } from './bridge-message.js';

export const DAEMON_HTTP = {
  statusPath: '/v1/status',
  dispatchPath: '/v1/dispatch',
  defaultTimeoutMs: 15000,
  startupTimeoutMs: 5000,
  startupPollMs: 200,
} as const;

export interface DaemonStatusResponse {
  pluginConnected: boolean;
}

export interface DaemonErrorResponse {
  error: string;
}

export type DaemonDispatchRequest = BridgeRequestMessage;
export type DaemonDispatchResponse = BridgeResponseMessage | DaemonErrorResponse;
```

```ts
// mcp-bridge/src/protocol/tool-result.ts
export type ToolTextResult = {
  [x: string]: unknown;
  content: [{ type: 'text'; text: string }];
  isError?: true;
};
```

```ts
// mcp-bridge/src/types.ts
export type {
  BridgeEventMessage,
  BridgeFailurePayload,
  BridgeMessage,
  BridgeRequestMessage,
  BridgeResponseMessage,
  BridgeResponsePayload,
  BridgeSuccessPayload,
} from './protocol/bridge-message.js';
```

- [ ] **Step 4: 테스트와 타입체크 실행**

Run:

```bash
pnpm --filter figma-bridge test -- src/protocol/bridge-message.test.ts
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: protocol test PASS. Typecheck may fail in existing files because `BridgeMessage.action` is now narrower; fix those in Task 2.

- [ ] **Step 5: Commit**

```bash
git add mcp-bridge/src/protocol mcp-bridge/src/types.ts
git commit -m "refactor(bridge): 프로토콜 타입 분리"
```

### Task 2: MCP 툴 정의를 레지스트리로 분리

**Files:**
- Create: `mcp-bridge/src/tools/tool-definition.ts`
- Create: `mcp-bridge/src/tools/schemas.ts`
- Create: `mcp-bridge/src/tools/create.ts`
- Create: `mcp-bridge/src/tools/hierarchy.ts`
- Create: `mcp-bridge/src/tools/read.ts`
- Create: `mcp-bridge/src/tools/batch.ts`
- Create: `mcp-bridge/src/tools/register-tools.ts`
- Modify: `mcp-bridge/src/index.ts`
- Test: `mcp-bridge/src/tools/register-tools.test.ts`

- [ ] **Step 1: 툴 등록 테스트 작성**

```ts
import { describe, expect, it, vi } from 'vitest';

import { registerTools } from './register-tools';

describe('registerTools (MCP 툴 등록)', () => {
  it('정의된 MCP 액션을 모두 서버에 등록한다', () => {
    const tool = vi.fn();
    const server = { tool };
    const dispatch = vi.fn();

    registerTools(server, dispatch);

    expect(tool).toHaveBeenCalledTimes(10);
    expect(tool.mock.calls.map((call) => call[0])).toEqual([
      'create_rectangle',
      'create_text',
      'create_frame',
      'set_parent',
      'set_name',
      'remove_node',
      'get_node',
      'get_page',
      'export_node',
      'create_screen',
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/tools/register-tools.test.ts`

Expected: FAIL with module resolution errors for `./register-tools`.

- [ ] **Step 3: 툴 타입과 공통 스키마 추가**

```ts
// mcp-bridge/src/tools/tool-definition.ts
import type { z } from 'zod';

import type { McpAction } from '../protocol/actions.js';
import type { ToolTextResult } from '../protocol/tool-result.js';

export type ToolDispatch = (
  action: McpAction,
  payload: Record<string, unknown>,
) => Promise<ToolTextResult>;

export interface ToolDefinition {
  name: McpAction;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
}

export interface ToolRegistrar {
  tool(
    name: string,
    description: string,
    schema: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<ToolTextResult>,
  ): void;
}
```

```ts
// mcp-bridge/src/tools/schemas.ts
import { z } from 'zod';

export const colorSchema = z
  .string()
  .optional()
  .describe('HEX 색상 (예: #FF5733) 또는 rgba (예: rgba(255,87,51,0.5))');

export const shadowSchema = z
  .object({
    type: z.enum(['DROP_SHADOW', 'INNER_SHADOW']).optional().default('DROP_SHADOW'),
    color: colorSchema,
    offsetX: z.number().optional().default(0),
    offsetY: z.number().optional().default(4),
    blur: z.number().optional().default(8),
    spread: z.number().optional().default(0),
    opacity: z.number().min(0).max(1).optional().default(1),
  })
  .optional();

export const strokeAlignSchema = z.enum(['INSIDE', 'OUTSIDE', 'CENTER']);
export const opacitySchema = z.number().min(0).max(1).optional();
export const nodeIdSchema = z.string().describe('노드 ID');
```

- [ ] **Step 4: 툴 정의 파일 추가**

`create.ts`, `hierarchy.ts`, `read.ts`, `batch.ts`는 기존 `index.ts`의 스키마를 그대로 옮기되, 배열 export만 제공합니다.

```ts
// mcp-bridge/src/tools/create.ts
import { z } from 'zod';

import type { ToolDefinition } from './tool-definition.js';
import { colorSchema, opacitySchema, shadowSchema, strokeAlignSchema } from './schemas.js';

export const createToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_rectangle',
    description: 'Figma 캔버스에 사각형을 생성합니다',
    schema: {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: colorSchema,
      opacity: opacitySchema.describe('전체 불투명도 (0~1)'),
      cornerRadius: z.number().optional().describe('모서리 반경 (전체)'),
      cornerRadii: z
        .tuple([z.number(), z.number(), z.number(), z.number()])
        .optional()
        .describe('[topLeft, topRight, bottomRight, bottomLeft] 개별 모서리 반경'),
      strokeColor: colorSchema,
      strokeWeight: z.number().optional().describe('선 두께'),
      strokeAlign: strokeAlignSchema.optional().describe('선 정렬'),
      shadow: shadowSchema,
      blur: z.number().optional().describe('배경 블러 반경'),
      parentId: z.string().optional().describe('부모 노드 ID'),
      name: z.string().optional().describe('노드 이름'),
    },
  },
  {
    name: 'create_text',
    description: 'Figma 캔버스에 텍스트를 생성합니다',
    schema: {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      content: z.string().describe('텍스트 내용'),
      fontSize: z.number().optional().describe('폰트 크기 (px)'),
      fontFamily: z.string().optional().describe('폰트 패밀리'),
      fontWeight: z
        .enum(['Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'])
        .optional()
        .describe('폰트 굵기'),
      color: colorSchema,
      opacity: opacitySchema.describe('전체 불투명도 (0~1)'),
      textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional().describe('텍스트 정렬'),
      lineHeight: z
        .union([
          z.object({ value: z.number(), unit: z.enum(['PIXELS', 'PERCENT']) }),
          z.literal('AUTO'),
        ])
        .optional()
        .describe('줄 높이'),
      letterSpacing: z.number().optional().describe('자간 (px)'),
      width: z.number().optional().describe('텍스트 박스 너비'),
      autoResize: z.enum(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE']).optional().describe('자동 크기 조정'),
      parentId: z.string().optional().describe('부모 노드 ID'),
      name: z.string().optional().describe('노드 이름'),
    },
  },
  {
    name: 'create_frame',
    description: 'Figma 캔버스에 프레임을 생성합니다',
    schema: {
      name: z.string().describe('프레임 이름'),
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().describe('너비'),
      height: z.number().describe('높이'),
      color: colorSchema,
      opacity: opacitySchema.describe('전체 불투명도 (0~1)'),
      cornerRadius: z.number().optional().describe('모서리 반경'),
      layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).optional().describe('Auto Layout 방향'),
      primaryAxisSizing: z.enum(['FIXED', 'AUTO']).optional().describe('주축 크기 조정'),
      counterAxisSizing: z.enum(['FIXED', 'AUTO']).optional().describe('교차축 크기 조정'),
      itemSpacing: z.number().optional().describe('자식 간 간격'),
      paddingTop: z.number().optional(),
      paddingRight: z.number().optional(),
      paddingBottom: z.number().optional(),
      paddingLeft: z.number().optional(),
      strokeColor: colorSchema,
      strokeWeight: z.number().optional(),
      strokeAlign: strokeAlignSchema.optional(),
      shadow: shadowSchema,
      clipContent: z.boolean().optional().describe('내용 잘라내기'),
      parentId: z.string().optional().describe('부모 노드 ID'),
    },
  },
];
```

```ts
// mcp-bridge/src/tools/hierarchy.ts
import { z } from 'zod';

import type { ToolDefinition } from './tool-definition.js';

export const hierarchyToolDefinitions: ToolDefinition[] = [
  {
    name: 'set_parent',
    description: '노드를 다른 부모로 이동합니다',
    schema: {
      nodeId: z.string().describe('이동할 노드 ID'),
      parentId: z.string().describe('새 부모 노드 ID'),
      index: z.number().optional().describe('삽입 위치'),
    },
  },
  {
    name: 'set_name',
    description: '노드 이름을 변경합니다',
    schema: {
      nodeId: z.string().describe('노드 ID'),
      name: z.string().describe('새 이름'),
    },
  },
  {
    name: 'remove_node',
    description: '노드를 삭제합니다',
    schema: {
      nodeId: z.string().describe('삭제할 노드 ID'),
    },
  },
];
```

```ts
// mcp-bridge/src/tools/read.ts
import { z } from 'zod';

import type { ToolDefinition } from './tool-definition.js';

export const readToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_node',
    description: '노드의 속성을 조회합니다',
    schema: {
      nodeId: z.string().optional().describe('노드 ID'),
    },
  },
  {
    name: 'get_page',
    description: '현재 페이지의 최상위 노드 목록을 반환합니다',
    schema: {},
  },
  {
    name: 'export_node',
    description: '노드를 PNG로 내보내고 base64를 반환합니다',
    schema: {
      nodeId: z.string().optional().describe('노드 ID'),
      scale: z.number().optional().default(1).describe('배율'),
    },
  },
];
```

```ts
// mcp-bridge/src/tools/batch.ts
import { z } from 'zod';

import type { ToolDefinition } from './tool-definition.js';

export const batchToolDefinitions: ToolDefinition[] = [
  {
    name: 'create_screen',
    description: '노드 트리를 한 번에 생성합니다',
    schema: {
      tree: z.record(z.string(), z.unknown()).describe('노드 트리 JSON'),
      parentId: z.string().optional().describe('루트 노드를 붙일 부모 ID'),
    },
  },
];
```

- [ ] **Step 5: registerTools 구현**

```ts
// mcp-bridge/src/tools/register-tools.ts
import { batchToolDefinitions } from './batch.js';
import { createToolDefinitions } from './create.js';
import { hierarchyToolDefinitions } from './hierarchy.js';
import { readToolDefinitions } from './read.js';
import type { ToolDispatch, ToolRegistrar } from './tool-definition.js';

export const toolDefinitions = [
  ...createToolDefinitions,
  ...hierarchyToolDefinitions,
  ...readToolDefinitions,
  ...batchToolDefinitions,
];

export function registerTools(
  server: ToolRegistrar,
  dispatch: ToolDispatch,
): void {
  for (const definition of toolDefinitions) {
    server.tool(
      definition.name,
      definition.description,
      definition.schema,
      (args) => dispatch(definition.name, args),
    );
  }
}
```

- [ ] **Step 6: `index.ts`를 얇게 수정**

`index.ts`는 `McpServer`, `StdioServerTransport`, `registerTools`, `createDispatch`, `WsBridge`만 조립하도록 줄입니다. 기존 inline zod 스키마와 `server.tool(...)` 블록은 제거합니다.

- [ ] **Step 7: 검증**

Run:

```bash
pnpm --filter figma-bridge test -- src/tools/register-tools.test.ts
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add mcp-bridge/src/index.ts mcp-bridge/src/tools
git commit -m "refactor(bridge): MCP 툴 정의 분리"
```

### Task 3: dispatch 포맷팅을 MCP 레이어로 이동

**Files:**
- Create: `mcp-bridge/src/mcp/dispatch.ts`
- Create: `mcp-bridge/src/mcp/dispatch.test.ts`
- Modify: `mcp-bridge/src/dispatch-format.ts`
- Modify: `mcp-bridge/src/index.ts`
- Delete after migration: `mcp-bridge/src/dispatch-format.ts`
- Delete after migration: `mcp-bridge/src/dispatch-format.test.ts`

- [ ] **Step 1: dispatch 테스트 작성**

```ts
import { describe, expect, it, vi } from 'vitest';

import { createDispatch } from './dispatch';

describe('createDispatch (MCP 디스패치)', () => {
  it('브릿지 성공 응답을 텍스트 결과로 변환한다', async () => {
    const bridge = {
      sendAndWait: vi.fn().mockResolvedValue({
        id: 'id-1',
        type: 'RESPONSE',
        action: 'create_rectangle',
        payload: { success: true, nodeId: 'rect-1' },
      }),
    };

    const dispatch = createDispatch(bridge);
    const result = await dispatch('create_rectangle', { width: 10 });

    expect(result).toEqual({ content: [{ type: 'text', text: 'nodeId: rect-1' }] });
  });

  it('플러그인 미연결 에러를 사용자 안내 문구로 변환한다', async () => {
    const bridge = {
      sendAndWait: vi.fn().mockRejectedValue(new Error('plugin not connected')),
    };

    const dispatch = createDispatch(bridge);
    const result = await dispatch('create_rectangle', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Figma 플러그인이 연결되지 않았습니다');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/mcp/dispatch.test.ts`

Expected: FAIL with module resolution errors for `./dispatch`.

- [ ] **Step 3: dispatch 구현**

```ts
// mcp-bridge/src/mcp/dispatch.ts
import type { McpAction } from '../protocol/actions.js';
import type { BridgeResponseMessage, BridgeSuccessPayload } from '../protocol/bridge-message.js';
import { isBridgeFailure, isBridgeSuccess } from '../protocol/bridge-message.js';
import type { ToolTextResult } from '../protocol/tool-result.js';

export interface DispatchBridge {
  sendAndWait(
    action: McpAction,
    payload: Record<string, unknown>,
  ): Promise<BridgeResponseMessage>;
}

function textResult(text: string, isError?: true): ToolTextResult {
  return isError
    ? { content: [{ type: 'text', text }], isError }
    : { content: [{ type: 'text', text }] };
}

function formatSuccess(payload: BridgeSuccessPayload): ToolTextResult {
  const parts: string[] = [];
  if (payload.nodeId) parts.push(`nodeId: ${payload.nodeId}`);
  if (payload.result) parts.push(JSON.stringify(payload.result, null, 2));
  return textResult(parts.length ? parts.join('\n') : '완료');
}

export function createDispatch(bridge: DispatchBridge) {
  return async (
    action: McpAction,
    payload: Record<string, unknown>,
  ): Promise<ToolTextResult> => {
    try {
      const response = await bridge.sendAndWait(action, payload);
      if (isBridgeSuccess(response.payload)) return formatSuccess(response.payload);
      if (isBridgeFailure(response.payload)) {
        return textResult(`오류: ${response.payload.error}`, true);
      }
      return textResult('오류: 응답 payload 형식이 올바르지 않습니다', true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('plugin not connected')) {
        return textResult('Figma 플러그인이 연결되지 않았습니다. Figma에서 플러그인을 실행해 주세요.', true);
      }
      return textResult(`오류: ${message}`, true);
    }
  };
}
```

- [ ] **Step 4: 기존 파일 제거**

`index.ts` import를 `createDispatch`로 바꾸고 `dispatch-format.ts`, `dispatch-format.test.ts`를 삭제합니다.

- [ ] **Step 5: 검증**

Run:

```bash
pnpm --filter figma-bridge test -- src/mcp/dispatch.test.ts
pnpm --filter figma-bridge test
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mcp-bridge/src
git commit -m "refactor(bridge): MCP 디스패치 분리"
```

### Task 4: 데몬 pending 요청 저장소 분리

**Files:**
- Create: `mcp-bridge/src/daemon/pending-store.ts`
- Create: `mcp-bridge/src/daemon/pending-store.test.ts`
- Modify later: `mcp-bridge/src/daemon/create-daemon.ts`

- [ ] **Step 1: pending store 테스트 작성**

```ts
import { describe, expect, it, vi } from 'vitest';

import { PendingRequestStore } from './pending-store';

describe('PendingRequestStore (대기 요청 저장소)', () => {
  it('id로 대기 요청을 완료하고 저장소에서 제거한다', () => {
    const store = new PendingRequestStore();
    const onTimeout = vi.fn();
    const resolve = vi.fn();

    store.add('id-1', { action: 'create_rectangle', timeoutMs: 1000, resolve, onTimeout });
    const completed = store.resolve('id-1', {
      id: 'id-1',
      type: 'RESPONSE',
      action: 'create_rectangle',
      payload: { success: true },
    });

    expect(completed).toBe(true);
    expect(resolve).toHaveBeenCalledOnce();
    expect(store.size).toBe(0);
  });

  it('알 수 없는 id 응답은 false를 반환한다', () => {
    const store = new PendingRequestStore();

    expect(
      store.resolve('missing', {
        id: 'missing',
        type: 'RESPONSE',
        action: 'create_rectangle',
        payload: { success: true },
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/daemon/pending-store.test.ts`

Expected: FAIL with module resolution errors for `./pending-store`.

- [ ] **Step 3: pending store 구현**

```ts
// mcp-bridge/src/daemon/pending-store.ts
import type { McpAction } from '../protocol/actions.js';
import type { BridgeResponseMessage } from '../protocol/bridge-message.js';

interface PendingRequest {
  action: McpAction;
  timeoutMs: number;
  resolve: (message: BridgeResponseMessage) => void;
  onTimeout: () => void;
}

interface PendingEntry extends PendingRequest {
  timer: NodeJS.Timeout;
}

export class PendingRequestStore {
  private readonly entries = new Map<string, PendingEntry>();

  get size(): number {
    return this.entries.size;
  }

  add(id: string, request: PendingRequest): void {
    const timer = setTimeout(() => {
      this.entries.delete(id);
      request.onTimeout();
    }, request.timeoutMs);

    this.entries.set(id, { ...request, timer });
  }

  resolve(id: string, message: BridgeResponseMessage): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.entries.delete(id);
    entry.resolve(message);
    return true;
  }

  clear(): void {
    for (const entry of this.entries.values()) clearTimeout(entry.timer);
    this.entries.clear();
  }
}
```

- [ ] **Step 4: 검증**

Run:

```bash
pnpm --filter figma-bridge test -- src/daemon/pending-store.test.ts
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-bridge/src/daemon/pending-store.ts mcp-bridge/src/daemon/pending-store.test.ts
git commit -m "refactor(bridge): 데몬 대기 요청 저장소 분리"
```

### Task 5: 플러그인 WebSocket 연결 객체 분리

**Files:**
- Create: `mcp-bridge/src/daemon/plugin-socket.ts`
- Create: `mcp-bridge/src/daemon/plugin-socket.test.ts`
- Modify later: `mcp-bridge/src/daemon/create-daemon.ts`

- [ ] **Step 1: 연결 객체 테스트 작성**

```ts
import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import { PluginSocket } from './plugin-socket';

describe('PluginSocket (플러그인 연결 관리)', () => {
  it('마지막 연결된 소켓만 현재 연결로 유지한다', () => {
    const first = new EventEmitter() as WebSocket;
    const second = new EventEmitter() as WebSocket;
    Object.defineProperty(first, 'readyState', { value: WebSocket.OPEN });
    Object.defineProperty(second, 'readyState', { value: WebSocket.OPEN });

    const plugin = new PluginSocket();
    plugin.attach(first);
    plugin.attach(second);

    expect(plugin.isConnected()).toBe(true);
    expect(plugin.current).toBe(second);
  });

  it('열린 소켓이 없으면 send가 false를 반환한다', () => {
    const plugin = new PluginSocket();

    expect(plugin.send({ id: 'id-1', type: 'REQUEST', action: 'get_page', payload: {} })).toBe(false);
  });

  it('열린 소켓에는 JSON 메시지를 전송한다', () => {
    const socket = new EventEmitter() as WebSocket & { send: ReturnType<typeof vi.fn> };
    Object.defineProperty(socket, 'readyState', { value: WebSocket.OPEN });
    socket.send = vi.fn();

    const plugin = new PluginSocket();
    plugin.attach(socket);

    expect(plugin.send({ id: 'id-1', type: 'REQUEST', action: 'get_page', payload: {} })).toBe(true);
    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining('"action":"get_page"'));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/daemon/plugin-socket.test.ts`

Expected: FAIL with module resolution errors for `./plugin-socket`.

- [ ] **Step 3: PluginSocket 구현**

```ts
// mcp-bridge/src/daemon/plugin-socket.ts
import { WebSocket } from 'ws';

import type { BridgeRequestMessage } from '../protocol/bridge-message.js';

export class PluginSocket {
  private socket: WebSocket | null = null;

  get current(): WebSocket | null {
    return this.socket;
  }

  attach(socket: WebSocket): void {
    this.socket = socket;
    socket.on('close', () => {
      if (this.socket === socket) this.socket = null;
    });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(message: BridgeRequestMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  detach(): void {
    this.socket = null;
  }
}
```

- [ ] **Step 4: 검증**

Run:

```bash
pnpm --filter figma-bridge test -- src/daemon/plugin-socket.test.ts
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-bridge/src/daemon/plugin-socket.ts mcp-bridge/src/daemon/plugin-socket.test.ts
git commit -m "refactor(bridge): 플러그인 소켓 관리 분리"
```

### Task 6: 데몬 HTTP API와 WS 서버 조립

**Files:**
- Create: `mcp-bridge/src/daemon/http-api.ts`
- Create: `mcp-bridge/src/daemon/http-api.test.ts`
- Create: `mcp-bridge/src/daemon/create-daemon.ts`
- Rename: `mcp-bridge/src/ws-server.test.ts` -> `mcp-bridge/src/daemon/create-daemon.test.ts`
- Modify: `mcp-bridge/src/ws-server.ts`
- Create: `mcp-bridge/src/cli/daemon.ts`

- [ ] **Step 1: HTTP API 테스트 작성**

```ts
import { describe, expect, it, vi } from 'vitest';

import { createHttpHandler } from './http-api';
import { PluginSocket } from './plugin-socket';
import { PendingRequestStore } from './pending-store';

describe('createHttpHandler (데몬 HTTP API)', () => {
  it('/v1/status는 플러그인 연결 상태를 반환한다', async () => {
    const plugin = new PluginSocket();
    const pending = new PendingRequestStore();
    const handler = createHttpHandler({ plugin, pending });

    const response = await handler({ method: 'GET', path: '/v1/status', body: '' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ pluginConnected: false });
  });

  it('플러그인 미연결 상태의 /v1/dispatch는 503을 반환한다', async () => {
    const plugin = new PluginSocket();
    const pending = new PendingRequestStore();
    const handler = createHttpHandler({ plugin, pending });

    const response = await handler({
      method: 'POST',
      path: '/v1/dispatch',
      body: JSON.stringify({ id: 'id-1', type: 'REQUEST', action: 'get_page', payload: {} }),
    });

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'plugin not connected' });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/daemon/http-api.test.ts`

Expected: FAIL with module resolution errors for `./http-api`.

- [ ] **Step 3: HTTP handler 구현**

```ts
// mcp-bridge/src/daemon/http-api.ts
import { DAEMON_HTTP } from '../protocol/daemon-http.js';
import type { BridgeRequestMessage, BridgeResponseMessage } from '../protocol/bridge-message.js';
import type { PendingRequestStore } from './pending-store.js';
import type { PluginSocket } from './plugin-socket.js';

export interface HttpHandlerRequest {
  method: string;
  path: string;
  body: string;
  timeoutMs?: number;
}

export interface HttpHandlerResponse {
  statusCode: number;
  body: string;
}

export function createHttpHandler(deps: {
  plugin: PluginSocket;
  pending: PendingRequestStore;
}) {
  return async (request: HttpHandlerRequest): Promise<HttpHandlerResponse> => {
    if (request.method === 'GET' && request.path === DAEMON_HTTP.statusPath) {
      return {
        statusCode: 200,
        body: JSON.stringify({ pluginConnected: deps.plugin.isConnected() }),
      };
    }

    if (request.method === 'POST' && request.path === DAEMON_HTTP.dispatchPath) {
      let message: BridgeRequestMessage;
      try {
        message = JSON.parse(request.body) as BridgeRequestMessage;
      } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'invalid json' }) };
      }

      if (!deps.plugin.isConnected()) {
        return { statusCode: 503, body: JSON.stringify({ error: 'plugin not connected' }) };
      }

      return new Promise((resolve) => {
        const timeoutMs = request.timeoutMs ?? DAEMON_HTTP.defaultTimeoutMs;
        deps.pending.add(message.id, {
          action: message.action,
          timeoutMs,
          resolve: (response: BridgeResponseMessage) => {
            resolve({ statusCode: 200, body: JSON.stringify(response) });
          },
          onTimeout: () => {
            resolve({
              statusCode: 504,
              body: JSON.stringify({ error: `timeout after ${timeoutMs}ms` }),
            });
          },
        });

        const sent = deps.plugin.send(message);
        if (!sent) {
          deps.pending.resolve(message.id, {
            id: message.id,
            type: 'RESPONSE',
            action: message.action,
            payload: { success: false, error: 'plugin not connected' },
          });
        }
      });
    }

    return { statusCode: 404, body: '' };
  };
}
```

- [ ] **Step 4: create-daemon 구현**

`create-daemon.ts`에서 `WebSocketServer`, Node HTTP server, `PluginSocket`, `PendingRequestStore`, `createHttpHandler`를 조립합니다. 기존 `ws-server.test.ts`의 실제 WS/HTTP 통합 테스트를 `/v1/status`, `/v1/dispatch` 경로에 맞춰 `create-daemon.test.ts`로 이동합니다.

- [ ] **Step 5: CLI 진입점 추가**

```ts
// mcp-bridge/src/cli/daemon.ts
import { createBridgeDaemon } from '../daemon/create-daemon.js';

const daemon = createBridgeDaemon({
  wsPort: Number(process.env.WS_PORT ?? 8765),
  httpPort: Number(process.env.HTTP_PORT ?? 8766),
});

process.on('SIGTERM', () => {
  daemon.close();
  process.exit(0);
});
```

`ws-server.ts`는 임시 호환 export만 남깁니다.

```ts
export { createBridgeDaemon } from './daemon/create-daemon.js';
export type { BridgeDaemon, BridgeDaemonOptions } from './daemon/create-daemon.js';
```

- [ ] **Step 6: 검증**

Run:

```bash
pnpm --filter figma-bridge test -- src/daemon/http-api.test.ts
pnpm --filter figma-bridge test -- src/daemon/create-daemon.test.ts
pnpm --filter figma-bridge test
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add mcp-bridge/src/daemon mcp-bridge/src/cli mcp-bridge/src/ws-server.ts
git rm mcp-bridge/src/ws-server.test.ts
git commit -m "refactor(bridge): 데몬 HTTP와 WS 조립 분리"
```

### Task 7: MCP 클라이언트와 데몬 프로세스 관리 분리

**Files:**
- Create: `mcp-bridge/src/client/daemon-client.ts`
- Create: `mcp-bridge/src/client/daemon-client.test.ts`
- Create: `mcp-bridge/src/client/daemon-process.ts`
- Create: `mcp-bridge/src/client/daemon-process.test.ts`
- Create: `mcp-bridge/src/client/ws-bridge.ts`
- Modify: `mcp-bridge/src/ws-bridge.ts`
- Modify: `mcp-bridge/src/ws-bridge.test.ts`
- Modify: `mcp-bridge/package.json`

- [ ] **Step 1: daemon client 테스트 작성**

```ts
import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

import { DaemonClient } from './daemon-client';

function fakeRequest() {
  const req = new EventEmitter() as EventEmitter & {
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    setTimeout: ReturnType<typeof vi.fn>;
  };
  req.write = vi.fn();
  req.end = vi.fn();
  req.destroy = vi.fn();
  req.setTimeout = vi.fn();
  return req;
}

describe('DaemonClient (데몬 HTTP 클라이언트)', () => {
  it('/v1/status 응답을 파싱한다', async () => {
    const httpGet = vi.fn((_url: string, cb: any) => {
      const req = fakeRequest();
      const res = new EventEmitter() as EventEmitter & { statusCode: number };
      res.statusCode = 200;
      cb(res);
      queueMicrotask(() => {
        res.emit('data', JSON.stringify({ pluginConnected: true }));
        res.emit('end');
      });
      return req as any;
    });

    const client = new DaemonClient({ httpGet, httpRequest: vi.fn() as any, httpPort: 8766 });

    await expect(client.getStatus()).resolves.toEqual({ pluginConnected: true });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter figma-bridge test -- src/client/daemon-client.test.ts`

Expected: FAIL with module resolution errors for `./daemon-client`.

- [ ] **Step 3: DaemonClient 구현**

`ws-bridge.ts`의 `getStatus()`와 `sendAndWait()` HTTP 로직을 `DaemonClient`로 이동하고, 경로는 `DAEMON_HTTP.statusPath`, `DAEMON_HTTP.dispatchPath`만 사용합니다.

- [ ] **Step 4: DaemonProcess 구현**

`ws-bridge.ts`의 `existsSync`, `spawn`, startup polling을 `DaemonProcess`로 이동합니다. 데몬 스크립트 기본값은 `path.resolve(__dirname, 'cli/daemon.js')`입니다.

- [ ] **Step 5: WsBridge facade 구현**

```ts
// mcp-bridge/src/client/ws-bridge.ts
import { DaemonClient } from './daemon-client.js';
import { DaemonProcess } from './daemon-process.js';
import type { McpAction } from '../protocol/actions.js';
import type { BridgeResponseMessage } from '../protocol/bridge-message.js';

export class WsBridge {
  constructor(
    private readonly client = new DaemonClient(),
    private readonly process = new DaemonProcess(client),
  ) {}

  async start(): Promise<void> {
    const alive = await this.process.isAlive();
    if (alive) return;
    await this.process.ensureStarted();
  }

  sendAndWait(
    action: McpAction,
    payload: Record<string, unknown>,
    timeout?: number,
  ): Promise<BridgeResponseMessage> {
    return this.client.dispatch(action, payload, timeout);
  }

  async isPluginConnected(): Promise<boolean> {
    try {
      const status = await this.client.getStatus();
      return status.pluginConnected;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.process.stop();
  }
}
```

기존 `mcp-bridge/src/ws-bridge.ts`는 export 호환 파일로 축소합니다.

```ts
export { WsBridge } from './client/ws-bridge.js';
```

- [ ] **Step 6: package script 수정**

`mcp-bridge/package.json`:

```json
{
  "scripts": {
    "start:daemon": "node dist/cli/daemon.js"
  }
}
```

- [ ] **Step 7: 검증**

Run:

```bash
pnpm --filter figma-bridge test -- src/client/daemon-client.test.ts
pnpm --filter figma-bridge test -- src/client/daemon-process.test.ts
pnpm --filter figma-bridge test -- src/ws-bridge.test.ts
pnpm --filter figma-bridge test
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add mcp-bridge/src/client mcp-bridge/src/ws-bridge.ts mcp-bridge/src/ws-bridge.test.ts mcp-bridge/package.json
git commit -m "refactor(bridge): 데몬 클라이언트와 프로세스 관리 분리"
```

### Task 8: 로깅과 에러 타입 정리

**Files:**
- Create: `mcp-bridge/src/logger.ts`
- Create: `mcp-bridge/src/errors.ts`
- Modify: `mcp-bridge/src/client/daemon-client.ts`
- Modify: `mcp-bridge/src/client/daemon-process.ts`
- Modify: `mcp-bridge/src/daemon/create-daemon.ts`
- Modify: `mcp-bridge/src/mcp/dispatch.ts`

- [ ] **Step 1: 에러 타입 추가**

```ts
// mcp-bridge/src/errors.ts
export class BridgeError extends Error {
  constructor(
    message: string,
    readonly code: 'DAEMON_UNREACHABLE' | 'PLUGIN_NOT_CONNECTED' | 'TIMEOUT' | 'BAD_RESPONSE',
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}
```

- [ ] **Step 2: logger 추가**

```ts
// mcp-bridge/src/logger.ts
export interface LogContext {
  id?: string;
  action?: string;
  direction?: 'mcp->daemon' | 'daemon->plugin' | 'plugin->daemon' | 'daemon->mcp';
  success?: boolean;
}

export function log(message: string, context: LogContext = {}): void {
  const suffix = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  console.error(suffix ? `[figma-bridge] ${message} ${suffix}` : `[figma-bridge] ${message}`);
}
```

- [ ] **Step 3: 문자열 에러 분기 교체**

`mcp/dispatch.ts`는 `BridgeError.code === 'PLUGIN_NOT_CONNECTED'`로 안내 문구를 고릅니다. `DaemonClient`는 503을 `BridgeError('plugin not connected', 'PLUGIN_NOT_CONNECTED')`, 504를 `BridgeError(..., 'TIMEOUT')`로 변환합니다.

- [ ] **Step 4: 검증**

Run:

```bash
pnpm --filter figma-bridge test
tsc -p mcp-bridge/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp-bridge/src/logger.ts mcp-bridge/src/errors.ts mcp-bridge/src
git commit -m "refactor(bridge): 에러와 로그 형식 정리"
```

### Task 9: 구 호환 파일 제거와 문서 갱신

**Files:**
- Delete: `mcp-bridge/src/ws-server.ts`
- Delete if fully replaced: `mcp-bridge/src/ws-bridge.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/protocol.md`
- Modify: `mcp-bridge/README.md`

- [ ] **Step 1: import 사용처 확인**

Run:

```bash
rg "from './ws-server|from './ws-bridge|ws-server.js|/send|/status" mcp-bridge docs
```

Expected: only migration references in this plan or no results outside docs being updated.

- [ ] **Step 2: 구 파일 제거**

`index.ts`가 `./client/ws-bridge.js`를 직접 import하도록 바꾸고, 구 `ws-server.ts`, `ws-bridge.ts`를 제거합니다.

- [ ] **Step 3: 문서 갱신**

`docs/architecture.md`의 `mcp-bridge` 설명을 새 경로로 교체합니다.

```text
MCP 프로세스 (mcp-bridge/src/index.ts, mcp/create-server.ts)
  │  HTTP (POST /v1/dispatch, GET /v1/status — http://localhost:8766)
  ▼
WS 데몬 (mcp-bridge/src/cli/daemon.ts, daemon/create-daemon.ts)
```

`docs/protocol.md`에 내부 HTTP API 경로를 명시합니다.

```text
MCP 프로세스 ↔ WS 데몬 내부 HTTP API:
- GET /v1/status → { pluginConnected: boolean }
- POST /v1/dispatch?timeout=15000 → BridgeRequestMessage를 받고 BridgeResponseMessage를 반환
```

`mcp-bridge/README.md`의 daemon 실행 명령을 `npm run start:daemon`과 `dist/cli/daemon.js` 기준으로 수정합니다.

- [ ] **Step 4: 검증**

Run:

```bash
pnpm --filter figma-bridge test
tsc -p mcp-bridge/tsconfig.json --noEmit
pnpm run lint
pnpm run format:check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md docs/protocol.md mcp-bridge/README.md mcp-bridge/src mcp-bridge/package.json
git commit -m "docs(bridge): 리팩터링 구조 문서화"
```

### Task 10: 최종 검증과 호환성 메모

**Files:**
- Modify: `docs/protocol.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: 전체 테스트**

Run:

```bash
pnpm --filter figma-bridge test
pnpm run test
tsc -p mcp-bridge/tsconfig.json --noEmit
tsc -p figma-plugin/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 2: 빌드**

Run:

```bash
pnpm --filter figma-bridge build
```

Expected: PASS and `mcp-bridge/dist/cli/daemon.js` exists.

- [ ] **Step 3: 불호환 변경 기록**

`docs/protocol.md`에 아래 항목을 추가합니다.

```text
## 호환되지 않는 변경

- 데몬 HTTP API가 `/status`, `/send`에서 `/v1/status`, `/v1/dispatch`로 변경되었다.
- MCP 브릿지 프로세스가 실행하는 데몬 엔트리포인트가 `dist/ws-server.js`에서 `dist/cli/daemon.js`로 변경되었다.
- `BridgeMessage.payload`는 성공/실패 union 타입으로 해석한다.
```

- [ ] **Step 4: 최종 검색**

Run:

```bash
pnpm run lint
pnpm run format:check
rg "ws-server.js|/send|/status" mcp-bridge docs
```

Expected: lint and format checks PASS. Stale `/send`, legacy `/status`, and `ws-server.js` implementation references do not appear outside migration notes.

- [ ] **Step 5: Commit**

```bash
git add docs mcp-bridge
git commit -m "chore(bridge): 리팩터링 최종 검증"
```

---

## 실행 순서 요약

1. 프로토콜 타입을 먼저 고정합니다.
2. 툴 정의를 레지스트리로 빼서 `index.ts`를 얇게 만듭니다.
3. MCP dispatch 포맷팅을 `mcp/`로 이동합니다.
4. 데몬 pending 저장소와 플러그인 소켓 상태를 분리합니다.
5. HTTP API와 WS 서버 조립을 `daemon/`으로 이동합니다.
6. MCP 프로세스의 데몬 클라이언트와 프로세스 관리를 `client/`로 분리합니다.
7. 에러와 로그 형식을 표준화합니다.
8. 구 호환 파일과 문서를 정리합니다.

## 위험과 대응

- `dist/cli/daemon.js` 경로 변경으로 설치된 Codex/Claude 플러그인 매니페스트가 깨질 수 있습니다. 실행 전에 `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, 설치 스크립트가 `mcp-bridge/dist/index.js`만 참조하는지 확인합니다.
- 내부 HTTP 경로 변경은 실행 중인 구 데몬과 호환되지 않습니다. 리팩터링 배포 후에는 기존 데몬 프로세스를 종료하고 새 데몬을 시작해야 합니다.
- `BridgeMessage.action`을 `McpAction`으로 좁히면 테스트 fake 객체에서 타입 오류가 늘 수 있습니다. 테스트 데이터는 `action: 'get_page'`처럼 실제 action만 사용합니다.
- `ws-server.ts` 삭제는 외부 import가 남아 있으면 빌드 실패로 드러납니다. Task 9의 `rg`와 `tsc`로 확인합니다.

## 자체 검토

- 문서 요구사항 반영: 상태 Source of Truth는 데몬의 `PluginSocket`과 `PendingRequestStore`로 분리했고, in-flight 요청은 계속 `BridgeMessage.id`로 추적합니다.
- 통신 프로토콜 반영: stdio, HTTP, WebSocket 역할은 유지하되 내부 HTTP 경로만 버전이 붙은 계약으로 바꿉니다.
- 테스트 규칙 반영: 모든 예시 테스트 제목에 한글을 포함했습니다.
- 절대경로 규칙 반영: 계획과 코드 예시는 프로젝트 루트 기준 상대경로만 사용합니다.
