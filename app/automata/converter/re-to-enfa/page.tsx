'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ArrowLeft, FlaskConical, Play, RotateCcw, Upload } from 'lucide-react';

type StepItem = {
  index: number;
  rule: 'Symbol Rule' | 'Concatenation Rule' | 'Union Rule' | 'Kleene Star Rule';
  detail: string;
};

type RuleFrame = {
  stepIndex: number;
  rule: StepItem['rule'];
  stateIds: number[];
};

type Fragment = { start: number; end: number };

type StateNodeProps = {
  data: { label: string; isStart?: boolean; isAccept?: boolean };
};

type FrameBoxNodeData = {
  title: string;
  stepIndex?: number;
  width: number;
  height: number;
  bgColor: string;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidth: number;
  layer?: number;
};

const StateNode: React.FC<StateNodeProps> = ({ data }) => {
  let borderColor = '#64748b';
  let borderStyle = 'solid';
  let borderWidth = '2px';
  if (data.isStart) borderColor = '#3b82f6';
  if (data.isAccept) {
    borderStyle = 'double';
    borderWidth = '6px';
    borderColor = data.isStart ? '#3b82f6' : '#e2e8f0';
  }

  return (
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: '50%',
        background: '#1e293b',
        border: `${borderWidth} ${borderStyle} ${borderColor}`,
        color: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: 12,
      }}
    >
      {data.label}
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="t" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="tt" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="tb" style={{ opacity: 0 }} />
    </div>
  );
};

const FrameBoxNode: React.FC<{ data: FrameBoxNodeData }> = ({ data }) => {
  return (
    <div
      style={{
        width: Math.max(120, Number(data.width) || 320),
        height: Math.max(90, Number(data.height) || 180),
        background: data.bgColor || 'rgba(30,41,59,0.20)',
        borderColor: data.borderColor || '#f59e0b',
        borderStyle: data.borderStyle || 'dashed',
        borderWidth: Math.max(1, Number(data.borderWidth) || 2),
        borderRadius: 12,
        color: '#e2e8f0',
        boxSizing: 'border-box',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'flex-start',
        fontFamily: 'var(--font-anuphan)',
      }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        background: 'rgba(15,23,42,0.75)',
        border: `1px solid ${data.borderColor || '#f59e0b'}`,
        borderRadius: 6,
        padding: '2px 8px',
        fontFamily: 'var(--font-anuphan)',
      }}>
        {data.title || 'Thompson Rule'}
      </div>
    </div>
  );
};

const nodeTypes = { stateNode: StateNode, frameBoxNode: FrameBoxNode };

const isLiteral = (c: string) => /[a-zA-Z0-9ε]/.test(c);

const addConcat = (expr: string) => {
  const out: string[] = [];
  for (let i = 0; i < expr.length; i++) {
    const a = expr[i];
    const b = expr[i + 1];
    out.push(a);
    if (!b) continue;
    const needConcat =
      (isLiteral(a) || a === ')' || a === '*') &&
      (isLiteral(b) || b === '(');
    if (needConcat) out.push('.');
  }
  return out.join('');
};

const toPostfix = (expr: string) => {
  const prec: Record<string, number> = { '|': 1, '+': 1, '.': 2, '*': 3 };
  const out: string[] = [];
  const st: string[] = [];

  for (const token of expr) {
    if (isLiteral(token)) {
      out.push(token);
    } else if (token === '(') {
      st.push(token);
    } else if (token === ')') {
      while (st.length > 0 && st[st.length - 1] !== '(') out.push(st.pop()!);
      if (st.length === 0) throw new Error('Mismatched parentheses');
      st.pop();
    } else if (token in prec) {
      while (
        st.length > 0 &&
        st[st.length - 1] !== '(' &&
        prec[st[st.length - 1]] >= prec[token]
      ) {
        out.push(st.pop()!);
      }
      st.push(token === '+' ? '|' : token);
    } else {
      throw new Error(`Invalid token: ${token}`);
    }
  }

  while (st.length > 0) {
    const t = st.pop()!;
    if (t === '(') throw new Error('Mismatched parentheses');
    out.push(t);
  }

  return out.join('');
};

const layoutGraph = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    nodesep: 130,
    ranksep: 180,
    edgesep: 70,
    marginx: 60,
    marginy: 45,
    ranker: 'network-simplex',
    acyclicer: 'greedy',
  });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach(n => g.setNode(n.id, { width: 70, height: 70 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    return {
      ...n,
      position: { x: (p?.x ?? 0) - 35, y: (p?.y ?? 0) - 35 },
    };
  });
};

const buildRuleFrameNodes = (layoutedStateNodes: Node[], frames: RuleFrame[]): Node[] => {
  const posById = new Map<string, { x: number; y: number }>();
  layoutedStateNodes.forEach((n) => posById.set(n.id, n.position));

  const out: Node[] = [];
  frames.forEach((f) => {
    const styleByRule: Record<StepItem['rule'], { bgColor: string; borderColor: string }> = {
      'Symbol Rule': { bgColor: 'rgba(14,165,233,0.10)', borderColor: '#38bdf8' },
      'Concatenation Rule': { bgColor: 'rgba(34,197,94,0.10)', borderColor: '#4ade80' },
      'Union Rule': { bgColor: 'rgba(168,85,247,0.10)', borderColor: '#c084fc' },
      'Kleene Star Rule': { bgColor: 'rgba(249,115,22,0.12)', borderColor: '#fb923c' },
    };
    const color = styleByRule[f.rule];

    const ids = Array.from(new Set(f.stateIds.map((id) => `q${id}`)));
    const pts = ids
      .map((id) => posById.get(id))
      .filter((p): p is { x: number; y: number } => !!p);
    if (pts.length === 0) return;

    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const paddingX = 42;
    const paddingY = 36;
    const width = Math.max(180, maxX - minX + 70 + paddingX * 2);
    const height = Math.max(110, maxY - minY + 70 + paddingY * 2);

    out.push({
      id: `rule-frame-${f.stepIndex}`,
      type: 'frameBoxNode',
      position: { x: minX - paddingX, y: minY - paddingY },
      data: {
        title: `Step ${f.stepIndex} · ${f.rule}`,
        stepIndex: f.stepIndex,
        width,
        height,
        bgColor: color.bgColor,
        borderColor: color.borderColor,
        borderStyle: 'dashed',
        borderWidth: 2,
        layer: -1,
      } as FrameBoxNodeData,
      draggable: true,
      selectable: true,
      zIndex: -1,
    } as Node);
  });

  return out;
};

function FitViewOnLoad({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (nodeCount > 0) setTimeout(() => fitView({ padding: 0.2, duration: 250 }), 30);
  }, [nodeCount, fitView]);
  return null;
}

function ReToEnfaScreen() {
  const [regex, setRegex] = useState('(a|b)*abb');
  const [normalized, setNormalized] = useState('');
  const [postfix, setPostfix] = useState('');
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [error, setError] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [frameViewMode, setFrameViewMode] = useState<'all' | 'latest'>('all');
  const [hiddenFrameSteps, setHiddenFrameSteps] = useState<Set<number>>(new Set());

  const applyFrameVisibility = React.useCallback((allNodes: Node[], latestStep: number) => {
    return allNodes.map((n) => {
      if (n.type !== 'frameBoxNode') return { ...n, hidden: false } as Node;
      const stepIndex = Number((n.data as { stepIndex?: number })?.stepIndex || 0);
      const hiddenByMode = frameViewMode === 'latest' && stepIndex !== latestStep;
      const hiddenByUser = hiddenFrameSteps.has(stepIndex);
      return { ...n, hidden: hiddenByMode || hiddenByUser } as Node;
    });
  }, [frameViewMode, hiddenFrameSteps]);

  const convert = () => {
    setError('');
    setHiddenFrameSteps(new Set());
    try {
      const raw = regex.replace(/\s+/g, '');
      if (!raw) throw new Error('Please enter a regular expression.');
      if (raw.length > 200) throw new Error('Regex is too long for interactive conversion (max 200 chars).');

      const withConcat = addConcat(raw);
      const pf = toPostfix(withConcat);

      let stateId = 0;
      const nextState = () => stateId++;
      const st: Fragment[] = [];
      const eds: Array<{ from: number; to: number; label: string }> = [];
      const buildSteps: StepItem[] = [];
      const ruleFrames: RuleFrame[] = [];

      const pushStep = (rule: StepItem['rule'], detail: string) => {
        buildSteps.push({ index: buildSteps.length + 1, rule, detail });
      };

      const pushRuleFrame = (rule: StepItem['rule'], stateIds: number[]) => {
        ruleFrames.push({
          stepIndex: buildSteps.length,
          rule,
          stateIds,
        });
      };

      for (const t of pf) {
        if (isLiteral(t)) {
          const s = nextState();
          const e = nextState();
          eds.push({ from: s, to: e, label: t });
          st.push({ start: s, end: e });
          pushStep('Symbol Rule', `Create fragment for '${t}': q${s} --${t}--> q${e}`);
          pushRuleFrame('Symbol Rule', [s, e]);
        } else if (t === '.') {
          const b = st.pop();
          const a = st.pop();
          if (!a || !b) throw new Error('Invalid concatenation in expression.');
          eds.push({ from: a.end, to: b.start, label: 'ε' });
          st.push({ start: a.start, end: b.end });
          pushStep('Concatenation Rule', `Connect q${a.end} --ε--> q${b.start}; new fragment q${a.start}..q${b.end}`);
          pushRuleFrame('Concatenation Rule', [a.start, a.end, b.start, b.end]);
        } else if (t === '|') {
          const b = st.pop();
          const a = st.pop();
          if (!a || !b) throw new Error('Invalid union in expression.');
          const s = nextState();
          const e = nextState();
          eds.push({ from: s, to: a.start, label: 'ε' });
          eds.push({ from: s, to: b.start, label: 'ε' });
          eds.push({ from: a.end, to: e, label: 'ε' });
          eds.push({ from: b.end, to: e, label: 'ε' });
          st.push({ start: s, end: e });
          pushStep('Union Rule', `New start q${s}, new end q${e}; split/merge with ε transitions`);
          pushRuleFrame('Union Rule', [s, e, a.start, a.end, b.start, b.end]);
        } else if (t === '*') {
          const a = st.pop();
          if (!a) throw new Error('Invalid Kleene star in expression.');
          const s = nextState();
          const e = nextState();
          eds.push({ from: s, to: a.start, label: 'ε' });
          eds.push({ from: s, to: e, label: 'ε' });
          eds.push({ from: a.end, to: a.start, label: 'ε' });
          eds.push({ from: a.end, to: e, label: 'ε' });
          st.push({ start: s, end: e });
          pushStep('Kleene Star Rule', `New start q${s}, new end q${e}; loop and skip ε transitions`);
          pushRuleFrame('Kleene Star Rule', [s, e, a.start, a.end]);
        } else {
          throw new Error(`Unsupported operator '${t}'`);
        }
      }

      if (st.length !== 1) throw new Error('Invalid RE: final fragment construction failed.');

      const result = st[0];
      const allStates = new Set<number>();
      eds.forEach(e => { allStates.add(e.from); allStates.add(e.to); });
      allStates.add(result.start);
      allStates.add(result.end);

      const rfnodes: Node[] = [...allStates]
        .sort((a, b) => a - b)
        .map((id) => ({
          id: `q${id}`,
          type: 'stateNode',
          position: { x: 0, y: 0 },
          data: {
            isStart: id === result.start,
            isAccept: id === result.end,
          },
        }));

      const rfedges: Edge[] = eds.map((e, i) => {
        const backward = e.from > e.to;
        return {
          id: `e-${i}-${e.from}-${e.to}`,
          source: `q${e.from}`,
          target: `q${e.to}`,
          sourceHandle: backward ? 't' : 'r',
          targetHandle: backward ? 'tt' : 'l',
          label: e.label,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        } as Edge;
      });

      const layoutedStates = layoutGraph(rfnodes, rfedges);
      const frameNodes = buildRuleFrameNodes(layoutedStates, ruleFrames);

      setNormalized(withConcat);
      setPostfix(pf);
      setSteps(buildSteps);
      setEdges(rfedges);
      setNodes(applyFrameVisibility([...frameNodes, ...layoutedStates], buildSteps.length));
    } catch (err) {
      setNodes([]);
      setEdges([]);
      setSteps([]);
      setPostfix('');
      setNormalized('');
      setError((err as Error).message || 'Conversion failed.');
    }
  };

  const clearAll = () => {
    setRegex('');
    setNodes([]);
    setEdges([]);
    setSteps([]);
    setPostfix('');
    setNormalized('');
    setError('');
    setHiddenFrameSteps(new Set());
  };

  useEffect(() => {
    const latestStep = steps.length;
    setNodes((prev) => applyFrameVisibility(prev, latestStep));
  }, [frameViewMode, hiddenFrameSteps, steps.length, applyFrameVisibility, setNodes]);

  const exportToVisualizer = () => {
    const stateNodes = nodes.filter((n) => (n.type || 'stateNode') === 'stateNode');
    if (stateNodes.length === 0) {
      setError('Please convert first before exporting to Visualizer.');
      return;
    }

    const frameNodes = nodes.filter((n) => n.type === 'frameBoxNode' && !n.hidden);

    const snapshot = {
      mode: 'eNFA',
      inputString: '',
      sidebarWidth: 420,
      nodeCount: stateNodes.length,
      nodes: [
        ...stateNodes.map((n) => ({
          ...n,
          type: 'stateNode',
          data: {
            label: n.id,
            isStart: !!(n.data as { isStart?: boolean })?.isStart,
            isAccept: !!(n.data as { isAccept?: boolean })?.isAccept,
            isActive: false,
            layer: 0,
          },
        })),
        ...frameNodes.map((n) => ({
          ...n,
          type: 'frameBoxNode',
        })),
      ],
      edges: edges.map((e) => ({
        ...e,
        sourceHandle: (e.sourceHandle as string) || 'r',
        targetHandle: (e.targetHandle as string) || 'l',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      })),
    };

    localStorage.setItem('automata-visualizer-draft-v1', JSON.stringify(snapshot));
    window.location.href = '/automata/visualizer';
  };

  const stats = useMemo(() => ({
    states: nodes.filter(n => (n.type || 'stateNode') === 'stateNode').length,
    transitions: edges.length,
  }), [nodes, edges.length]);

  return (
    <div className="visualizer-root h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/automata" className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">RE → ε-NFA Converter</h1>
            <p className="text-[11px] text-slate-500">Thompson&apos;s Construction with rule-by-rule explanation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={convert} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium">
            <Play className="w-4 h-4" /> Convert
          </button>
          <button onClick={exportToVisualizer} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 rounded text-sm font-medium">
            <Upload className="w-4 h-4" /> Export to Visualizer
          </button>
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium border border-slate-700">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[34%] border-r border-slate-800 bg-slate-900/20 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2 text-orange-300">
              <FlaskConical className="w-4 h-4" /> Input Regular Expression
            </div>
            <input
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              placeholder="e.g. (a|b)*abb"
              className="w-full px-3 py-2 text-sm rounded bg-slate-950 border border-slate-700 focus:outline-none focus:border-orange-500"
            />
            <p className="text-[11px] text-slate-500">
              Supported: literals `a-z A-Z 0-9`, union `|` or `+`, star `*`, parentheses `()`, epsilon `ε`.
            </p>
            <button
              onClick={() => setRegex('(a|b)*abb')}
              className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
            >
              Use example
            </button>
            {error && <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded p-2">{error}</div>}
          </div>

          <div className="p-4 border-b border-slate-800 space-y-1 text-xs">
            <div><span className="text-slate-500">Normalized:</span> <span className="font-mono text-slate-300">{normalized || '—'}</span></div>
            <div><span className="text-slate-500">Postfix:</span> <span className="font-mono text-slate-300">{postfix || '—'}</span></div>
            <div><span className="text-slate-500">States:</span> <span className="text-slate-300">{stats.states}</span></div>
            <div><span className="text-slate-500">Transitions:</span> <span className="text-slate-300">{stats.transitions}</span></div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-300">Thompson Rules Used</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFrameViewMode('all')}
                  className={`text-[10px] px-2 py-1 rounded border ${frameViewMode === 'all' ? 'bg-cyan-800 border-cyan-500 text-cyan-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFrameViewMode('latest')}
                  className={`text-[10px] px-2 py-1 rounded border ${frameViewMode === 'latest' ? 'bg-cyan-800 border-cyan-500 text-cyan-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                >
                  Latest
                </button>
              </div>
            </div>
            {steps.length === 0 ? (
              <div className="text-xs text-slate-600">No steps yet. Press Convert.</div>
            ) : (
              <div className="space-y-2">
                {steps.map((s) => (
                  <div key={s.index} className="text-xs bg-slate-900/70 border border-slate-800 rounded p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[10px] uppercase tracking-wide text-orange-400 font-bold">Step {s.index} · {s.rule}</div>
                      <button
                        onClick={() => setHiddenFrameSteps((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.index)) next.delete(s.index);
                          else next.add(s.index);
                          return next;
                        })}
                        className={`text-[10px] px-2 py-0.5 rounded border ${hiddenFrameSteps.has(s.index) ? 'bg-rose-900/40 border-rose-700 text-rose-300' : 'bg-emerald-900/30 border-emerald-700 text-emerald-300'}`}
                        title={hiddenFrameSteps.has(s.index) ? 'Show this frame' : 'Hide this frame'}
                      >
                        {hiddenFrameSteps.has(s.index) ? 'Hidden' : 'Visible'}
                      </button>
                    </div>
                    <div className="text-slate-300 mt-1">{s.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative min-h-0 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={null}
            nodesDraggable
            elementsSelectable
            proOptions={{ hideAttribution: true }}
            style={{ background: '#0f172a' }}
          >
            <FitViewOnLoad nodeCount={nodes.length} />
            <Background color="#1e293b" gap={20} size={1} />
            <Controls position="bottom-right" style={{ fill: '#0f172a' }} />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm pointer-events-none">
              Graph preview will appear here after conversion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReToEnfaPage() {
  return (
    <ReactFlowProvider>
      <ReToEnfaScreen />
    </ReactFlowProvider>
  );
}
