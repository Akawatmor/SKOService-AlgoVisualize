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

/** TM acceptance criteria */
export type TmAcceptMode = 'final-state' | 'halt';

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
    tmAcceptMode?: TmAcceptMode;
  };
  nodes: ImportNode[];
  edges: ImportEdge[];
  annotations?: ImportAnnotation[];
}

// ─── PDA / TM rule types ───

export type PdaRule = { input: string; pop: string; push: string };
export type PdaConfig = { state: string; stack: string[] };

/** TM move direction */
export type TmMove = 'L' | 'R' | 'S';

/** 
 * TM transition rule supporting multi-tape.
 * For single tape: reads[0], writes[0], moves[0]
 * For multi-tape: reads[i] for tape i, etc.
 */
export type TmRule = { 
  reads: string[];    // Symbol to read from each tape
  writes: string[];   // Symbol to write to each tape
  moves: TmMove[];    // Direction to move each head
};

/** 
 * TM configuration supporting multi-tape/multi-head.
 * - tapes: Array of tapes, each tape is string[]
 * - heads: Position of each head (heads[i] is on tape headToTape[i] or tape i by default)
 */
export type TmConfig = { 
  state: string; 
  tapes: string[][];  // Multiple tapes
  heads: number[];    // Head positions (one per head)
};

/** TM settings for multi-tape/multi-head configuration */
export type TmSettings = {
  tapeCount: number;      // Number of tapes (default 1)
  headCount: number;      // Number of heads (default 1)
  headToTape: number[];   // Maps head index to tape index (headToTape[i] = tape that head i operates on)
};

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
