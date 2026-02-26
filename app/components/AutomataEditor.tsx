'use client';
import React, { useState, useEffect, useRef } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Custom Node ---
type StateNodeProps = {
  data: { label: string; isStart?: boolean; isAccept?: boolean; isActive?: boolean };
  isConnectable?: boolean;
  selected?: boolean;
};

const StateNode: React.FC<StateNodeProps> = ({ data, isConnectable, selected }) => {
  let borderColor = selected ? '#fff' : '#64748b'; 
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
    borderColor = data.isStart ? '#3b82f6' : '#fff';
  }
  if (data.isActive) {
    borderColor = '#facc15';
    backgroundColor = '#422006';
    boxShadow = '0 0 15px #facc15';
    textColor = '#facc15';
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
  // --- Core State ---
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [mode, setMode] = useState<'DFA' | 'NFA' | 'eNFA'>('NFA');

  // --- Simulation State ---
  const [inputString, setInputString] = useState('');
  const [activeStates, setActiveStates] = useState<Set<string>>(new Set());
  const [stepIndex, setStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [simMessage, setSimMessage] = useState('Ready');
  const [history, setHistory] = useState<string[]>([]);
  
  const activeStatesRef = useRef(activeStates);
  const stepIndexRef = useRef(stepIndex);
  const edgesRef = useRef(edges);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { activeStatesRef.current = activeStates; }, [activeStates]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // --- Types for import JSON ---
  type ModeType = 'DFA' | 'NFA' | 'eNFA';
  interface ImportNode { id: string; position: { x: number; y: number }; isStart?: boolean; isAccept?: boolean; }
  interface ImportEdge { from: string; from_con?: string; to: string; to_con?: string; label?: string; }
  interface ImportData { metadata?: { type?: ModeType }; nodes: ImportNode[]; edges: ImportEdge[]; }

  // --- Helper Functions ---
  const isTransitionMatch = (edgeLabel: string, symbol: string) => {
    if (!edgeLabel) return false;
    const symbols = edgeLabel.split(',').map(s => s.trim()); 
    return symbols.includes(symbol);
  };

  const isEpsilon = (edgeLabel: string) => {
    if (!edgeLabel) return false;
    const symbols = edgeLabel.split(',').map(s => s.trim());
    return symbols.includes('e') || symbols.includes('ε');
  }

  // --- Validation & Constraints Helpers ---
  const splitLabelToSymbols = (label?: string) => {
    if (!label) return [] as string[];
    return label.split(',').map(s => s.trim()).filter(s => s !== '' && s !== 'e' && s !== 'ε');
  };

  const getAlphabetFromEdges = (edgeList: Edge[]) => {
    const set = new Set<string>();
    edgeList.forEach(e => splitLabelToSymbols(e.label as string).forEach(s => set.add(s)));
    return Array.from(set);
  };

  const validateAutomaton = (modeToCheck: ModeType, nodeList: Node[], edgeList: Edge[]) => {
    const issues: string[] = [];
    const alphabet = getAlphabetFromEdges(edgeList);

    // Epsilon checks
    if (modeToCheck !== 'eNFA') {
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

  // --- Simulation Actions ---
  const startSimulation = () => {
    const startNode = nodes.find(n => n.data.isStart);
    if (!startNode) {
      Swal.fire('Error', '⚠️ Error: ไม่พบ Start State', 'error');
      return;
    }
    const initialSet = getEpsilonClosure([startNode.id], edges);
    setActiveStates(initialSet);
    setStepIndex(0);
    setIsRunning(true);
    setSimMessage(`Start at: {${Array.from(initialSet).join(', ')}}`);
    setHistory([`Start: {${Array.from(initialSet).join(', ')}}`]);
  };

  const executeStep = () => {
    const idx = stepIndexRef.current;
    const currentSet = activeStatesRef.current;
    const str = inputString;
    const currentEdges = edgesRef.current;
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
    setActiveStates(finalSet);
    setStepIndex(idx + 1);
    setSimMessage(`Read '${char}' -> Active: {${Array.from(finalSet).join(', ')}}`);
    setHistory(prev => [...prev, `Read '${char}' -> {${Array.from(finalSet).join(', ')}}`]);
    return true;
  };

  const runAll = () => {
    startSimulation();
    setTimeout(() => {
        const loop = setInterval(() => {
            const currentIdx = stepIndexRef.current;
            if (currentIdx >= inputString.length) {
                clearInterval(loop);
                setIsRunning(false);
                return;
            }
            executeStep();
        }, 500);
    }, 100);
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setStepIndex(-1);
    setActiveStates(new Set());
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
  useEffect(() => { promptOpenRef.current = promptState.open; }, [promptState.open]);

  // Delete key handler (works for both selected edge and selected nodes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (promptOpenRef.current) return;
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selEdgeId = selectedEdgeIdRef.current;
        if (selEdgeId) {
          setEdges(eds => eds.filter(ed => ed.id !== selEdgeId));
          setSelectedEdgeId(null);
          e.preventDefault();
        } else {
          setNodes(nds => {
            const toDelete = new Set(nds.filter(n => n.selected).map(n => n.id));
            if (toDelete.size > 0) {
              setEdges(eds => eds.filter(ed => !toDelete.has(ed.source) && !toDelete.has(ed.target)));
            }
            return nds.filter(n => !n.selected);
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // --- Import / Export Functions (Updated Logic) ---

  const exportConfig = () => {
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
        // แปลง Handle ID (t,b,l,r) เป็น UpperCase (T,B,L,R) หรือ Default 'T'
        from_con: e.sourceHandle ? e.sourceHandle.toUpperCase() : 'T', 
        to: e.target,
        to_con: e.targetHandle ? e.targetHandle.toUpperCase() : 'T',
        label: e.label
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `automata_${mode.toLowerCase()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!event.target.files || !event.target.files[0]) return;
    
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = e => {
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
        const newNodes: Node[] = parsedData.nodes.map((n: ImportNode) => {
          const idNum = parseInt(n.id.replace('q', ''));
          if (!isNaN(idNum) && idNum > maxId) maxId = idNum;

          return {
            id: n.id,
            position: n.position,
            type: 'stateNode',
            data: { 
              label: n.id, 
              isStart: n.isStart, 
              isAccept: n.isAccept, 
              isActive: false 
            },
            selected: false
          } as Node;
        });

        // 3. Map Edges (With fallback for T, B, L, R)
        const newEdges: Edge[] = parsedData.edges.map((e: ImportEdge, i: number) => ({
          id: `e-${i}-${Date.now()}`,
          source: e.from,
          target: e.to,
          label: e.label,
          sourceHandle: e.from_con ? e.from_con.toLowerCase() : 't',
          targetHandle: e.to_con ? e.to_con.toLowerCase() : 't',
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          animated: isEpsilon(e.label || '')
        } as Edge));

        // If mode is DFA or NFA (per your rule) strip epsilon transitions
        let cleanedEdges = newEdges;
        if (currentMode !== 'eNFA') {
          const hadEps = cleanedEdges.some(e => isEpsilon(e.label as string));
          if (hadEps) {
            cleanedEdges = cleanedEdges.filter(e => !isEpsilon(e.label as string));
            alert('Import: Epsilon transitions were removed because current mode does not allow them.');
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
          alert(`DFA import: Missing transitions detected. A dead state '${deadId}' was added to make the transition function total.`);
        } else if (issues.length > 0) {
          alert(`Import warnings:\n- ${issues.join('\n- ')}`);
        } else {
          stopSimulation();
          alert('Import Successful!');
        }

      } catch (err) {
        alert("Invalid JSON File");
        console.error(err);
      }
    };
    event.target.value = '';
  };

  // --- Editor Actions ---
  const addNode = () => {
    const id = `q${nodeCount}`;
    const newNode: Node = {
      id,
      position: { x: Math.random() * 300 + 50, y: Math.random() * 300 + 50 },
      data: { label: id, isStart: false, isAccept: false, isActive: false },
      type: 'stateNode',
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeCount((c) => c + 1);
  };

  const deleteSelected = () => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  };
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

  const openEdgeLabelPrompt = (params: Connection) => {
    setPromptValue('0');
    setPromptState({ open: true, kind: 'edgeLabel', params, defaultValue: '0', title: 'Input Transition(s) (e.g. "0" or "0,1")' });
  };

  const openEditLabelPrompt = (edge: Edge) => {
    const def = (edge.label as string) || '';
    setPromptValue(def);
    setPromptState({ open: true, kind: 'editLabel', params: edge, defaultValue: def, title: 'Edit Transition(s)' });
  };

  const openNodeSettingsPrompt = (nodeId: string) => {
    setPromptState({ open: true, kind: 'nodeSettings', nodeId, defaultValue: '1', title: `Set State Properties — ${nodeId}` });
  };

  const closePrompt = () => setPromptState({ open: false, kind: undefined, params: null, nodeId: null, defaultValue: '' });

  const handleSubmitPrompt = (value: string | null) => {
    const { kind, params, nodeId } = promptState;
    if (kind === 'edgeLabel') {
      if (value !== null) {
        const conn = params as Connection;
        // validate: no epsilon for DFA/NFA
        if (mode !== 'eNFA' && splitLabelToSymbols(value).length < splitLabelToSymbols(value).length) { /*noop*/ }
        const symbols = splitLabelToSymbols(value);
        if ((mode === 'DFA' || mode === 'NFA') && value && value.split(',').map(s=>s.trim()).some(s => s === 'e' || s === 'ε')) {
          alert('Epsilon transitions are not allowed in DFA/NFA. Edge not created.');
          closePrompt();
          return;
        }

        // For DFA ensure no existing outgoing transition for same symbol
        if (mode === 'DFA' && conn.source) {
          const existing = edges.filter(e => e.source === conn.source);
          for (const sym of symbols) {
            const conflict = existing.some(e => splitLabelToSymbols(e.label as string).includes(sym));
            if (conflict) {
              alert(`DFA violation: state ${conn.source} already has a transition on '${sym}'.`);
              closePrompt();
              return;
            }
          }
        }

        setEdges((eds) => addEdge({
          ...conn,
          label: value,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          animated: isEpsilon(value)
        } as Edge, eds));
      }
    } else if (kind === 'editLabel') {
      const edge = params as Edge;
      if (value !== null) {
        // For DFA, ensure editing doesn't create duplicate transitions for same source+symbol
        if (mode !== 'eNFA' && value.split(',').map(s=>s.trim()).some(s => s === 'e' || s === 'ε')) {
          alert('Epsilon transitions are not allowed in DFA/NFA. Edit rejected.');
          closePrompt();
          return;
        }
        if (mode === 'DFA') {
          const symbols = splitLabelToSymbols(value);
          const others = edges.filter(e => e.source === edge.source && e.id !== edge.id);
          for (const sym of symbols) {
            if (others.some(o => splitLabelToSymbols(o.label as string).includes(sym))) {
              alert(`DFA violation: another edge from ${edge.source} already covers '${sym}'. Edit rejected.`);
              closePrompt();
              return;
            }
          }
        }
        setEdges((eds) => eds.map(e => e.id === edge.id ? { ...e, label: value, animated: isEpsilon(value) } : e));
      }
    } else if (kind === 'nodeSettings') {
      if (!nodeId) return closePrompt();
      const option = value;
      if (!option) return closePrompt();
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isStart: option === '2' || option === '4', isAccept: option === '3' || option === '4' } } : n));
    }
    closePrompt();
  };

  const onConnect = (params: Connection) => {
    openEdgeLabelPrompt(params);
  };

  const handleNodeSettings = (nodeId: string) => {
    openNodeSettingsPrompt(nodeId);
  };

  const onNodeDoubleClick = (e: React.MouseEvent, node: Node) => {
    e.preventDefault(); 
    handleNodeSettings(node.id);
  };

  const onNodeContextMenu = (e: React.MouseEvent, node: Node) => {
    e.preventDefault(); 
    handleNodeSettings(node.id);
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
  };

  const onEdgeDoubleClick = (_: React.MouseEvent, edge: Edge) => {
    openEditLabelPrompt(edge);
  };

  const onPaneClick = () => {
    setSelectedEdgeId(null);
  };

  const displayNodes = nodes.map(node => ({
    ...node, data: { ...node.data, isActive: activeStates.has(node.id) }
  }));

  const displayEdges = edges.map(edge => (
    edge.id === selectedEdgeId
      ? { ...edge, style: { ...(edge.style || {}), stroke: '#facc15', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#facc15' } }
      : edge
  ));

  // --- Machine summary / Transition table data ---
  const Q = nodes.map(n => n.id);
  const q0 = nodes.find(n => n.data.isStart)?.id || '—';
  const F = nodes.filter(n => n.data.isAccept).map(n => n.id);
  const alphabet = getAlphabetFromEdges(edges).filter(s => s !== 'e' && s !== 'ε');

  // build transition map: state -> symbol -> [targets]
  const buildTransitionMap = () => {
    const map: Record<string, Record<string, string[]>> = {};
    nodes.forEach(n => {
      map[n.id] = {};
      const syms = [...alphabet];
      if (mode === 'eNFA') syms.push('ε');
      syms.forEach(sym => { map[n.id][sym] = []; });
    });
    edges.forEach(e => {
      const syms = (e.label as string) ? e.label!.toString().split(',').map(s => s.trim()) : [];
      syms.forEach(sym => {
        if (sym === 'e' || sym === 'ε') {
          if (!map[e.source]) return;
          const key = 'ε';
          // Ensure key exists if it wasn't pre-initialized (e.g. if we switch context)
          if(mode === 'eNFA') {
              map[e.source][key] = map[e.source][key] || [];
              map[e.source][key].push(e.target);
          }
        } else {
          if (!map[e.source]) return;
          map[e.source][sym] = map[e.source][sym] || [];
          map[e.source][sym].push(e.target);
        }
      });
    });
    return map;
  };

  const transitionMap = buildTransitionMap();

  const isAccepted = () => {
      if (stepIndex !== inputString.length) return null;
      const acceptNodeIds = nodes.filter(n => n.data.isAccept).map(n => n.id);
      return Array.from(activeStates).some(id => acceptNodeIds.includes(id));
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', background: '#0f172a', color: '#e2e8f0' }}>
      
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
      <div style={{ padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', gap: '15px', alignItems: 'center', zIndex: 10, height: '60px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0ea5e9', marginRight: '10px' }}>AutomataViz</div>
        <div style={{ width: '1px', height: '30px', background: '#475569', margin: '0 5px' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8' }}>MODE</label>
            <select 
              value={mode} 
              onChange={(e) => { setMode(e.target.value as ModeType); stopSimulation(); }}
                style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '0px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
            >
                <option value="DFA">DFA</option>
                <option value="NFA">NFA</option>
                <option value="eNFA">e-NFA</option>
            </select>
        </div>
        <div style={{ width: '1px', height: '30px', background: '#475569', margin: '0 5px' }}></div>
        <input 
          placeholder="Input (e.g. 010)" 
          value={inputString}
          onChange={(e) => setInputString(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', width: '200px' }}
        />
        <button onClick={startSimulation} disabled={isRunning} style={{ cursor: 'pointer', background: '#0ea5e9', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white', fontWeight: 'bold' }}>To Start</button>
        <button onClick={executeStep} disabled={!isRunning} style={{ cursor: 'pointer', background: '#3b82f6', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>Step</button>
        <button onClick={runAll} disabled={isRunning} style={{ cursor: 'pointer', background: '#22c55e', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>Run All</button>
        <button onClick={stopSimulation} style={{ cursor: 'pointer', background: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>Reset</button>
        
        <div style={{ flexGrow: 1 }}></div>

        {/* Import / Export Buttons */}
        <button onClick={exportConfig} style={{ cursor: 'pointer', background: '#8b5cf6', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>💾 Export</button>
        <button onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', background: '#6366f1', border: 'none', padding: '8px 16px', borderRadius: '4px', color: 'white' }}>📂 Import</button>

        <div style={{ textAlign: 'right', fontSize: '14px', minWidth: '150px' }}>
            <div style={{ color: '#94a3b8' }}>{simMessage}</div>
            {stepIndex === inputString.length && (
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
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onPaneClick={onPaneClick}
            deleteKeyCode={null}
            connectionMode={ConnectionMode.Loose}
            fitView
            style={{ background: '#0f172a' }}
          >
            <Background color="#334155" gap={20} size={1} /> 
            <Controls style={{ fill: '#fff' }} />
          </ReactFlow>

          <div style={{ position: 'absolute', bottom: 20, left: 20, padding: '10px 20px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
              <button onClick={addNode} style={{ background: '#334155', color: '#e2e8f0', border: '1px solid #475569', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>+ Add Node</button>
              <button onClick={deleteSelected} style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>🗑 Delete</button>
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
                {nodes.flatMap(n => {
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

          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8 }}>Transition Table</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>State</th>
                  {alphabet.map(sym => (
                    <th key={sym} style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>{sym}</th>
                  ))}
                  {mode === 'eNFA' && <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>ε</th>}
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
                    {mode === 'eNFA' && <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{(transitionMap[n.id] && transitionMap[n.id]['ε']) ? transitionMap[n.id]['ε'].join(',') : '—'}</td>}
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