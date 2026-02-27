'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw, Download, ChevronRight, Info, Cpu, FileCode2, Brain, BookOpen, Shield } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Region: Types
// ─────────────────────────────────────────────────────────────────
type LangMode = 'RL' | 'CFL' | 'CSL' | 'REL';

// ─── RL types ────────────────────────────────────────────────────
type NFATrans = Map<number, Map<string, Set<number>>>;
interface NFA {
  start: number;
  accept: Set<number>;
  trans: NFATrans;
}
interface RLStep {
  pos: number;
  symbol: string;
  states: number[];
  isEps?: boolean;
}

// ─── CFL types ───────────────────────────────────────────────────
type CFGProds = Map<string, string[][]>;
interface CFLResult {
  accepted: boolean;
  table: Set<string>[][];
  cnfLines: string[];
  steps: Array<{ i: number; l: number; k: number; rule: string; added: string }>;
  error?: string;
}

// ─── CSL types ──────────────────────────────────────────────────
interface CSGRule {
  lhs: string[];
  rhs: string[];
}
interface CSLStep {
  form: string[];
  appliedRule: string;
  position: number;
}
interface CSLResult {
  accepted: boolean;
  derivation: CSLStep[];
  explored: number;
  error?: string;
}

// ─── REL (TM) types ──────────────────────────────────────────────
interface TMTrans {
  from: string; read: string;
  to: string; write: string;
  move: 'L' | 'R' | 'S';
}
interface TMConfig {
  state: string;
  tape: string[];
  head: number;
  note: string;
}

// ─────────────────────────────────────────────────────────────────
// Region: RL — Thompson NFA + simulation
// ─────────────────────────────────────────────────────────────────
const isLit = (c: string) => /[a-zA-Z0-9ε]/.test(c);

function addConcat(expr: string): string {
  const out: string[] = [];
  for (let i = 0; i < expr.length; i++) {
    const a = expr[i], b = expr[i + 1];
    out.push(a);
    if (!b) continue;
    const need = (isLit(a) || a === ')' || a === '*') && (isLit(b) || b === '(');
    if (need) out.push('.');
  }
  return out.join('');
}

function toPostfix(expr: string): string {
  const prec: Record<string, number> = { '|': 1, '+': 1, '.': 2, '*': 3 };
  const out: string[] = [], st: string[] = [];
  for (const tok of expr) {
    if (isLit(tok)) { out.push(tok); }
    else if (tok === '(') { st.push(tok); }
    else if (tok === ')') {
      while (st.length && st[st.length - 1] !== '(') out.push(st.pop()!);
      if (!st.length) throw new Error('Mismatched parentheses');
      st.pop();
    } else if (tok in prec) {
      while (st.length && st[st.length - 1] !== '(' && prec[st[st.length - 1]] >= prec[tok]) out.push(st.pop()!);
      st.push(tok === '+' ? '|' : tok);
    } else throw new Error(`Invalid token: ${tok}`);
  }
  while (st.length) {
    const t = st.pop()!;
    if (t === '(') throw new Error('Mismatched parentheses');
    out.push(t);
  }
  return out.join('');
}

let _nfaId = 0;
function newState(): number { return _nfaId++; }
function addTrans(t: NFATrans, from: number, sym: string, to: number) {
  if (!t.has(from)) t.set(from, new Map());
  const m = t.get(from)!;
  if (!m.has(sym)) m.set(sym, new Set());
  m.get(sym)!.add(to);
}

function buildNFA(postfix: string): NFA {
  _nfaId = 0;
  const trans: NFATrans = new Map();
  type Frag = { start: number; end: number };
  const st: Frag[] = [];

  for (const t of postfix) {
    if (isLit(t)) {
      const s = newState(), e = newState();
      addTrans(trans, s, t === 'ε' ? 'ε' : t, e);
      st.push({ start: s, end: e });
    } else if (t === '.') {
      const b = st.pop()!, a = st.pop()!;
      addTrans(trans, a.end, 'ε', b.start);
      st.push({ start: a.start, end: b.end });
    } else if (t === '|') {
      const b = st.pop()!, a = st.pop()!;
      const s = newState(), e = newState();
      addTrans(trans, s, 'ε', a.start);
      addTrans(trans, s, 'ε', b.start);
      addTrans(trans, a.end, 'ε', e);
      addTrans(trans, b.end, 'ε', e);
      st.push({ start: s, end: e });
    } else if (t === '*') {
      const a = st.pop()!;
      const s = newState(), e = newState();
      addTrans(trans, s, 'ε', a.start);
      addTrans(trans, s, 'ε', e);
      addTrans(trans, a.end, 'ε', a.start);
      addTrans(trans, a.end, 'ε', e);
      st.push({ start: s, end: e });
    }
  }
  if (st.length !== 1) throw new Error('Invalid expression');
  const res = st[0];
  return { start: res.start, accept: new Set([res.end]), trans };
}

function epsClosure(states: Set<number>, trans: NFATrans): Set<number> {
  const visited = new Set(states);
  const queue = [...states];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const nx of trans.get(cur)?.get('ε') ?? []) {
      if (!visited.has(nx)) { visited.add(nx); queue.push(nx); }
    }
  }
  return visited;
}

function nfaMove(states: Set<number>, sym: string, trans: NFATrans): Set<number> {
  const result = new Set<number>();
  for (const s of states) {
    for (const nx of trans.get(s)?.get(sym) ?? []) result.add(nx);
  }
  return result;
}

function simulateNFA(nfa: NFA, input: string): { accepted: boolean; steps: RLStep[] } {
  const steps: RLStep[] = [];
  let cur = epsClosure(new Set([nfa.start]), nfa.trans);
  steps.push({ pos: -1, symbol: 'start', states: [...cur].sort((a, b) => a - b) });
  for (let i = 0; i < input.length; i++) {
    const sym = input[i];
    cur = epsClosure(nfaMove(cur, sym, nfa.trans), nfa.trans);
    steps.push({ pos: i, symbol: sym, states: [...cur].sort((a, b) => a - b) });
  }
  const accepted = [...cur].some(s => nfa.accept.has(s));
  return { accepted, steps };
}

function checkRL(re: string, input: string): { accepted: boolean; steps: RLStep[]; error?: string } {
  try {
    const norm = addConcat(re.replace(/\s/g, ''));
    const pf = toPostfix(norm);
    const nfa = buildNFA(pf);
    return simulateNFA(nfa, input);
  } catch (e) {
    return { accepted: false, steps: [], error: (e as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────────
// Region: CFL — CNF conversion + CYK
// ─────────────────────────────────────────────────────────────────
function parseGrammar(text: string): { prods: CFGProds; start: string; error?: string } {
  const prods: CFGProds = new Map();
  let start = '';
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#'));
  for (const line of lines) {
    const [lhsRaw, rhsRaw] = line.split(/->|→/).map(s => s.trim());
    if (!lhsRaw || !rhsRaw) return { prods, start, error: `Bad rule: "${line}"` };
    const lhs = lhsRaw.trim();
    if (!start) start = lhs;
    const alts = rhsRaw.split('|').map(alt => {
      const toks = alt.trim().split(/\s+/).filter(Boolean);
      // handle ε / epsilon
      return toks.map(t => (t === 'e' || t === 'epsilon' || t === 'ε') ? 'ε' : t);
    });
    if (!prods.has(lhs)) prods.set(lhs, []);
    prods.get(lhs)!.push(...alts);
  }
  if (!start) return { prods, start, error: 'Empty grammar' };
  return { prods, start };
}

function toCNF(prods: CFGProds, startSym: string): { cnf: CFGProds; cnfLines: string[]; newStart: string } {
  let counter = 0;
  const fresh = (prefix: string) => `${prefix}${counter++}`;

  // Deep clone
  let P: CFGProds = new Map();
  for (const [k, v] of prods) P.set(k, v.map(a => [...a]));

  // Step 1: New start symbol
  const newStart = fresh('S_');
  P.set(newStart, [[startSym]]);

  // Step 2: Remove ε-productions
  // Find nullable variables
  const nullable = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [A, rules] of P) {
      if (!nullable.has(A) && rules.some(r => r.every(s => s === 'ε' || nullable.has(s)))) {
        nullable.add(A);
        changed = true;
      }
    }
  }
  // For each production, add versions with nullables removed
  const newP: CFGProds = new Map();
  for (const [A, rules] of P) {
    const expanded = new Set<string>();
    for (const r of rules) {
      const nullIndices: number[] = r.map((s, i) => nullable.has(s) && s !== 'ε' ? i : -1).filter(i => i >= 0);
      const variants = 1 << nullIndices.length;
      for (let mask = 0; mask < variants; mask++) {
        const newR = r.filter((s, i) => {
          const ni = nullIndices.indexOf(i);
          return s === 'ε' ? false : (ni < 0 || (mask >> ni) & 1);
        });
        if (newR.length > 0) expanded.add(newR.join('\x00'));
      }
    }
    const finalRules: string[][] = [...expanded].map(s => s.split('\x00'));
    if (finalRules.length) newP.set(A, finalRules);
  }
  // Add ε back only for new start if original start was nullable
  if (nullable.has(startSym) && newP.has(newStart)) {
    newP.get(newStart)!.push(['ε']);
  }
  P = newP;

  // Step 3: Remove unit productions
  for (let iter = 0; iter < 20; iter++) {
    let anyUnit = false;
    const nextP: CFGProds = new Map();
    for (const [A, rules] of P) {
      const newRules: string[][] = [];
      for (const r of rules) {
        if (r.length === 1 && P.has(r[0]) && r[0] !== A) {
          // unit production: A -> B, replace with B's rules
          for (const br of P.get(r[0])!) newRules.push([...br]);
          anyUnit = true;
        } else {
          newRules.push(r);
        }
      }
      // deduplicate
      const seen = new Set<string>();
      const deduped: string[][] = [];
      for (const r of newRules) {
        const k = r.join('\x00');
        if (!seen.has(k)) { seen.add(k); deduped.push(r); }
      }
      nextP.set(A, deduped);
    }
    P = nextP;
    if (!anyUnit) break;
  }

  // Step 4: Replace terminals in mixed/length>2 productions
  const termMap = new Map<string, string>();
  const getTermVar = (t: string) => {
    if (!termMap.has(t)) { const v = fresh('T_'); termMap.set(t, v); P.set(v, [[t]]); }
    return termMap.get(t)!;
  };

  // First, identify all variables once
  const vars = new Set(P.keys());

  const P2: CFGProds = new Map();
  for (const [A, rules] of P) {
    const newRules: string[][] = [];
    for (const r of rules) {
      if (r.length === 1) { newRules.push(r); continue; }
      if (r[0] === 'ε') { newRules.push(r); continue; }
      // Replace terminal symbols in multi-symbol rules
      const replaced = r.map(s => (!vars.has(s) && s !== 'ε') ? getTermVar(s) : s);
      newRules.push(replaced);
    }
    P2.set(A, newRules);
  }
  P = P2;

  // Step 5: Break long productions
  const P3: CFGProds = new Map();
  for (const [A, rules] of P) {
    const newRules: string[][] = [];
    for (const r of rules) {
      if (r.length <= 2 || r[0] === 'ε') { newRules.push(r); continue; }
      let cur = A;
      let rest = [...r];
      while (rest.length > 2) {
        const nv = fresh('X_');
        // We'll add the new variable rule later
        const newRule = [rest[0], nv];
        if (cur === A) newRules.push(newRule);
        else {
          if (!P3.has(cur)) P3.set(cur, []);
          P3.get(cur)!.push(newRule);
        }
        rest = rest.slice(1);
        cur = nv;
      }
      if (!P3.has(cur)) P3.set(cur, []);
      P3.get(cur)!.push(rest);
    }
    if (!P3.has(A)) P3.set(A, []);
    P3.get(A)!.push(...newRules.filter(r => !P3.get(A)?.some(x => x.join('') === r.join(''))));
  }
  // Merge P3 with remaining P variables
  for (const [A, rules] of P) {
    if (!P3.has(A)) P3.set(A, rules);
  }
  P = P3;

  // Build display lines
  const cnfLines: string[] = [];
  for (const [A, rules] of P) {
    const rhs = rules.map(r => r.join(' ')).join(' | ');
    cnfLines.push(`${A} → ${rhs}`);
  }

  return { cnf: P, cnfLines, newStart };
}

function runCYK(cnf: CFGProds, start: string, input: string): CFLResult {
  if (input === '' || input === 'ε') {
    const accepted = cnf.get(start)?.some(r => r[0] === 'ε') ?? false;
    return { accepted, table: [], cnfLines: [], steps: [] };
  }
  const n = input.length;
  // table[i][l] = set of variables that derive input.slice(i, i+l+1)
  const table: Set<string>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set<string>())
  );
  const steps: CFLResult['steps'] = [];

  // Fill length-1 substrings
  for (let i = 0; i < n; i++) {
    const sym = input[i];
    for (const [A, rules] of cnf) {
      if (rules.some(r => r.length === 1 && r[0] === sym)) {
        table[i][0].add(A);
        steps.push({ i, l: 0, k: 0, rule: `${A} → ${sym}`, added: A });
      }
    }
  }

  // Fill longer substrings
  for (let l = 1; l < n; l++) {
    for (let i = 0; i < n - l; i++) {
      for (let k = 0; k < l; k++) {
        for (const [A, rules] of cnf) {
          for (const r of rules) {
            if (r.length === 2) {
              const [B, C] = r;
              if (table[i][k].has(B) && table[i + k + 1][l - k - 1].has(C)) {
                if (!table[i][l].has(A)) {
                  table[i][l].add(A);
                  steps.push({ i, l, k, rule: `${A} → ${B} ${C}`, added: A });
                }
              }
            }
          }
        }
      }
    }
  }

  const accepted = table[0][n - 1].has(start);
  return { accepted, table, cnfLines: [], steps };
}

function checkCFL(grammarText: string, input: string): CFLResult & { cnfLines: string[] } {
  const { prods, start, error } = parseGrammar(grammarText);
  if (error) return { accepted: false, table: [], cnfLines: [], steps: [], error };
  try {
    const { cnf, cnfLines, newStart } = toCNF(prods, start);
    const result = runCYK(cnf, newStart, input);
    return { ...result, cnfLines };
  } catch (e) {
    return { accepted: false, table: [], cnfLines: [], steps: [], error: (e as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────────
// Region: CSL — Context-Sensitive Grammar BFS membership
// ─────────────────────────────────────────────────────────────────
function parseCSG(text: string): { rules: CSGRule[]; start: string; error?: string } {
  const rules: CSGRule[] = [];
  let start = '';
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#'));

  for (const line of lines) {
    const arrowIdx = line.search(/->|→/);
    if (arrowIdx < 0) return { rules, start, error: `Bad rule (missing ->): "${line}"` };
    const lhsStr = line.slice(0, arrowIdx).trim();
    const rhsStr = line.slice(arrowIdx + (line[arrowIdx + 1] === '>' ? 2 : 1)).trim();
    const lhs = lhsStr.split(/\s+/).filter(Boolean);
    if (lhs.length === 0) return { rules, start, error: `Empty LHS: "${line}"` };
    // Start symbol = first uppercase variable on any LHS (first occurrence)
    if (!start) {
      const firstVar = lhs.find(s => /^[A-Z]/.test(s));
      if (firstVar) start = firstVar;
    }
    for (const alt of rhsStr.split('|')) {
      const toks = alt.trim().split(/\s+/).filter(Boolean);
      const rhs = toks.map(t => (t === 'e' || t === 'epsilon' || t === 'ε') ? 'ε' : t);
      const rhsClean = rhs[0] === 'ε' ? [] : rhs;
      // CSG constraint: |rhs| >= |lhs|, except start → ε
      if (rhsClean.length > 0 && rhsClean.length < lhs.length) {
        return { rules, start, error: `Rule "${lhsStr} -> ${alt.trim()}" violates CSG constraint (|RHS| must be ≥ |LHS|)` };
      }
      rules.push({ lhs, rhs: rhsClean.length > 0 ? rhsClean : ['ε'] });
    }
  }
  if (!start) return { rules, start, error: 'Empty grammar or no uppercase variable found on LHS' };
  return { rules, start };
}

const CSL_MAX_EXPLORE = 3000;

function checkCSL(grammarText: string, input: string): CSLResult {
  const { rules, start, error } = parseCSG(grammarText);
  if (error) return { accepted: false, derivation: [], explored: 0, error };

  const targetSymbols = input.length === 0 ? [] : [...input];
  const targetKey = targetSymbols.join('\x00');
  const targetLen = targetSymbols.length;

  // Handle ε — start symbol directly produces empty?
  const startForm = [start];
  if (targetLen === 0) {
    const hasEpsRule = rules.some(r => r.lhs.length === 1 && r.lhs[0] === start && r.rhs[0] === 'ε');
    return {
      accepted: hasEpsRule,
      derivation: hasEpsRule ? [{ form: [], appliedRule: `${start} → ε`, position: 0 }] : [],
      explored: 1,
    };
  }

  if (startForm.join('\x00') === targetKey) {
    return { accepted: true, derivation: [{ form: startForm, appliedRule: 'start', position: 0 }], explored: 1 };
  }

  type QItem = { form: string[]; path: CSLStep[] };
  const visited = new Set<string>([startForm.join('\x00')]);
  const queue: QItem[] = [{ form: startForm, path: [] }];
  let explored = 0;

  while (queue.length > 0 && explored < CSL_MAX_EXPLORE) {
    const { form, path } = queue.shift()!;
    explored++;

    for (const rule of rules) {
      if (rule.rhs[0] === 'ε') continue; // skip ε-rules in mid-derivation for non-empty target
      const lhsLen = rule.lhs.length;
      for (let pos = 0; pos <= form.length - lhsLen; pos++) {
        const match = form.slice(pos, pos + lhsLen).every((s, i) => s === rule.lhs[i]);
        if (!match) continue;

        const newForm = [...form.slice(0, pos), ...rule.rhs, ...form.slice(pos + lhsLen)];
        // CSG pruning: length can only stay same or grow — skip if exceeds target
        if (newForm.length > targetLen) continue;

        const newKey = newForm.join('\x00');
        const ruleStr = `${rule.lhs.join(' ')} → ${rule.rhs.join(' ')}`;
        const step: CSLStep = { form: newForm, appliedRule: ruleStr, position: pos };

        if (newKey === targetKey) {
          return { accepted: true, derivation: [...path, step], explored };
        }
        if (!visited.has(newKey)) {
          visited.add(newKey);
          queue.push({ form: newForm, path: [...path, step] });
        }
      }
    }
  }

  return { accepted: false, derivation: [], explored };
}

// ─────────────────────────────────────────────────────────────────
// Region: REL — TM simulation
// ─────────────────────────────────────────────────────────────────
function parseTM(text: string): { trans: TMTrans[]; start: string; accepts: Set<string>; rejects: Set<string>; error?: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#'));
  let start = 'q0';
  const accepts = new Set<string>();
  const rejects = new Set<string>();
  const trans: TMTrans[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('start:')) { start = line.split(':')[1].trim(); continue; }
    if (lower.startsWith('accept:')) { line.split(':')[1].split(',').forEach(s => accepts.add(s.trim())); continue; }
    if (lower.startsWith('reject:')) { line.split(':')[1].split(',').forEach(s => rejects.add(s.trim())); continue; }

    // Format: state, read -> nextState, write, dir
    const m = line.match(/^(\S+)\s*,\s*(\S+)\s*->\s*(\S+)\s*,\s*(\S+)\s*,\s*([LRS])$/i);
    if (m) {
      trans.push({ from: m[1], read: m[2], to: m[3], write: m[4], move: m[5].toUpperCase() as 'L' | 'R' | 'S' });
    } else {
      return { trans, start, accepts, rejects, error: `Invalid transition: "${line}"\nFormat: state, read -> nextState, write, L/R/S` };
    }
  }
  if (accepts.size === 0) return { trans, start, accepts, rejects, error: 'No accept states defined (add "accept: qacc" line)' };
  return { trans, start, accepts, rejects };
}

const TM_BLANK = '_';
const TM_MAX = 300;

function simulateTM(trans: TMTrans[], start: string, accepts: Set<string>, rejects: Set<string>, input: string): { accepted: boolean; configs: TMConfig[]; halted: boolean } {
  const tape = [...(input || TM_BLANK)];
  let head = 0, state = start;
  const configs: TMConfig[] = [{ state, tape: [...tape], head, note: 'Initial configuration' }];

  for (let step = 0; step < TM_MAX; step++) {
    if (accepts.has(state)) return { accepted: true, configs, halted: true };
    if (rejects.has(state)) return { accepted: false, configs, halted: true };
    const sym = tape[head] ?? TM_BLANK;
    const rule = trans.find(t => t.from === state && t.read === sym);
    if (!rule) {
      configs[configs.length - 1] = { ...configs[configs.length - 1], note: `No transition for (${state}, ${sym}) — halt reject` };
      return { accepted: false, configs, halted: true };
    }
    tape[head] = rule.write;
    state = rule.to;
    if (rule.move === 'R') { head++; if (head >= tape.length) tape.push(TM_BLANK); }
    else if (rule.move === 'L') { head = Math.max(0, head - 1); }
    configs.push({ state, tape: [...tape], head, note: `Apply: ${rule.from},${rule.read} → ${rule.to},${rule.write},${rule.move}` });
  }
  return { accepted: false, configs, halted: false };
}

// ─────────────────────────────────────────────────────────────────
// Region: Mode Info
// ─────────────────────────────────────────────────────────────────
const MODE_INFO = {
  RL: {
    label: 'Regular Language',
    short: 'RL',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-400',
    icon: FileCode2,
    description: 'Recognized by DFA/NFA. Described by Regular Expressions.',
    exprLabel: 'Regular Expression',
    exprPlaceholder: '(0+1)*abb  or  (a|b)*abb',
    exprHint: 'Operators: | or + (union), * (Kleene star), () grouping. Literals: a–z 0–9 ε  e.g. (0+1)* = {0,1}*',
    inputLabel: 'Test String (leave blank to test empty string)',
    inputPlaceholder: 'e.g. aabb',
    example: { expr: '(a|b)*abb', input: 'aabb' },
    exports: [{ label: 'Open in RE → ε-NFA Converter', href: (expr: string) => `/converter/re-to-enfa?re=${encodeURIComponent(expr)}` }],
  },
  CFL: {
    label: 'Context-Free Language',
    short: 'CFL',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    activeBorder: 'border-green-400',
    icon: Cpu,
    description: 'Recognized by PDA. Described by Context-Free Grammars (CFG).',
    exprLabel: 'Context-Free Grammar (one rule per line)',
    exprPlaceholder: 'S -> a S b | ε',
    exprHint: 'Format: A -> α | β   Use ε for the empty string. First rule\'s LHS = start symbol.',
    inputLabel: 'Test String (leave blank or ε for empty)',
    inputPlaceholder: 'e.g. aabb',
    example: { expr: 'S -> a S b | ε', input: 'aabb' },
    exports: [],
  },
  CSL: {
    label: 'Context-Sensitive Language',
    short: 'CSL',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    activeBorder: 'border-yellow-400',
    icon: Shield,
    description: 'Recognized by LBA (Linear Bounded Automaton). Described by Context-Sensitive Grammars (CSG).',
    exprLabel: 'Context-Sensitive Grammar (space-separated symbols)',
    exprPlaceholder: 'S -> a b C\nS -> a S B C\nC B -> B C\na B -> a b\nb B -> b b\nb C -> b c\nc C -> c c',
    exprHint: 'Format: LHS symbols (space-separated) -> RHS symbols | alt\nCSG rule: |RHS| ≥ |LHS|. Uppercase = variable, lowercase = terminal. First uppercase on LHS = start symbol.',
    inputLabel: 'Test String',
    inputPlaceholder: 'e.g. aabbcc',
    example: {
      expr: 'S -> a b C\nS -> a S B C\nC B -> B C\na B -> a b\nb B -> b b\nb C -> b c\nc C -> c c',
      input: 'aabbcc',
    },
    exports: [],
  },
  REL: {
    label: 'Recursively Enumerable Language',
    short: 'REL',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    activeBorder: 'border-orange-400',
    icon: Brain,
    description: 'Recognized by Turing Machines. Most general class in the Chomsky hierarchy.',
    exprLabel: 'Turing Machine Transitions',
    exprPlaceholder: 'start: q0\naccept: qacc\nreject: qrej\nq0, a -> q0, a, R\nq0, _ -> qacc, _, S',
    exprHint: 'Format: state, read -> nextState, write, L/R/S\nLines "start:", "accept:", "reject:" configure the machine. Blank symbol = _',
    inputLabel: 'Input Tape',
    inputPlaceholder: 'e.g. ab',
    example: {
      expr: 'start: q0\naccept: qacc\nreject: qrej\n// Accept any string of a\'s\nq0, a -> q0, a, R\nq0, _ -> qacc, _, S\nq0, b -> qrej, b, S',
      input: 'aaa',
    },
    exports: [{ label: 'Open in Visualizer (DTM mode)', href: () => `/visualizer` }],
  },
};

// ─────────────────────────────────────────────────────────────────
// Region: Sub-components
// ─────────────────────────────────────────────────────────────────
function ResultBadge({ accepted }: { accepted: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${accepted ? 'bg-emerald-900/30 border-emerald-600 text-emerald-400' : 'bg-red-900/30 border-red-700 text-red-400'}`}>
      {accepted ? '✓ ACCEPT' : '✗ REJECT'}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{children}</div>;
}

// ─── RL Trace ─────────────────────────────────────────────────────
function RLTrace({ steps, input, acceptStates, error }: { steps: RLStep[]; input: string; acceptStates: number[]; error?: string }) {
  if (error) return <div className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded p-3">{error}</div>;
  if (!steps.length) return null;
  return (
    <div className="space-y-3">
      <SectionTitle>NFA Simulation Trace</SectionTitle>
      <div className="text-xs text-slate-500 mb-1">Accepting states: {acceptStates.map(s => `q${s}`).join(', ')}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
              <th className="px-2 py-1.5 text-left w-8">#</th>
              <th className="px-2 py-1.5 text-left">Input read</th>
              <th className="px-2 py-1.5 text-left">Active NFA states</th>
              <th className="px-2 py-1.5 text-left">Contains accept?</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, idx) => {
              const hasAccept = step.states.some(s => acceptStates.includes(s));
              const isLast = idx === steps.length - 1;
              return (
                <tr key={idx} className={`border-b border-slate-800/40 ${isLast ? 'bg-slate-900/40' : ''}`}>
                  <td className="px-2 py-1.5 text-slate-600">{idx}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {step.symbol === 'start' ? <span className="text-slate-500 italic">—</span> : (
                      <span>
                        <span className="text-slate-500">{input.slice(0, step.pos)}</span>
                        <span className="bg-blue-700/40 text-blue-200 px-0.5 rounded">{step.symbol}</span>
                        <span className="text-slate-500">{input.slice(step.pos + 1)}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 font-mono">
                    <span className="flex flex-wrap gap-1">
                      {step.states.length === 0
                        ? <span className="text-red-500">∅ (dead)</span>
                        : step.states.map(s => (
                          <span key={s} className={`px-1.5 py-0.5 rounded border text-[10px] ${acceptStates.includes(s) ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                            q{s}
                          </span>
                        ))}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    {isLast && (hasAccept ? <span className="text-emerald-400 font-bold text-xs">Yes ✓</span> : <span className="text-red-400 font-bold text-xs">No ✗</span>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CFL Trace ────────────────────────────────────────────────────
function CFLTrace({ result, input }: { result: (CFLResult & { cnfLines: string[] }) | null; input: string }) {
  if (!result) return null;
  if (result.error) return <div className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded p-3">{result.error}</div>;
  if (!result.table.length && input !== '' && input !== 'ε') return null;

  const n = input.length;
  const chars = [...input];

  return (
    <div className="space-y-4">
      {result.cnfLines.length > 0 && (
        <div>
          <SectionTitle>Grammar in CNF (Chomsky Normal Form)</SectionTitle>
          <div className="bg-slate-900/60 border border-slate-800 rounded p-3 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
            {result.cnfLines.map((l, i) => <div key={i} className="text-slate-300">{l}</div>)}
          </div>
        </div>
      )}

      {n > 0 && result.table.length > 0 && (
        <div>
          <SectionTitle>CYK Parse Table</SectionTitle>
          <p className="text-[10px] text-slate-500 mb-2">Cell (i, l) = variables that derive substring of length <em>l+1</em> starting at position <em>i</em>. Top-right cell contains start symbol if accepted.</p>
          <div className="overflow-x-auto">
            <table className="text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="px-1 py-1 text-slate-600 text-right">pos→</th>
                  {chars.map((c, i) => <th key={i} className="px-2 py-1 text-slate-400 font-mono min-w-[60px] text-center">{i}: {c}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: n }, (_, l) => (
                  <tr key={l} className="border-t border-slate-800/40">
                    <td className="px-2 py-1 text-slate-600 text-right">len {l + 1}</td>
                    {Array.from({ length: n }, (_, i) => {
                      if (i + l >= n) return <td key={i} className="px-2 py-1 text-center text-slate-800">—</td>;
                      const cell = result.table[i][l];
                      const isTarget = i === 0 && l === n - 1;
                      return (
                        <td key={i} className={`px-2 py-1 text-center border-l border-slate-800/30 min-w-[60px] ${isTarget ? 'bg-blue-900/20 border border-blue-800/50' : ''}`}>
                          {cell.size === 0
                            ? <span className="text-slate-700">∅</span>
                            : <span className="flex flex-wrap gap-0.5 justify-center">
                              {[...cell].map(v => <span key={v} className="bg-slate-800 text-slate-300 px-1 rounded">{v}</span>)}
                            </span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.steps.length > 0 && (
        <div>
          <SectionTitle>CYK Fill Steps (first 30)</SectionTitle>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {result.steps.slice(0, 30).map((s, i) => (
              <div key={i} className="text-xs flex items-center gap-2 bg-slate-900/50 border border-slate-800/50 rounded px-2 py-1">
                <span className="text-slate-600 shrink-0 w-5">{i + 1}</span>
                <span className="text-emerald-400 font-mono shrink-0">{s.rule}</span>
                <span className="text-slate-500 shrink-0">→</span>
                <span className="text-slate-400">
                  span [{s.i}..{s.i + s.l}] = &quot;{input.slice(s.i, s.i + s.l + 1)}&quot;
                </span>
              </div>
            ))}
            {result.steps.length > 30 && <div className="text-xs text-slate-600 text-center">+ {result.steps.length - 30} more steps</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSL Trace ──────────────────────────────────────────────────
function CSLTrace({ result }: { result: CSLResult }) {
  if (result.error) return <div className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded p-3 whitespace-pre-wrap">{result.error}</div>;
  if (!result.derivation.length && !result.accepted) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-red-400 bg-red-950/20 border border-red-800/30 rounded p-3">
          No accepting derivation found after exploring <span className="font-bold">{result.explored}</span> sentential forms.
        </div>
        <div className="text-xs text-slate-600">The string is either not in the language, or the BFS limit ({CSL_MAX_EXPLORE} forms) was reached.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle>CSG Derivation Trace</SectionTitle>
      <div className="text-xs text-slate-500 mb-2">
        BFS explored <span className="text-slate-300 font-bold">{result.explored}</span> sentential forms to find this derivation ({result.derivation.length} steps).
      </div>

      <div className="space-y-2">
        {result.derivation.map((step, idx) => {
          const isLast = idx === result.derivation.length - 1;
          return (
            <div key={idx} className={`rounded border px-3 py-2 text-xs font-mono ${
              isLast ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-slate-900/40 border-slate-800/50'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-slate-600 shrink-0 w-5">{idx + 1}</span>
                <span className="text-yellow-400 text-[10px] uppercase tracking-wide">{step.appliedRule}</span>
                {isLast && <span className="ml-auto text-emerald-400 text-[10px] font-bold">✓ derived</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {step.form.map((sym, si) => {
                  const isVar = /^[A-Z]/.test(sym);
                  // Highlight the symbols at the applied position range
                  const ruleLen = parseInt('0'); // placeholder for visual
                  return (
                    <span
                      key={si}
                      className={`px-1.5 py-0.5 rounded border text-[11px] ${
                        isVar
                          ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {sym}
                    </span>
                  );
                  void ruleLen;
                })}
                {step.form.length === 0 && <span className="text-slate-500 italic">ε (empty)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── REL Trace ────────────────────────────────────────────────────
function RELTrace({ configs, halted, error }: { configs: TMConfig[]; halted: boolean; error?: string }) {
  if (error) return <div className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded p-3">{error}</div>;
  if (!configs.length) return null;
  return (
    <div className="space-y-3">
      <SectionTitle>TM Tape Configurations</SectionTitle>
      {!halted && <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded p-2">⚠ Maximum step limit ({TM_MAX}) reached — may not halt.</div>}
      <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono">
        {configs.map((cfg, idx) => (
          <div key={idx} className={`rounded border px-3 py-2 text-xs ${idx === configs.length - 1 ? 'border-blue-800/50 bg-blue-950/20' : 'border-slate-800/50 bg-slate-900/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500 w-6 shrink-0">{idx}</span>
              <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">{cfg.state}</span>
              <span className="text-slate-500 text-[10px]">{cfg.note}</span>
            </div>
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {cfg.tape.map((sym, ti) => (
                <div key={ti} className={`w-6 h-6 flex items-center justify-center border text-[11px] shrink-0 ${ti === cfg.head ? 'bg-orange-700/40 border-orange-500 text-orange-200 font-bold' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                  {sym}
                </div>
              ))}
              <div className="w-6 h-6 flex items-center justify-center border border-slate-800/50 border-dashed text-slate-700 text-[10px] shrink-0">_</div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-600 flex items-center gap-1">
        <div className="w-4 h-4 bg-orange-700/40 border border-orange-500 inline-block" />
        = head position
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Region: Main Page
// ─────────────────────────────────────────────────────────────────
export default function LanguageCheckerPage() {
  const [mode, setMode] = useState<LangMode>('RL');
  const [expr, setExpr] = useState('');
  const [testInput, setTestInput] = useState('');

  // RL state
  const [rlResult, setRlResult] = useState<{ accepted: boolean; steps: RLStep[]; acceptStates: number[]; error?: string } | null>(null);
  // CFL state
  const [cflResult, setCflResult] = useState<(CFLResult & { cnfLines: string[] }) | null>(null);
  // CSL state
  const [cslResult, setCslResult] = useState<CSLResult | null>(null);
  // REL state
  const [relResult, setRelResult] = useState<{ accepted: boolean; configs: TMConfig[]; halted: boolean; error?: string } | null>(null);

  const info = MODE_INFO[mode];

  const clearResults = useCallback(() => {
    setRlResult(null); setCflResult(null); setCslResult(null); setRelResult(null);
  }, []);

  const handleModeChange = useCallback((m: LangMode) => {
    setMode(m); setExpr(''); setTestInput(''); clearResults();
  }, [clearResults]);

  const handleCheck = useCallback(() => {
    clearResults();
    if (mode === 'RL') {
      const result = checkRL(expr, testInput);
      const nfa = (() => { try { return buildNFA(toPostfix(addConcat(expr.replace(/\s/g, '')))); } catch { return null; } })();
      setRlResult({ ...result, acceptStates: nfa ? [...nfa.accept] : [] });
    } else if (mode === 'CFL') {
      const result = checkCFL(expr, testInput);
      setCflResult(result);
    } else if (mode === 'CSL') {
      const result = checkCSL(expr, testInput);
      setCslResult(result);
    } else {
      const { trans, start, accepts, rejects, error } = parseTM(expr);
      if (error) { setRelResult({ accepted: false, configs: [], halted: false, error }); return; }
      const { accepted, configs, halted } = simulateTM(trans, start, accepts, rejects, testInput);
      setRelResult({ accepted, configs, halted });
    }
  }, [mode, expr, testInput, clearResults]);

  const hasResult = mode === 'RL' ? rlResult !== null : mode === 'CFL' ? cflResult !== null : mode === 'CSL' ? cslResult !== null : relResult !== null;
  const accepted = mode === 'RL' ? rlResult?.accepted : mode === 'CFL' ? cflResult?.accepted : mode === 'CSL' ? cslResult?.accepted : relResult?.accepted;

  const currentExports = useMemo(() => info.exports, [info.exports]);

  const handleUseExample = useCallback(() => {
    const ex = MODE_INFO[mode].example;
    setExpr(ex.expr); setTestInput(ex.input); clearResults();
  }, [mode, clearResults]);

  return (
    <div className="visualizer-root min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/automata" className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Language Acceptance Checker
            </h1>
            <p className="text-[11px] text-slate-500">Chomsky Hierarchy: RL · CFL · CSL · REL — step-by-step verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheck}
            disabled={!expr.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" /> Check
          </button>
          <button
            onClick={() => { setExpr(''); setTestInput(''); clearResults(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Inputs ────────────────── */}
        <div className="w-[360px] shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/20 overflow-y-auto">

          {/* Mode Selector */}
          <div className="p-4 border-b border-slate-800">
            <SectionTitle>Language Class (Chomsky Hierarchy)</SectionTitle>
            <div className="flex flex-col gap-2">
              {(['RL', 'CFL', 'CSL', 'REL'] as LangMode[]).map(m => {
                const mi = MODE_INFO[m];
                const Icon = mi.icon;
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${active ? `${mi.bg} ${mi.activeBorder} border` : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? mi.color : 'text-slate-600'}`} />
                    <div>
                      <div className={`text-sm font-semibold ${active ? mi.color : 'text-slate-400'}`}>
                        {m} — {mi.label}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{mi.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expression Input */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <SectionTitle>{info.exprLabel}</SectionTitle>
              <button onClick={handleUseExample} className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                Use example
              </button>
            </div>
            <textarea
              value={expr}
              onChange={e => setExpr(e.target.value)}
              placeholder={info.exprPlaceholder}
              rows={mode === 'REL' ? 8 : (mode === 'CFL' || mode === 'CSL') ? 6 : 2}
              spellCheck={false}
              className="w-full px-3 py-2 text-sm rounded bg-slate-950 border border-slate-700 focus:outline-none focus:border-teal-500 font-mono resize-none leading-relaxed"
            />
            <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{info.exprHint}</span>
            </div>
          </div>

          {/* Test String Input */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <SectionTitle>{info.inputLabel}</SectionTitle>
            <input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder={info.inputPlaceholder}
              spellCheck={false}
              className="w-full px-3 py-2 text-sm rounded bg-slate-950 border border-slate-700 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          {/* Chomsky Hierarchy Info */}
          <div className="p-4">
            <SectionTitle>Chomsky Hierarchy</SectionTitle>
            <div className="space-y-1.5 text-[10px]">
              {[
                { cls: 'Type 3 · RL', detail: 'Regular Grammar / DFA / NFA / RegEx', color: 'text-blue-400' },
                { cls: 'Type 2 · CFL', detail: 'Context-Free Grammar / PDA', color: 'text-green-400' },
                { cls: 'Type 1 · CSL', detail: 'Context-Sensitive Grammar / LBA', color: 'text-yellow-400' },
                { cls: 'Type 0 · REL', detail: 'Unrestricted Grammar / Turing Machine', color: 'text-orange-400' },
              ].map(h => (
                <div key={h.cls} className="flex gap-2">
                  <span className={`font-mono shrink-0 ${h.color}`}>{h.cls}</span>
                  <span className="text-slate-600">{h.detail}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-slate-600 border-t border-slate-800 pt-2">
              Each class is a strict superset of the one above it.<br />
              RL ⊂ CFL ⊂ CSL ⊂ REL
            </div>
          </div>
        </div>

        {/* ── Right Panel: Results ──────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Result summary bar */}
          {hasResult && (
            <div className={`shrink-0 flex items-center gap-4 px-6 py-3 border-b border-slate-800 ${accepted ? 'bg-emerald-950/20' : 'bg-red-950/20'}`}>
              <ResultBadge accepted={!!accepted} />
              <div className="text-sm text-slate-400">
                {mode === 'RL' && `String "${testInput || 'ε'}" ${accepted ? 'is accepted by' : 'is rejected by'} RE: ${expr}`}
                {mode === 'CFL' && `String "${testInput || 'ε'}" ${accepted ? 'is generated by' : 'is not generated by'} the grammar`}
                {mode === 'CSL' && `String "${testInput || 'ε'}" ${accepted ? 'is generated by' : 'is not generated by'} the CSG (explored ${cslResult?.explored} forms)`}
                {mode === 'REL' && `Tape "${testInput || '(empty)'}" ${accepted ? 'is accepted by' : 'is rejected by'} the TM (${relResult?.configs.length} steps)`}
              </div>
              {currentExports.length > 0 && (
                <div className="ml-auto flex gap-2">
                  {currentExports.map((ex, i) => (
                    <Link key={i} href={ex.href(expr)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600/20 hover:bg-teal-600/30 border border-teal-700/50 text-teal-300 rounded transition-colors">
                      <Download className="w-3 h-3" /> {ex.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main trace area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!hasResult && (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
                <BookOpen className="w-12 h-12 opacity-20" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-500 mb-1">Language Acceptance Checker</div>
                  <div className="text-sm">
                    Select a language class, enter an expression or grammar,<br />
                    provide a test string, then press <strong className="text-teal-400">Check</strong>.
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  {(['RL', 'CFL', 'CSL', 'REL'] as LangMode[]).map(m => {
                    const mi = MODE_INFO[m];
                    const Icon = mi.icon;
                    return (
                      <button key={m} onClick={() => { handleModeChange(m); setExpr(mi.example.expr); setTestInput(mi.example.input); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${mi.border} ${mi.bg} ${mi.color} text-sm hover:opacity-90 transition-opacity`}>
                        <Icon className="w-4 h-4" /> {m} Example
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'RL' && rlResult && (
              <RLTrace
                steps={rlResult.steps}
                input={testInput}
                acceptStates={rlResult.acceptStates}
                error={rlResult.error}
              />
            )}

            {mode === 'CFL' && cflResult && (
              <CFLTrace result={cflResult} input={testInput} />
            )}

            {mode === 'CSL' && cslResult && (
              <CSLTrace result={cslResult} />
            )}

            {mode === 'REL' && relResult && (
              <RELTrace
                configs={relResult.configs}
                halted={relResult.halted}
                error={relResult.error}
              />
            )}
          </div>

          {/* How it works footer */}
          {hasResult && (
            <div className="shrink-0 border-t border-slate-800 bg-slate-900/20 px-6 py-3">
              <div className="flex items-start gap-2 text-[11px] text-slate-500">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-600" />
                {mode === 'RL' && 'Algorithm: Thompson\'s construction (RE→NFA) then subset-based ε-closure simulation. Each row shows active NFA states after reading that character.'}
                {mode === 'CFL' && 'Algorithm: Grammar is converted to Chomsky Normal Form (CNF) then CYK dynamic programming fills a 2D table: cell (i,l) holds variables deriving the substring of length l+1 starting at i.'}
                {mode === 'CSL' && 'Algorithm: BFS over sentential forms bounded by |input| length (exploiting the CSG non-decreasing length property). Each step applies a rule αAβ→αγβ where |γ|≥|A|. Variables shown in yellow, terminals in grey.'}
                {mode === 'REL' && 'Algorithm: Turing Machine simulation. Each row shows the full tape and head position after one transition. Halts at accept/reject state or when no transition exists.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
