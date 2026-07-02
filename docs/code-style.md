# 코드 작성 규칙

이 문서는 이 레포의 코드 전반에 적용하는 작성 규칙이다.

## 함수 위에는 JSDoc 설명을 쓴다

테스트 파일을 제외한 구현 코드의 주요 함수 위에는 `/** ... */` 형식의 JSDoc 설명을 붙인다. 설명은 함수가 하는 일을 한 문장으로 쓰고, 문장 끝은 존댓말로 작성한다.

```typescript
/**
 * 프레임 정의를 Figma FrameNode로 생성하고 레이아웃과 스타일을 적용합니다.
 */
function createFrame(msg: FrameDef): FrameNode {
  // ...
}
```

## 타입 정의는 `any`를 기본값으로 쓰지 않는다

타입을 알 수 없다고 해서 `any`나 느슨한 타입(`unknown` 남용, `object`, 암묵적 `any`)으로 얼버무리지 않는다. 외부 라이브러리나 API의 타입이 불확실할 때는 추측해서 작성하지 말고, Context7 MCP 도구(`resolve-library-id` → `get-library-docs`)로 해당 라이브러리의 최신 문서를 조회한 뒤 정확한 타입을 정의한다.

- Figma Plugin API, MCP SDK 등 외부 타입을 다룰 때도 동일하게 적용한다.
- 문서 조회로도 타입을 특정할 수 없는 경우에만 최소 범위로 `unknown`을 쓰고, 사용 지점에서 타입 가드로 좁힌다.
