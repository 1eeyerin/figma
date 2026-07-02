export type ToolTextResult = {
  [x: string]: unknown;
  content: [{ type: 'text'; text: string }];
  isError?: true;
};
