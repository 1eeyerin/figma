export type StrokeAlign = 'INSIDE' | 'OUTSIDE' | 'CENTER';
export type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
export type TextAutoResize =
  | 'NONE'
  | 'WIDTH_AND_HEIGHT'
  | 'HEIGHT'
  | 'TRUNCATE';
export type FontWeight =
  | 'Thin'
  | 'ExtraLight'
  | 'Light'
  | 'Regular'
  | 'Medium'
  | 'SemiBold'
  | 'Bold'
  | 'ExtraBold'
  | 'Black';
export type ShadowType = 'DROP_SHADOW' | 'INNER_SHADOW';
export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';
export type AxisSizing = 'FIXED' | 'AUTO';

export interface ShadowDef {
  type?: ShadowType;
  color?: string;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  spread?: number;
  opacity?: number;
}

export interface RectDef {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  color?: string;
  opacity?: number;
  cornerRadius?: number;
  cornerRadii?: [number, number, number, number];
  strokeColor?: string;
  strokeWeight?: number;
  strokeAlign?: StrokeAlign;
  shadow?: ShadowDef;
  blur?: number;
  parentId?: string;
}

export interface TextDef {
  x?: number;
  y?: number;
  content?: string;
  name?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  opacity?: number;
  textAlign?: TextAlign;
  lineHeight?: { value: number; unit: 'PIXELS' | 'PERCENT' } | 'AUTO';
  letterSpacing?: number;
  width?: number;
  autoResize?: TextAutoResize;
  parentId?: string;
}

export interface FrameDef {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  cornerRadius?: number;
  layoutMode?: LayoutMode;
  primaryAxisSizing?: AxisSizing;
  counterAxisSizing?: AxisSizing;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  strokeColor?: string;
  strokeWeight?: number;
  strokeAlign?: StrokeAlign;
  shadow?: ShadowDef;
  blur?: number;
  clipContent?: boolean;
  parentId?: string;
  children?: NodeTreeDef[];
}

export type NodeTreeDef = (RectDef | TextDef | FrameDef) & {
  type?: 'rectangle' | 'text' | 'frame';
};

interface BaseCanvasMsg {
  id: string;
  type: string;
  action?: string;
}

export interface DrawRectMsg extends BaseCanvasMsg, RectDef {
  type: 'DRAW_RECT';
}

export interface DrawTextMsg extends BaseCanvasMsg, TextDef {
  type: 'DRAW_TEXT';
}

export interface DrawFrameMsg extends BaseCanvasMsg, FrameDef {
  type: 'DRAW_FRAME';
}

export interface SetParentMsg extends BaseCanvasMsg {
  type: 'SET_PARENT';
  nodeId: string;
  parentId: string;
  index?: number;
}

export interface SetNameMsg extends BaseCanvasMsg {
  type: 'SET_NAME';
  nodeId: string;
  name: string;
}

export interface RemoveNodeMsg extends BaseCanvasMsg {
  type: 'REMOVE_NODE';
  nodeId: string;
}

export interface GetNodeMsg extends BaseCanvasMsg {
  type: 'GET_NODE';
  nodeId?: string;
}

export interface GetPageMsg extends BaseCanvasMsg {
  type: 'GET_PAGE';
}

export interface GetSelectionContextMsg extends BaseCanvasMsg {
  type: 'GET_SELECTION_CONTEXT';
  nodeId?: string;
  nodeIds?: string[];
  maxDepth?: number;
}

export interface ExportNodeMsg extends BaseCanvasMsg {
  type: 'EXPORT_NODE';
  nodeId?: string;
  scale?: number;
  format?: 'PNG' | 'SVG';
}

export interface CreateScreenMsg extends BaseCanvasMsg {
  type: 'DRAW_SCREEN';
  tree: NodeTreeDef;
  parentId?: string;
}

export interface LogMsg extends BaseCanvasMsg {
  type: 'LOG';
  message: unknown;
}

export interface PingMsg extends BaseCanvasMsg {
  type: 'PING';
}

export interface CloseMsg extends BaseCanvasMsg {
  type: 'CLOSE';
}

export type CanvasMessage =
  | DrawRectMsg
  | DrawTextMsg
  | DrawFrameMsg
  | SetParentMsg
  | SetNameMsg
  | RemoveNodeMsg
  | GetNodeMsg
  | GetPageMsg
  | GetSelectionContextMsg
  | ExportNodeMsg
  | CreateScreenMsg
  | LogMsg
  | PingMsg
  | CloseMsg;

export type CanvasMessageType = CanvasMessage['type'];
