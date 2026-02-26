'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow, useNodesState, useEdgesState, addEdge,
  Background, Controls, Connection, Edge, Node,
  Handle, Position, ConnectionMode, MarkerType, ReactFlowProvider, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, GitMerge, Trash2, StepForward, Play, Download, Upload, SkipForward } from 'lucide-react';
import Link from 'next/link';
import dagre from 'dagre';
import Swal from 'sweetalert2';

// --- Custom Node ---
type StateNodeProps = {
  data: { label: string; isStart?: boolean; isAccept?: boolean; isActive?: boolean };
  isConnectable?: boolean;
  selected?: boolean;
};
const StateNode: React.FC<StateNodeProps> = ({ data, isConnectable, selected }) => {
  let bc = '#64748b', bg = '#1e293b', tc = '#e2e8f0', bw = '2px', bs = 'solid', shadow = 'none';
  if (data.isStart) bc = '#3b82f6';
  if (data.isAccept) { bs = 'double'; bw = '6px'; bc = data.isStart ? '#3b82f6' : '#e2e8f0'; }
  if (data.isActive) { bc = '#fb923c'; bg = '#431407'; shadow = '0 0 18px #fb923c'; tc = '#fdba74'; }
  if (selected) shadow = (shadow !== 'none' ? shadow + ', ' : '') + '0 0 0 3px #22d3ee, 0 0 10px #22d3ee99';
  const hs = { width: 12, height: 12, background: '#94a3b8' };
  const hsHidden = { ...hs, opacity: 0, pointerEvents: 'none' as const };
  return (
    <div style={{ width: 60, height: 60, borderRadius: '50%', background: bg,
      border: `${bw} ${bs} ${bc}`, boxShadow: shadow, color: tc,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', position: 'relative', cursor: 'pointer' }}>
      <div style={{ pointerEvents: 'none', userSelect: 'none', fontSize: 12 }}>{data.label}</div>
      <Handle type="target" position={Position.Top}    id="tt" isConnectable={isConnectable} style={{ ...hs, opacity: 0 }} />
      <Handle type="target" position={Position.Right}  id="tr" isConnectable={isConnectable} style={{ ...hs, opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="tb" isConnectable={isConnectable} style={{ ...hs, opacity: 0 }} />
      <Handle type="target" position={Position.Left}   id="tl" isConnectable={isConnectable} style={{ ...hs, opacity: 0 }} />

      {/* hidden lane handles (target) to fan-in/fan-out without changing visible 4-direction UI */}
      <Handle type="target" position={Position.Top}    id="tt1" isConnectable={isConnectable} style={{ ...hsHidden, left: '35%' }} />
      <Handle type="target" position={Position.Top}    id="tt2" isConnectable={isConnectable} style={{ ...hsHidden, left: '65%' }} />
      <Handle type="target" position={Position.Right}  id="tr1" isConnectable={isConnectable} style={{ ...hsHidden, top: '35%' }} />
      <Handle type="target" position={Position.Right}  id="tr2" isConnectable={isConnectable} style={{ ...hsHidden, top: '65%' }} />
      <Handle type="target" position={Position.Bottom} id="tb1" isConnectable={isConnectable} style={{ ...hsHidden, left: '35%' }} />
      <Handle type="target" position={Position.Bottom} id="tb2" isConnectable={isConnectable} style={{ ...hsHidden, left: '65%' }} />
      <Handle type="target" position={Position.Left}   id="tl1" isConnectable={isConnectable} style={{ ...hsHidden, top: '35%' }} />
      <Handle type="target" position={Position.Left}   id="tl2" isConnectable={isConnectable} style={{ ...hsHidden, top: '65%' }} />

      <Handle type="source" position={Position.Top}    id="t" isConnectable={isConnectable} style={hs} />
      <Handle type="source" position={Position.Right}  id="r" isConnectable={isConnectable} style={hs} />
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={isConnectable} style={hs} />
      <Handle type="source" position={Position.Left}   id="l" isConnectable={isConnectable} style={hs} />

      {/* hidden lane handles (source) to fan-out while keeping visible 4-direction points */}
      <Handle type="source" position={Position.Top}    id="t1" isConnectable={isConnectable} style={{ ...hsHidden, left: '35%' }} />
      <Handle type="source" position={Position.Top}    id="t2" isConnectable={isConnectable} style={{ ...hsHidden, left: '65%' }} />
      <Handle type="source" position={Position.Right}  id="r1" isConnectable={isConnectable} style={{ ...hsHidden, top: '35%' }} />
      <Handle type="source" position={Position.Right}  id="r2" isConnectable={isConnectable} style={{ ...hsHidden, top: '65%' }} />
      <Handle type="source" position={Position.Bottom} id="b1" isConnectable={isConnectable} style={{ ...hsHidden, left: '35%' }} />
      <Handle type="source" position={Position.Bottom} id="b2" isConnectable={isConnectable} style={{ ...hsHidden, left: '65%' }} />
      <Handle type="source" position={Position.Left}   id="l1" isConnectable={isConnectable} style={{ ...hsHidden, top: '35%' }} />
      <Handle type="source" position={Position.Left}   id="l2" isConnectable={isConnectable} style={{ ...hsHidden, top: '65%' }} />
    </div>
  );
};
const nodeTypes = { stateNode: StateNode };

// --- Types & helpers ---
type DFARow = {
  key: string; label: string; prettyName: string;
  isStart: boolean; isAccept: boolean;
  transitions: Record<string, string>;
  isReachable: boolean; isProcessed: boolean;
};
const getKey = (ids: string[]): string =>
  ids.length === 0 ? '\u2205' : [...ids].sort().join(',');
const LBL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toLabel = (i: number) => i < 26 ? LBL[i] : LBL[Math.floor(i/26)-1]+LBL[i%26];

function generatePowerSet(ids: string[]): string[][] {
  const sorted = [...ids].sort();
  const result: string[][] = [[]];
  sorted.forEach(id => {
    const len = result.length;
    for (let i = 0; i < len; i++) result.push([...result[i], id]);
  });
  return result.sort((a,b) => a.length !== b.length ? a.length-b.length : a.join(',').localeCompare(b.join(',')));
}

/** Build dagre-layout + ReactFlow nodes/edges from reachable rows.
 *  Node IDs = row.label (A/B/C…) — avoid conflicts with NFA node IDs. */
function layoutDfaGraph(reachable: DFARow[], alphabet: string[]) {
  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({ rankdir: 'LR', nodesep: 90, ranksep: 150, edgesep: 60, marginx: 30, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  reachable.forEach(r => g.setNode(r.label, { width: 70, height: 70 }));
  const edgeMap = new Map<string, string[]>();
  reachable.forEach(r => {
    alphabet.forEach(sym => {
      const tgtKey = r.transitions[sym];
      const tgtRow = reachable.find(x => x.key === tgtKey);
      if (!tgtRow) return;
      const k = r.label + '\x00' + tgtRow.label;
      if (!edgeMap.has(k)) edgeMap.set(k, []);
      edgeMap.get(k)!.push(sym);
    });
  });
  const nodeCount = Math.max(1, reachable.length);
  const edgeCount = Array.from(edgeMap.values()).reduce((sum, syms) => sum + (syms.length > 0 ? 1 : 0), 0);
  const density = edgeCount / nodeCount;
  const extraGap = Math.min(120, Math.floor(density * 26));
  g.setGraph({ rankdir: 'LR', nodesep: 90 + extraGap, ranksep: 150 + extraGap, edgesep: 60 + Math.floor(extraGap / 2), marginx: 30, marginy: 20 });
  edgeMap.forEach((_, k) => { const [s,t] = k.split('\x00'); try { g.setEdge(s,t); } catch { /**/ } });
  dagre.layout(g);
  const newNodes: Node[] = reachable.map(r => {
    const p = g.node(r.label);
    return { id: r.label, type: 'stateNode', position: { x: p?.x??0, y: p?.y??0 },
      data: { label: r.label, isStart: r.isStart, isAccept: r.isAccept } };
  });
  const newEdges: Edge[] = [];
  const sourceLaneCounter = new Map<string, number>();
  const targetLaneCounter = new Map<string, number>();
  const sourceLaneMap: Record<'t'|'r'|'b'|'l', string[]> = {
    t: ['t', 't1', 't2'],
    r: ['r', 'r1', 'r2'],
    b: ['b', 'b1', 'b2'],
    l: ['l', 'l1', 'l2'],
  };
  const targetLaneMap: Record<'tt'|'tr'|'tb'|'tl', string[]> = {
    tt: ['tt', 'tt1', 'tt2'],
    tr: ['tr', 'tr1', 'tr2'],
    tb: ['tb', 'tb1', 'tb2'],
    tl: ['tl', 'tl1', 'tl2'],
  };

  edgeMap.forEach((syms, k) => {
    const [src, tgt] = k.split('\x00');
    const srcPos = g.node(src) as { x: number; y: number } | undefined;
    const tgtPos = g.node(tgt) as { x: number; y: number } | undefined;
    let sourceBase: 't' | 'r' | 'b' | 'l' = 'r';
    let targetBase: 'tt' | 'tr' | 'tb' | 'tl' = 'tl';

    if (src === tgt) {
      sourceBase = 't';
      targetBase = 'tr';
    } else if (srcPos && tgtPos) {
      const dx = tgtPos.x - srcPos.x;
      const dy = tgtPos.y - srcPos.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx >= 0) { sourceBase = 'r'; targetBase = 'tl'; }
        else { sourceBase = 'l'; targetBase = 'tr'; }
      } else {
        if (dy >= 0) { sourceBase = 'b'; targetBase = 'tt'; }
        else { sourceBase = 't'; targetBase = 'tb'; }
      }
    }

    const srcLaneKey = `${src}|${sourceBase}`;
    const tgtLaneKey = `${tgt}|${targetBase}`;
    const srcLane = sourceLaneCounter.get(srcLaneKey) ?? 0;
    const tgtLane = targetLaneCounter.get(tgtLaneKey) ?? 0;
    sourceLaneCounter.set(srcLaneKey, srcLane + 1);
    targetLaneCounter.set(tgtLaneKey, tgtLane + 1);

    const sourceHandle = sourceLaneMap[sourceBase][srcLane % sourceLaneMap[sourceBase].length];
    const targetHandle = targetLaneMap[targetBase][tgtLane % targetLaneMap[targetBase].length];
    const edgeOffset = 20 + (srcLane % 3) * 10 + (tgtLane % 3) * 6;

    newEdges.push({ id: `e-${src}-${tgt}`, source: src, target: tgt,
      sourceHandle, targetHandle,
      label: syms.sort().join(', '), type: 'smoothstep',
      pathOptions: { offset: edgeOffset, borderRadius: 14 },
      labelBgPadding: [5, 3],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: '#0b1220', fillOpacity: 0.92 },
      labelStyle: { fill: '#e2e8f0', fontSize: 11, fontWeight: 600 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 2 } });
  });
  return { newNodes, newEdges };
}

/** Calls fitView whenever nodes go from 0 → N (must be inside ReactFlowProvider) */
function FitViewOnLoad({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => { if (nodeCount > 0) setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 30); }, [nodeCount, fitView]);
  return null;
}

// --- Main Component ---
function NfaToDfaConverter() {
  const [nfaNodes, setNfaNodes, onNfaNodesChange] = useNodesState<Node>([]);
  const [nfaEdges, setNfaEdges, onNfaEdgesChange] = useEdgesState<Edge>([]);
  const nfaNodeCountRef = useRef(0);
  const [dfaNodes, setDfaNodes, onDfaNodesChange] = useNodesState<Node>([]);
  const [dfaEdges, setDfaEdges, onDfaEdgesChange] = useEdgesState<Edge>([]);
  const [allRows, setAllRows] = useState<DFARow[]>([]);
  const [alphabet, setAlphabet] = useState<string[]>([]);
  const [bfsQueue, setBfsQueue] = useState<string[]>([]);
  const [nameMode, setNameMode] = useState<'label' | 'subset'>('label');
  const [phase, setPhase] = useState<'idle'|'stepping'|'done'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nfaNodesRef = useRef<Node[]>([]);
  const nfaEdgesRef = useRef<Edge[]>([]);
  const alphabetRef = useRef<string[]>([]);
  const allRowsRef = useRef<DFARow[]>([]);
  const bfsQueueRef = useRef<string[]>([]);
  useEffect(() => { nfaNodesRef.current = nfaNodes; }, [nfaNodes]);
  useEffect(() => { nfaEdgesRef.current = nfaEdges; }, [nfaEdges]);
  useEffect(() => { alphabetRef.current = alphabet; }, [alphabet]);
  useEffect(() => { allRowsRef.current = allRows; }, [allRows]);

  useEffect(() => {
    const saved = localStorage.getItem('automata-data-transfer');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.source === 'visualizer' && p.nodes && p.edges) {
          setNfaNodes(p.nodes); setNfaEdges(p.edges);
          nfaNodeCountRef.current = (p.nodes||[]).length;
        }
      } catch { /**/ }
      localStorage.removeItem('automata-data-transfer');
    }
  }, [setNfaNodes, setNfaEdges]);

  const onConnect = useCallback(async (params: Connection) => {
    const { value: label } = await Swal.fire({ title: 'Transition symbol', input: 'text',
      inputLabel: 'e.g. 0, 1, a  (\u03b5 not allowed \u2014 use \u03b5-NFA converter)', showCancelButton: true });
    if (label == null) return;
    const sym = label.trim();
    if (!sym || sym === '\u03b5' || sym.toLowerCase() === 'e') {
      await Swal.fire('Error', 'Use the \u03b5-NFA\u2192DFA converter for epsilon transitions.', 'error'); return;
    }
    setNfaEdges(eds => addEdge({ ...params, id: `e-${Date.now()}`, label: sym,
      markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } }, eds));
  }, [setNfaEdges]);

  const addNfaNode = () => {
    const id = `q${nfaNodeCountRef.current}`;
    setNfaNodes(nds => [...nds, { id, type: 'stateNode',
      position: { x: 80+(nfaNodeCountRef.current%5)*120, y: 80+Math.floor(nfaNodeCountRef.current/5)*120 },
      data: { label: id, isStart: nfaNodeCountRef.current===0, isAccept: false } }]);
    nfaNodeCountRef.current += 1;
  };
  const onNfaNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setNfaNodes(nds => nds.map(n => n.id===node.id ? {...n, data:{...n.data, isAccept:!n.data.isAccept}} : n));
  }, [setNfaNodes]);
  const onNfaNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setNfaNodes(nds => nds.map(n => ({...n, data:{...n.data, isStart: n.id===node.id}})));
  }, [setNfaNodes]);

  const resetConversion = () => {
    setAllRows([]); setAlphabet([]); setBfsQueue([]); setPhase('idle'); setErrorMsg('');
    setDfaNodes([]); setDfaEdges([]);
    allRowsRef.current = []; bfsQueueRef.current = [];
  };
  const resetAll = async () => {
    const r = await Swal.fire({ title: 'Reset everything?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes' });
    if (!r.isConfirmed) return;
    setNfaNodes([]); setNfaEdges([]); nfaNodeCountRef.current = 0; resetConversion();
  };

  const initComputation = async () => {
    setErrorMsg('');
    const curNodes = nfaNodesRef.current, curEdges = nfaEdgesRef.current;
    if (curNodes.length === 0) { setErrorMsg('No states found.'); return; }
    if (curNodes.length > 14) {
      const r = await Swal.fire({ title: 'Large graph', text: `${curNodes.length} states = ${Math.pow(2,curNodes.length)} rows. Continue?`, icon: 'warning', showCancelButton: true });
      if (!r.isConfirmed) return;
    }
    const symbols = new Set<string>(); let hasEps = false;
    curEdges.forEach(e => {
      ((e.label as string)||'').split(',').forEach(s => {
        const t = s.trim();
        if (t==='\u03b5'||t.toLowerCase()==='e') { hasEps=true; return; }
        if (t) symbols.add(t);
      });
    });
    if (hasEps) { setErrorMsg('Epsilon transitions found \u2192 use \u03b5-NFA\u2192DFA converter.'); return; }
    if (symbols.size===0) { setErrorMsg('No transitions found. Add edges first.'); return; }
    const startNode = curNodes.find(n => n.data.isStart);
    if (!startNode) { setErrorMsg('No start state. Right-click a node to set it.'); return; }
    const alpha = [...symbols].sort();
    const allIds = curNodes.map(n => n.id);
    const powerSet = generatePowerSet(allIds);
    const labelMap = new Map<string,string>();
    powerSet.forEach((sub, i) => labelMap.set(getKey(sub), toLabel(i)));
    const rows: DFARow[] = powerSet.map(sub => {
      const key = getKey(sub), label = labelMap.get(key)!;
      const isStart = key === getKey([startNode.id]);
      const isAccept = sub.some(id => curNodes.find(n=>n.id===id)?.data.isAccept);
      const transitions: Record<string,string> = {};
      alpha.forEach(sym => {
        const reach = new Set<string>();
        sub.forEach(srcId => curEdges
          .filter(e => e.source===srcId && ((e.label as string)||'').split(',').map(s=>s.trim()).includes(sym))
          .forEach(e => reach.add(e.target)));
        transitions[sym] = getKey([...reach].sort());
      });
      return { key, label, prettyName: sub.length===0?'\u2205':`{${sub.join(', ')}}`,
        isStart, isAccept, transitions, isReachable: false, isProcessed: false };
    });
    const startKey = getKey([startNode.id]);
    const markedRows = rows.map(r => r.key===startKey ? {...r, isReachable:true} : r);
    allRowsRef.current = markedRows; bfsQueueRef.current = [startKey];
    setAlphabet(alpha); alphabetRef.current = alpha;
    setAllRows(markedRows); setBfsQueue([startKey]); setPhase('stepping');
  };

  const processOneStep = useCallback(() => {
    if (bfsQueueRef.current.length===0) return;
    const [cur, ...rest] = bfsQueueRef.current;
    const alpha = alphabetRef.current;
    let rows = allRowsRef.current.map(r=>({...r}));
    rows = rows.map(r => r.key===cur ? {...r, isProcessed:true} : r);
    const curRow = rows.find(r=>r.key===cur);
    const newQ = [...rest];
    if (curRow) {
      alpha.forEach(sym => {
        const tgtKey = curRow.transitions[sym];
        const tgtRow = rows.find(r=>r.key===tgtKey);
        if (tgtRow && !tgtRow.isReachable) {
          rows = rows.map(r => r.key===tgtKey ? {...r, isReachable:true} : r);
          newQ.push(tgtKey);
        }
      });
    }
    allRowsRef.current = rows; bfsQueueRef.current = newQ;
    setAllRows([...rows]); setBfsQueue([...newQ]);
    if (newQ.length===0) {
      const reachable = rows.filter(r=>r.isReachable);
      const { newNodes, newEdges } = layoutDfaGraph(reachable, alpha);
      setDfaNodes(newNodes); setDfaEdges(newEdges); setPhase('done');
    }
  }, [setDfaNodes, setDfaEdges]);

  const runToEnd = useCallback(() => {
    if (bfsQueueRef.current.length===0) return;
    const alpha = alphabetRef.current;
    let rows = [...allRowsRef.current]; let q = [...bfsQueueRef.current];
    while (q.length>0) {
      const [cur,...rest] = q; q=[...rest];
      rows = rows.map(r => r.key===cur ? {...r, isProcessed:true} : r);
      const curRow = rows.find(r=>r.key===cur)!;
      alpha.forEach(sym => {
        const tgtKey = curRow.transitions[sym];
        const tgtRow = rows.find(r=>r.key===tgtKey);
        if (tgtRow && !tgtRow.isReachable) {
          rows = rows.map(r => r.key===tgtKey ? {...r, isReachable:true} : r);
          q.push(tgtKey);
        }
      });
    }
    allRowsRef.current = rows; bfsQueueRef.current = [];
    setAllRows([...rows]); setBfsQueue([]);
    const reachable = rows.filter(r=>r.isReachable);
    const { newNodes, newEdges } = layoutDfaGraph(reachable, alpha);
    setDfaNodes(newNodes); setDfaEdges(newEdges); setPhase('done');
  }, [setDfaNodes, setDfaEdges]);

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.metadata?.type==='DFA') { await Swal.fire('Error','Already a DFA.','error'); return; }
        type JN = { id:string; position?:{x:number;y:number}; isStart?:boolean; isAccept?:boolean; data?:{isStart?:boolean;isAccept?:boolean} };
        type JE = { id?:string; from?:string; source?:string; to?:string; target?:string; label?:string };
        const hasEps = ((json.edges??[]) as JE[]).some(e=>{ const l=(e.label||'').trim(); return l==='\u03b5'||l.toLowerCase()==='e'; });
        if (json.metadata?.type==='eNFA'||hasEps) { await Swal.fire('Error','Has epsilon \u2192 use \u03b5-NFA converter.','error'); return; }
        resetConversion();
        const vN = ((json.nodes||[]) as JN[]).map(n=>({ id:n.id, type:'stateNode',
          position:n.position||{x:50,y:50},
          data:{ label:n.id, isStart:n.isStart??n.data?.isStart??false, isAccept:n.isAccept??n.data?.isAccept??false } }));
        const vE = ((json.edges||[]) as JE[]).map((e,i):Edge=>({ id:e.id||`ie-${i}`,
          source:e.from??e.source??'', target:e.to??e.target??'',
          label:e.label||'', type:'default',
          markerEnd:{type:MarkerType.ArrowClosed}, style:{strokeWidth:2} }));
        setNfaNodes(vN); setNfaEdges(vE); nfaNodeCountRef.current=vN.length;
      } catch { await Swal.fire('Error','Invalid JSON.','error'); }
    };
    reader.readAsText(file); e.target.value='';
  };
  const handleExport = () => {
    const normalizeCon = (raw?: string) => {
      const v = (raw || '').toLowerCase();
      if (v === 't' || v === 'tt') return 'T';
      if (v === 'r' || v === 'tr') return 'R';
      if (v === 'b' || v === 'tb') return 'B';
      if (v === 'l' || v === 'tl') return 'L';
      return 'T';
    };

    const data = {
      metadata:{name:'My_DFA',type:'DFA',exportedAt:new Date().toISOString()},
      nodes: dfaNodes.map((n) => ({
        id: n.id,
        position: n.position,
        isStart: !!n.data?.isStart,
        isAccept: !!n.data?.isAccept,
      })),
      edges: dfaEdges.map((e) => ({
        from: e.source,
        from_con: normalizeCon(e.sourceHandle?.toString()),
        to: e.target,
        to_con: normalizeCon(e.targetHandle?.toString()),
        label: (e.label as string) || '',
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    Object.assign(document.createElement('a'),{href:url,download:'dfa_result.json'}).click();
    URL.revokeObjectURL(url);
  };

  const formatRowName = useCallback((row: DFARow) => {
    return nameMode === 'label' ? row.label : row.prettyName;
  }, [nameMode]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">NFA → DFA Converter</h1>
            <p className="text-[11px] text-slate-500">Subset Construction — full 2ⁿ table, step-by-step BFS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <button onClick={handleImportClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-medium border border-slate-700"><Upload className="w-3 h-3" /> Import NFA</button>
          {phase==='idle' && <button onClick={initComputation} className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium shadow-lg shadow-purple-500/20"><Play className="w-4 h-4" /> Start</button>}
          {phase==='stepping' && <>
            <button onClick={processOneStep} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"><StepForward className="w-4 h-4" /> Next Step <span className="ml-1 bg-blue-500 rounded px-1.5 text-xs font-bold">{bfsQueue.length}</span></button>
            <button onClick={runToEnd} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium"><SkipForward className="w-3 h-3" /> Skip to End</button>
            <button onClick={resetConversion} className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded text-xs border border-slate-700">Reset steps</button>
          </>}
          {phase==='done' && <>
            <span className="text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-900/20 rounded border border-emerald-800">✓ Done</span>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"><Download className="w-3 h-3" /> Export DFA</button>
            <button onClick={resetConversion} className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded text-xs border border-slate-700">Reset steps</button>
          </>}
          <button onClick={resetAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded text-xs border border-slate-700"><Trash2 className="w-3 h-3" /> Reset All</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Left: NFA input — wrapped in its own provider */}
        <div className="w-[28%] border-r border-slate-800 flex flex-col relative bg-slate-900/20">
          <div className="absolute top-3 left-3 z-10 pointer-events-auto">
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 backdrop-blur shadow-xl">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5">Input NFA</p>
              <button onClick={addNfaNode} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold w-full">+ State</button>
              <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">Dbl-click → accept<br/>Right-click → start</p>
            </div>
          </div>
          <ReactFlowProvider>
            <ReactFlow nodes={nfaNodes} edges={nfaEdges}
              onNodesChange={onNfaNodesChange} onEdgesChange={onNfaEdgesChange}
              onConnect={onConnect} nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose} fitView
              onNodeDoubleClick={onNfaNodeDoubleClick}
              onNodeContextMenu={onNfaNodeContextMenu}
              deleteKeyCode={null}>
              <Background color="#1e293b" gap={20} size={1} />
              <Controls className="bg-slate-800 border-slate-700 fill-slate-100" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Center: Table */}
        <div className="w-[44%] border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/50 shrink-0 flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-sm font-semibold text-slate-300">Subset Construction Table</span>
            <div className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900 p-0.5">
              <button
                onClick={() => setNameMode('label')}
                className={`px-2 py-0.5 text-[10px] rounded ${nameMode === 'label' ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Label
              </button>
              <button
                onClick={() => setNameMode('subset')}
                className={`px-2 py-0.5 text-[10px] rounded ${nameMode === 'subset' ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Set
              </button>
            </div>
            {allRows.length>0 && <span className="ml-auto text-[10px] text-slate-500">{allRows.filter(r=>r.isReachable).length}/{allRows.length} reachable</span>}
          </div>
          {errorMsg && <div className="mx-3 mt-2 p-2.5 text-xs text-red-400 bg-red-950/40 rounded border border-red-900/40 shrink-0">{errorMsg}</div>}
          {phase==='stepping' && bfsQueue.length>0 && (
            <div className="px-3 py-1.5 bg-purple-950/30 border-b border-purple-900/30 shrink-0 flex items-center flex-wrap gap-1">
              <span className="text-[10px] font-bold text-purple-400 uppercase mr-1">Queue:</span>
              {bfsQueue.slice(0,5).map((k,i)=>{ const row=allRows.find(r=>r.key===k); return (
                <span key={k} className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${i===0?'bg-purple-900/60 border-purple-500 text-purple-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {row?.label}
                </span>); })}
              {bfsQueue.length>5 && <span className="text-[10px] text-slate-600">+{bfsQueue.length-5}</span>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {allRows.length===0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2">
                <GitMerge className="w-8 h-8 opacity-20" />
                Build NFA on the left then click <strong className="text-slate-500">Start</strong>.
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="w-5 px-1.5 py-2 border-b border-slate-800"></th>
                    <th className="px-2 py-2 border-b border-slate-800 text-left">State</th>
                    {alphabet.map(s=><th key={s} className="px-2 py-2 border-b border-l border-slate-800 text-center">{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {allRows.map(row=>{
                    const isFH = bfsQueue[0]===row.key, inQ = bfsQueue.includes(row.key), unreach = !row.isReachable && phase!=='idle';
                    return (
                      <tr key={row.key} className={[
                        'border-b border-slate-800/50',
                        isFH?'bg-purple-900/30':inQ?'bg-blue-900/10':row.isProcessed?'bg-emerald-950/20':'',
                        unreach?'opacity-30':''
                      ].join(' ')}>
                        <td className="px-1.5 py-1.5 text-center text-[11px]">
                          {row.isProcessed?<span className="text-emerald-500">✓</span>:isFH?<span className="text-purple-400">▶</span>:inQ?<span className="text-blue-400">○</span>:null}
                        </td>
                        <td className={`px-2 py-1.5 font-mono text-[11px] relative ${unreach?'text-slate-600':'text-slate-300'} ${row.isAccept ? 'font-bold' : ''}`}>
                          {row.isStart&&<span className="text-blue-400">→</span>}
                          {row.isAccept&&<span>*</span>}
                          {unreach&&<div className="absolute top-1/2 left-0 right-0 h-px bg-red-700/60 pointer-events-none"/>}
                          {formatRowName(row)}
                        </td>
                        {alphabet.map(sym=>{
                          const tgtKey=row.transitions[sym], tgtRow=allRows.find(r=>r.key===tgtKey);
                          return (
                            <td key={sym} className="px-2 py-1.5 text-center border-l border-slate-800/50 font-mono">
                              {tgtRow ? <span className={tgtRow.isReachable||phase==='idle'?'text-slate-300':'text-slate-600'}>{formatRowName(tgtRow)}</span>
                                : <span className="text-slate-600">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: DFA result — wrapped in its own provider */}
        <div className="flex-1 flex flex-col bg-slate-900/10 relative">
          <div className="absolute top-3 left-3 z-10 text-[10px] font-bold bg-slate-950/70 border border-slate-800 text-purple-400 px-2 py-1 rounded uppercase tracking-wider">
            Result: DFA Graph
          </div>
          <ReactFlowProvider>
            <ReactFlow nodes={dfaNodes} edges={dfaEdges}
              onNodesChange={onDfaNodesChange} onEdgesChange={onDfaEdgesChange}
              nodeTypes={nodeTypes} deleteKeyCode={null}>
              <FitViewOnLoad nodeCount={dfaNodes.length} />
              <Background color="#0f172a" gap={20} size={1} />
              <Controls className="bg-slate-800 border-slate-700 fill-slate-100" />
            </ReactFlow>
          </ReactFlowProvider>
          {dfaNodes.length===0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-700 text-sm text-center px-8 pointer-events-none">
              <GitMerge className="w-10 h-10 opacity-15" />
              {phase==='idle'?'DFA will appear after conversion':'Step through BFS to complete'}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function NfaToDfaPage() { return <NfaToDfaConverter />; }
