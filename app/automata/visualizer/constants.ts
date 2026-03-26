// ─── Automata Visualizer — Constants ───

/** Initial symbol at the bottom of the PDA stack. */
export const PDA_STACK_START = 'Z';

/** Maximum depth the PDA stack can reach before a configuration is pruned. */
export const PDA_MAX_STACK_DEPTH = 30;

/** Maximum epsilon expansions during PDA epsilon-closure. */
export const PDA_MAX_EPSILON_EXPANSIONS = 2000;

/** Blank symbol for Turing machines. */
export const TM_BLANK = '□';

/** Maximum number of TM steps before the simulation is forcefully halted. */
export const TM_MAX_STEPS = 500;

/** Default number of tapes for TM. */
export const TM_DEFAULT_TAPE_COUNT = 1;

/** Default number of heads for TM. */
export const TM_DEFAULT_HEAD_COUNT = 1;

/** Maximum number of tapes allowed. */
export const TM_MAX_TAPES = 5;

/** Maximum number of heads allowed. */
export const TM_MAX_HEADS = 5;

/** localStorage key for persisting the visualizer draft across refreshes. */
export const VISUALIZER_DRAFT_KEY = 'automata-visualizer-draft-v1';
