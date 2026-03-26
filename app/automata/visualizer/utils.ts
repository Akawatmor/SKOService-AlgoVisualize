// ─── Automata Visualizer — Pure Utility Functions ───
import type { Edge } from '@xyflow/react';
import type { ModeType, PdaRule, PdaConfig, TmRule, MealyRule, ClockConstraint, TimedRule } from './types';
import { PDA_STACK_START, PDA_MAX_STACK_DEPTH, PDA_MAX_EPSILON_EXPANSIONS, TM_BLANK } from './constants';

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

// ────────────────────────────────────────────
// PDA rule parsing & helpers
// ────────────────────────────────────────────

export const parsePdaRules = (label?: string): PdaRule[] => {
  if (!label) return [];
  return label
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map((ruleText) => {
      const arrowIdx = ruleText.indexOf('->');
      if (arrowIdx < 0) return null;
      const lhs = ruleText.slice(0, arrowIdx).trim();
      const rhs = ruleText.slice(arrowIdx + 2).trim();
      const lhsParts = lhs.split(',').map(s => s.trim());
      if (lhsParts.length !== 2) return null;
      const [inputRaw, popRaw] = lhsParts;
      const input = normalizeEpsilonSymbol(inputRaw);
      const pop = normalizeEpsilonSymbol(popRaw);
      const push = normalizeEpsilonSymbol(rhs);
      if (!input || !pop || !push) return null;
      return { input, pop, push };
    })
    .filter((r): r is PdaRule => r !== null);
};

export const isValidPdaLabel = (label?: string): boolean => {
  if (!label) return false;
  const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
  if (chunks.length === 0) return false;
  return parsePdaRules(label).length === chunks.length;
};

export const tryConvertNfaShorthandToPda = (raw?: string): string | null => {
  if (!raw) return null;
  if (raw.includes('->')) return null;
  const symbols = raw.split(',').map(s => normalizeEpsilonSymbol(s.trim())).filter(Boolean);
  if (symbols.length === 0) return null;
  return symbols.map(sym => `${sym},${PDA_STACK_START}->${PDA_STACK_START}`).join('; ');
};

export const applyPdaRule = (cfg: PdaConfig, targetState: string, rule: PdaRule): PdaConfig | null => {
  const stack = [...cfg.stack];
  const popSym = normalizeEpsilonSymbol(rule.pop);
  if (popSym !== 'ε') {
    const top = stack[stack.length - 1];
    if (top !== popSym) return null;
    stack.pop();
  }
  const pushSym = normalizeEpsilonSymbol(rule.push);
  if (pushSym !== 'ε') {
    const symbols = pushSym.split('');
    for (let i = symbols.length - 1; i >= 0; i--) stack.push(symbols[i]);
  }
  if (stack.length > PDA_MAX_STACK_DEPTH) return null;
  return { state: targetState, stack };
};

export const expandPdaEpsilonClosure = (configs: PdaConfig[], currentEdges: Edge[]): PdaConfig[] => {
  const keyOf = (cfg: PdaConfig) => `${cfg.state}|${cfg.stack.join('')}`;
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
      const rules = parsePdaRules(edge.label as string).filter(r => normalizeEpsilonSymbol(r.input) === 'ε');
      rules.forEach(rule => {
        const next = applyPdaRule(cfg, edge.target, rule);
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

// ────────────────────────────────────────────
// TM rule parsing (supports single-tape and multi-tape)
// ────────────────────────────────────────────

/** Normalize shorthand blank symbols to the canonical TM_BLANK (□). */
const normalizeTmSymbol = (s: string): string =>
  s === 'B' || s === '␣' ? TM_BLANK : s;

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
 * 1. Single-tape (legacy): "read->write,move" e.g. "0->1,R"
 * 2. Multi-tape: "(r1,r2,...)->(w1,w2,...),(m1,m2,...)" e.g. "(0,1)->(1,0),(R,L)"
 * 
 * Multiple rules separated by semicolon.
 */
export const parseTmRules = (label?: string, expectedTapeCount: number = 1): TmRule[] => {
  if (!label) return [];
  return label
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map((ruleText) => {
      const arrowIdx = ruleText.indexOf('->');
      if (arrowIdx < 0) return null;
      
      const lhs = ruleText.slice(0, arrowIdx).trim();
      const rhs = ruleText.slice(arrowIdx + 2).trim();
      
      // Check if multi-tape format (starts with parenthesis)
      if (lhs.startsWith('(')) {
        // Multi-tape format: (r1,r2,...)->(w1,w2,...),(m1,m2,...)
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
        if (!moves.every(m => m === 'L' || m === 'R' || m === 'S')) return null;
        
        return {
          reads: normalizedReads,
          writes: normalizedWrites,
          moves: moves as ('L' | 'R' | 'S')[],
        };
      } else {
        // Single-tape format (legacy): read->write,move
        const read = normalizeTmSymbol(lhs);
        const rhsParts = rhs.split(',').map(s => s.trim());
        if (rhsParts.length !== 2) return null;
        const [writeRaw, moveRaw] = rhsParts;
        const write = normalizeTmSymbol(writeRaw);
        const move = moveRaw.toUpperCase();
        if (!read || !write || (move !== 'L' && move !== 'R' && move !== 'S')) return null;
        
        // Return in multi-tape format with single element arrays
        return { 
          reads: [read], 
          writes: [write], 
          moves: [move as 'L' | 'R' | 'S'],
        };
      }
    })
    .filter((r): r is TmRule => r !== null);
};

/**
 * Validate TM label format.
 * Accepts both single-tape and multi-tape formats.
 */
export const isValidTmLabel = (label?: string, expectedTapeCount: number = 1): boolean => {
  if (!label) return false;
  const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
  if (chunks.length === 0) return false;
  const parsed = parseTmRules(label, expectedTapeCount);
  if (parsed.length !== chunks.length) return false;
  
  // For multi-tape, verify tape count matches expected
  if (expectedTapeCount > 1) {
    return parsed.every(rule => rule.reads.length === expectedTapeCount);
  }
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

export const toFaLabelFromPda = (label: string, targetMode: ModeType): string => {
  const rules = parsePdaRules(label);
  if (rules.length === 0) return label;
  const uniqueInputs = Array.from(new Set(rules.map(r => normalizeEpsilonSymbol(r.input))));
  const normalized = targetMode === 'eNFA'
    ? uniqueInputs
    : uniqueInputs.filter(s => s !== 'ε' && s !== 'e');
  return normalized.join(',');
};

export const toPdaLabelFromFa = (label: string): string => {
  const raw = (label || '').trim();
  if (!raw) return '';
  if (parsePdaRules(raw).length > 0) return raw;
  const symbols = raw.split(',').map(s => normalizeEpsilonSymbol(s.trim())).filter(Boolean);
  if (symbols.length === 0) return '';
  return symbols.map(sym => `${sym},${PDA_STACK_START}->${PDA_STACK_START}`).join('; ');
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
