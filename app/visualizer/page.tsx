'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
  ConnectionMode,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Custom Node ---
type StateNodeProps = {
  data: { label: string; isStart?: boolean; isAccept?: boolean; isActive?: boolean };
  isConnectable?: boolean;
  selected?: boolean;
};

const StateNode: React.FC<StateNodeProps> = ({ data, isConnectable, selected }) => {
  let borderColor = '#64748b';
  let backgroundColor = '#1e293b';
  let textColor = '#e2e8f0';
  let borderWidth = '2px';
  let borderStyle = 'solid';
  let boxShadow = 'none';

  if (data.isStart) {
    borderColor = '#3b82f6';
    borderWidth = '2px';
  }
  if (data.isAccept) {
    borderStyle = 'double';
    borderWidth = '6px';
    borderColor = data.isStart ? '#3b82f6' : '#e2e8f0';
  }
  // Active (simulation running): amber/orange tone
  if (data.isActive) {
    borderColor = '#fb923c';
    backgroundColor = '#431407';
    boxShadow = '0 0 20px #fb923c';
    textColor = '#fdba74';
  }
  // Selected: cyan ring via box-shadow — layered on top of any existing shadow
  if (selected) {
    boxShadow = (boxShadow !== 'none' ? boxShadow + ', ' : '') + '0 0 0 3px #22d3ee, 0 0 10px #22d3ee99';
  }

  const handleStyle = { width: 12, height: 12, background: '#94a3b8' };

  return (
    <div
      style={{
        width: 60, height: 60, borderRadius: '50%',
        background: backgroundColor,
        border: `${borderWidth} ${borderStyle} ${borderColor}`,
        boxShadow: boxShadow,
        color: textColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div style={{ pointerEvents: 'none', userSelect: 'none' }}>{data.label}</div>
      {/* ID ของ Handle: t, r, b, l (สำคัญสำหรับการ map ค่า) */}
      <Handle type="source" position={Position.Top} id="t" isConnectable={isConnectable} style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" isConnectable={isConnectable} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={isConnectable} style={handleStyle} />
      <Handle type="source" position={Position.Left} id="l" isConnectable={isConnectable} style={handleStyle} />
    </div>
  );
};

const nodeTypes = { stateNode: StateNode };

function AutomataEditor() {
  const VISUALIZER_DRAFT_KEY = 'automata-visualizer-draft-v1';

  // --- Core State ---
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [mode, setMode] = useState<'DFA' | 'NFA' | 'eNFA' | 'DPDA' | 'NPDA' | 'DTM' | 'NTM' | 'LBA'>('NFA');
  const isPdaMode = mode === 'DPDA' || mode === 'NPDA';
  const isTmMode = mode === 'DTM' || mode === 'NTM' || mode === 'LBA';
  const uiSwal = Swal.mixin({
    background: '#0f172a',
    color: '#e2e8f0',
    confirmButtonColor: '#0ea5e9',
    cancelButtonColor: '#475569'
  });

  // --- Simulation State ---
  const [inputString, setInputString] = useState('');
  const [activeStates, setActiveStates] = useState<Set<string>>(new Set());
  const [stepIndex, setStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [simMessage, setSimMessage] = useState('Ready');
  const [history, setHistory] = useState<string[]>([]);
  const [pdaConfigs, setPdaConfigs] = useState<Array<{ state: string; stack: string[] }>>([]);
  const [tmConfigs, setTmConfigs] = useState<Array<{ state: string; tape: string[]; head: number }>>([]);
  const [simTimeline, setSimTimeline] = useState<Array<{ stepIndex: number; activeStates: string[]; pdaConfigs: Array<{ state: string; stack: string[] }>; tmConfigs: Array<{ state: string; tape: string[]; head: number }>; simMessage: string; history: string[] }>>([]);
  const [pdaStackView, setPdaStackView] = useState<'top' | 'raw'>('top');
  const hasHydratedRef = useRef(false);
  const runLoopRef = useRef<number | null>(null);
  
  const activeStatesRef = useRef(activeStates);
  const stepIndexRef = useRef(stepIndex);
  const edgesRef = useRef(edges);
  const nodesRef = useRef<Node[]>(nodes);
  const pdaConfigsRef = useRef(pdaConfigs);
  const tmConfigsRef = useRef(tmConfigs);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { activeStatesRef.current = activeStates; }, [activeStates]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { pdaConfigsRef.current = pdaConfigs; }, [pdaConfigs]);
  useEffect(() => { tmConfigsRef.current = tmConfigs; }, [tmConfigs]);

  // --- Types for import JSON ---
  type ModeType = 'DFA' | 'NFA' | 'eNFA' | 'DPDA' | 'NPDA' | 'DTM' | 'NTM' | 'LBA';
  interface ImportNode {
    id: string;
    position?: { x: number; y: number };
    isStart?: boolean;
    isAccept?: boolean;
    data?: { isStart?: boolean; isAccept?: boolean; label?: string };
  }
  interface ImportEdge {
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
  interface ImportData { metadata?: { type?: ModeType }; nodes: ImportNode[]; edges: ImportEdge[]; }
  type PdaRule = { input: string; pop: string; push: string };
  type PdaConfig = { state: string; stack: string[] };
  type TmRule = { read: string; write: string; move: 'L' | 'R' | 'S' };
  type TmConfig = { state: string; tape: string[]; head: number };
  const PDA_STACK_START = 'Z';
  const PDA_MAX_STACK_DEPTH = 30;
  const PDA_MAX_EPSILON_EXPANSIONS = 2000;
  const TM_BLANK = '□';
  const TM_MAX_STEPS = 500;

  // --- Helper Functions ---
  const isTransitionMatch = (edgeLabel: string, symbol: string) => {
    if (!edgeLabel) return false;
    if (isPdaMode) return false;
    const symbols = edgeLabel.split(',').map(s => s.trim()); 
    return symbols.includes(symbol);
  };

  const isEpsilon = (edgeLabel: string) => {
    if (!edgeLabel) return false;
    const symbols = edgeLabel.split(',').map(s => s.trim());
    return symbols.includes('e') || symbols.includes('ε');
  }

  const normalizeEpsilonSymbol = (value: string) => {
    return value === 'e' ? 'ε' : value;
  };

  const formatIssuesHtml = (issues: string[]) => {
    return `<div style="display:inline-block;text-align:left;max-width:100%;"><ul style="margin:0;padding-left:18px;"><li>${issues.join('</li><li>')}</li></ul></div>`;
  };

  const tryConvertNfaShorthandToPda = (raw?: string) => {
    if (!raw) return null;
    if (raw.includes('->')) return null;
    const symbols = raw.split(',').map(s => normalizeEpsilonSymbol(s.trim())).filter(Boolean);
    if (symbols.length === 0) return null;
    const converted = symbols.map(sym => `${sym},${PDA_STACK_START}->${PDA_STACK_START}`).join('; ');
    return converted;
  };

  const parsePdaRules = (label?: string): PdaRule[] => {
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

  const parseTmRules = (label?: string): TmRule[] => {
    if (!label) return [];
    return label
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map((ruleText) => {
        const arrowIdx = ruleText.indexOf('->');
        if (arrowIdx < 0) return null;
        const read = ruleText.slice(0, arrowIdx).trim();
        const rhs = ruleText.slice(arrowIdx + 2).trim();
        const rhsParts = rhs.split(',').map(s => s.trim());
        if (rhsParts.length !== 2) return null;
        const [write, moveRaw] = rhsParts;
        const move = moveRaw.toUpperCase();
        if (!read || !write || (move !== 'L' && move !== 'R' && move !== 'S')) return null;
        return { read, write, move: move as 'L' | 'R' | 'S' };
      })
      .filter((r): r is TmRule => r !== null);
  };

  const isValidTmLabel = (label?: string) => {
    if (!label) return false;
    const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
    if (chunks.length === 0) return false;
    const parsed = parseTmRules(label);
    return parsed.length === chunks.length;
  };

  const toFaLabelFromPda = (label: string, targetMode: ModeType) => {
    const rules = parsePdaRules(label);
    if (rules.length === 0) return label;
    const uniqueInputs = Array.from(new Set(rules.map(r => normalizeEpsilonSymbol(r.input))));
    const normalized = targetMode === 'eNFA'
      ? uniqueInputs
      : uniqueInputs.filter(s => s !== 'ε' && s !== 'e');
    return normalized.join(',');
  };

  const toPdaLabelFromFa = (label: string) => {
    const raw = (label || '').trim();
    if (!raw) return '';
    if (parsePdaRules(raw).length > 0) return raw;
    const symbols = raw.split(',').map(s => normalizeEpsilonSymbol(s.trim())).filter(Boolean);
    if (symbols.length === 0) return '';
    return symbols.map(sym => `${sym},${PDA_STACK_START}->${PDA_STACK_START}`).join('; ');
  };

  const toTmLabelFromFa = (label: string) => {
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

  const toTmLabelFromPda = (label: string) => {
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

  const toFaLabelFromTm = (label: string, targetMode: ModeType) => {
    const raw = (label || '').trim();
    if (!raw) return '';
    const rules = parseTmRules(raw);
    if (rules.length === 0) return raw;
    const symbols = Array.from(new Set(rules.map(r => normalizeEpsilonSymbol(r.read))));
    const normalized = targetMode === 'eNFA'
      ? symbols
      : symbols.filter(s => s !== 'ε' && s !== 'e' && s !== TM_BLANK);
    return normalized.join(',');
  };

  const toPdaLabelFromTm = (label: string) => {
    const faLabel = toFaLabelFromTm(label, 'NFA');
    return toPdaLabelFromFa(faLabel);
  };

  const isValidPdaLabel = (label?: string) => {
    if (!label) return false;
    const chunks = label.split(';').map(s => s.trim()).filter(Boolean);
    if (chunks.length === 0) return false;
    const parsed = parsePdaRules(label);
    return parsed.length === chunks.length;
  };

  const applyPdaRule = (cfg: PdaConfig, targetState: string, rule: PdaRule) => {
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
    return { state: targetState, stack } as PdaConfig;
  };

  const expandPdaEpsilonClosure = (configs: PdaConfig[], currentEdges: Edge[]) => {
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

  // --- Validation & Constraints Helpers ---
  const splitLabelToSymbols = (label?: string) => {
    if (!label) return [] as string[];
    if (isTmMode) {
      return parseTmRules(label)
        .map(r => r.read)
        .filter(s => s !== '' && s !== TM_BLANK);
    }
    if (isPdaMode) {
      return parsePdaRules(label)
        .map(r => r.input)
        .filter(s => s !== '' && s !== 'e' && s !== 'ε');
    }
    return label.split(',').map(s => s.trim()).filter(s => s !== '' && s !== 'e' && s !== 'ε');
  };

  const getAlphabetFromEdges = (edgeList: Edge[]) => {
    const set = new Set<string>();
    edgeList.forEach(e => splitLabelToSymbols(e.label as string).forEach(s => set.add(s)));
    return Array.from(set);
  };

  const normalizeConnector = (raw?: string): 't' | 'r' | 'b' | 'l' => {
    const v = (raw || '').trim().toLowerCase();
    if (v === 't' || v === 'tt') return 't';
    if (v === 'r' || v === 'tr') return 'r';
    if (v === 'b' || v === 'tb') return 'b';
    if (v === 'l' || v === 'tl') return 'l';
    return 't';
  };

  const validateAutomaton = (modeToCheck: ModeType, nodeList: Node[], edgeList: Edge[]) => {
    const issues: string[] = [];
    const alphabet = getAlphabetFromEdges(edgeList);

    // Epsilon checks
    if (modeToCheck === 'DFA' || modeToCheck === 'NFA') {
      const hasEps = edgeList.some(e => isEpsilon(e.label as string));
      if (hasEps) issues.push('Epsilon transitions are not allowed in DFA/NFA — found and will be removed.');
    }

    if (modeToCheck === 'DFA') {
      // For DFA: determinism and completeness
      nodeList.forEach(n => {
        alphabet.forEach(sym => {
          const candidates = edgeList.filter(e => e.source === n.id && splitLabelToSymbols(e.label as string).includes(sym));
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

  const getEpsilonClosure = (nodeIds: string[], currentEdges: Edge[]) => {
    if (mode !== 'eNFA') return new Set(nodeIds);
    const closure = new Set(nodeIds);
    const stack = [...nodeIds];
    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      const epsilonEdges = currentEdges.filter(
        (e) => e.source === nodeId && isEpsilon(e.label as string)
      );
      for (const edge of epsilonEdges) {
        if (!closure.has(edge.target)) {
          closure.add(edge.target);
          stack.push(edge.target);
        }
      }
    }
    return closure;
  };

  const getNextStates = (currentIds: Set<string>, char: string, currentEdges: Edge[]) => {
    const next = new Set<string>();
    currentIds.forEach((id) => {
      const validEdges = currentEdges.filter(e => 
        e.source === id && isTransitionMatch(e.label as string, char)
      );
      validEdges.forEach(e => next.add(e.target));
    });
    return next;
  };

  const pushSimSnapshot = (next: {
    stepIndex: number;
    activeStates: Set<string>;
    pdaConfigs: Array<{ state: string; stack: string[] }>;
    tmConfigs: Array<{ state: string; tape: string[]; head: number }>;
    simMessage: string;
    history: string[];
  }) => {
    setSimTimeline(prev => ([
      ...prev,
      {
        stepIndex: next.stepIndex,
        activeStates: Array.from(next.activeStates),
        pdaConfigs: next.pdaConfigs.map(cfg => ({ state: cfg.state, stack: [...cfg.stack] })),
        tmConfigs: next.tmConfigs.map(cfg => ({ state: cfg.state, tape: [...cfg.tape], head: cfg.head })),
        simMessage: next.simMessage,
        history: [...next.history],
      }
    ]));
  };

  // --- Simulation Actions ---
  const startSimulation = () => {
    const startNode = nodes.find(n => n.data.isStart);
    if (!startNode) {
      uiSwal.fire('Error', 'Start state not found.', 'error');
      return false;
    }

    const isolatedNodes = nodes
      .filter(n => !edges.some(e => e.source === n.id || e.target === n.id))
      .map(n => n.id);
    if (isolatedNodes.length > 0) {
      uiSwal.fire({
        icon: 'error',
        title: 'Isolated state detected',
        html: formatIssuesHtml(isolatedNodes.map(id => `State ${id} has no connected transition.`))
      });
      return false;
    }

    const hasAcceptingState = nodes.some(n => !!n.data.isAccept);
    if (!hasAcceptingState) {
      uiSwal.fire('Warning', 'No accepting state found. Please mark at least one accepting state before simulation.', 'warning');
      return false;
    }

    if (mode === 'DFA') {
      const { issues } = validateAutomaton('DFA', nodes, edges);
      if (issues.length > 0) {
        uiSwal.fire({
          icon: 'error',
          title: 'DFA validation failed',
          html: formatIssuesHtml(issues)
        });
        return false;
      }
    }

    if (isTmMode) {
      if (mode !== 'NTM') {
        const seen = new Set<string>();
        const issues: string[] = [];
        edges.forEach(edge => {
          const rules = parseTmRules(edge.label as string);
          rules.forEach(rule => {
            const key = `${edge.source}|${rule.read}`;
            if (seen.has(key)) issues.push(`Nondeterministic TM rule from ${edge.source} on '${rule.read}'`);
            seen.add(key);
          });
        });
        if (issues.length > 0) {
          uiSwal.fire({ icon: 'error', title: `${mode} validation failed`, html: formatIssuesHtml(issues) });
          return false;
        }
      }

      const tape = inputString.length > 0 ? inputString.split('') : [TM_BLANK];
      const initialConfigs: TmConfig[] = [{ state: startNode.id, tape, head: 0 }];
      const active = new Set(initialConfigs.map(c => c.state));
      const startMsg = `TM start at ${startNode.id}, head=0`;
      const startHistory = [`Start TM at ${startNode.id}`];

      setTmConfigs(initialConfigs);
      setPdaConfigs([]);
      setActiveStates(active);
      setStepIndex(0);
      setIsRunning(true);
      setSimMessage(startMsg);
      setHistory(startHistory);
      setSimTimeline([]);
      pushSimSnapshot({
        stepIndex: 0,
        activeStates: active,
        pdaConfigs: [],
        tmConfigs: initialConfigs,
        simMessage: startMsg,
        history: startHistory,
      });
      return true;
    }

    if (isPdaMode) {
      const initialConfigs = expandPdaEpsilonClosure([{ state: startNode.id, stack: [PDA_STACK_START] }], edges);
      const active = new Set(initialConfigs.map(c => c.state));
      setPdaConfigs(initialConfigs);
      setActiveStates(active);
      setStepIndex(0);
      setIsRunning(true);
      const sample = initialConfigs.slice(0, 3).map(c => `${c.state}:[${c.stack.join('') || 'ε'}]`).join(' | ');
      const startMsg = `PDA start (${initialConfigs.length} cfg): ${sample}${initialConfigs.length > 3 ? ' ...' : ''}`;
      const startHistory = [`Start PDA: ${sample}${initialConfigs.length > 3 ? ' ...' : ''}`];
      setSimMessage(startMsg);
      setHistory(startHistory);
      setSimTimeline([]);
      pushSimSnapshot({
        stepIndex: 0,
        activeStates: active,
        pdaConfigs: initialConfigs,
        tmConfigs: [],
        simMessage: startMsg,
        history: startHistory,
      });
      return true;
    }

    const initialSet = getEpsilonClosure([startNode.id], edges);
    setActiveStates(initialSet);
    setPdaConfigs([]);
    setTmConfigs([]);
    setStepIndex(0);
    setIsRunning(true);
    const startMsg = `Start at: {${Array.from(initialSet).join(', ')}}`;
    const startHistory = [`Start: {${Array.from(initialSet).join(', ')}}`];
    setSimMessage(startMsg);
    setHistory(startHistory);
    setSimTimeline([]);
    pushSimSnapshot({
      stepIndex: 0,
      activeStates: initialSet,
      pdaConfigs: [],
      tmConfigs: [],
      simMessage: startMsg,
      history: startHistory,
    });
    return true;
  };

  const executeStep = () => {
    const idx = stepIndexRef.current;
    const str = inputString;
    const currentEdges = edgesRef.current;

    if (isTmMode) {
      const currentConfigs = tmConfigsRef.current;
      if (currentConfigs.length === 0) {
        setIsRunning(false);
        return false;
      }

      const usedEdgeIds = new Set<string>();
      const moved: TmConfig[] = [];

      currentConfigs.forEach(cfg => {
        const outgoing = currentEdges.filter(e => e.source === cfg.state);
        const currentSym = cfg.tape[cfg.head] ?? TM_BLANK;

        outgoing.forEach(edge => {
          const rules = parseTmRules(edge.label as string).filter(r => r.read === currentSym);
          rules.forEach(rule => {
            const nextTape = [...cfg.tape];
            let nextHead = cfg.head;
            nextTape[nextHead] = rule.write;

            if (rule.move === 'L') {
              if (mode === 'LBA') {
                if (nextHead === 0) return;
                nextHead -= 1;
              } else if (nextHead === 0) {
                nextTape.unshift(TM_BLANK);
                nextHead = 0;
              } else {
                nextHead -= 1;
              }
            } else if (rule.move === 'R') {
              if (mode === 'LBA') {
                if (nextHead >= nextTape.length - 1) return;
                nextHead += 1;
              } else {
                nextHead += 1;
                if (nextHead >= nextTape.length) nextTape.push(TM_BLANK);
              }
            }

            moved.push({ state: edge.target, tape: nextTape, head: nextHead });
            if (edge.id) usedEdgeIds.add(edge.id);
          });
        });
      });

      if (usedEdgeIds.size > 0) {
        setEdges(prev => prev.map(edge => usedEdgeIds.has(edge.id as string)
          ? { ...edge, style: { ...(edge.style || {}), stroke: '#facc15', strokeWidth: 4 }, animated: true }
          : edge
        ));
        setTimeout(() => {
          setEdges(prev => prev.map(edge => usedEdgeIds.has(edge.id as string)
            ? { ...edge, style: { ...(edge.style || {}), stroke: '#94a3b8', strokeWidth: 2 }, animated: isEpsilon(edge.label as string) }
            : edge
          ));
        }, 300);
      }

      const unique = new Map<string, TmConfig>();
      moved.forEach(cfg => {
        const key = `${cfg.state}|${cfg.head}|${cfg.tape.join('')}`;
        if (!unique.has(key)) unique.set(key, cfg);
      });
      const nextConfigs = Array.from(unique.values());
      const active = new Set(nextConfigs.map(c => c.state));
      const nextStepIndex = idx + 1;
      const sample = nextConfigs.slice(0, 2).map(c => `${c.state} @${c.head} [${c.tape.join('')}]`).join(' | ');
      const nextMsg = nextConfigs.length > 0 ? `TM step ${nextStepIndex}: ${sample}${nextConfigs.length > 2 ? ' ...' : ''}` : 'TM halted: no transition';
      const nextHistory = [...history, nextMsg];

      setTmConfigs(nextConfigs);
      setActiveStates(active);
      setStepIndex(nextStepIndex);
      setSimMessage(nextMsg);
      setHistory(nextHistory);
      pushSimSnapshot({
        stepIndex: nextStepIndex,
        activeStates: active,
        pdaConfigs: [],
        tmConfigs: nextConfigs,
        simMessage: nextMsg,
        history: nextHistory,
      });

      const acceptNodeIds = nodesRef.current.filter(n => n.data.isAccept).map(n => n.id);
      if (nextConfigs.some(cfg => acceptNodeIds.includes(cfg.state))) {
        setIsRunning(false);
        return false;
      }

      if (nextConfigs.length === 0) {
        setIsRunning(false);
        return false;
      }
      return true;
    }

    if (isPdaMode) {
      const currentConfigs = pdaConfigsRef.current;
      if (idx >= str.length) {
        setIsRunning(false);
        return false;
      }
      const char = str[idx];
      const usedEdgeIds = new Set<string>();
      const moved: PdaConfig[] = [];

      currentConfigs.forEach(cfg => {
        const outgoing = currentEdges.filter(e => e.source === cfg.state);
        outgoing.forEach(edge => {
          const rules = parsePdaRules(edge.label as string).filter(r => normalizeEpsilonSymbol(r.input) === char);
          rules.forEach(rule => {
            const next = applyPdaRule(cfg, edge.target, rule);
            if (!next) return;
            moved.push(next);
            if (edge.id) usedEdgeIds.add(edge.id);
          });
        });
      });

      if (usedEdgeIds.size > 0) {
        setEdges(prev => prev.map(edge => usedEdgeIds.has(edge.id as string)
          ? { ...edge, style: { ...(edge.style || {}), stroke: '#facc15', strokeWidth: 4 }, animated: true }
          : edge
        ));
        setTimeout(() => {
          setEdges(prev => prev.map(edge => usedEdgeIds.has(edge.id as string)
            ? { ...edge, style: { ...(edge.style || {}), stroke: '#94a3b8', strokeWidth: 2 }, animated: isEpsilon(edge.label as string) }
            : edge
          ));
        }, 400);
      }

      const closed = expandPdaEpsilonClosure(moved, currentEdges);
      const active = new Set(closed.map(c => c.state));
      const nextStepIndex = idx + 1;
      const sample = closed.slice(0, 3).map(c => `${c.state}:[${c.stack.join('') || 'ε'}]`).join(' | ');
      const nextMsg = `Read '${char}' -> ${closed.length} cfg${closed.length !== 1 ? 's' : ''}: ${sample}${closed.length > 3 ? ' ...' : ''}`;
      const nextHistory = [...history, `Read '${char}' -> ${sample}${closed.length > 3 ? ' ...' : ''}`];
      setPdaConfigs(closed);
      setActiveStates(active);
      setStepIndex(nextStepIndex);
      setSimMessage(nextMsg);
      setHistory(nextHistory);
      pushSimSnapshot({
        stepIndex: nextStepIndex,
        activeStates: active,
        pdaConfigs: closed,
        tmConfigs: [],
        simMessage: nextMsg,
        history: nextHistory,
      });
      return true;
    }

    const currentSet = activeStatesRef.current;
    if (idx >= str.length) {
      setIsRunning(false);
      return false;
    }
    const char = str[idx];
    // determine which edges will be used for this character (for glow effect)
    const usedEdgeIds = currentEdges
      .filter(e => currentSet.has(e.source) && isTransitionMatch(e.label as string, char))
      .map(e => e.id)
      .filter((id): id is string => !!id);

    // briefly highlight/glow the used edges
    if (usedEdgeIds.length > 0) {
      setEdges(prev => prev.map(edge => usedEdgeIds.includes(edge.id as string)
        ? { ...edge, style: { ...(edge.style || {}), stroke: '#facc15', strokeWidth: 4 }, animated: true }
        : edge
      ));
      // clear glow shortly after
      setTimeout(() => {
        setEdges(prev => prev.map(edge => usedEdgeIds.includes(edge.id as string)
          ? { ...edge, style: { ...(edge.style || {}), stroke: '#94a3b8', strokeWidth: 2 }, animated: isEpsilon(edge.label as string) }
          : edge
        ));
      }, 400);
    }

    const movedSet = getNextStates(currentSet, char, currentEdges);
    const finalSet = getEpsilonClosure(Array.from(movedSet), currentEdges);
    const nextStepIndex = idx + 1;
    const nextMsg = `Read '${char}' -> Active: {${Array.from(finalSet).join(', ')}}`;
    const nextHistory = [...history, `Read '${char}' -> {${Array.from(finalSet).join(', ')}}`];
    setActiveStates(finalSet);
    setStepIndex(nextStepIndex);
    setSimMessage(nextMsg);
    setHistory(nextHistory);
    pushSimSnapshot({
      stepIndex: nextStepIndex,
      activeStates: finalSet,
      pdaConfigs: [],
      tmConfigs: [],
      simMessage: nextMsg,
      history: nextHistory,
    });
    return true;
  };

  const prevStep = () => {
    if (simTimeline.length <= 1) return;
    if (runLoopRef.current !== null) {
      window.clearInterval(runLoopRef.current);
      runLoopRef.current = null;
    }
    const prev = simTimeline[simTimeline.length - 2];
    setSimTimeline(t => t.slice(0, -1));
    setStepIndex(prev.stepIndex);
    setActiveStates(new Set(prev.activeStates));
    setPdaConfigs(prev.pdaConfigs.map(cfg => ({ state: cfg.state, stack: [...cfg.stack] })));
    setTmConfigs(prev.tmConfigs.map(cfg => ({ state: cfg.state, tape: [...cfg.tape], head: cfg.head })));
    setSimMessage(prev.simMessage);
    setHistory(prev.history);
    setIsRunning(true);
  };

  const runAll = () => {
    if (!startSimulation()) return;
    if (runLoopRef.current !== null) {
      window.clearInterval(runLoopRef.current);
      runLoopRef.current = null;
    }
    setTimeout(() => {
        runLoopRef.current = window.setInterval(() => {
            const currentIdx = stepIndexRef.current;
            if (!isTmMode && currentIdx >= inputString.length) {
                if (runLoopRef.current !== null) {
                  window.clearInterval(runLoopRef.current);
                  runLoopRef.current = null;
                }
                setIsRunning(false);
                return;
            }
            if (isTmMode && currentIdx >= TM_MAX_STEPS) {
              if (runLoopRef.current !== null) {
                window.clearInterval(runLoopRef.current);
                runLoopRef.current = null;
              }
              setIsRunning(false);
              setSimMessage(`TM stopped at max steps (${TM_MAX_STEPS})`);
              return;
            }
            const ok = executeStep();
            if (!ok && runLoopRef.current !== null) {
              window.clearInterval(runLoopRef.current);
              runLoopRef.current = null;
              setIsRunning(false);
            }
        }, 500);
    }, 100);
  };

  const stopSimulation = () => {
    if (runLoopRef.current !== null) {
      window.clearInterval(runLoopRef.current);
      runLoopRef.current = null;
    }
    setIsRunning(false);
    setStepIndex(-1);
    setActiveStates(new Set());
    setPdaConfigs([]);
    setTmConfigs([]);
    setSimTimeline([]);
    setSimMessage('Ready');
    setHistory([]);
  };

  const [sidebarWidth, setSidebarWidth] = useState(360);
  const isResizingRef = useRef(false);

  // --- Edge Selection ---
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const selectedEdgeIdRef = useRef<string | null>(null);
  const promptOpenRef = useRef(false);
  useEffect(() => { selectedEdgeIdRef.current = selectedEdgeId; }, [selectedEdgeId]);

  // --- Undo / Redo ---
  const undoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveSnapshot = () => {
    undoStack.current = [...undoStack.current.slice(-49), { nodes: nodesRef.current, edges: edgesRef.current }];
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const undo = () => {
    if (undoStack.current.length === 0) return;
    const snap = undoStack.current[undoStack.current.length - 1];
    redoStack.current = [...redoStack.current, { nodes: nodesRef.current, edges: edgesRef.current }];
    undoStack.current = undoStack.current.slice(0, -1);
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (redoStack.current.length === 0) return;
    const snap = redoStack.current[redoStack.current.length - 1];
    undoStack.current = [...undoStack.current, { nodes: nodesRef.current, edges: edgesRef.current }];
    redoStack.current = redoStack.current.slice(0, -1);
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  };

  // Stable refs so keyboard handler ([] deps) always calls latest version
  const undoActionRef = useRef<() => void>(() => {});
  const redoActionRef = useRef<() => void>(() => {});
  const saveSnapshotRef = useRef<() => void>(() => {});
  const addNodeActionRef = useRef<() => void>(() => {});
  const clearBoardActionRef = useRef<() => void>(() => {});
  const helpActionRef = useRef<() => void>(() => {});
  const prevStepActionRef = useRef<() => void>(() => {});

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y/Ctrl+Shift+Z redo, Ctrl+N add node, Ctrl+B prev step, Ctrl+Shift+Backspace clear, Ctrl+/ help, Delete remove
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (promptOpenRef.current) return;
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (e.ctrlKey || e.metaKey) {
        if (!e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undoActionRef.current(); return; }
        if ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))) { e.preventDefault(); redoActionRef.current(); return; }
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); addNodeActionRef.current(); return; }
        if (e.key === 'b' || e.key === 'B') { e.preventDefault(); prevStepActionRef.current(); return; }
        if ((e.key === '/' || e.key === '?')) { e.preventDefault(); helpActionRef.current(); return; }
        if (e.shiftKey && e.key === 'Backspace') { e.preventDefault(); clearBoardActionRef.current(); return; }
      }

      if (e.key === 'F1') { e.preventDefault(); helpActionRef.current(); return; }

      if (isRunning) {
        if (e.key === 'Delete' || e.key === 'Backspace') e.preventDefault();
        return;
      }

      if (isTyping) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selEdgeId = selectedEdgeIdRef.current;
        if (selEdgeId) {
          saveSnapshotRef.current();
          setEdges(eds => eds.filter(ed => ed.id !== selEdgeId));
          setSelectedEdgeId(null);
          e.preventDefault();
        } else {
          const toDelete = new Set(nodesRef.current.filter(n => n.selected).map(n => n.id));
          if (toDelete.size > 0) {
            saveSnapshotRef.current();
            setEdges(eds => eds.filter(ed => !toDelete.has(ed.source) && !toDelete.has(ed.target)));
            setNodes(nds => nds.filter(n => !toDelete.has(n.id)));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setEdges, setNodes]);

  // --- Resize Handlers ---
  const startResizing = React.useCallback(() => {
    isResizingRef.current = true;
  }, []);

  const stopResizing = React.useCallback(() => {
    isResizingRef.current = false;
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizingRef.current) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (newWidth > 200 && newWidth < 800) {
            setSidebarWidth(newWidth);
        }
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // Restore draft after refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VISUALIZER_DRAFT_KEY);
      if (!raw) {
        hasHydratedRef.current = true;
        return;
      }
      const draft = JSON.parse(raw) as {
        mode?: ModeType;
        inputString?: string;
        sidebarWidth?: number;
        nodeCount?: number;
        nodes?: Node[];
        edges?: Edge[];
      };

      if (draft.mode) setMode(draft.mode);
      if (typeof draft.inputString === 'string') setInputString(draft.inputString);
      if (typeof draft.sidebarWidth === 'number' && draft.sidebarWidth >= 200 && draft.sidebarWidth <= 800) setSidebarWidth(draft.sidebarWidth);
      if (typeof draft.nodeCount === 'number') setNodeCount(draft.nodeCount);

      if (Array.isArray(draft.nodes)) {
        setNodes(draft.nodes.map((n) => ({
          ...n,
          type: 'stateNode',
          data: {
            ...(n.data || {}),
            label: n.id,
            isStart: !!(n.data as { isStart?: boolean })?.isStart,
            isAccept: !!(n.data as { isAccept?: boolean })?.isAccept,
            isActive: false,
          }
        })));
      }

      if (Array.isArray(draft.edges)) {
        setEdges(draft.edges.map((e) => {
          const label = (e.label as string) || '';
          return {
            ...e,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            style: { ...(e.style || {}), stroke: '#94a3b8', strokeWidth: 2 },
            animated: isEpsilon(label),
          } as Edge;
        }));
      }
    } catch (err) {
      console.warn('Failed to restore visualizer draft', err);
    } finally {
      hasHydratedRef.current = true;
    }
  }, [setEdges, setNodes]);

  // Persist basic draft continuously
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    try {
      const snapshot = {
        mode,
        inputString,
        sidebarWidth,
        nodeCount,
        nodes,
        edges,
      };
      localStorage.setItem(VISUALIZER_DRAFT_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('Failed to save visualizer draft', err);
    }
  }, [VISUALIZER_DRAFT_KEY, mode, inputString, sidebarWidth, nodeCount, nodes, edges]);

  // --- Import / Export Functions (Updated Logic) ---

  const exportConfig = async () => {
    const exportData = {
      metadata: { 
        name: `My_${mode}`, 
        type: mode,
        exportedAt: new Date().toISOString()
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        position: n.position,
        isStart: n.data.isStart,
        isAccept: n.data.isAccept
      })),
      edges: edges.map((e) => ({
        from: e.source,
        from_con: e.sourceHandle ? e.sourceHandle.toUpperCase() : 'T', 
        to: e.target,
        to_con: e.targetHandle ? e.targetHandle.toUpperCase() : 'T',
        label: e.label
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const defaultName = `automata_${mode.toLowerCase()}`;

    try {
        // @ts-expect-error - showSaveFilePicker is not yet in standard lib dom types
        if (window.showSaveFilePicker) {
            // @ts-expect-error -- showSaveFilePicker not in lib.dom yet
            const handle = await window.showSaveFilePicker({
                suggestedName: `${defaultName}.json`,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            return;
        }
    } catch (err) {
        // Fallback or user cancelled
        if ((err as Error).name !== 'AbortError') {
             console.error("Save File Picker failed", err);
        } else {
            return; // User cancelled
        }
    }

    // Fallback: Prompt for name and download
    const { value: fileName } = await uiSwal.fire({
      title: 'Enter file name to save',
      input: 'text',
      inputValue: defaultName,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!'
        }
      }
    });

    if (!fileName) return; // User cancelled

    const finalName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", finalName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!event.target.files || !event.target.files[0]) return;
    
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content) as ImportData;

        // 1. Determine Mode
        let currentMode = mode;
        if (parsedData.metadata?.type) {
          currentMode = parsedData.metadata.type as ModeType;
          setMode(currentMode);
        }

        // 2. Map Nodes
        let maxId = 0;
        const newNodes: Node[] = (parsedData.nodes || []).map((n: ImportNode) => {
          const idNum = parseInt(n.id.replace('q', ''));
          if (!isNaN(idNum) && idNum > maxId) maxId = idNum;

          return {
            id: n.id,
            position: n.position || { x: 50, y: 50 },
            type: 'stateNode',
            data: { 
              label: n.id, 
              isStart: n.isStart ?? n.data?.isStart ?? false,
              isAccept: n.isAccept ?? n.data?.isAccept ?? false,
              isActive: false 
            },
            selected: false
          } as Node;
        });

        // 3. Map Edges (supports both {from,to} and {source,target} schemas)
        const edgeCandidates: Edge[] = (parsedData.edges || []).map((e: ImportEdge, i: number) => {
          const source = e.from ?? e.source ?? '';
          const target = e.to ?? e.target ?? '';
          const label = e.label || '';
          const fromCon = e.from_con ?? e.sourceHandle;
          const toCon = e.to_con ?? e.targetHandle;
          return {
            id: `e-${i}-${Date.now()}`,
            source,
            target,
            label,
            sourceHandle: normalizeConnector(fromCon),
            targetHandle: normalizeConnector(toCon),
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            animated: isEpsilon(label)
          } as Edge;
        });
        const newEdges: Edge[] = edgeCandidates.filter(e => !!e.source && !!e.target);

        // If mode is DFA or NFA (per your rule) strip epsilon transitions
        let cleanedEdges = newEdges;
        if (currentMode === 'DFA' || currentMode === 'NFA') {
          const hadEps = cleanedEdges.some(e => isEpsilon(e.label as string));
          if (hadEps) {
            cleanedEdges = cleanedEdges.filter(e => !isEpsilon(e.label as string));
            await uiSwal.fire('Warning', 'Import: Epsilon transitions were removed because current mode does not allow them.', 'warning');
          }
        }

        setNodes(newNodes);
        setEdges(cleanedEdges);
        setNodeCount(maxId + 1);

        // Validate imported automaton and auto-add dead state for DFA completeness
        const { issues, alphabet } = validateAutomaton(currentMode, newNodes, cleanedEdges);
        const missing: { state: string; symbol: string }[] = [];
        if (currentMode === 'DFA' && alphabet.length > 0) {
          newNodes.forEach(n => {
            alphabet.forEach(sym => {
              const exists = cleanedEdges.some(e => e.source === n.id && splitLabelToSymbols(e.label as string).includes(sym));
              if (!exists) missing.push({ state: n.id, symbol: sym });
            });
          });
        }

        if (currentMode === 'DFA' && missing.length > 0) {
          const deadId = `qd${maxId + 1}`;
          const deadNode: Node = { id: deadId, position: { x: 20, y: 20 }, type: 'stateNode', data: { label: deadId, isStart: false, isAccept: false, isActive: false } } as Node;
          const deadEdges: Edge[] = [];
          // add missing transitions to dead state
          missing.forEach((m, i) => {
            deadEdges.push({ id: `e-miss-${i}-${Date.now()}`, source: m.state, target: deadId, label: m.symbol, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { stroke: '#94a3b8', strokeWidth: 2 }, animated: false } as Edge);
          });
          // add self-loops on dead state for each alphabet symbol
          alphabet.forEach((sym, i) => {
            deadEdges.push({ id: `e-dead-${i}-${Date.now()}`, source: deadId, target: deadId, label: sym, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { stroke: '#94a3b8', strokeWidth: 2 }, animated: false } as Edge);
          });

          setNodes(prev => prev.concat(deadNode));
          setEdges(prev => prev.concat(deadEdges));
          setNodeCount(maxId + 2);
          await uiSwal.fire('Warning', `DFA import: Missing transitions detected. A dead state '${deadId}' was added to make the transition function total.`, 'warning');
        } else if (issues.length > 0) {
          await uiSwal.fire({
             icon: 'warning',
             title: 'Import Warnings',
             html: formatIssuesHtml(issues)
          });
        } else {
          stopSimulation();
          await uiSwal.fire('Success', 'Import Successful!', 'success');
        }

      } catch (err) {
        await uiSwal.fire('Error', "Invalid JSON File", 'error');
        console.error(err);
      }
    };
    event.target.value = '';
  };

  // --- Editor Actions ---
  const addNode = () => {
    if (isRunning) return;
    saveSnapshot();
    const id = `q${nodeCount}`;
    const shouldBeStart = nodesRef.current.length === 0;
    const newNode: Node = {
      id,
      position: { x: 50 + (nodeCount % 6) * 130, y: 50 + Math.floor(nodeCount / 6) * 130 },
      data: { label: id, isStart: shouldBeStart, isAccept: false, isActive: false },
      type: 'stateNode',
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeCount((c) => c + 1);
  };

  // Update stable action refs after every render (inside layout effect to satisfy React compiler)
  React.useLayoutEffect(() => {
    undoActionRef.current = undo;
    redoActionRef.current = redo;
    saveSnapshotRef.current = saveSnapshot;
    addNodeActionRef.current = addNode;
    prevStepActionRef.current = prevStep;
  });

  const deleteSelected = () => {
    if (isRunning) return;
    saveSnapshot();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  };

  const clearBoard = async () => {
    if (isRunning) {
      await uiSwal.fire('Info', 'Stop simulation before editing the graph.', 'info');
      return;
    }
    const result = await uiSwal.fire({
      title: 'Clear board? ',
      text: 'This will remove all states and transitions.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Clear',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444'
    });
    if (!result.isConfirmed) return;

    saveSnapshot();
    setNodes([]);
    setEdges([]);
    setNodeCount(0);
    stopSimulation();
    setInputString('');
    localStorage.removeItem('automata-data-transfer');
  };

  const handleModeChange = async (nextMode: ModeType) => {
    if (nextMode === mode) return;

    const fromPda = mode === 'DPDA' || mode === 'NPDA';
    const toFa = nextMode === 'DFA' || nextMode === 'NFA' || nextMode === 'eNFA';
    const fromFa = mode === 'DFA' || mode === 'NFA' || mode === 'eNFA';
    const toPda = nextMode === 'DPDA' || nextMode === 'NPDA';
    const fromTm = mode === 'DTM' || mode === 'NTM' || mode === 'LBA';
    const toTm = nextMode === 'DTM' || nextMode === 'NTM' || nextMode === 'LBA';

    if (fromTm && toFa) {
      const tmLikeEdges = edges.filter(e => parseTmRules((e.label as string) || '').length > 0);
      if (tmLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: 'warning',
          title: 'Convert TM transitions to FA?',
          html: 'FA transitions do not include write/move operations. Only read symbols will be kept from TM rules.<br/><br/>Do you want to continue?',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel'
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let convertedCount = 0;
        let removedCount = 0;
        const convertedEdges = edges
          .map((edge) => {
            const before = String(edge.label || '');
            const convertedLabel = toFaLabelFromTm(before, nextMode);
            if (before !== convertedLabel) convertedCount += 1;
            if (String(convertedLabel).trim() === '') removedCount += 1;
            return {
              ...edge,
              label: convertedLabel,
              animated: isEpsilon(convertedLabel),
            } as Edge;
          })
          .filter((edge) => String(edge.label || '').trim() !== '');

        setEdges(convertedEdges);
        await uiSwal.fire('Success', `Converted ${convertedCount} transition(s) to FA format and removed ${removedCount} unsupported transition(s).`, 'success');
      }
    }

    if (fromTm && toPda) {
      const tmLikeEdges = edges.filter(e => parseTmRules((e.label as string) || '').length > 0);
      if (tmLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: 'warning',
          title: 'Convert TM transitions to PDA?',
          html: 'PDA transitions do not include write/move operations. TM rules will be reduced to input symbols and converted implicitly (for example, <code>a-&gt;a,R</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>Do you want to continue?',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel'
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let convertedCount = 0;
        let removedCount = 0;
        const convertedEdges = edges
          .map((edge) => {
            const before = String(edge.label || '');
            const convertedLabel = toPdaLabelFromTm(before);
            if (before !== convertedLabel) convertedCount += 1;
            if (String(convertedLabel).trim() === '') removedCount += 1;
            return {
              ...edge,
              label: convertedLabel,
              animated: isEpsilon(convertedLabel),
            } as Edge;
          })
          .filter((edge) => String(edge.label || '').trim() !== '');

        setEdges(convertedEdges);
        await uiSwal.fire('Success', `Converted ${convertedCount} transition(s) to PDA format and removed ${removedCount} unsupported transition(s).`, 'success');
      }
    }

    if (toTm && (fromPda || fromFa)) {
      const confirm = await uiSwal.fire({
        icon: 'warning',
        title: 'Convert transitions to TM format?',
        html: 'TM transitions use the format <code>read-&gt;write,move</code>. Existing labels will be converted implicitly (for example, <code>a</code> becomes <code>a-&gt;a,R</code>).<br/><br/>If a transition only uses epsilon input, it cannot be represented directly and will be removed.<br/><br/>Do you want to continue?',
        showCancelButton: true,
        confirmButtonText: 'Continue',
        cancelButtonText: 'Cancel'
      });
      if (!confirm.isConfirmed) return;

      saveSnapshot();
      let convertedCount = 0;
      let removedCount = 0;
      const convertedEdges = edges
        .map((edge) => {
          const before = String(edge.label || '');
          const convertedLabel = fromPda
            ? toTmLabelFromPda(before)
            : toTmLabelFromFa(before);
          if (before !== convertedLabel) convertedCount += 1;
          if (String(convertedLabel).trim() === '') removedCount += 1;
          return {
            ...edge,
            label: convertedLabel,
            animated: false,
          } as Edge;
        })
        .filter((edge) => String(edge.label || '').trim() !== '');

      setEdges(convertedEdges);
      await uiSwal.fire('Success', `Converted ${convertedCount} transition(s) to TM format and removed ${removedCount} unsupported transition(s).`, 'success');
    }

    if (fromPda && (nextMode === 'NFA' || nextMode === 'DFA')) {
      const epsilonPdaEdges = edges.filter((edge) => {
        const rules = parsePdaRules((edge.label as string) || '');
        if (rules.length === 0) return false;
        return rules.some(rule => normalizeEpsilonSymbol(rule.input) === 'ε');
      });

      if (epsilonPdaEdges.length > 0) {
        await uiSwal.fire({
          icon: 'error',
          title: 'Cannot switch mode',
          html: 'This PDA still contains epsilon transitions.<br/><br/>Please remove all <code>ε</code> transitions before switching to NFA or DFA.'
        });
        return;
      }
    }

    if (fromPda && toFa) {
      const pdaLikeEdges = edges.filter(e => parsePdaRules((e.label as string) || '').length > 0);
      if (pdaLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: 'warning',
          title: 'Convert PDA transitions to FA?',
          html: 'FA does not use a stack. Pop/push parts will be removed from transition labels, and only input symbols will be kept.<br/><br/>Do you want to continue?',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel'
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let removedCount = 0;
        let convertedCount = 0;
        const convertedEdges = edges
          .map((edge) => {
            const before = String(edge.label || '');
            const convertedLabel = toFaLabelFromPda((edge.label as string) || '', nextMode);
            if (before !== convertedLabel) convertedCount += 1;
            if (String(convertedLabel).trim() === '') removedCount += 1;
            return {
              ...edge,
              label: convertedLabel,
              animated: isEpsilon(convertedLabel),
            } as Edge;
          })
          .filter((edge) => String(edge.label || '').trim() !== '');

        setEdges(convertedEdges);
        await uiSwal.fire('Success', `Converted ${convertedCount} transition(s) and removed ${removedCount} empty transition(s).`, 'success');
      }
    }

    if (fromFa && toPda) {
      const faLikeEdges = edges.filter(e => {
        const txt = String(e.label || '').trim();
        return txt !== '' && parsePdaRules(txt).length === 0;
      });
      if (faLikeEdges.length > 0) {
        const confirm = await uiSwal.fire({
          icon: 'warning',
          title: 'Convert FA transitions to PDA?',
          html: 'PDA transitions require stack operations. Your FA labels will be interpreted implicitly (for example, <code>a</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>In formal PDA constructions, rules are usually explicit with a stack variable (for example, <code>a,X-&gt;XZ</code>).<br/><br/>Do you want to continue?',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel'
        });
        if (!confirm.isConfirmed) return;

        saveSnapshot();
        let convertedCount = 0;
        const convertedEdges = edges.map((edge) => {
          const before = String(edge.label || '');
          const convertedLabel = toPdaLabelFromFa(before);
          if (before !== convertedLabel) convertedCount += 1;
          return {
            ...edge,
            label: convertedLabel,
            animated: isEpsilon(convertedLabel),
          } as Edge;
        });

        setEdges(convertedEdges);
        await uiSwal.fire('Success', `Converted ${convertedCount} transition(s) to implicit PDA form.`, 'success');
      }
    }

    setMode(nextMode);
    stopSimulation();
  };

  const showHelp = () => {
    uiSwal.fire({
      title: 'Quick Help',
      html: `
        <div style="text-align:left;line-height:1.6">
          <div><strong>Basics</strong></div>
          <ul style="margin:6px 0 10px 18px;padding:0;">
            <li>Double-click state to toggle Start/Accept</li>
            <li>Drag between handles to create transition</li>
            <li>Double-click edge to edit label</li>
            <li>TM label format: read-&gt;write,move (e.g. 0-&gt;1,R)</li>
          </ul>
          <div><strong>Shortcuts</strong></div>
          <ul style="margin:6px 0 0 18px;padding:0;">
            <li>Ctrl+N: New Node</li>
            <li>Ctrl+B: Previous Step</li>
            <li>Ctrl+Z / Ctrl+Y: Undo / Redo</li>
            <li>Ctrl+Shift+Backspace: Clear Board</li>
            <li>Ctrl+/ or F1: Help</li>
            <li>Delete / Backspace: Delete selected</li>
          </ul>
        </div>
      `,
      confirmButtonColor: '#0ea5e9'
    });
  };

  React.useLayoutEffect(() => {
    clearBoardActionRef.current = () => { void clearBoard(); };
    helpActionRef.current = showHelp;
  });
  // --- Floating prompt state (replaces window.prompt) ---
  type PromptKind = 'edgeLabel' | 'editLabel' | 'nodeSettings';
  const [promptState, setPromptState] = useState<{
    open: boolean;
    kind?: PromptKind;
    params?: Connection | Edge | null;
    nodeId?: string | null;
    defaultValue?: string;
    title?: string;
  }>({ open: false, kind: undefined, params: null, nodeId: null, defaultValue: '' });
  const [promptValue, setPromptValue] = useState<string>('');
  useEffect(() => { promptOpenRef.current = promptState.open; }, [promptState.open]);

  const openEdgeLabelPrompt = (params: Connection) => {
    const defaultValue = isTmMode ? '0->1,R' : isPdaMode ? 'a,Z->AZ' : '0';
    const title = isTmMode
      ? 'Input TM rule(s) (e.g. "0->1,R; 1->1,R")'
      : isPdaMode
      ? 'Input PDA rule(s) (e.g. "a,Z->AZ; b,Z->Z")'
      : 'Input Transition(s) (e.g. "0" or "0,1")';
    setPromptValue(defaultValue);
    setPromptState({ open: true, kind: 'edgeLabel', params, defaultValue, title });
  };

  const openEditLabelPrompt = (edge: Edge) => {
    const def = (edge.label as string) || '';
    setPromptValue(def);
    setPromptState({
      open: true,
      kind: 'editLabel',
      params: edge,
      defaultValue: def,
      title: isTmMode
        ? 'Edit TM rule(s) (e.g. "0->1,R; 1->1,R")'
        : isPdaMode ? 'Edit PDA rule(s) (e.g. "a,Z->AZ; b,Z->Z")' : 'Edit Transition(s)'
    });
  };

  const openNodeSettingsPrompt = (nodeId: string) => {
    setPromptState({ open: true, kind: 'nodeSettings', nodeId, defaultValue: '1', title: `Set State Properties — ${nodeId}` });
  };

  const closePrompt = () => setPromptState({ open: false, kind: undefined, params: null, nodeId: null, defaultValue: '' });

  const handleSubmitPrompt = async (value: string | null) => {
    const { kind, params, nodeId } = promptState;
    if (kind === 'edgeLabel') {
      if (value !== null) {
        const conn = params as Connection;
        let nextValue = value;
        if (isTmMode && !isValidTmLabel(nextValue)) {
          uiSwal.fire('Error', 'Invalid TM label. Use format: read->write,move and separate multiple rules with ;', 'error');
          closePrompt();
          return;
        }
        if (isPdaMode && !isValidPdaLabel(nextValue)) {
          const converted = tryConvertNfaShorthandToPda(nextValue);
          if (converted) {
            const confirm = await uiSwal.fire({
              icon: 'warning',
              title: 'Implicit PDA shorthand detected',
              html: 'You entered shorthand transition labels. They will be interpreted automatically as PDA rules (for example, <code>a</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>In formal PDA constructions, rules are usually explicit with a stack variable (for example, <code>a,X-&gt;XZ</code>).<br/><br/>Do you want to continue with the implicit conversion?',
              showCancelButton: true,
              confirmButtonText: 'Continue',
              cancelButtonText: 'Cancel'
            });
            if (!confirm.isConfirmed) {
              closePrompt();
              return;
            }
            nextValue = converted;
          } else {
            uiSwal.fire('Error', 'Invalid PDA label. Use format: input,pop->push and separate multiple rules with ;', 'error');
            closePrompt();
            return;
          }
        }
        const symbols = splitLabelToSymbols(nextValue);
        if ((mode === 'DFA' || mode === 'NFA') && nextValue && nextValue.split(',').map(s=>s.trim()).some(s => s === 'e' || s === 'ε')) {
          uiSwal.fire('Error', 'Epsilon transitions are not allowed in DFA/NFA. Edge not created.', 'error');
          closePrompt();
          return;
        }

        // For DFA ensure no existing outgoing transition for same symbol
        if (mode === 'DFA' && conn.source) {
          const existing = edges.filter(e => e.source === conn.source);
          for (const sym of symbols) {
            const conflict = existing.some(e => splitLabelToSymbols(e.label as string).includes(sym));
            if (conflict) {
              uiSwal.fire('Error', `DFA violation: state ${conn.source} already has a transition on '${sym}'.`, 'error');
              closePrompt();
              return;
            }
          }
        }

        saveSnapshot();
        setEdges((eds) => addEdge({
          ...conn,
          label: nextValue,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          animated: isEpsilon(nextValue)
        } as Edge, eds));
      }
    } else if (kind === 'editLabel') {
      const edge = params as Edge;
      if (value !== null) {
        let nextValue = value;
        if (isTmMode && !isValidTmLabel(nextValue)) {
          uiSwal.fire('Error', 'Invalid TM label. Use format: read->write,move and separate multiple rules with ;', 'error');
          closePrompt();
          return;
        }
        if (isPdaMode && !isValidPdaLabel(nextValue)) {
          const converted = tryConvertNfaShorthandToPda(nextValue);
          if (converted) {
            const confirm = await uiSwal.fire({
              icon: 'warning',
              title: 'Implicit PDA shorthand detected',
              html: 'You entered shorthand transition labels. They will be interpreted automatically as PDA rules (for example, <code>a</code> becomes <code>a,Z-&gt;Z</code>).<br/><br/>In formal PDA constructions, rules are usually explicit with a stack variable (for example, <code>a,X-&gt;XZ</code>).<br/><br/>Do you want to continue with the implicit conversion?',
              showCancelButton: true,
              confirmButtonText: 'Continue',
              cancelButtonText: 'Cancel'
            });
            if (!confirm.isConfirmed) {
              closePrompt();
              return;
            }
            nextValue = converted;
          } else {
            uiSwal.fire('Error', 'Invalid PDA label. Use format: input,pop->push and separate multiple rules with ;', 'error');
            closePrompt();
            return;
          }
        }
        // For DFA, ensure editing doesn't create duplicate transitions for same source+symbol
        if ((mode === 'DFA' || mode === 'NFA') && nextValue.split(',').map(s=>s.trim()).some(s => s === 'e' || s === 'ε')) {
          uiSwal.fire('Error', 'Epsilon transitions are not allowed in DFA/NFA. Edit rejected.', 'error');
          closePrompt();
          return;
        }
        if (mode === 'DFA') {
          const symbols = splitLabelToSymbols(nextValue);
          const others = edges.filter(e => e.source === edge.source && e.id !== edge.id);
          for (const sym of symbols) {
            if (others.some(o => splitLabelToSymbols(o.label as string).includes(sym))) {
              uiSwal.fire('Error', `DFA violation: another edge from ${edge.source} already covers '${sym}'. Edit rejected.`, 'error');
              closePrompt();
              return;
            }
          }
        }
        saveSnapshot();
        setEdges((eds) => eds.map(e => e.id === edge.id ? { ...e, label: nextValue, animated: isEpsilon(nextValue) } : e));
      }
    } else if (kind === 'nodeSettings') {
      if (!nodeId) return closePrompt();
      const option = value;
      if (!option) return closePrompt();
      saveSnapshot();
      const makingStart = option === '2' || option === '4';
      setNodes((nds) => nds.map((n) => n.id === nodeId
        ? { ...n, data: { ...n.data, isStart: makingStart, isAccept: option === '3' || option === '4' } }
        : { ...n, data: { ...n.data, isStart: makingStart ? false : n.data.isStart } }
      ));
    }
    closePrompt();
  };

  const onConnect = (params: Connection) => {
    if (isRunning) return;
    openEdgeLabelPrompt(params);
  };

  const handleNodeSettings = (nodeId: string) => {
    openNodeSettingsPrompt(nodeId);
  };

  const onNodeDoubleClick = (e: React.MouseEvent, node: Node) => {
    if (isRunning) return;
    e.preventDefault(); 
    handleNodeSettings(node.id);
  };

  const onNodeContextMenu = (e: React.MouseEvent, node: Node) => {
    if (isRunning) return;
    e.preventDefault(); 
    handleNodeSettings(node.id);
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
  };

  const onEdgeDoubleClick = (_: React.MouseEvent, edge: Edge) => {
    if (isRunning) return;
    openEditLabelPrompt(edge);
  };

  const onPaneClick = () => {
    setSelectedEdgeId(null);
  };

  const displayNodes = nodes.map(node => ({
    ...node, data: { ...node.data, isActive: activeStates.has(node.id) }
  }));

  const handleNodesChange = React.useCallback((changes: NodeChange<Node>[]) => {
    if (isRunning) return;
    onNodesChange(changes);
  }, [isRunning, onNodesChange]);

  const handleEdgesChange = React.useCallback((changes: EdgeChange<Edge>[]) => {
    if (isRunning) return;
    onEdgesChange(changes);
  }, [isRunning, onEdgesChange]);

  const displayEdges = edges.map(edge =>
    edge.id === selectedEdgeId
      ? { ...edge, style: { ...(edge.style || {}), stroke: '#facc15', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#facc15' } }
      : edge
  );

  // --- Machine summary / Transition table data ---
  const Q = nodes.map(n => n.id);
  const q0 = nodes.find(n => n.data.isStart)?.id || '—';
  const F = nodes.filter(n => n.data.isAccept).map(n => n.id);
  const alphabet = getAlphabetFromEdges(edges).filter(s => s !== 'e' && s !== 'ε');

  // build transition map: state -> symbol -> [targets]
  const buildTransitionMap = () => {
    const allowsEpsilonColumn = mode === 'eNFA' || mode === 'DPDA' || mode === 'NPDA';
    const map: Record<string, Record<string, string[]>> = {};
    nodes.forEach(n => {
      map[n.id] = {};
      const syms = [...alphabet];
      if (allowsEpsilonColumn) syms.push('ε');
      syms.forEach(sym => { map[n.id][sym] = []; });
    });
    edges.forEach(e => {
      if (isTmMode) {
        const rules = parseTmRules(e.label as string);
        rules.forEach(rule => {
          if (!map[e.source]) return;
          const key = rule.read;
          map[e.source][key] = map[e.source][key] || [];
          map[e.source][key].push(e.target);
        });
      } else if (isPdaMode) {
        const rules = parsePdaRules(e.label as string);
        rules.forEach(rule => {
          if (!map[e.source]) return;
          const key = rule.input === 'e' ? 'ε' : rule.input;
          if (key === 'ε') {
            if (allowsEpsilonColumn) {
              map[e.source][key] = map[e.source][key] || [];
              map[e.source][key].push(e.target);
            }
          } else {
            map[e.source][key] = map[e.source][key] || [];
            map[e.source][key].push(e.target);
          }
        });
      } else {
        const syms = (e.label as string) ? e.label!.toString().split(',').map(s => s.trim()) : [];
        syms.forEach(sym => {
          if (sym === 'e' || sym === 'ε') {
            if (!map[e.source]) return;
            const key = 'ε';
            // Ensure key exists if it wasn't pre-initialized (e.g. if we switch context)
            if(allowsEpsilonColumn) {
                map[e.source][key] = map[e.source][key] || [];
                map[e.source][key].push(e.target);
            }
          } else {
            if (!map[e.source]) return;
            map[e.source][sym] = map[e.source][sym] || [];
            map[e.source][sym].push(e.target);
          }
        });
      }
    });
    return map;
  };

  const transitionMap = buildTransitionMap();

  const isAccepted = () => {
      const acceptNodeIds = nodes.filter(n => n.data.isAccept).map(n => n.id);
      if (isTmMode) {
        return tmConfigs.some(cfg => acceptNodeIds.includes(cfg.state));
      }
      if (stepIndex !== inputString.length) return null;
      if (isPdaMode) {
        return pdaConfigs.some(cfg => acceptNodeIds.includes(cfg.state));
      }
      return Array.from(activeStates).some(id => acceptNodeIds.includes(id));
  };
  
  return (
    <div className="visualizer-root" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', background: '#0f172a', color: '#e2e8f0' }}>
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json" 
        onChange={importConfig} 
      />

      {/* Floating Prompt Modal (replaces window.prompt) */}
      {promptState.open && (() => {
        const currentNode = nodes.find(n => n.id === promptState.nodeId);
        const currentVal = currentNode
          ? (currentNode.data.isStart && currentNode.data.isAccept ? '4'
            : currentNode.data.isStart ? '2'
            : currentNode.data.isAccept ? '3' : '1')
          : '1';
        return (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.6)' }} onClick={() => closePrompt()} />
            <div style={{ position: 'relative', width: 480, background: '#0b1220', border: '1px solid #334155', padding: 20, borderRadius: 8, boxShadow: '0 10px 30px rgba(2,6,23,0.6)', color: '#e2e8f0' }}>
              <div style={{ marginBottom: 14, color: '#94a3b8', fontWeight: 600, fontSize: 15 }}>{promptState.title}</div>
              {promptState.kind === 'nodeSettings' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'Normal', icon: '⬤', value: '1', bg: '#1e293b', border: '#475569', accent: '#94a3b8' },
                      { label: 'Start State', icon: '▶', value: '2', bg: '#1e3a5f', border: '#3b82f6', accent: '#3b82f6' },
                      { label: 'Accept State', icon: '✦', value: '3', bg: '#14532d', border: '#22c55e', accent: '#22c55e' },
                      { label: 'Start + Accept', icon: '★', value: '4', bg: '#3b0764', border: '#a855f7', accent: '#a855f7' },
                    ].map(opt => {
                      const isActive = currentVal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleSubmitPrompt(opt.value)}
                          style={{
                            background: opt.bg,
                            color: '#e2e8f0',
                            border: `2px solid ${isActive ? opt.accent : opt.border}`,
                            padding: '14px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: isActive ? `0 0 10px ${opt.accent}66` : 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ fontSize: 22, color: opt.accent }}>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {isActive && <span style={{ fontSize: 10, color: opt.accent }}>(current)</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={closePrompt} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    autoFocus
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitPrompt(promptValue); }}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #475569', background: '#071428', color: '#fff', marginBottom: 12, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => { closePrompt(); }} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleSubmitPrompt(promptValue)} style={{ background: '#0ea5e9', color: '#04293a', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>OK</button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Top Navbar: Control Panel */}
      <div style={{ padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', gap: '12px', alignItems: 'stretch', zIndex: 10, minHeight: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', alignContent: 'center', flexWrap: 'wrap', rowGap: 8, columnGap: 12, flex: 1, minWidth: 0, paddingBottom: 2 }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0ea5e9', marginRight: '10px' }}>AutomataViz</div>
        <div style={{ width: '1px', height: '30px', background: '#475569', margin: '0 5px' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8' }}>MODE</label>
            <select 
              value={mode} 
              onChange={(e) => { void handleModeChange(e.target.value as ModeType); }}
                style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '0px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
            >
                <option value="DFA">DFA</option>
                <option value="NFA">NFA</option>
                <option value="eNFA">e-NFA</option>
              <option value="DPDA">DPDA</option>
              <option value="NPDA">NPDA</option>
              <option value="DTM">DTM</option>
              <option value="NTM">NTM</option>
              <option value="LBA">LBA</option>
            </select>
        </div>
        <div style={{ width: '1px', height: '30px', background: '#475569', margin: '0 5px' }}></div>
        <input 
          placeholder="Input (e.g. 010)" 
          value={inputString}
          onChange={(e) => {
            const next = e.target.value;
            if ((isRunning || stepIndex >= 0) && next !== inputString) stopSimulation();
            setInputString(next);
          }}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', width: '200px' }}
        />
        <button onClick={startSimulation} disabled={isRunning} style={{ cursor: 'pointer', background: '#0ea5e9', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white', fontWeight: 'bold' }}>To Start</button>
        <button onClick={prevStep} disabled={simTimeline.length <= 1} style={{ cursor: simTimeline.length > 1 ? 'pointer' : 'default', background: simTimeline.length > 1 ? '#2563eb' : '#1e293b', border: 'none', padding: '8px 16px', borderRadius: '4px', color: simTimeline.length > 1 ? 'white' : '#64748b' }}>Prev Step</button>
        <button onClick={executeStep} disabled={!isRunning} style={{ cursor: 'pointer', background: '#3b82f6', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>Step</button>
        <button onClick={runAll} disabled={isRunning} style={{ cursor: 'pointer', background: '#22c55e', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>Run All</button>
        <button onClick={stopSimulation} style={{ cursor: 'pointer', background: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>Reset</button>

        {(mode === 'NFA' || mode === 'eNFA') && (
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          border: '1px solid #334155',
          borderRadius: 8,
          background: '#0f172a'
          }}>
          <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, letterSpacing: 0.4 }}>CONVERT</span>
          <Link href={mode === 'eNFA' ? '/converter/enfa-to-dfa' : '/converter/nfa-to-dfa'} onClick={() => {
              localStorage.setItem('automata-data-transfer', JSON.stringify({
                source: 'visualizer',
                nodes, edges
              }));
            }} style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'linear-gradient(to right, #9333ea, #db2777)',
                border: 'none',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span>{mode === 'eNFA' ? '⚡ ε-NFA → DFA' : '⚡ NFA → DFA'}</span>
              </button>
            </Link>
          </div>
        )}
        
        {/* Import / Export Buttons */}
        <button disabled={isRunning} onClick={addNode} title="Add Node (Ctrl+N)" style={{ cursor: isRunning ? 'default' : 'pointer', background: isRunning ? '#1e293b' : '#334155', border: 'none', padding: '8px 16px', borderRadius: '4px', color: isRunning ? '#64748b' : 'white' }}>➕ New Node</button>
        <button disabled={isRunning} onClick={clearBoard} style={{ cursor: isRunning ? 'default' : 'pointer', background: isRunning ? '#1e293b' : '#475569', border: 'none', padding: '8px 16px', borderRadius: '4px', color: isRunning ? '#64748b' : 'white' }}>🧹 Clear Board</button>
        <button onClick={showHelp} title="Help (Ctrl+/ or F1)" style={{ cursor: 'pointer', background: '#0f172a', border: '1px solid #475569', padding: '8px 16px', borderRadius: '4px', color: '#e2e8f0' }}>❔ Help</button>
        <button onClick={exportConfig} style={{ cursor: 'pointer', background: '#8b5cf6', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>💾 Export</button>
        <button disabled={isRunning} onClick={() => fileInputRef.current?.click()} style={{ cursor: isRunning ? 'default' : 'pointer', background: isRunning ? '#1e293b' : '#6366f1', border: 'none', padding: '8px 16px', borderRadius: '4px', color: isRunning ? '#64748b' : 'white' }}>📂 Import</button>

        </div>

        <div style={{ textAlign: 'right', fontSize: '14px', minWidth: 220, flexShrink: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#94a3b8' }}>{simMessage}</div>
            {((!isTmMode && stepIndex === inputString.length) || (isTmMode && !isRunning && stepIndex >= 0)) && (
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: isAccepted() ? '#4ade80' : '#f87171' }}>
                    {isAccepted() ? '✅ ACCEPTED' : '❌ REJECTED'}
                </div>
            )}
        </div>
      </div>

      {/* Main Content: Canvas + Sidebar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onPaneClick={onPaneClick}
            deleteKeyCode={null}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable={!isRunning}
            nodesConnectable={!isRunning}
            elementsSelectable={!isRunning}
            proOptions={{ hideAttribution: true }}
            fitView
            style={{ background: '#0f172a' }}
          >
            <Background color="#334155" gap={20} size={1} /> 
            <Controls position="bottom-right" style={{ fill: '#0f172a' }} />
          </ReactFlow>

          <div style={{ position: 'absolute', bottom: 20, left: 20, padding: '10px 20px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
              <button disabled={isRunning} onClick={addNode} title="Add Node (Ctrl+N)" style={{ background: isRunning ? '#1e293b' : '#334155', color: isRunning ? '#64748b' : '#e2e8f0', border: '1px solid #475569', padding: '5px 15px', borderRadius: '4px', cursor: isRunning ? 'default' : 'pointer' }}>+ Add Node</button>
              <button disabled={isRunning} onClick={deleteSelected} title="Delete selected (Del)" style={{ background: isRunning ? '#1e293b' : '#450a0a', color: isRunning ? '#64748b' : '#fca5a5', border: '1px solid #7f1d1d', padding: '5px 15px', borderRadius: '4px', cursor: isRunning ? 'default' : 'pointer' }}>🗑 Delete</button>
              <div style={{ width: '1px', background: '#475569', margin: '0 2px' }} />
              <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ background: canUndo ? '#334155' : '#1e293b', color: canUndo ? '#e2e8f0' : '#475569', border: '1px solid #475569', padding: '5px 15px', borderRadius: '4px', cursor: canUndo ? 'pointer' : 'default', transition: 'all 0.15s' }}>↩ Undo</button>
              <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" style={{ background: canRedo ? '#334155' : '#1e293b', color: canRedo ? '#e2e8f0' : '#475569', border: '1px solid #475569', padding: '5px 15px', borderRadius: '4px', cursor: canRedo ? 'pointer' : 'default', transition: 'all 0.15s' }}>↪ Redo</button>
          </div>
        </div>

        {/* Resizer Handle */}
        <div
            onMouseDown={startResizing}
            style={{
              width: '5px',
              cursor: 'col-resize',
              background: '#334155',
              zIndex: 20,
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#0ea5e9'}
            onMouseOut={(e) => e.currentTarget.style.background = '#334155'}
        />

        {/* Right: Machine Description & Transition Table */}
        <div style={{ width: sidebarWidth, minWidth: 200, maxWidth: 800, borderLeft: '1px solid #21314a', padding: 16, overflowY: 'auto', background: '#071024' }}>
          <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: '600', marginBottom: 8 }}>M = (Q, Σ, δ, q₀, F)</div>

          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8 }}>Description</div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
            <div><strong>Q</strong>: {"{"}{Q.join(', ')}{"}"}</div>
            <div style={{ marginTop: 6 }}><strong>Σ</strong>: {"{"}{alphabet.join(', ')}{"}"}</div>
            <div style={{ marginTop: 6 }}>
              <strong>δ</strong>: <br/>
              <div style={{ paddingLeft: 10, marginTop: 4 }}>
                {isPdaMode
                  ? edges.flatMap((edge, edgeIdx) => {
                      const rules = parsePdaRules(edge.label as string);
                      return rules.map((rule, ruleIdx) => (
                        <div key={`pda-delta-${edgeIdx}-${ruleIdx}`}>
                          δ({edge.source}, {rule.input}, {rule.pop}) = ({edge.target}, {rule.push})
                        </div>
                      ));
                    })
                  : isTmMode
                  ? edges.flatMap((edge, edgeIdx) => {
                      const rules = parseTmRules(edge.label as string);
                      return rules.map((rule, ruleIdx) => (
                        <div key={`tm-delta-${edgeIdx}-${ruleIdx}`}>
                          δ({edge.source}, {rule.read}) = ({edge.target}, {rule.write}, {rule.move})
                        </div>
                      ));
                    })
                  : nodes.flatMap(n => {
                      const map = transitionMap[n.id];
                      if (!map) return [];
                      return Object.keys(map).map(symbol => {
                        const targets = map[symbol];
                        if (targets && targets.length > 0) {
                          const targetStr = (mode === 'DFA') ? targets[0] : `{${targets.join(', ')}}`;
                          return <div key={`${n.id}-${symbol}`}>δ({n.id}, {symbol}) = {targetStr}</div>;
                        }
                        return null;
                      });
                    })}
              </div>
            </div>
            <div style={{ marginTop: 6 }}><strong>q₀</strong>: {q0}</div>
            <div style={{ marginTop: 6 }}><strong>F</strong>: {"{"}{F.join(', ')}{"}"}</div>
          </div>
          
           {/* Simulation History */}
           {history.length > 0 && (
            <>
              <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8, marginTop: 20 }}>Simulation Steps</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12, maxHeight: 200, overflowY: 'auto', background: '#0f172a', padding: 8, borderRadius: 4 }}>
                {history.map((step, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>{i + 1}. {step}</div>
                ))}
              </div>
            </>
          )}

          {isPdaMode && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, marginTop: 20 }}>
                <div style={{ color: '#cbd5e1', fontWeight: 600 }}>
                  PDA Configurations
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>({pdaConfigs.length})</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPdaStackView('top')}
                    style={{
                      background: pdaStackView === 'top' ? '#334155' : '#0f172a',
                      color: pdaStackView === 'top' ? '#e2e8f0' : '#94a3b8',
                      border: '1px solid #21314a',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    Top→Bottom
                  </button>
                  <button
                    onClick={() => setPdaStackView('raw')}
                    style={{
                      background: pdaStackView === 'raw' ? '#334155' : '#0f172a',
                      color: pdaStackView === 'raw' ? '#e2e8f0' : '#94a3b8',
                      border: '1px solid #21314a',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    Raw
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12, maxHeight: 220, overflowY: 'auto', background: '#0f172a', borderRadius: 4, border: '1px solid #21314a' }}>
                {pdaConfigs.length === 0 ? (
                  <div style={{ padding: 8 }}>No active PDA configuration</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                        <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a', width: '35%' }}>State</th>
                        <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>
                          {pdaStackView === 'top' ? 'Stack (top→bottom)' : 'Stack (raw order)'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdaConfigs.slice(0, 40).map((cfg, i) => {
                        const stackDisplay = cfg.stack.length === 0
                          ? 'ε'
                          : pdaStackView === 'top'
                            ? [...cfg.stack].reverse().join(' ')
                            : cfg.stack.join(' ');
                        return (
                          <tr key={`pda-cfg-${cfg.state}-${cfg.stack.join('')}-${i}`} style={{ borderBottom: '1px dashed #0b1324' }}>
                            <td style={{ padding: '6px 8px', color: '#e2e8f0', fontWeight: 600 }}>{cfg.state}</td>
                            <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{stackDisplay}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {pdaConfigs.length > 40 && (
                  <div style={{ padding: 8, borderTop: '1px solid #21314a', color: '#94a3b8' }}>
                    Showing first 40 of {pdaConfigs.length} configurations
                  </div>
                )}
              </div>
            </>
          )}

          {isTmMode && (
            <>
              <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8, marginTop: 20 }}>
                Tape View
                <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                  ({tmConfigs.length} cfg)
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12, background: '#0f172a', borderRadius: 4, border: '1px solid #21314a', padding: 8 }}>
                {tmConfigs.length === 0 ? (
                  <div>No active TM configuration</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 6, color: '#e2e8f0' }}>
                      State: <strong>{tmConfigs[0].state}</strong> | Head: <strong>{tmConfigs[0].head}</strong>
                    </div>
                    <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: '4px 0' }}>
                      {tmConfigs[0].tape.map((ch, idx) => (
                        <span key={`tm-cell-${idx}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginRight: 8 }}>
                          <span style={{ color: idx === tmConfigs[0].head ? '#22d3ee' : '#64748b', fontSize: 11, height: 14 }}>
                            {idx === tmConfigs[0].head ? '^' : ''}
                          </span>
                          <span style={{ minWidth: 20, textAlign: 'center', padding: '2px 6px', border: '1px solid #334155', borderRadius: 4, color: idx === tmConfigs[0].head ? '#22d3ee' : '#cbd5e1' }}>
                            {ch || TM_BLANK}
                          </span>
                        </span>
                      ))}
                    </div>
                    {tmConfigs.length > 1 && (
                      <div style={{ marginTop: 6, color: '#94a3b8' }}>Showing first configuration of {tmConfigs.length}</div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8 }}>Transition Table</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>State</th>
                  {alphabet.map(sym => (
                    <th key={sym} style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>{sym}</th>
                  ))}
                  {(mode === 'eNFA' || mode === 'DPDA' || mode === 'NPDA') && <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>ε</th>}
                </tr>
              </thead>
              <tbody>
                {nodes.map(n => {
                  const isStart = n.id === q0;
                  const isAccept = F.includes(n.id);
                  const prefix = (isStart ? '→' : '') + (isAccept ? '*' : '');
                  return (
                  <tr key={n.id} style={{ borderBottom: '1px dashed #0f172a' }}>
                    <td style={{ padding: '6px 8px', color: '#e2e8f0', fontWeight: 600 }}>
                      <span style={{ color: '#94a3b8', marginRight: 4 }}>{prefix}</span>
                      {n.id}
                    </td>
                    {alphabet.map(sym => (
                      <td key={sym} style={{ padding: '6px 8px', color: '#cbd5e1' }}>{(transitionMap[n.id] && transitionMap[n.id][sym]) ? transitionMap[n.id][sym].join(',') : '—'}</td>
                    ))}
                    {(mode === 'eNFA' || mode === 'DPDA' || mode === 'NPDA') && <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{(transitionMap[n.id] && transitionMap[n.id]['ε']) ? transitionMap[n.id]['ε'].join(',') : '—'}</td>}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AutomataEditor />
    </ReactFlowProvider>
  );
}