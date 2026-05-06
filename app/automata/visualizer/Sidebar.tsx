'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Edge, Node } from '@xyflow/react';
import type { ModeType, PdaConfig, PdaSettings, TmConfig, TmSettings, PdaRule, TmRule, SimSnapshot } from './types';
import { TM_BLANK } from './constants';
import {
  formatPdaExtensionSummary,
  formatPdaStoreContents,
  getPdaConfigStores,
  getPdaStoreCount,
  parsePdaRules,
  parseTmRules,
} from './utils';

const TM_DEFAULT_SHEET_COLUMNS = 8;

const normalizeSheetColumns = (value: number) => Math.max(2, Math.min(16, Number(value) || TM_DEFAULT_SHEET_COLUMNS));

const getTmRuleArity = (settings: TmSettings) => settings.headTrackMap.reduce((sum, tracks) => sum + tracks.length, 0);

const getTmRuleSlots = (settings: TmSettings) =>
  settings.headTrackMap.flatMap((tracks, headIndex) =>
    tracks.map((tapeIndex) => ({ headIndex, tapeIndex }))
  );

const getTmReadSymbols = (cfg: TmConfig, settings: TmSettings) =>
  getTmRuleSlots(settings).map(({ headIndex, tapeIndex }) => {
    const headPos = cfg.heads[headIndex] ?? 0;
    const tape = cfg.tapes[tapeIndex] ?? [TM_BLANK];
    return tape[headPos] ?? TM_BLANK;
  });

const formatTmCursorPosition = (position: number, settings: TmSettings) => {
  if (settings.sheetMode !== 'sheet-2d') return String(position);
  const columns = normalizeSheetColumns(settings.sheetColumns);
  return `r${Math.floor(position / columns)}c${position % columns}`;
};

const formatTmExtensionSummary = (settings: TmSettings) => {
  const parts: string[] = [];
  if (settings.sheetMode === 'sheet-2d') parts.push(`2D ${normalizeSheetColumns(settings.sheetColumns)} cols`);
  if (settings.ramEnabled) parts.push('RAM jump');
  if (settings.stateStorageEnabled) parts.push('State storage');
  return parts.length > 0 ? parts.join(' · ') : 'Classic tape';
};

const extractStateStorage = (label?: string) => {
  const trimmed = (label || '').trim();
  const match = trimmed.match(/(?:\{([^{}]+)\}|\[([^\[\]]+)\])\s*$/);
  return (match?.[1] ?? match?.[2] ?? '').trim() || null;
};

const buildIdTimelineHash = (timelinePayload: unknown) => {
  const hashParams = new URLSearchParams();
  hashParams.set('timeline', JSON.stringify(timelinePayload));
  return hashParams.toString();
};

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
  pdaConfigs: PdaConfig[];
  pdaSettings: PdaSettings;
  tmConfigs: TmConfig[];
  tmSettings: TmSettings;
  transitionMap: Record<string, Record<string, string[]>>;
  sidebarWidth: number;
  simTimeline: SimSnapshot[];
  timelineIndex: number;
  onJumpToStep?: (idx: number) => void;
  onPersistDraft?: () => void;
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
  pdaConfigs,
  pdaSettings,
  tmConfigs,
  tmSettings,
  transitionMap,
  sidebarWidth,
  simTimeline,
  timelineIndex,
  onJumpToStep,
  onPersistDraft,
  inputString = '',
  pdaAcceptMode = 'final-state',
}) => {
  const router = useRouter();
  const [pdaStackView, setPdaStackView] = useState<'top' | 'raw'>('top');
  const pdaStoreCount = getPdaStoreCount(pdaSettings);
  const pdaExtensionLabel = formatPdaExtensionSummary(pdaSettings);

  const getOrderedPdaStore = (store: string[]) => {
    if (pdaSettings.storageModel === 'queue') return [...store];
    return pdaStackView === 'top' ? [...store].reverse() : [...store];
  };

  const renderPdaStoreTokens = (store: string[]) => {
    const ordered = getOrderedPdaStore(store);
    if (ordered.length === 0) {
      return <span style={{ color: '#94a3b8' }}>ε</span>;
    }
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {ordered.map((token, index) => (
          <span
            key={`${token}-${index}`}
            style={{
              display: 'inline-block',
              padding: '1px 4px',
              background: index === 0 ? '#7c3aed' : '#334155',
              color: '#fff',
              borderRadius: 3,
              fontSize: 12,
              fontWeight: index === 0 ? 600 : 400,
            }}
          >
            {token}
          </span>
        ))}
      </div>
    );
  };

  const renderPdaStoreSummaryPreview = (store: string[], count: number) => {
    const ordered = getOrderedPdaStore(store);

    if (pdaSettings.storageModel === 'queue') {
      return (
        <div
          style={{
            minWidth: 180,
            padding: 10,
            borderRadius: 10,
            background: '#111827',
            border: '1px solid #1f2937',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 700 }}>Queue Snapshot</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              x{count}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
            <span>Front</span>
            <span>Rear</span>
          </div>
          {ordered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 52,
                borderRadius: 8,
                border: '1px dashed #334155',
                color: '#94a3b8',
                fontSize: 12,
                background: '#0b1324',
              }}
            >
              ε
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {ordered.map((token, index) => (
                <div
                  key={`pda-queue-summary-${token}-${index}`}
                  style={{
                    minWidth: 34,
                    padding: '8px 10px',
                    borderRadius: 8,
                    textAlign: 'center',
                    background: index === 0 ? '#0c4a6e' : '#0f172a',
                    border: index === 0 ? '1px solid #38bdf8' : '1px solid #334155',
                    color: '#e2e8f0',
                    fontSize: 12,
                    fontWeight: index === 0 ? 700 : 600,
                  }}
                >
                  {token}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          minWidth: 120,
          padding: 10,
          borderRadius: 10,
          background: '#111827',
          border: '1px solid #1f2937',
          display: 'grid',
          gap: 8,
          alignContent: 'start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 700 }}>Stack Snapshot</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#e2e8f0',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            x{count}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
          <span>{pdaStackView === 'top' ? 'Top' : 'Raw start'}</span>
          <span>{pdaStackView === 'top' ? 'Bottom' : 'Raw end'}</span>
        </div>
        {ordered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
              borderRadius: 8,
              border: '1px dashed #334155',
              color: '#94a3b8',
              fontSize: 12,
              background: '#0b1324',
            }}
          >
            ε
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              alignItems: 'stretch',
            }}
          >
            {ordered.map((token, index) => (
              <div
                key={`pda-stack-summary-${token}-${index}`}
                style={{
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: index === 0 ? '#4c1d95' : '#0f172a',
                  border: index === 0 ? '1px solid #a78bfa' : '1px solid #334155',
                  color: '#f8fafc',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: index === 0 ? 700 : 600,
                  boxShadow: index === 0 ? '0 0 0 1px rgba(167,139,250,0.18) inset' : 'none',
                }}
              >
                {token}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const pdaSummaryByStore = Array.from({ length: pdaStoreCount }, (_, storeIndex) => {
    const counts = new Map<string, { count: number; store: string[] }>();
    pdaConfigs.forEach((cfg) => {
      const store = getPdaConfigStores(cfg, pdaSettings)[storeIndex] ?? [];
      const key = store.join('\u0001');
      const entry = counts.get(key);
      if (entry) {
        entry.count += 1;
        return;
      }
      counts.set(key, { count: 1, store: [...store] });
    });
    return {
      storeIndex,
      entries: Array.from(counts.values()).sort((left, right) => right.count - left.count),
    };
  });

  const pdaConfigsByState = Array.from(
    pdaConfigs.reduce((groups, cfg) => {
      const group = groups.get(cfg.state) || [];
      group.push(cfg);
      groups.set(cfg.state, group);
      return groups;
    }, new Map<string, PdaConfig[]>())
  );

  const formatPdaOperand = (values: string[]) =>
    values.length <= 1 ? values[0] : `(${values.join(', ')})`;

  // Handler for viewing instantaneous descriptions
  const handleViewID = () => {
    onPersistDraft?.();

    if (isPdaMode && simTimeline.length > 0) {
      const timelinePayload = simTimeline.map((snap) => ({
        stepIndex: snap.stepIndex,
        simMessage: snap.simMessage,
        pdaConfigs: (snap.pdaPathConfigs ?? snap.pdaConfigs).map((cfg) => ({
          state: cfg.state,
          stack: [...cfg.stack],
          stacks: getPdaConfigStores(cfg, pdaSettings).map((store) => [...store]),
          storageModel: cfg.storageModel ?? pdaSettings.storageModel,
        })),
        pdaPathNodes: (snap.pdaPathNodes ?? []).map((node) => ({
          id: node.id,
          parentId: node.parentId,
          stepIndex: node.stepIndex,
          state: node.state,
          stack: [...node.stack],
          stacks: Array.isArray(node.stacks)
            ? node.stacks.map((store) => [...store])
            : [node.stack],
          storageModel: node.storageModel ?? pdaSettings.storageModel,
          transitionLabel: node.transitionLabel,
        })),
      }));

      const params = new URLSearchParams({
        mode,
        input: inputString,
        acceptMode: pdaAcceptMode,
        pdaSettings: encodeURIComponent(JSON.stringify(pdaSettings)),
      });
      router.push(`/automata/instantaneous-description?${params.toString()}#${buildIdTimelineHash(timelinePayload)}`);
    } else if (isTmMode && simTimeline.length > 0) {
      const timelinePayload = simTimeline.map((snap) => ({
        stepIndex: snap.stepIndex,
        simMessage: snap.simMessage,
        tmConfigs: (snap.tmPathConfigs ?? snap.tmConfigs).map((cfg) => ({
          state: cfg.state,
          tapes: cfg.tapes.map((tape) => [...tape]),
          heads: [...cfg.heads],
        })),
        tmPathNodes: (snap.tmPathNodes ?? []).map((node) => ({
          id: node.id,
          parentId: node.parentId,
          stepIndex: node.stepIndex,
          state: node.state,
          tapes: node.tapes.map((tape) => [...tape]),
          heads: [...node.heads],
          transitionLabel: node.transitionLabel,
        })),
      }));
      const params = new URLSearchParams({
        mode,
        input: inputString,
        tmSettings: encodeURIComponent(JSON.stringify(tmSettings)),
      });
      router.push(`/automata/instantaneous-description?${params.toString()}#${buildIdTimelineHash(timelinePayload)}`);
    }
  };
  const [tmTimelineExpanded, setTmTimelineExpanded] = useState<Set<number>>(new Set());
  const Q = stateNodes.map(n => n.id);
  const tmInputModeLabel = tmSettings.inputMode === 'textbook'
    ? 'Textbook input on all tapes'
    : 'Machine input on Tape 1';
  const tmExtensionLabel = formatTmExtensionSummary(tmSettings);
  const tmMappingLabel = tmSettings.headTrackMap
        .map((tracks, headIndex) => `H${headIndex + 1}->${tracks.map((tapeIndex) => `T${tapeIndex + 1}`).join('+')}`)
        .join(', ');
  const getStateStorageLabel = (stateId: string) => {
    if (!tmSettings.stateStorageEnabled) return null;
    const stateNode = stateNodes.find((node) => node.id === stateId);
    const label = typeof stateNode?.data?.label === 'string' ? stateNode.data.label : stateId;
    return extractStateStorage(label);
  };

  // Helper: render a single TM tape with multiple head support
  const renderTape = (tape: string[], heads: number[], tapeIdx: number, compact: boolean = false) => {
    // Find all heads on this tape
    const headsOnTape = tmSettings.headTrackMap
      .map((tracks, headIndex) => ({ tracks, headIndex }))
      .filter((entry) => entry.tracks.includes(tapeIdx))
      .map((entry) => entry.headIndex);
    
    const headPositions = headsOnTape.map(h => heads[h]);
    
    if (tmSettings.sheetMode === 'sheet-2d') {
      const columns = normalizeSheetColumns(tmSettings.sheetColumns);
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(${compact ? 30 : 44}px, 1fr))`,
            gap: compact ? 4 : 6,
            padding: compact ? '2px 0' : '4px 0',
          }}
        >
          {tape.map((ch, idx) => {
            const isHead = headPositions.includes(idx);
            const headLabels = headsOnTape.filter((headIndex) => heads[headIndex] === idx);
            const rowIndex = Math.floor(idx / columns);
            const columnIndex = idx % columns;

            return (
              <span key={idx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span
                  style={{
                    color: isHead ? '#22d3ee' : 'transparent',
                    fontSize: compact ? 10 : 11,
                    minHeight: compact ? 12 : 14,
                    fontWeight: 700,
                  }}
                >
                  {isHead ? headLabels.map((headIndex) => `H${headIndex + 1}`).join(',') : '.'}
                </span>
                <span
                  style={{
                    minWidth: compact ? 26 : 34,
                    textAlign: 'center',
                    padding: compact ? '4px 2px' : '6px 4px',
                    border: isHead ? '2px solid #22d3ee' : '1px solid #334155',
                    borderRadius: compact ? 4 : 6,
                    color: isHead ? '#ffffff' : '#cbd5e1',
                    background: isHead ? '#0369a1' : '#0f172a',
                    fontWeight: isHead ? 700 : 400,
                    fontSize: compact ? 11 : 13,
                  }}
                >
                  {ch || TM_BLANK}
                </span>
                <span style={{ fontSize: 9, color: '#64748b', minHeight: 12 }}>
                  r{rowIndex}c{columnIndex}
                </span>
              </span>
            );
          })}
        </div>
      );
    }

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
    if (tapes.length === 1) {
      // Single tape - use simplified render
      return renderTape(tapes[0], heads, 0, compact);
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
        {tapes.map((tape, tIdx) => (
          <div key={tIdx}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>
              Tape {tIdx + 1}
            </div>
            {renderTape(tape, heads, tIdx, compact)}
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
        {isTmMode && (
          <>
            <div style={{ marginTop: 6 }}><strong>Tapes / Heads</strong>: {tmSettings.tapeCount} / {tmSettings.headCount}</div>
            <div style={{ marginTop: 6 }}><strong>Head Map</strong>: {tmMappingLabel}</div>
            <div style={{ marginTop: 6 }}><strong>Input Mode</strong>: {tmInputModeLabel}</div>
            <div style={{ marginTop: 6 }}><strong>Extensions</strong>: {tmExtensionLabel}</div>
          </>
        )}
        {isPdaMode && (
          <>
            <div style={{ marginTop: 6 }}><strong>PDA Setup</strong>: {pdaExtensionLabel}</div>
            <div style={{ marginTop: 6 }}><strong>Stores</strong>: {pdaStoreCount}</div>
          </>
        )}
        <div style={{ marginTop: 6 }}>
          <strong>δ</strong>: <br/>
          <div style={{ paddingLeft: 10, marginTop: 4 }}>
            {isPdaMode
              ? edges.flatMap((edge, edgeIdx) => {
                  const rules: PdaRule[] = parsePdaRules(edge.label as string, pdaSettings);
                  return rules.map((rule, ruleIdx) => (
                    <div key={`pda-delta-${edgeIdx}-${ruleIdx}`}>
                      δ({edge.source}, {rule.input}, {formatPdaOperand(rule.pops ?? [rule.pop])}) = ({edge.target}, {formatPdaOperand(rule.pushes ?? [rule.push])})
                    </div>
                  ));
                })
              : isTmMode
              ? edges.flatMap((edge, edgeIdx) => {
                  const rules: TmRule[] = parseTmRules(edge.label as string, getTmRuleArity(tmSettings));
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
                        const curSyms = getTmReadSymbols(cfg, tmSettings);
                        const isAccept = F.includes(cfg.state);
                        const stateStorage = getStateStorageLabel(cfg.state);
                        return (
                          <div key={`tl-${stepIdx}-${ci}`} style={{ background: '#0b1324', borderRadius: 4, padding: 8, border: '1px solid #21314a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {hasMultiple && <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>#{ci + 1}</span>}
                                <span style={{ color: isAccept ? '#4ade80' : '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{cfg.state}</span>
                                {stateStorage && <span style={{ fontSize: 10, color: '#facc15' }}>{`{${stateStorage}}`}</span>}
                                {isAccept && <span style={{ fontSize: 9, color: '#4ade80' }}>✓</span>}
                              </div>
                              <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', gap: 8 }}>
                                <span>{cfg.heads.length > 1 ? 'Heads' : 'Head'}: <strong style={{ color: '#22d3ee' }}>{cfg.heads.map((position) => formatTmCursorPosition(position, tmSettings)).join(', ')}</strong></span>
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
                {pdaSettings.storageModel === 'queue' ? 'Front→Rear' : 'Top→Bottom'}
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
          <div
            style={{
              display: 'grid',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ background: '#0f172a', borderRadius: 6, border: '1px solid #21314a', padding: 10 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>Store Summary</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
                สรุปภาพรวมของ store ปัจจุบันทุก configuration ก่อนแยกตาม state
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {pdaSummaryByStore.map(({ storeIndex, entries }) => (
                  <div key={`pda-summary-${storeIndex}`}>
                    <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 6 }}>
                      {pdaSettings.storageModel === 'queue'
                        ? 'Queue'
                        : pdaStoreCount > 1
                        ? `Stack ${storeIndex + 1}`
                        : 'Stack'}
                    </div>
                    {entries.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>No active content</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
                        {entries.map((entry, entryIndex) => (
                          <div
                            key={`pda-summary-chip-${storeIndex}-${entryIndex}`}
                          >
                            {renderPdaStoreSummaryPreview(entry.store, entry.count)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, maxHeight: 260, overflowY: 'auto', background: '#0f172a', borderRadius: 4, border: '1px solid #21314a' }}>
              <div style={{ padding: '10px 10px 0', color: '#e2e8f0', fontWeight: 600 }}>
                Store by State
              </div>
            {pdaConfigs.length === 0 ? (
              <div style={{ padding: 8 }}>No active PDA configuration</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a', width: '25%' }}>State</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a', width: '15%' }}>Configs</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #21314a' }}>
                      {pdaSettings.storageModel === 'queue'
                        ? 'Queue Snapshots'
                        : pdaStackView === 'top'
                        ? 'Store Snapshots (display order)'
                        : 'Store Snapshots (raw order)'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pdaConfigsByState.slice(0, 40).map(([state, configs]) => {
                    return (
                      <tr key={`pda-group-${state}`} style={{ borderBottom: '1px dashed #0b1324' }}>
                        <td style={{ padding: '6px 8px', color: '#e2e8f0', fontWeight: 600 }}>{state}</td>
                        <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{configs.length}</td>
                        <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {configs.map((cfg, configIndex) => {
                              const stores = getPdaConfigStores(cfg, pdaSettings);
                              return (
                                <div
                                  key={`pda-state-${state}-${configIndex}`}
                                  style={{
                                    display: 'grid',
                                    gap: 4,
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    background: '#111827',
                                    border: '1px solid #1f2937',
                                  }}
                                >
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Config #{configIndex + 1}</div>
                                  {stores.map((store, storeIndex) => (
                                    <div key={`pda-state-${state}-${configIndex}-${storeIndex}`} style={{ display: 'grid', gap: 4 }}>
                                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                        {pdaSettings.storageModel === 'queue'
                                          ? 'Queue'
                                          : pdaStoreCount > 1
                                          ? `Stack ${storeIndex + 1}`
                                          : 'Stack'}
                                      </div>
                                      {renderPdaStoreTokens(store)}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
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
                      {getStateStorageLabel(cfg.state) && (
                        <span style={{ color: '#facc15', marginLeft: 6 }}>{`{${getStateStorageLabel(cfg.state)}}`}</span>
                      )}
                    </div>
                    <div style={{ marginBottom: 6, fontSize: 11, color: '#94a3b8' }}>
                      {cfg.heads.length > 1
                        ? `Heads: ${cfg.heads.map((position, headIndex) => `H${headIndex + 1}@${formatTmCursorPosition(position, tmSettings)}`).join(', ')}`
                        : `Head: H1@${formatTmCursorPosition(cfg.heads[0] ?? 0, tmSettings)}`}
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
              const tmRules = parseTmRules(label, getTmRuleArity(tmSettings));
              
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
