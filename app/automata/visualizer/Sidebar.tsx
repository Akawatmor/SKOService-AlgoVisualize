'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Edge, Node } from '@xyflow/react';
import type { ModeType, PdaConfig, TmConfig, TmSettings, PdaRule, TmRule, SimSnapshot } from './types';
import { TM_BLANK } from './constants';
import { parsePdaRules, parseTmRules } from './utils';

// ─── Props ───

interface SidebarProps {
  mode: ModeType;
  isPdaMode: boolean;
  isTmMode: boolean;
  stateNodes: Node[];
  edges: Edge[];
  alphabet: string[];
  q0: string;
  F: string[];
  history: string[];
  pdaConfigs: PdaConfig[];
  tmConfigs: TmConfig[];
  tmSettings: TmSettings;
  transitionMap: Record<string, Record<string, string[]>>;
  sidebarWidth: number;
  simTimeline: SimSnapshot[];
  timelineIndex: number;
  onJumpToStep?: (idx: number) => void;
  inputString?: string;
  pdaAcceptMode?: string;
}

// ─── Component ───

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  isPdaMode,
  isTmMode,
  stateNodes,
  edges,
  alphabet,
  q0,
  F,
  history,
  pdaConfigs,
  tmConfigs,
  tmSettings,
  transitionMap,
  sidebarWidth,
  simTimeline,
  timelineIndex,
  onJumpToStep,
  inputString = '',
  pdaAcceptMode = 'final-state',
}) => {
  const router = useRouter();
  const [pdaStackView, setPdaStackView] = useState<'top' | 'raw'>('top');
  const [tmCfgIndex, setTmCfgIndex] = useState(0);

  // Handler for viewing instantaneous descriptions
  const handleViewID = () => {
    if (isPdaMode && simTimeline.length > 0) {
      // Build full PDA configs with input string context from timeline
      const fullConfigs = simTimeline.flatMap((snap) => 
        snap.pdaConfigs.map((cfg) => ({
          state: cfg.state,
          stack: cfg.stack,
          input: inputString,
          index: snap.stepIndex,
        }))
      );
      
      const params = new URLSearchParams({
        mode,
        configs: encodeURIComponent(JSON.stringify(fullConfigs)),
        input: inputString,
        acceptMode: pdaAcceptMode,
      });
      router.push(`/automata/instantaneous-description?${params.toString()}`);
    } else if (isTmMode && simTimeline.length > 0) {
      const fullConfigs = simTimeline.flatMap(snap => snap.tmConfigs);
      const params = new URLSearchParams({
        mode,
        configs: encodeURIComponent(JSON.stringify(fullConfigs)),
        input: inputString,
      });
      router.push(`/automata/instantaneous-description?${params.toString()}`);
    }
  };
  const [tmTimelineExpanded, setTmTimelineExpanded] = useState<Set<number>>(new Set());
  const Q = stateNodes.map(n => n.id);

  // Keep tmCfgIndex in bounds when configs change
  const safeTmIdx = tmConfigs.length > 0 ? Math.min(tmCfgIndex, tmConfigs.length - 1) : 0;

  // Helper: render a single TM tape with multiple head support
  const renderTape = (tape: string[], heads: number[], headToTape: number[], tapeIdx: number, compact: boolean = false) => {
    // Find all heads on this tape
    const headsOnTape = headToTape
      .map((t, h) => ({ tapeIndex: t, headIndex: h }))
      .filter(h => h.tapeIndex === tapeIdx)
      .map(h => h.headIndex);
    
    const headPositions = headsOnTape.map(h => heads[h]);
    
    return (
      <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: compact ? '2px 0' : '4px 0' }}>
        {tape.map((ch, idx) => {
          const isHead = headPositions.includes(idx);
          const headLabels = headsOnTape.filter((_, hi) => heads[headsOnTape[hi]] === idx);
          return (
            <span key={idx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginRight: compact ? 1 : 2 }}>
              {/* Top arrow indicator */}
              <span style={{ 
                color: isHead ? '#22d3ee' : 'transparent', 
                fontSize: compact ? 11 : 12, 
                height: compact ? 14 : 16, 
                lineHeight: compact ? '14px' : '16px',
                fontWeight: 700
              }}>
                {isHead ? (headLabels.length > 1 ? `▼${headLabels.map(h => h+1).join(',')}` : '▼') : '.'}
              </span>
              
              {/* Tape cell */}
              <span style={{
                minWidth: compact ? 20 : 24,
                textAlign: 'center',
                padding: compact ? '2px 3px' : '3px 5px',
                border: isHead ? `2px solid #22d3ee` : '1px solid #334155',
                borderRadius: compact ? 3 : 4,
                color: isHead ? '#ffffff' : '#cbd5e1',
                background: isHead ? '#0369a1' : '#0f172a',
                fontWeight: isHead ? 700 : 400,
                fontSize: compact ? 11 : 13,
                boxShadow: isHead ? '0 0 8px rgba(34, 211, 238, 0.5)' : 'none',
              }}>
                {ch || TM_BLANK}
              </span>
              
              {/* Bottom index */}
              {!compact && (
                <span style={{ fontSize: 9, color: '#64748b', height: 12, lineHeight: '12px', marginTop: 2 }}>{idx}</span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  // Helper: render all tapes for a config
  const renderMultiTape = (tapes: string[][], heads: number[], compact: boolean = false) => {
    const { headToTape } = tmSettings;
    if (tapes.length === 1) {
      // Single tape - use simplified render
      return renderTape(tapes[0], heads, headToTape, 0, compact);
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
        {tapes.map((tape, tIdx) => (
          <div key={tIdx}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>
              Tape {tIdx + 1}
            </div>
            {renderTape(tape, heads, headToTape, tIdx, compact)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: sidebarWidth, minWidth: 200, maxWidth: 800, borderLeft: '1px solid #21314a', padding: 16, overflowY: 'auto', background: '#071024' }}>
      {/* ── Formal definition ── */}
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
                  const rules: PdaRule[] = parsePdaRules(edge.label as string);
                  return rules.map((rule, ruleIdx) => (
                    <div key={`pda-delta-${edgeIdx}-${ruleIdx}`}>
                      δ({edge.source}, {rule.input}, {rule.pop}) = ({edge.target}, {rule.push})
                    </div>
                  ));
                })
              : isTmMode
              ? edges.flatMap((edge, edgeIdx) => {
                  const rules: TmRule[] = parseTmRules(edge.label as string, tmSettings.tapeCount);
                  return rules.map((rule, ruleIdx) => {
                    // Format for multi-tape: δ(q, (r1,r2)) = (q', (w1,w2), (m1,m2))
                    const readsStr = rule.reads.length > 1 ? `(${rule.reads.join(',')})` : rule.reads[0];
                    const writesStr = rule.writes.length > 1 ? `(${rule.writes.join(',')})` : rule.writes[0];
                    const movesStr = rule.moves.length > 1 ? `(${rule.moves.join(',')})` : rule.moves[0];
                    return (
                      <div key={`tm-delta-${edgeIdx}-${ruleIdx}`}>
                        δ({edge.source}, {readsStr}) = ({edge.target}, {writesStr}, {movesStr})
                      </div>
                    );
                  });
                })
              : stateNodes.flatMap(n => {
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

      {/* ── Unified Step-by-Step History & Timeline ── */}
      {simTimeline.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 20 }}>
            <div style={{ color: '#cbd5e1', fontWeight: 600 }}>
              Simulation Timeline
              <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>({simTimeline.length} step{simTimeline.length !== 1 ? 's' : ''})</span>
            </div>
            {/* Timeline position indicator */}
            <div style={{ fontSize: 10, color: timelineIndex === -1 ? '#4ade80' : '#f59e0b' }}>
              {timelineIndex === -1 ? '● Live' : `Step ${timelineIndex + 1}/${simTimeline.length}`}
            </div>
          </div>
          
          {/* Timeline slider */}
          {simTimeline.length > 1 && onJumpToStep && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min={0}
                max={simTimeline.length - 1}
                value={timelineIndex === -1 ? simTimeline.length - 1 : timelineIndex}
                onChange={(e) => onJumpToStep(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <button
                onClick={() => onJumpToStep(simTimeline.length - 1)}
                style={{
                  background: timelineIndex === -1 ? '#334155' : '#0ea5e9',
                  color: '#e2e8f0',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Latest
              </button>
            </div>
          )}
          
          <div style={{ maxHeight: 500, overflowY: 'auto', background: '#0f172a', borderRadius: 6, border: '1px solid #21314a' }}>
            {simTimeline.map((snap, stepIdx) => {
              const isExpanded = isTmMode ? tmTimelineExpanded.has(stepIdx) : false;
              const hasMultiple = snap.tmConfigs.length > 1 || snap.pdaConfigs.length > 1;
              const isCurrentStep = (timelineIndex === -1 && stepIdx === simTimeline.length - 1) || timelineIndex === stepIdx;

              return (
                <div key={`timeline-${stepIdx}`} style={{ borderBottom: '1px solid #1e293b' }}>
                  {/* Step header */}
                  <div
                    onClick={() => {
                      if (isTmMode) {
                        setTmTimelineExpanded(prev => {
                          const next = new Set(prev);
                          if (next.has(stepIdx)) next.delete(stepIdx);
                          else next.add(stepIdx);
                          return next;
                        });
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px',
                      cursor: isTmMode ? 'pointer' : 'default',
                      background: isCurrentStep ? '#1e3a5f' : 'transparent',
                      borderLeft: isCurrentStep ? '3px solid #0ea5e9' : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    {isTmMode && (
                      <span style={{ fontSize: 10, color: '#64748b', width: 16, flexShrink: 0 }}>
                        {isExpanded ? '▾' : '▸'}
                      </span>
                    )}
                    <span 
                      style={{ fontSize: 11, color: isCurrentStep ? '#0ea5e9' : '#94a3b8', fontWeight: 700, minWidth: 30, flexShrink: 0, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onJumpToStep) onJumpToStep(stepIdx);
                      }}
                      title="Click to jump to this step"
                    >
                      {stepIdx === 0 ? 'Start' : `Step ${stepIdx}`}
                    </span>
                    
                    {/* Step message */}
                    <div style={{ flex: 1, fontSize: 12, color: '#cbd5e1', minWidth: 0 }}>
                      {snap.simMessage}
                    </div>
                    
                    {hasMultiple && (
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                        {isTmMode ? `${snap.tmConfigs.length} cfgs` : `${snap.pdaConfigs.length} cfgs`}
                      </span>
                    )}
                  </div>

                  {/* Expanded TM detail */}
                  {isTmMode && isExpanded && snap.tmConfigs.length > 0 && (
                    <div style={{ padding: '4px 8px 8px 30px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {snap.tmConfigs.map((cfg, ci) => {
                        const curSyms = cfg.heads.map((headPos, hIdx) => {
                          const tapeIdx = tmSettings.headToTape[hIdx];
                          const tape = cfg.tapes[tapeIdx] || [TM_BLANK];
                          return tape[headPos] ?? TM_BLANK;
                        });
                        const isAccept = F.includes(cfg.state);
                        return (
                          <div key={`tl-${stepIdx}-${ci}`} style={{ background: '#0b1324', borderRadius: 4, padding: 8, border: '1px solid #21314a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {hasMultiple && <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>#{ci + 1}</span>}
                                <span style={{ color: isAccept ? '#4ade80' : '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{cfg.state}</span>
                                {isAccept && <span style={{ fontSize: 9, color: '#4ade80' }}>✓</span>}
                              </div>
                              <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', gap: 8 }}>
                                <span>{cfg.heads.length > 1 ? 'Heads' : 'Head'}: <strong style={{ color: '#22d3ee' }}>{cfg.heads.length > 1 ? `[${cfg.heads.join(',')}]` : cfg.heads[0]}</strong></span>
                                <span>Read: <strong style={{ color: '#facc15' }}>{curSyms.length > 1 ? `(${curSyms.join(',')})` : curSyms[0]}</strong></span>
                              </div>
                            </div>
                            {renderMultiTape(cfg.tapes, cfg.heads, true)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── PDA Configurations ── */}
      {isPdaMode && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, marginTop: 20 }}>
            <div style={{ color: '#cbd5e1', fontWeight: 600 }}>
              PDA Configurations
              <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>({pdaConfigs.length})</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {simTimeline.length > 0 && (
                <button
                  onClick={handleViewID}
                  style={{
                    background: '#7c3aed',
                    color: '#fff',
                    border: '1px solid #6d28d9',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#6d28d9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7c3aed';
                  }}
                  title="View Instantaneous Description"
                >
                  View ID
                </button>
              )}
              <button
                onClick={() => setPdaStackView('top')}
                style={{
                  background: pdaStackView === 'top' ? '#334155' : '#0f172a',
                  color: pdaStackView === 'top' ? '#e2e8f0' : '#94a3b8',
                  border: '1px solid #21314a', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer'
                }}
              >
                Top→Bottom
              </button>
              <button
                onClick={() => setPdaStackView('raw')}
                style={{
                  background: pdaStackView === 'raw' ? '#334155' : '#0f172a',
                  color: pdaStackView === 'raw' ? '#e2e8f0' : '#94a3b8',
                  border: '1px solid #21314a', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer'
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
                      {pdaStackView === 'top' ? 'Stack (top → bottom)' : 'Stack (raw order)'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pdaConfigs.slice(0, 40).map((cfg, i) => {
                    const stackDisplay = cfg.stack.length === 0
                      ? 'ε'
                      : pdaStackView === 'top'
                        ? [...cfg.stack].reverse().map((sym, idx) => (
                            <span key={idx} style={{ 
                              display: 'inline-block',
                              padding: '1px 4px',
                              margin: '0 2px',
                              background: idx === 0 ? '#7c3aed' : '#334155',
                              color: '#fff',
                              borderRadius: 3,
                              fontSize: 12,
                              fontWeight: idx === 0 ? 600 : 400
                            }}>
                              {sym}
                            </span>
                          ))
                        : cfg.stack.map((sym, idx) => (
                            <span key={idx} style={{ 
                              display: 'inline-block',
                              padding: '1px 4px',
                              margin: '0 2px',
                              background: '#334155',
                              color: '#cbd5e1',
                              borderRadius: 3,
                              fontSize: 12
                            }}>
                              {sym}
                            </span>
                          ));
                    return (
                      <tr key={`pda-cfg-${cfg.state}-${cfg.stack.join('')}-${i}`} style={{ borderBottom: '1px dashed #0b1324' }}>
                        <td style={{ padding: '6px 8px', color: '#e2e8f0', fontWeight: 600 }}>{cfg.state}</td>
                        <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>
                          {typeof stackDisplay === 'string' ? stackDisplay : <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>{stackDisplay}</div>}
                        </td>
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


      {/* ── TM Configurations ── */}
      {isTmMode && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, marginTop: 20 }}>
            <div style={{ color: '#cbd5e1', fontWeight: 600 }}>
              TM Configurations
              <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>({tmConfigs.length})</span>
            </div>
            {simTimeline.length > 0 && (
              <button
                onClick={handleViewID}
                style={{
                  background: '#7c3aed',
                  color: '#fff',
                  border: '1px solid #6d28d9',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#6d28d9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7c3aed';
                }}
                title="View Instantaneous Description"
              >
                View ID
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12, maxHeight: 300, overflowY: 'auto', background: '#0f172a', borderRadius: 4, border: '1px solid #21314a', padding: 8 }}>
            {tmConfigs.length === 0 ? (
              <div style={{ color: '#94a3b8' }}>No active TM configuration</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tmConfigs.slice(0, 20).map((cfg, i) => (
                  <div key={`tm-cfg-${i}`} style={{ borderBottom: i < Math.min(tmConfigs.length, 20) - 1 ? '1px dashed #1e293b' : 'none', paddingBottom: 8 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8' }}>State: </span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>{cfg.state}</span>
                    </div>
                    {renderMultiTape(cfg.tapes, cfg.heads, true)}
                  </div>
                ))}
              </div>
            )}
            {tmConfigs.length > 20 && (
              <div style={{ padding: 8, borderTop: '1px solid #21314a', color: '#94a3b8', marginTop: 8 }}>
                Showing first 20 of {tmConfigs.length} configurations
              </div>
            )}
          </div>
        </>
      )}


      {/* ── Transition Table ── */}
      <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8, marginTop: 20 }}>Transition Table</div>
      <div style={{ overflowX: 'auto' }}>
        {isTmMode ? (
          /* TM Transition Table - standard table format */
          (() => {
            // Build TM transition map: state -> symbol -> [(nextState, write, move), ...]
            const tmTransitionMap: Record<string, Record<string, Array<{ nextState: string; write: string; move: string }>>> = {};
            const tmSymbols = new Set<string>();
            
            edges.forEach((edge) => {
              const from = edge.source;
              const to = edge.target;
              const label = edge.label?.toString() || '';
              const tmRules = parseTmRules(label, tmSettings.tapeCount);
              
              tmRules.forEach((rule) => {
                const read = rule.reads.length > 1 ? `(${rule.reads.join(',')})` : rule.reads[0];
                const write = rule.writes.length > 1 ? `(${rule.writes.join(',')})` : rule.writes[0];
                const move = rule.moves.length > 1 ? `(${rule.moves.join(',')})` : rule.moves[0];
                
                tmSymbols.add(read);
                
                if (!tmTransitionMap[from]) {
                  tmTransitionMap[from] = {};
                }
                if (!tmTransitionMap[from][read]) {
                  tmTransitionMap[from][read] = [];
                }
                tmTransitionMap[from][read].push({ nextState: to, write, move });
              });
            });
            
            const sortedSymbols = Array.from(tmSymbols).sort();
            const sortedStates = stateNodes.map(n => n.id).sort();
            
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>State</th>
                    {sortedSymbols.map(sym => (
                      <th key={sym} style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStates.map((state) => {
                    const isStart = state === q0;
                    const isAccept = F.includes(state);
                    return (
                      <tr key={state} style={{ color: '#cbd5e1' }}>
                        <td style={{ 
                          padding: '6px 8px', 
                          borderBottom: '1px solid #1e293b',
                          color: isAccept ? '#4ade80' : '#e2e8f0',
                          fontWeight: 600
                        }}>
                          {isStart && '→'}{isAccept && '*'}{state}
                        </td>
                        {sortedSymbols.map(sym => {
                          const transitions = tmTransitionMap[state]?.[sym] || [];
                          return (
                            <td key={sym} style={{ padding: '6px 8px', borderBottom: '1px solid #1e293b', fontSize: 11 }}>
                              {transitions.length === 0 ? (
                                <span style={{ color: '#475569' }}>∅</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {transitions.map((t, idx) => {
                                    const isNextAccept = F.includes(t.nextState);
                                    return (
                                      <div key={idx}>
                                        <span style={{ color: '#94a3b8' }}>(</span>
                                        <span style={{ color: isNextAccept ? '#4ade80' : '#e2e8f0', fontWeight: 600 }}>
                                          {isNextAccept && '*'}{t.nextState}
                                        </span>
                                        <span style={{ color: '#94a3b8' }}>, </span>
                                        <span style={{ color: '#22d3ee' }}>{t.write}</span>
                                        <span style={{ color: '#94a3b8' }}>, </span>
                                        <span style={{ color: '#c084fc' }}>{t.move}</span>
                                        <span style={{ color: '#94a3b8' }}>)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()
        ) : isPdaMode ? (
          /* PDA Transition Table - standard table format with state rows and input/stack columns */
          (() => {
            // Build PDA transition map: state -> (input,pop) -> [(nextState, push), ...]
            const pdaTransitionMap: Record<string, Record<string, Array<{ nextState: string; push: string }>>> = {};
            const inputSymbols = new Set<string>();
            const stackSymbols = new Set<string>();
            
            edges.forEach((edge) => {
              const from = edge.source;
              const to = edge.target;
              const label = edge.label?.toString() || '';
              const pdaRules = parsePdaRules(label);
              
              pdaRules.forEach((rule) => {
                inputSymbols.add(rule.input);
                stackSymbols.add(rule.pop);
                
                const key = `${rule.input},${rule.pop}`;
                
                if (!pdaTransitionMap[from]) {
                  pdaTransitionMap[from] = {};
                }
                if (!pdaTransitionMap[from][key]) {
                  pdaTransitionMap[from][key] = [];
                }
                pdaTransitionMap[from][key].push({ nextState: to, push: rule.push });
              });
            });
            
            const sortedInputs = Array.from(inputSymbols).sort();
            const sortedStack = Array.from(stackSymbols).sort();
            const sortedStates = stateNodes.map(n => n.id).sort();
            
            // Create combined columns for each (input, stack) pair
            const columns: Array<{ input: string; stack: string }> = [];
            sortedInputs.forEach(inp => {
              sortedStack.forEach(stk => {
                columns.push({ input: inp, stack: stk });
              });
            });
            
            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a', position: 'sticky', left: 0, background: '#071024', zIndex: 1 }}>State</th>
                      {columns.map((col, idx) => (
                        <th key={idx} style={{ padding: '6px 8px', borderBottom: '1px solid #21314a', minWidth: '80px' }}>
                          <div style={{ fontSize: 10 }}>
                            <div>in: <span style={{ color: '#facc15' }}>{col.input}</span></div>
                            <div>pop: <span style={{ color: '#c084fc' }}>{col.stack}</span></div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStates.map((state) => {
                      const isStart = state === q0;
                      const isAccept = F.includes(state);
                      return (
                        <tr key={state} style={{ color: '#cbd5e1' }}>
                          <td style={{ 
                            padding: '6px 8px', 
                            borderBottom: '1px solid #1e293b',
                            color: isAccept ? '#4ade80' : '#e2e8f0',
                            fontWeight: 600,
                            position: 'sticky',
                            left: 0,
                            background: '#071024',
                            zIndex: 1
                          }}>
                            {isStart && '→'}{isAccept && '*'}{state}
                          </td>
                          {columns.map((col, idx) => {
                            const key = `${col.input},${col.stack}`;
                            const transitions = pdaTransitionMap[state]?.[key] || [];
                            return (
                              <td key={idx} style={{ padding: '6px 8px', borderBottom: '1px solid #1e293b', fontSize: 10 }}>
                                {transitions.length === 0 ? (
                                  <span style={{ color: '#475569' }}>∅</span>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {transitions.map((t, tidx) => {
                                      const isNextAccept = F.includes(t.nextState);
                                      return (
                                        <div key={tidx}>
                                          <span style={{ color: '#94a3b8' }}>(</span>
                                          <span style={{ color: isNextAccept ? '#4ade80' : '#e2e8f0', fontWeight: 600 }}>
                                            {isNextAccept && '*'}{t.nextState}
                                          </span>
                                          <span style={{ color: '#94a3b8' }}>,</span>
                                          <span style={{ color: '#22d3ee' }}>{t.push}</span>
                                          <span style={{ color: '#94a3b8' }}>)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : (
          /* FA/NFA Transition Table - standard table format */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>State</th>
                {alphabet.map(sym => (
                  <th key={sym} style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>{sym}</th>
                ))}
                {(mode === 'eNFA') && <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>ε</th>}
              </tr>
            </thead>
            <tbody>
              {stateNodes.map(n => {
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
                      <td key={sym} style={{ padding: '6px 8px', color: '#cbd5e1' }}>
                        {transitionMap[n.id]?.[sym]?.join(',') || '∅'}
                      </td>
                    ))}
                    {(mode === 'eNFA') && (
                      <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>
                        {transitionMap[n.id]?.['ε']?.join(',') || '∅'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
