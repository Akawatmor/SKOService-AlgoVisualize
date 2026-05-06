// ─── Automata Visualizer — Pure Utility Functions ───
import type { Edge } from '@xyflow/react';
import type {
  ModeType,
  PdaRule,
  PdaConfig,
  PdaSettings,
  PdaStorageModel,
  TmRule,
  MealyRule,
  ClockConstraint,
  TimedRule,
} from './types';
import {
  PDA_DEFAULT_STACK_COUNT,
  PDA_MAX_STACK_DEPTH,
  PDA_MAX_EPSILON_EXPANSIONS,
  PDA_MAX_STACKS,
  PDA_STACK_START,
  TM_BLANK,
} from './constants';

const TM_SIMPLE_MOVES = new Set(['L', 'R', 'S', 'U', 'D']);

// ────────────────────────────────────────────
// Epsilon & symbol helpers
// ────────────────────────────────────────────

export const normalizeEpsilonSymbol = (value: string): string => {
  return value === 'e' ? 'ε' : value;
};

export const isEpsilon = (edgeLabel: string): boolean => {
  if (!edgeLabel) return false;
  const symbols = edgeLabel.split(',').map(s => s.trim());
  return symbols.includes('e') || symbols.includes('ε');
};

export const isTransitionMatch = (edgeLabel: string, symbol: string, isPda: boolean): boolean => {
  if (!edgeLabel) return false;
  if (isPda) return false;
  const symbols = edgeLabel.split(',').map(s => s.trim());
  return symbols.includes(symbol);
};

// ────────────────────────────────────────────
// Handle / connector normalisation
// ────────────────────────────────────────────

/** Strip sub-handle suffix: "t-s1"→"t", "R-T2"→"r", etc. */
export const baseHandle = (h?: string | null): 't' | 'r' | 'b' | 'l' => {
  const v = (h || '').trim().toLowerCase().replace(/[-_](s|t)\d+$/i, '');
  if (v === 'r' || v === 'tr') return 'r';
  if (v === 'b' || v === 'tb') return 'b';
  if (v === 'l' || v === 'tl') return 'l';
  return 't';
};

export const normalizeConnector = (raw?: string): 't' | 'r' | 'b' | 'l' => {
  const v = (raw || '').trim().toLowerCase().replace(/[-_](s|t)\d+$/i, '');
  if (v === 't' || v === 'tt') return 't';
  if (v === 'r' || v === 'tr') return 'r';
  if (v === 'b' || v === 'tb') return 'b';
  if (v === 'l' || v === 'tl') return 'l';
  return 't';
};

// ────────────────────────────────────────────
// Sub-handle routing (display-only)
// ────────────────────────────────────────────

/**
 * Build visual-only sub-handle assignment for rendering.
 * Never mutates stored edge handles — import/export schema stays T/R/B/L.
 */
export const buildDisplaySubHandleMap = (edgeList: Edge[]) => {
  const srcGroups = new Map<string, Edge[]>();
  const tgtGroups = new Map<string, Edge[]>();
  edgeList.forEach(e => {
    if (e.source === e.target) return;
    const sKey = `${e.source}:${baseHandle(e.sourceHandle)}`;
    const tKey = `${e.target}:${baseHandle(e.targetHandle)}`;
    if (!srcGroups.has(sKey)) srcGroups.set(sKey, []);
    if (!tgtGroups.has(tKey)) tgtGroups.set(tKey, []);
    srcGroups.get(sKey)!.push(e);
    tgtGroups.get(tKey)!.push(e);
  });
  const newSrc = new Map<string, string>();
  const newTgt = new Map<string, string>();
  srcGroups.forEach(group =>
    group.forEach((e, i) => newSrc.set(e.id, `${baseHandle(e.sourceHandle)}-s${(i % 2) + 1}`))
  );
  tgtGroups.forEach(group =>
    group.forEach((e, i) => newTgt.set(e.id, `${baseHandle(e.targetHandle)}-t${(i % 2) + 1}`))
  );
  const out = new Map<string, { sourceHandle?: string; targetHandle?: string }>();
  edgeList.forEach(e => {
    if (e.source === e.target) return;
    out.set(e.id, {
      sourceHandle: newSrc.get(e.id) ?? e.sourceHandle ?? undefined,
      targetHandle: newTgt.get(e.id) ?? e.targetHandle ?? undefined,
    });
  });
  return out;
};

const findRuleSeparator = (ruleText: string): { index: number; length: number } | null => {
  const arrowIdx = ruleText.indexOf('->');
  if (arrowIdx >= 0) return { index: arrowIdx, length: 2 };
  const slashIdx = ruleText.indexOf('/');
  if (slashIdx >= 0) return { index: slashIdx, length: 1 };
  return null;
};

const normalizePdaStackSymbolAliases = (value: string): string => {
  return value.replace(/Z₀|Z0/g, PDA_STACK_START);
};

// ────────────────────────────────────────────
// PDA rule parsing & helpers
// ────────────────────────────────────────────

const clampPdaStackCount = (value: number): number => {
  if (!Number.isFinite(value)) return PDA_DEFAULT_STACK_COUNT;
  return Math.min(PDA_MAX_STACKS, Math.max(PDA_DEFAULT_STACK_COUNT, Math.round(value)));
};

const removeInlineWhitespace = (value: string) => value.replace(/\s+/g, '');

const splitTopLevel = (value: string, separator: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === separator && parenDepth === 0 && bracketDepth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
};

const tokenizeNestedStackSymbols = (value: string): string[] | null => {
  const compact = removeInlineWhitespace(value);
  if (!compact) return [];

  const tokens: string[] = [];
  let index = 0;

  while (index < compact.length) {
    if (compact[index] !== '[') {
      tokens.push(compact[index]);
      index += 1;
      continue;
    }

    let depth = 1;
    let cursor = index + 1;
    while (cursor < compact.length && depth > 0) {
      if (compact[cursor] === '[') depth += 1;
      if (compact[cursor] === ']') depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) return null;
    tokens.push(compact.slice(index, cursor));
    index = cursor;
  }

  return tokens;
};

const tokenizePdaStoreSymbols = (
  value: string,
  storageModel: PdaStorageModel,
): string[] | null => {
  const normalized = normalizePdaStackSymbolAliases(normalizeEpsilonSymbol(removeInlineWhitespace(value)));
  if (!normalized || normalized === 'ε') return [];
  if (storageModel === 'nested-stack') {
    return tokenizeNestedStackSymbols(normalized);
  }
  return normalized.split('');
};

const parsePdaOperandList = (
  rawValue: string,
  expectedCount: number,
): string[] | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const parseSingleOperand = (value: string) => {
    const normalized = normalizePdaStackSymbolAliases(normalizeEpsilonSymbol(removeInlineWhitespace(value)));
    return normalized || null;
  };

  if (expectedCount <= 1) {
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const tupleItems = splitTopLevel(trimmed.slice(1, -1), ',').map((item) => item.trim());
      if (tupleItems.length !== 1) return null;
      const singleValue = parseSingleOperand(tupleItems[0]);
      return singleValue ? [singleValue] : null;
    }
    const singleValue = parseSingleOperand(trimmed);
    return singleValue ? [singleValue] : null;
  }

  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return null;
  const tupleItems = splitTopLevel(trimmed.slice(1, -1), ',').map((item) => item.trim());
  if (tupleItems.length !== expectedCount) return null;

  const normalizedItems = tupleItems.map(parseSingleOperand);
  if (normalizedItems.some((item) => item === null)) return null;
  return normalizedItems as string[];
};

const normalizeStoresForSettings = (
  stores: string[][],
  settings: PdaSettings,
): string[][] => {
  const expectedCount = settings.storageModel === 'stack' ? settings.stackCount : 1;
  const normalized = stores.slice(0, expectedCount).map((store) => [...store]);
  while (normalized.length < expectedCount) {
    normalized.push([PDA_STACK_START]);
  }
  return normalized;
};

export const normalizePdaSettings = (settings?: Partial<PdaSettings> | null): PdaSettings => {
  const requestedModel = settings?.storageModel;
  const requestedVariant = settings?.variant;

  if (requestedModel === 'queue' || requestedVariant === 'queue') {
    return {
      stackCount: 1,
      storageModel: 'queue',
      variant: 'queue',
    };
  }

  if (requestedModel === 'nested-stack' || requestedVariant === 'nested-stack') {
    return {
      stackCount: 1,
      storageModel: 'nested-stack',
      variant: 'nested-stack',
    };
  }

  const stackCount = clampPdaStackCount(Number(settings?.stackCount ?? PDA_DEFAULT_STACK_COUNT));
  return {
    stackCount: stackCount > 1 ? stackCount : 1,
    storageModel: 'stack',
    variant: stackCount > 1 ? 'multi-stack' : 'classic',
  };
};

export const getPdaStoreCount = (settings?: Partial<PdaSettings> | null) => {
  const normalized = normalizePdaSettings(settings);
  return normalized.storageModel === 'stack' ? normalized.stackCount : 1;
};

export const getPdaConfigStores = (
  cfg: PdaConfig,
  settings?: Partial<PdaSettings> | null,
): string[][] => {
  const normalizedSettings = normalizePdaSettings(settings);
  const fallbackStack = Array.isArray(cfg.stack) ? [...cfg.stack] : [];
  const sourceStores = Array.isArray(cfg.stacks) && cfg.stacks.length > 0
    ? cfg.stacks.map((store) => [...store])
    : [fallbackStack];
  return normalizeStoresForSettings(sourceStores, normalizedSettings);
};

export const buildPdaConfig = (
  state: string,
  stores: string[][],
  settings?: Partial<PdaSettings> | null,
): PdaConfig => {
  const normalizedSettings = normalizePdaSettings(settings);
  const normalizedStores = normalizeStoresForSettings(stores, normalizedSettings);
  return {
    state,
    stack: [...(normalizedStores[0] || [])],
    stacks: normalizedStores.map((store) => [...store]),
    storageModel: normalizedSettings.storageModel,
  };
};

export const getPdaConfigKey = (
  cfg: PdaConfig,
  settings?: Partial<PdaSettings> | null,
): string => {
  const stores = getPdaConfigStores(cfg, settings);
  return `${cfg.state}|${stores.map((store) => store.join('\u0001')).join('\u0002')}`;
};

export const isPdaStoreEmpty = (
  cfg: PdaConfig,
  settings?: Partial<PdaSettings> | null,
): boolean => {
  return getPdaConfigStores(cfg, settings).every(
    (store) => store.length === 0 || (store.length === 1 && store[0] === PDA_STACK_START)
  );
};

export const formatPdaStoreContents = (
  store: string[],
  settings?: Partial<PdaSettings> | null,
): string => {
  const normalizedSettings = normalizePdaSettings(settings);
  if (store.length === 0) return 'ε';
  if (normalizedSettings.storageModel === 'queue') return store.join(' ');
  if (normalizedSettings.storageModel === 'nested-stack') return store.join(' ');
  return store.join('');
};

export const formatPdaExtensionSummary = (settings?: Partial<PdaSettings> | null): string => {
  const normalized = normalizePdaSettings(settings);
  if (normalized.storageModel === 'queue') return 'Queue automata';
  if (normalized.storageModel === 'nested-stack') return 'Nested stack automata';
  if (normalized.stackCount === 2) return 'Two-stack PDA';
  if (normalized.stackCount > 2) return `${normalized.stackCount}-stack PDA`;
  return 'Classic PDA';
};

export const getDefaultPdaRuleLabel = (settings?: Partial<PdaSettings> | null): string => {
  const normalized = normalizePdaSettings(settings);
  const storeCount = getPdaStoreCount(normalized);
  if (storeCount <= 1) {
    return `${PDA_STACK_START},${PDA_STACK_START}->${PDA_STACK_START}`;
  }
  const tuple = Array.from({ length: storeCount }, (_, index) => (index === 0 ? PDA_STACK_START : 'ε')).join(',');
  return `${PDA_STACK_START},(${tuple})->(${tuple})`;
};

export const getPdaRulePromptTitle = (
  action: 'Input' | 'Edit',
  settings?: Partial<PdaSettings> | null,
): string => {
  const normalized = normalizePdaSettings(settings);
  const summary = formatPdaExtensionSummary(normalized);
  if (normalized.storageModel === 'queue') {
    return `${action} Queue rule(s): input,dequeue->enqueue  •  ${summary}`;
  }
  if (normalized.storageModel === 'nested-stack') {
    return `${action} nested-stack rule(s): input,pop->push  •  use [frame] for nested tokens`;
  }
  if (normalized.stackCount > 1) {
    return `${action} ${normalized.stackCount}-stack rule(s): input,(pop1,...)->(push1,...)`;
  }
  return `${action} PDA rule(s): input,pop->push`;
};

export const parsePdaRules = (
  label?: string,
  settings?: Partial<PdaSettings> | null,
): PdaRule[] => {
  if (!label) return [];
  const normalizedSettings = normalizePdaSettings(settings);
  const storeCount = getPdaStoreCount(normalizedSettings);
  const parsed = label
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map((ruleText): PdaRule | null => {
      const separator = findRuleSeparator(ruleText);
      if (!separator) return null;
      const lhs = ruleText.slice(0, separator.index).trim();
      const rhs = ruleText.slice(separator.index + separator.length).trim();
      const lhsParts = splitTopLevel(lhs, ',').map(s => s.trim());
      if (lhsParts.length !== 2) return null;
      const [inputRaw, popRaw] = lhsParts;
      const input = normalizeEpsilonSymbol(inputRaw);
      const pops = parsePdaOperandList(popRaw, storeCount);
      const pushes = parsePdaOperandList(rhs, storeCount);
      if (!input || !pops || !pushes) return null;
      return {
        input,
        pop: pops[0],
        push: pushes[0],
        pops,
        pushes,
      };
    });

  return parsed.filter((rule): rule is PdaRule => rule !== null);
};

export const isValidPdaLabel = (
  label?: string,
  settings?: Partial<PdaSettings> | null,
): boolean => {
  if (!label) return false;
  const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
  if (chunks.length === 0) return false;
  return parsePdaRules(label, settings).length === chunks.length;
};

export const tryConvertNfaShorthandToPda = (
  raw?: string,
  settings?: Partial<PdaSettings> | null,
): string | null => {
  if (!raw) return null;
  const normalizedSettings = normalizePdaSettings(settings);
  if (normalizedSettings.storageModel !== 'stack' || normalizedSettings.stackCount !== 1) {
    return null;
  }
  if (findRuleSeparator(raw)) return null;
  const symbols = raw.split(',').map(s => normalizeEpsilonSymbol(s.trim())).filter(Boolean);
  if (symbols.length === 0) return null;
  return symbols.map(sym => `${sym},${PDA_STACK_START}->${PDA_STACK_START}`).join('; ');
};

export const applyPdaRule = (
  cfg: PdaConfig,
  targetState: string,
  rule: PdaRule,
  settings?: Partial<PdaSettings> | null,
): PdaConfig | null => {
  const normalizedSettings = normalizePdaSettings(settings);
  const currentStores = getPdaConfigStores(cfg, normalizedSettings).map((store) => [...store]);
  const pops = rule.pops && rule.pops.length > 0 ? rule.pops : [rule.pop];
  const pushes = rule.pushes && rule.pushes.length > 0 ? rule.pushes : [rule.push];

  for (let index = 0; index < currentStores.length; index += 1) {
    const store = currentStores[index];
    const popValue = normalizeEpsilonSymbol(pops[index] ?? 'ε');
    const pushValue = normalizeEpsilonSymbol(pushes[index] ?? 'ε');

    if (popValue !== 'ε') {
      if (normalizedSettings.storageModel === 'queue') {
        const front = store[0];
        if (front !== popValue) return null;
        store.shift();
      } else {
        const top = store[store.length - 1];
        if (top !== popValue) return null;
        store.pop();
      }
    }

    const pushTokens = tokenizePdaStoreSymbols(pushValue, normalizedSettings.storageModel);
    if (pushTokens === null) return null;
    if (pushTokens.length > 0) {
      if (normalizedSettings.storageModel === 'queue') {
        pushTokens.forEach((token) => store.push(token));
      } else {
        for (let pushIndex = pushTokens.length - 1; pushIndex >= 0; pushIndex -= 1) {
          store.push(pushTokens[pushIndex]);
        }
      }
    }

    if (store.length > PDA_MAX_STACK_DEPTH) return null;
  }

  return buildPdaConfig(targetState, currentStores, normalizedSettings);
};

export const expandPdaEpsilonClosure = (
  configs: PdaConfig[],
  currentEdges: Edge[],
  settings?: Partial<PdaSettings> | null,
): PdaConfig[] => {
  const keyOf = (cfg: PdaConfig) => getPdaConfigKey(cfg, settings);
  const visited = new Set<string>();
  const queue: PdaConfig[] = [];
  const out: PdaConfig[] = [];
  configs.forEach(cfg => {
    const key = keyOf(cfg);
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(cfg);
      out.push(cfg);
    }
  });

  let expansions = 0;
  while (queue.length > 0 && expansions < PDA_MAX_EPSILON_EXPANSIONS) {
    const cfg = queue.shift()!;
    const outgoing = currentEdges.filter(e => e.source === cfg.state);
    outgoing.forEach(edge => {
      const rules = parsePdaRules(edge.label as string, settings).filter(r => normalizeEpsilonSymbol(r.input) === 'ε');
      rules.forEach(rule => {
        const next = applyPdaRule(cfg, edge.target, rule, settings);
        if (!next) return;
        const key = keyOf(next);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(next);
          out.push(next);
        }
      });
    });
    expansions += 1;
  }
  return out;
};

export const expandPdaEpsilonPaths = (
  configs: PdaConfig[],
  currentEdges: Edge[],
  settings?: Partial<PdaSettings> | null,
): PdaConfig[] => {
  const normalizedSettings = normalizePdaSettings(settings);
  const keyOf = (cfg: PdaConfig) => getPdaConfigKey(cfg, normalizedSettings);
  const queue = configs.map((cfg) => ({
    cfg,
    seen: new Set<string>([keyOf(cfg)]),
  }));
  const out = configs.map((cfg) => buildPdaConfig(cfg.state, getPdaConfigStores(cfg, normalizedSettings), normalizedSettings));

  let expansions = 0;
  while (queue.length > 0 && expansions < PDA_MAX_EPSILON_EXPANSIONS) {
    const current = queue.shift();
    if (!current) break;

    const outgoing = currentEdges.filter(e => e.source === current.cfg.state);
    outgoing.forEach(edge => {
      const rules = parsePdaRules(edge.label as string, normalizedSettings).filter(r => normalizeEpsilonSymbol(r.input) === 'ε');
      rules.forEach(rule => {
        const next = applyPdaRule(current.cfg, edge.target, rule, normalizedSettings);
        if (!next) return;

        const nextKey = keyOf(next);
        if (current.seen.has(nextKey)) return;

        out.push(next);
        const nextSeen = new Set(current.seen);
        nextSeen.add(nextKey);
        queue.push({ cfg: next, seen: nextSeen });
      });
    });

    expansions += 1;
  }

  return out;
};

// ────────────────────────────────────────────
// TM rule parsing (supports single-head and multi-head tuples)
// ────────────────────────────────────────────

/** Normalize shorthand blank symbols to the canonical TM_BLANK (□). */
const normalizeTmSymbol = (s: string): string =>
  s === 'B' || s === '␣' ? TM_BLANK : s;

export const isRamJumpMove = (move: string): boolean => /^@\d+$/.test(move.trim().toUpperCase());

export const isValidTmMove = (move: string): boolean => {
  const normalized = move.trim().toUpperCase();
  return TM_SIMPLE_MOVES.has(normalized) || isRamJumpMove(normalized);
};

/**
 * Parse a parenthesized tuple like "(a,b,c)" into an array ["a","b","c"].
 * Returns null if not a valid tuple format.
 */
const parseTuple = (s: string): string[] | null => {
  const trimmed = s.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return null;
  const inner = trimmed.slice(1, -1);
  return inner.split(',').map(x => x.trim());
};

/**
 * Parse TM rules from edge label.
 * Supports two formats:
 * 
 * 1. Single-head: "read->write,move" e.g. "0->1,R"
 * 2. Multi-head: "(r1,r2,...)->(w1,w2,...),(m1,m2,...)" e.g. "(0,1)->(1,0),(R,L)"
 * 
 * Multiple rules separated by semicolon.
 */
export const parseTmRules = (label?: string, expectedArity?: number): TmRule[] => {
  if (!label) return [];
  const parsed = label
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map((ruleText) => {
      const separator = findRuleSeparator(ruleText);
      if (!separator) return null;

      const lhs = ruleText.slice(0, separator.index).trim();
      const rhs = ruleText.slice(separator.index + separator.length).trim();
      
      // Check if multi-head tuple format (starts with parenthesis)
      if (lhs.startsWith('(')) {
        // Multi-head format: (r1,r2,...)->(w1,w2,...),(m1,m2,...)
        const reads = parseTuple(lhs);
        if (!reads) return null;
        
        // RHS should be (writes),(moves)
        // Find the closing paren of writes tuple, then comma, then moves tuple
        const firstCloseParen = rhs.indexOf(')');
        if (firstCloseParen < 0) return null;
        
        const writesStr = rhs.slice(0, firstCloseParen + 1);
        const writes = parseTuple(writesStr);
        if (!writes) return null;
        
        // After writes tuple, expect comma then moves tuple
        const afterWrites = rhs.slice(firstCloseParen + 1).trim();
        if (!afterWrites.startsWith(',')) return null;
        
        const movesStr = afterWrites.slice(1).trim();
        const movesParsed = parseTuple(movesStr);
        if (!movesParsed) return null;
        
        // Validate all arrays have same length
        if (reads.length !== writes.length || writes.length !== movesParsed.length) return null;
        
        // Normalize and validate
        const normalizedReads = reads.map(normalizeTmSymbol);
        const normalizedWrites = writes.map(normalizeTmSymbol);
        const moves = movesParsed.map(m => m.toUpperCase());
        
        // Validate moves
        if (!moves.every(isValidTmMove)) return null;
        
        return {
          reads: normalizedReads,
          writes: normalizedWrites,
          moves,
        };
      } else {
        // Single-tape format (legacy): read->write,move
        const read = normalizeTmSymbol(lhs);
        const rhsParts = rhs.split(',').map(s => s.trim());
        if (rhsParts.length !== 2) return null;
        const [writeRaw, moveRaw] = rhsParts;
        const write = normalizeTmSymbol(writeRaw);
        const move = moveRaw.toUpperCase();
        if (!read || !write || !isValidTmMove(move)) return null;
        
        // Return in tuple format with single element arrays
        return { 
          reads: [read], 
          writes: [write], 
          moves: [move],
        };
      }
    })
    .filter((r): r is TmRule => r !== null);

  if (!expectedArity || expectedArity < 1) return parsed;
  return parsed.filter((rule) => rule.reads.length === expectedArity);
};

/**
 * Validate TM label format.
 * Accepts both single-head and multi-head formats.
 */
export const isValidTmLabel = (label?: string, expectedHeadCount: number = 1): boolean => {
  if (!label) return false;
  const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
  if (chunks.length === 0) return false;
  const parsed = parseTmRules(label, expectedHeadCount);
  if (parsed.length !== chunks.length) return false;
  return true;
};

/**
 * Helper: Get number of tapes from a TM rule.
 */
export const getTapeCountFromRule = (rule: TmRule): number => {
  return rule.reads.length;
};

// ────────────────────────────────────────────
// Mealy Machine parsing
// Format: "input/output" or "a/0; b/1"
// ────────────────────────────────────────────

export const parseMealyRules = (label?: string): MealyRule[] => {
  if (!label) return [];
  return label
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map((ruleText) => {
      // Format: input/output
      const slashIdx = ruleText.indexOf('/');
      if (slashIdx < 0) {
        // Treat as FA label with no output
        return { input: ruleText.trim(), output: '' };
      }
      const input = ruleText.slice(0, slashIdx).trim();
      const output = ruleText.slice(slashIdx + 1).trim();
      return { input: normalizeEpsilonSymbol(input), output };
    });
};

export const isValidMealyLabel = (label?: string): boolean => {
  if (!label) return false;
  const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
  if (chunks.length === 0) return false;
  return parseMealyRules(label).length === chunks.length;
};

// ────────────────────────────────────────────
// Timed Automata parsing
// Format: "input, guard, reset" e.g. "a, x<5, x:=0"
// ────────────────────────────────────────────

const parseClockConstraint = (s: string): ClockConstraint | null => {
  // Format: x<5, x<=3, x=2, x>=1, x>0
  const match = s.trim().match(/^(\w+)\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return {
    clock: match[1],
    op: match[2] as ClockConstraint['op'],
    value: parseFloat(match[3]),
  };
};

export const parseTimedRules = (label?: string): TimedRule[] => {
  if (!label) return [];
  return label
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map((ruleText) => {
      // Format: input, guard, reset  OR  input, guard  OR  just input
      const parts = ruleText.split(',').map(p => p.trim());
      const input = normalizeEpsilonSymbol(parts[0] || '');
      
      // Parse guards (e.g., "x<5 && y>=2" or "x<5")
      const guardPart = parts[1] || '';
      const guardStrings = guardPart.split(/\s*&&\s*/).filter(Boolean);
      const guard = guardStrings
        .map(parseClockConstraint)
        .filter((c): c is ClockConstraint => c !== null);
      
      // Parse resets (e.g., "x:=0, y:=0" or "x")
      const resetPart = parts[2] || '';
      const reset = resetPart
        .split(/[,&]/)
        .map(r => r.replace(/:=\s*0/, '').trim())
        .filter(Boolean);
      
      return { input, guard, reset };
    });
};

export const isValidTimedLabel = (label?: string): boolean => {
  if (!label) return false;
  const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
  if (chunks.length === 0) return false;
  return parseTimedRules(label).length === chunks.length;
};

// ────────────────────────────────────────────
// Label conversion between modes
// ────────────────────────────────────────────

export const toFaLabelFromPda = (
  label: string,
  targetMode: ModeType,
  settings?: Partial<PdaSettings> | null,
): string => {
  const rules = parsePdaRules(label, settings);
  if (rules.length === 0) return label;
  const uniqueInputs = Array.from(new Set(rules.map(r => normalizeEpsilonSymbol(r.input))));
  const normalized = targetMode === 'eNFA'
    ? uniqueInputs
    : uniqueInputs.filter(s => s !== 'ε' && s !== 'e');
  return normalized.join(',');
};

export const toPdaLabelFromFa = (
  label: string,
  settings?: Partial<PdaSettings> | null,
): string => {
  const raw = (label || '').trim();
  if (!raw) return '';
  if (parsePdaRules(raw, settings).length > 0) return raw;
  const symbols = raw.split(',').map(s => normalizeEpsilonSymbol(s.trim())).filter(Boolean);
  if (symbols.length === 0) return '';
  const defaultRule = getDefaultPdaRuleLabel(settings);
  if (getPdaStoreCount(settings) <= 1) {
    return symbols.map(sym => `${sym},${PDA_STACK_START}->${PDA_STACK_START}`).join('; ');
  }
  return symbols
    .map((sym) => defaultRule.replace(PDA_STACK_START, sym))
    .join('; ');
};

export const toTmLabelFromFa = (label: string): string => {
  const raw = (label || '').trim();
  if (!raw) return '';
  if (parseTmRules(raw).length > 0) return raw;
  const symbols = raw
    .split(',')
    .map(s => normalizeEpsilonSymbol(s.trim()))
    .filter(s => s !== '' && s !== 'ε' && s !== 'e');
  if (symbols.length === 0) return '';
  return symbols.map(sym => `${sym}->${sym},R`).join('; ');
};

export const toTmLabelFromPda = (label: string): string => {
  const raw = (label || '').trim();
  if (!raw) return '';
  if (parseTmRules(raw).length > 0) return raw;
  const rules = parsePdaRules(raw);
  if (rules.length === 0) return toTmLabelFromFa(raw);
  const symbols = Array.from(new Set(
    rules
      .map(r => normalizeEpsilonSymbol(r.input))
      .filter(s => s !== '' && s !== 'ε' && s !== 'e')
  ));
  if (symbols.length === 0) return '';
  return symbols.map(sym => `${sym}->${sym},R`).join('; ');
};

export const toFaLabelFromTm = (label: string, targetMode: ModeType): string => {
  const raw = (label || '').trim();
  if (!raw) return '';
  const rules = parseTmRules(raw);
  if (rules.length === 0) return raw;
  // For multi-tape, just use first tape's read symbol
  const symbols = Array.from(new Set(rules.map(r => normalizeEpsilonSymbol(r.reads[0]))));
  const normalized = targetMode === 'eNFA'
    ? symbols
    : symbols.filter(s => s !== 'ε' && s !== 'e' && s !== TM_BLANK);
  return normalized.join(',');
};

export const toPdaLabelFromTm = (label: string): string => {
  const faLabel = toFaLabelFromTm(label, 'NFA');
  return toPdaLabelFromFa(faLabel);
};

// ────────────────────────────────────────────
// Alphabet & label splitting
// ────────────────────────────────────────────

export const splitLabelToSymbols = (label: string | undefined, isTm: boolean, isPda: boolean): string[] => {
  if (!label) return [];
  if (isTm) {
    return parseTmRules(label)
      .flatMap(r => r.reads)  // Use all reads for multi-tape
      .filter(s => s !== '' && s !== TM_BLANK);
  }
  if (isPda) {
    return parsePdaRules(label)
      .map(r => r.input)
      .filter(s => s !== '' && s !== 'e' && s !== 'ε');
  }
  return label.split(',').map(s => s.trim()).filter(s => s !== '' && s !== 'e' && s !== 'ε');
};

/**
 * Custom sort comparator for alphabet symbols.
 * Numbers come first (sorted numerically), then letters (sorted alphabetically).
 * e.g. 0, 1, 2, a, b, c
 */
const alphabetComparator = (a: string, b: string): number => {
  const aIsNum = /^\d+$/.test(a);
  const bIsNum = /^\d+$/.test(b);
  if (aIsNum && bIsNum) return Number(a) - Number(b);
  if (aIsNum && !bIsNum) return -1;
  if (!aIsNum && bIsNum) return 1;
  return a.localeCompare(b);
};

export const getAlphabetFromEdges = (edgeList: Edge[], isTm: boolean, isPda: boolean): string[] => {
  const set = new Set<string>();
  edgeList.forEach(e => splitLabelToSymbols(e.label as string, isTm, isPda).forEach(s => set.add(s)));
  return Array.from(set).sort(alphabetComparator);
};

// ────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────

export const validateAutomaton = (
  modeToCheck: ModeType,
  nodeList: { id: string }[],
  edgeList: Edge[],
  isTm: boolean,
  isPda: boolean,
) => {
  const issues: string[] = [];
  const alphabet = getAlphabetFromEdges(edgeList, isTm, isPda);

  if (modeToCheck === 'DFA' || modeToCheck === 'NFA') {
    const hasEps = edgeList.some(e => isEpsilon(e.label as string));
    if (hasEps) issues.push('Epsilon transitions are not allowed in DFA/NFA — found and will be removed.');
  }

  if (modeToCheck === 'DFA') {
    nodeList.forEach(n => {
      alphabet.forEach(sym => {
        const candidates = edgeList.filter(e => e.source === n.id && splitLabelToSymbols(e.label as string, isTm, isPda).includes(sym));
        if (candidates.length === 0) {
          issues.push(`Missing transition from ${n.id} on '${sym}'`);
        } else if (candidates.length > 1) {
          issues.push(`Nondeterministic: ${n.id} has ${candidates.length} transitions on '${sym}'`);
        }
      });
    });
  }

  return { issues, alphabet };
};

// ────────────────────────────────────────────
// Epsilon closure & next states (FA)
// ────────────────────────────────────────────

export const getEpsilonClosure = (nodeIds: string[], currentEdges: Edge[], mode: ModeType): Set<string> => {
  if (mode !== 'eNFA') return new Set(nodeIds);
  const closure = new Set(nodeIds);
  const stack = [...nodeIds];
  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    const epsilonEdges = currentEdges.filter(e => e.source === nodeId && isEpsilon(e.label as string));
    for (const edge of epsilonEdges) {
      if (!closure.has(edge.target)) {
        closure.add(edge.target);
        stack.push(edge.target);
      }
    }
  }
  return closure;
};

export const getNextStates = (currentIds: Set<string>, char: string, currentEdges: Edge[], isPda: boolean): Set<string> => {
  const next = new Set<string>();
  currentIds.forEach(id => {
    const validEdges = currentEdges.filter(e =>
      e.source === id && isTransitionMatch(e.label as string, char, isPda)
    );
    validEdges.forEach(e => next.add(e.target));
  });
  return next;
};

// ────────────────────────────────────────────
// Misc UI helpers
// ────────────────────────────────────────────

export const formatIssuesHtml = (issues: string[]): string => {
  return `<div style="display:inline-block;text-align:left;max-width:100%;"><ul style="margin:0;padding-left:18px;"><li>${issues.join('</li><li>')}</li></ul></div>`;
};
