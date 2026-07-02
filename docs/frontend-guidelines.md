# 프론트엔드 설계 지침

이 문서는 이 레포의 TypeScript/Preact 코드 전반에 적용하는 설계 원칙이다.

## 가독성

### 매직 넘버는 상수로

```typescript
const RECONNECT_DELAY_MS = 1000;
const MAX_RETRY_COUNT = 5;

async function reconnect() {
  await delay(RECONNECT_DELAY_MS);
}
```

### 복잡한 조건은 변수로 명명

```typescript
const isRootNode = !node.parent || node.parent.type === 'PAGE';
const hasChildren = 'children' in node && node.children.length > 0;

if (isRootNode && hasChildren) {
  // ...
}
```

### 복잡한 삼항 연산자는 if/else로

중첩 삼항은 IIFE나 if/else로 풀어 위에서 아래로 읽히게 한다.

```typescript
const state = (() => {
  if (isConnecting) return 'connecting';
  if (isConnected) return 'connected';
  return 'disconnected';
})();
```

### 분기가 크게 다르면 별도 컴포넌트로

```tsx
function StatusBadge({ state }: { state: ConnectionState }) {
  if (state === 'connected') return <ConnectedBadge />;
  if (state === 'connecting') return <ConnectingBadge />;
  return <DisconnectedBadge />;
}
```

## 예측 가능성

### 반환 타입 통일 — Discriminated Union

이 레포의 액션 응답은 이미 `{ success: true, ... } | { success: false, error: string }` 구조를 따른다. 신규 함수도 같은 패턴을 쓴다.

```typescript
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function validateNodeId(id: string): ActionResult<string> {
  if (!id.trim()) return { success: false, error: '노드 ID가 비어 있습니다' };
  return { success: true, data: id };
}
```

### 함수는 이름이 암시하는 것만 한다 (SRP)

```typescript
// 조회만 한다 — 로그·알림은 호출자 몫
function getNodeById(id: string): SceneNode | null {
  return figma.getNodeById(id) as SceneNode | null;
}

// 호출자가 명시적으로 처리
async function handleGetNode(msg: Msg) {
  const node = getNodeById(msg.nodeId);
  if (!node) {
    figma.notify('노드를 찾을 수 없습니다', { error: true });
    return;
  }
  // ...
}
```

## 선언적 코드

"무엇을 한다"는 의도만 드러내고, 내부 제어 흐름은 추상화 안으로 숨긴다.

### 상태 관리를 호출자에서 분리한다

```tsx
// 명령형 — 상태를 직접 다룸
const [isSheetOpen, setIsSheetOpen] = useState(false);
<button onClick={() => setIsSheetOpen(true)}>열기</button>
<BottomSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />

// 선언적 — 열기 동작만 선언
const overlay = useOverlay();
<button onClick={() => overlay.open(({ close }) => <BottomSheet onClose={close} />)}>열기</button>
```

### 추상화 수준은 변경 가능성에 맞춘다

미래에 바뀔 것만 추상화한다. 변하지 않을 것을 추상화하면 복잡도만 올라간다.

```tsx
// 나쁨 — Props가 많아질수록 내부 복잡도가 외부로 새어 나옴
<SignUpForm signUpOrder={['sns', 'normal']} title="회원가입" primaryButtonColor={...} />

// 좋음 — 변하는 부분만 노출
<SignUpForm variant="sns-first" />
```

## 응집도

### 코드는 기능(Feature) 단위로 묶는다

이 레포에서 "기능"은 **MCP action 종류**다. 핸들러·노드 생성 로직·유틸이 같은 action을 위한 것이라면 같은 디렉토리에 둔다. 현재 레이어 구조(`canvas/`, `bridge/`, `ui/`)는 유지하되, `canvas/` 내부는 action 그룹별 하위 디렉토리로 나눈다.

```
canvas/
├── dispatch/      # LOG/PING/CLOSE 및 action dispatch, 공통 reply/runAction
│   ├── handle-message.ts
│   ├── reply.ts
│   └── run-action.ts
├── draw/          # DRAW_RECT, DRAW_TEXT, DRAW_FRAME
│   ├── handler.ts
│   ├── nodes.ts
│   └── nodes.test.ts
├── screen/        # DRAW_SCREEN (create_screen)
│   ├── handler.ts
│   ├── tree.ts
│   └── tree.test.ts
├── query/         # GET_NODE, GET_PAGE, EXPORT_NODE
│   ├── handler.ts
│   └── serialize.ts
├── mutation/      # SET_PARENT, SET_NAME, REMOVE_NODE
│   └── handler.ts
├── shared/        # 여러 action 그룹에서 공유하는 Figma 노드 조회·부모 append 헬퍼
│   ├── node-lookup.ts
│   └── append-to-parent.ts
├── utils/         # 여러 action에서 공유하는 순수 유틸
│   ├── color.ts
│   ├── effects.ts
│   ├── font.ts
│   └── props.ts
└── main.ts        # showUI + figma.ui.onmessage 연결
```

새 action은 기존 파일에 이어 붙이지 않고 새 파일로 묶는다.

### 상수는 관련 로직 곁에

전역 상수 파일보다 사용처 가까이 둔다. 여러 곳에서 공유해야 할 때만 `constants.ts`로 올린다.
