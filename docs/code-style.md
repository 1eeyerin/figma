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
