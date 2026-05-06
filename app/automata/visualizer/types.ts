// ─── Automata Visualizer — Shared Type Definitions ───

export type ModeType = 
  | 'DFA' | 'NFA' | 'eNFA' 
  | 'DPDA' | 'NPDA' 
  | 'DTM' | 'NTM' | 'LBA'
  | 'Mealy' | 'Moore'
  | 'Buchi'
  | 'Timed';

// ─── Acceptance modes ───

/** PDA acceptance criteria */
export type PdaAcceptMode = 'final-state' | 'empty-stack' | 'both';

/** Optional PDA storage models layered on top of the classic single-stack machine. */
export type PdaStorageModel = 'stack' | 'queue' | 'nested-stack';

export type PdaVariant = 'classic' | 'multi-stack' | 'nested-stack' | 'queue';

export type PdaSettings = {
  stackCount: number;
  storageModel: PdaStorageModel;
  variant: PdaVariant;
};

/** TM acceptance criteria */
export type TmAcceptMode = 'final-state' | 'halt';

/** How the initial input should be placed on tapes before simulation starts. */
export type TmInputMode = 'textbook' | 'machine';

/** Optional TM extensions layered on top of the classic tape model. */
export type TmSheetMode = 'linear' | 'sheet-2d';

// ─── Node data shapes ───

export type StateNodeProps = {
  data: { label: string; isStart?: boolean; isAccept?: boolean; isActive?: boolean };
  isConnectable?: boolean;
  selected?: boolean;
};

export type TextNoteNodeData = {
  text: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  width: number;
  height: number;
  layer?: number;
};

export type FrameBoxNodeData = {
  title: string;
  width: number;
  height: number;
  bgColor: string;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidth: number;
  layer?: number;
};

// ─── Import / Export JSON schema ───

export interface ImportNode {
  id: string;
  label?: string;
  position?: { x: number; y: number };
  isStart?: boolean;
  isAccept?: boolean;
  data?: { isStart?: boolean; isAccept?: boolean; label?: string; layer?: number };
}

export interface ImportEdge {
  from?: string;
  from_con?: string;
  to?: string;
  to_con?: string;
  source?: string;
  sourceHandle?: string;
  target?: string;
  targetHandle?: string;
  label?: string;
}

export interface ImportAnnotation {
  id?: string;
  kind?: 'text-note' | 'frame-box';
  position?: { x: number; y: number };
  text?: string;
  title?: string;
  width?: number;
  height?: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidth?: number;
  layer?: number;
}

export interface ImportData {
  metadata?: { 
    type?: ModeType;
    pdaAcceptMode?: PdaAcceptMode;
    pdaSettings?: PdaSettings;
    tmAcceptMode?: TmAcceptMode;
    tmSettings?: TmSettings;
  };
  type?: ModeType;
  pdaAcceptMode?: PdaAcceptMode;
  pdaSettings?: PdaSettings;
  tmAcceptMode?: TmAcceptMode;
  tmSettings?: TmSettings;
  nodes: ImportNode[];
  edges: ImportEdge[];
  annotations?: ImportAnnotation[];
}

// ─── PDA / TM rule types ───

export type PdaRule = {
  input: string;
  pop: string;
  push: string;
  pops?: string[];
  pushes?: string[];
};

export type PdaConfig = {
  state: string;
  stack: string[];
  stacks?: string[][];
  storageModel?: PdaStorageModel;
};

/** TM move direction / addressing operation */
export type TmMove = 'L' | 'R' | 'S' | 'U' | 'D' | `@${number}`;

/**
 * TM transition rule supporting multi-head execution.
 * Each tuple slot corresponds to a head in head order.
 */
export type TmRule = { 
  reads: string[];
  writes: string[];
  moves: TmMove[];
};

/** 
 * TM configuration supporting multi-tape/multi-head.
 * - tapes: Array of tapes, each tape is string[]
 * - heads: Position of each head (heads[i] is on tape headToTape[i])
 */
export type TmConfig = { 
  state: string; 
  tapes: string[][];
  heads: number[];
};

/** TM settings for multi-tape/multi-head configuration */
export type TmSettings = {
  tapeCount: number;
  headCount: number;
  /** Legacy single-track mapping: one primary track per head. */
  headToTape: number[];
  /** Full mapping: each head can access one or more tracks at the same head position. */
  headTrackMap: number[][];
  inputMode: TmInputMode;
  sheetMode: TmSheetMode;
  sheetColumns: number;
  ramEnabled: boolean;
  stateStorageEnabled: boolean;
};

export interface PdaPathNode {
  id: string;
  parentId: string | null;
  stepIndex: number;
  state: string;
  stack: string[];
  stacks?: string[][];
  storageModel?: PdaStorageModel;
  transitionLabel?: string;
}

export interface TmPathNode {
  id: string;
  parentId: string | null;
  stepIndex: number;
  state: string;
  tapes: string[][];
  heads: number[];
  transitionLabel?: string;
}

// ─── Mealy / Moore types ───

export type MealyRule = { input: string; output: string };
export type MooreOutput = { output: string };

// ─── Timed Automata types ───

export type ClockConstraint = {
  clock: string;
  op: '<' | '<=' | '=' | '>=' | '>';
  value: number;
};
export type TimedRule = {
  input: string;
  guard: ClockConstraint[];
  reset: string[];
};
export type TimedConfig = {
  state: string;
  clocks: Record<string, number>;
};

// ─── Simulation timeline snapshot ───

export interface SimSnapshot {
  stepIndex: number;
  activeStates: string[];
  pdaConfigs: PdaConfig[];
  tmConfigs: TmConfig[];
  pdaPathConfigs?: PdaConfig[];
  tmPathConfigs?: TmConfig[];
  pdaPathNodes?: PdaPathNode[];
  tmPathNodes?: TmPathNode[];
  simMessage: string;
  history: string[];
}

// ─── Prompt modal ───

export type PromptKind = 'edgeLabel' | 'editLabel' | 'nodeSettings';

export interface PromptState {
  open: boolean;
  kind?: PromptKind;
  params?: unknown;
  nodeId?: string | null;
  defaultValue?: string;
  title?: string;
}
