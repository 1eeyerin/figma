export interface SerializedMixedValue {
  type: 'MIXED';
}

export interface SerializedDesignObject {
  [key: string]: SerializedDesignValue;
}

export type SerializedDesignValue =
  | string
  | number
  | boolean
  | null
  | SerializedMixedValue
  | SerializedDesignObject
  | SerializedDesignValue[];

export interface SerializedDesignNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  css: Record<string, string>;
  properties: SerializedDesignObject;
  childCount?: number;
  childrenTruncated?: boolean;
  children?: SerializedDesignNode[];
}

export interface SelectionContextResult {
  root: SerializedDesignNode;
  serializedNodeCount: number;
  maxDepth: number | null;
}
