'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type {
  PdaConfig,
  PdaPathNode,
  PdaSettings,
  TmConfig,
  TmPathNode,
  TmSettings,
} from '../visualizer/types';
import {
  formatPdaExtensionSummary,
  formatPdaStoreContents,
  getPdaStoreCount,
  normalizePdaSettings,
} from '../visualizer/utils';

type LegacyPdaConfig = PdaConfig & { input: string; index: number };

type PdaTimelineStep = {
  stepIndex: number;
  simMessage: string;
  pdaConfigs: PdaConfig[];
  pdaPathNodes?: PdaPathNode[];
};

type TmTimelineStep = {
  stepIndex: number;
  simMessage: string;
  tmConfigs: TmConfig[];
  tmPathNodes?: TmPathNode[];
};

type TreeNodeBase = {
  id: string;
  parentId: string | null;
};

type IdViewMode = 'visual' | 'textbook';

const TM_DEFAULT_SHEET_COLUMNS = 8;

const normalizeSheetColumns = (value: number) => Math.max(2, Math.min(16, Number(value) || TM_DEFAULT_SHEET_COLUMNS));

const defaultTmSettings: TmSettings = {
  tapeCount: 1,
  headCount: 1,
  headToTape: [0],
  headTrackMap: [[0]],
  inputMode: 'machine',
  sheetMode: 'linear',
  sheetColumns: TM_DEFAULT_SHEET_COLUMNS,
  ramEnabled: false,
  stateStorageEnabled: false,
};

const defaultPdaSettings: PdaSettings = normalizePdaSettings();

const groupLegacyPdaConfigs = (configs: LegacyPdaConfig[]): PdaTimelineStep[] => {
  const grouped = new Map<number, PdaConfig[]>();
  configs.forEach((config) => {
    const current = grouped.get(config.index) ?? [];
    current.push({ state: config.state, stack: [...config.stack] });
    grouped.set(config.index, current);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([stepIndex, pdaConfigs]) => ({
      stepIndex,
      simMessage: stepIndex === 0 ? 'Start configuration set' : `Reachable PDA IDs after step ${stepIndex}`,
      pdaConfigs,
    }));
};

const groupLegacyTmConfigs = (configs: TmConfig[]): TmTimelineStep[] => {
  return configs.map((config, stepIndex) => ({
    stepIndex,
    simMessage: stepIndex === 0 ? 'Start configuration set' : `Reachable TM IDs after step ${stepIndex}`,
    tmConfigs: [{
      state: config.state,
      tapes: config.tapes.map((tape) => [...tape]),
      heads: [...config.heads],
    }],
  }));
};

const buildTree = <T extends TreeNodeBase>(nodes: T[]) => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const roots: T[] = [];
  const children = new Map<string, T[]>();

  nodes.forEach((node) => {
    if (!node.parentId || !nodeIds.has(node.parentId)) {
      roots.push(node);
      return;
    }

    const current = children.get(node.parentId) ?? [];
    current.push(node);
    children.set(node.parentId, current);
  });

  return { roots, children };
};

const parseJsonParam = <T,>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value)) as T;
    } catch {
      return null;
    }
  }
};

function InstantaneousDescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hashTimelineParam, setHashTimelineParam] = useState<string | null>(null);
  const [hashChecked, setHashChecked] = useState(false);
  const [idViewMode, setIdViewMode] = useState<IdViewMode>('visual');

  useEffect(() => {
    const syncHashTimeline = () => {
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      setHashTimelineParam(hashParams.get('timeline'));
      setHashChecked(true);
    };

    syncHashTimeline();
    window.addEventListener('hashchange', syncHashTimeline);

    return () => {
      window.removeEventListener('hashchange', syncHashTimeline);
    };
  }, []);

  const parsedData = (() => {
    const modeParam = searchParams.get('mode') || '';
    const timelineParam = hashTimelineParam ?? searchParams.get('timeline');
    const configsParam = searchParams.get('configs');
    const inputParam = searchParams.get('input') || '';
    const acceptModeParam = searchParams.get('acceptMode') || 'final-state';
    const pdaSettingsParam = searchParams.get('pdaSettings');
    const tmSettingsParam = searchParams.get('tmSettings');

    const result = {
      mode: modeParam,
      inputString: inputParam,
      acceptMode: acceptModeParam,
      pdaSettings: defaultPdaSettings,
      tmSettings: defaultTmSettings,
      pdaTimeline: [] as PdaTimelineStep[],
      tmTimeline: [] as TmTimelineStep[],
    };

    try {
      const decodedPdaSettings = parseJsonParam<Partial<PdaSettings>>(pdaSettingsParam);
      if (decodedPdaSettings) {
        result.pdaSettings = normalizePdaSettings(decodedPdaSettings);
      }

      const decodedTmSettings = parseJsonParam<Partial<TmSettings> & { trackMode?: boolean }>(tmSettingsParam);
      if (decodedTmSettings) {
        const legacySharedTrackPreset = decodedTmSettings.trackMode === true;
        const tapeCount = Math.max(1, Number(decodedTmSettings.tapeCount) || defaultTmSettings.tapeCount);
        const headCount = Math.max(
          1,
          legacySharedTrackPreset ? 1 : Number(decodedTmSettings.headCount) || defaultTmSettings.headCount
        );
        const restTmSettings = { ...decodedTmSettings };
        delete restTmSettings.trackMode;
        result.tmSettings = {
          ...defaultTmSettings,
          ...restTmSettings,
          tapeCount,
          headCount,
          headToTape: decodedTmSettings.headToTape ?? defaultTmSettings.headToTape,
          headTrackMap: decodedTmSettings.headTrackMap
            ?? (legacySharedTrackPreset
              ? [Array.from({ length: tapeCount }, (_, tapeIndex) => tapeIndex)]
              : (decodedTmSettings.headToTape ?? defaultTmSettings.headToTape)
                  .slice(0, headCount)
                  .map((tapeIndex) => [tapeIndex])),
        };
      }

      if (timelineParam) {
        const decodedTimeline = parseJsonParam<PdaTimelineStep[] | TmTimelineStep[]>(timelineParam);
        if (!decodedTimeline) {
          return result;
        }

        if (modeParam.includes('PDA')) {
          result.pdaTimeline = decodedTimeline as PdaTimelineStep[];
        } else if (modeParam.includes('TM') || modeParam === 'LBA') {
          result.tmTimeline = decodedTimeline as TmTimelineStep[];
        }
        return result;
      }

      if (configsParam) {
        const decoded = parseJsonParam<LegacyPdaConfig[] | TmConfig[]>(configsParam);
        if (!decoded) {
          return result;
        }

        if (modeParam.includes('PDA')) {
          result.pdaTimeline = groupLegacyPdaConfigs(decoded as LegacyPdaConfig[]);
        } else if (modeParam.includes('TM') || modeParam === 'LBA') {
          result.tmTimeline = groupLegacyTmConfigs(decoded as TmConfig[]);
        }
      }
    } catch (error) {
      console.error('Failed to parse configurations:', error);
    }

    return result;
  })();

  const { pdaTimeline, tmTimeline, mode, inputString, acceptMode, pdaSettings, tmSettings } = parsedData;
  const isWaitingForHashTimeline = !hashChecked && !searchParams.get('timeline') && !searchParams.get('configs');

  const isPDA = mode.includes('PDA');
  const isTM = mode.includes('TM') || mode === 'LBA';
  const pdaPathNodes = pdaTimeline.flatMap((step) => step.pdaPathNodes ?? []);
  const tmPathNodes = tmTimeline.flatMap((step) => step.tmPathNodes ?? []);
  const pdaTree = buildTree(pdaPathNodes);
  const tmTree = buildTree(tmPathNodes);
  const pdaLeaves = pdaPathNodes.filter((node) => !pdaTree.children.has(node.id));
  const tmLeaves = tmPathNodes.filter((node) => !tmTree.children.has(node.id));

  const getPdaStores = (entry: { stack: string[]; stacks?: string[][] }) => {
    if (Array.isArray(entry.stacks) && entry.stacks.length > 0) {
      return entry.stacks.map((store) => [...store]);
    }
    return [[...entry.stack]];
  };

  const formatPdaStoreForId = (store: string[]) => {
    const ordered = pdaSettings.storageModel === 'queue' ? [...store] : [...store].reverse();
    return formatPdaStoreContents(ordered, pdaSettings);
  };

  const formatPdaStoreBundle = (entry: { stack: string[]; stacks?: string[][] }) => {
    const stores = getPdaStores(entry);
    if (stores.length <= 1 && pdaSettings.storageModel === 'stack') {
      return formatPdaStoreForId(stores[0]);
    }
    if (pdaSettings.storageModel === 'queue') {
      return `Q=${formatPdaStoreForId(stores[0])}`;
    }
    return stores
      .map((store, storeIndex) => `S${storeIndex + 1}=${formatPdaStoreForId(store)}`)
      .join(' | ');
  };

  const formatPdaIdTuple = (state: string, stepIndex: number, config: { stack: string[]; stacks?: string[][] }) => {
    const remainingInput = inputString.substring(stepIndex) || 'ε';
    const stackDisplay = formatPdaStoreBundle(config);
    return `(${state}, ${remainingInput}, ${stackDisplay})`;
  };

  const formatTmTapeText = (tape: string[], heads: number[], tapeIdx: number) => {
    const headsOnTape = tmSettings.headTrackMap
      .map((tracks, headIndex) => ({ tracks, headIndex, position: heads[headIndex] ?? 0 }))
      .filter((head) => head.tracks.includes(tapeIdx));

    return tape
      .map((symbol, position) => {
        const headLabels = headsOnTape
          .filter((head) => head.position === position)
          .map((head) => `H${head.headIndex + 1}`);
        const cell = symbol || '□';

        return headLabels.length > 0 ? `${headLabels.join('&')}:[${cell}]` : cell;
      })
      .join(' ');
  };

  const formatTmIdLine = (config: TmConfig) => {
    const tapeSummary = config.tapes
      .map((tape, tapeIdx) => `T${tapeIdx + 1}: ${formatTmTapeText(tape, config.heads, tapeIdx)}`)
      .join(' || ');

    return `${config.state} || ${tapeSummary}`;
  };

  const renderTmTape = (tape: string[], heads: number[], tapeIdx: number) => {
    const headsOnTape = tmSettings.headTrackMap
      .map((tracks, headIndex) => ({ tracks, headIndex, position: heads[headIndex] ?? 0 }))
      .filter((head) => head.tracks.includes(tapeIdx));

    if (tmSettings.sheetMode === 'sheet-2d') {
      const columns = normalizeSheetColumns(tmSettings.sheetColumns);
      return (
        <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(52px, 1fr))`, gap: '0.35rem', minWidth: 'max-content' }}>
            {tape.map((symbol, position) => {
              const headLabels = headsOnTape
                .filter((head) => head.position === position)
                .map((head) => `H${head.headIndex + 1}`);
              const isHead = headLabels.length > 0;
              const rowIndex = Math.floor(position / columns);
              const columnIndex = position % columns;

              return (
                <span
                  key={`${tapeIdx}-${position}`}
                  style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                >
                  <span style={{ fontSize: '0.65rem', color: isHead ? '#22d3ee' : 'transparent', minHeight: '0.9rem' }}>
                    {isHead ? headLabels.join(', ') : '·'}
                  </span>
                  <span
                    style={{
                      minWidth: '2.2rem',
                      padding: '0.35rem 0.4rem',
                      borderRadius: '0.5rem',
                      border: isHead ? '2px solid #22d3ee' : '1px solid #334155',
                      background: isHead ? '#082f49' : '#0f172a',
                      color: '#f8fafc',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    {symbol}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>r{rowIndex}c{columnIndex}</span>
                </span>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <div style={{ display: 'inline-flex', gap: '0.35rem', minWidth: 'max-content' }}>
          {tape.map((symbol, position) => {
            const headLabels = headsOnTape
              .filter((head) => head.position === position)
              .map((head) => `H${head.headIndex + 1}`);
            const isHead = headLabels.length > 0;

            return (
              <span
                key={`${tapeIdx}-${position}`}
                style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
              >
                <span style={{ fontSize: '0.65rem', color: isHead ? '#22d3ee' : 'transparent', minHeight: '0.9rem' }}>
                  {isHead ? headLabels.join(', ') : '·'}
                </span>
                <span
                  style={{
                    minWidth: '2rem',
                    padding: '0.3rem 0.45rem',
                    borderRadius: '6px',
                    border: isHead ? '2px solid #22d3ee' : '1px solid #334155',
                    background: isHead ? '#082f49' : '#0f172a',
                    color: isHead ? '#f8fafc' : '#22d3ee',
                    textAlign: 'center',
                  }}
                >
                  {symbol}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{position}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPdaBranch = (node: PdaPathNode): ReturnType<typeof renderTmTape> => {
    const children = pdaTree.children.get(node.id) ?? [];
    const remainingInput = inputString.substring(node.stepIndex) || 'ε';
    const stackDisplay = formatPdaStoreBundle(node);

    return (
      <div key={node.id} style={{ display: 'grid', gap: '0.85rem' }}>
        <div
          style={{
            padding: '0.95rem 1rem',
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            boxShadow: '0 10px 30px rgba(2, 6, 23, 0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.7rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {node.stepIndex === 0 ? 'Start frontier' : `Step ${node.stepIndex}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                {node.transitionLabel ?? (node.stepIndex === 0 ? 'Start' : `Step ${node.stepIndex}`)}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'right' }}>
              Remaining: <span style={{ color: '#22d3ee' }}>{remainingInput}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '0.15rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '1rem', display: 'inline-flex', gap: '0.45rem', alignItems: 'center', whiteSpace: 'nowrap', minWidth: 'max-content' }}>
              <span style={{ color: '#94a3b8' }}>(</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>{node.state}</span>
              <span style={{ color: '#94a3b8' }}>,</span>
              <span style={{ color: '#22d3ee' }}>{remainingInput}</span>
              <span style={{ color: '#94a3b8' }}>,</span>
              <span style={{ color: '#facc15' }}>{stackDisplay}</span>
              <span style={{ color: '#94a3b8' }}>)</span>
            </div>
          </div>
        </div>

        {children.length > 0 && (
          <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid #334155', display: 'grid', gap: '0.85rem' }}>
            {children.map((child) => (
              <div key={child.id} style={{ position: 'relative', paddingLeft: '1rem' }}>
                <div style={{ position: 'absolute', left: 0, top: '1.4rem', width: '0.75rem', borderTop: '1px solid #334155' }} />
                {renderPdaBranch(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTmBranch = (node: TmPathNode): ReturnType<typeof renderTmTape> => {
    const children = tmTree.children.get(node.id) ?? [];

    return (
      <div key={node.id} style={{ display: 'grid', gap: '0.85rem' }}>
        <div
          style={{
            padding: '0.95rem 1rem',
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            boxShadow: '0 10px 30px rgba(2, 6, 23, 0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.7rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {node.stepIndex === 0 ? 'Start frontier' : `Step ${node.stepIndex}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                {node.transitionLabel ?? (node.stepIndex === 0 ? 'Start' : `Step ${node.stepIndex}`)}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Heads: <span style={{ color: '#22d3ee' }}>[{node.heads.join(', ')}]</span>
            </div>
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#4ade80', fontWeight: 600, marginBottom: '0.75rem' }}>
            {node.state}
          </div>

          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {node.tapes.map((tape, tapeIdx) => (
              <div key={`${node.id}-tape-${tapeIdx}`}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Tape {tapeIdx + 1}</div>
                {renderTmTape(tape, node.heads, tapeIdx)}
              </div>
            ))}
          </div>
        </div>

        {children.length > 0 && (
          <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid #334155', display: 'grid', gap: '0.85rem' }}>
            {children.map((child) => (
              <div key={child.id} style={{ position: 'relative', paddingLeft: '1rem' }}>
                <div style={{ position: 'absolute', left: 0, top: '1.4rem', width: '0.75rem', borderTop: '1px solid #334155' }} />
                {renderTmBranch(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLegacyPdaSteps = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {pdaTimeline.map((step, idx) => {
        const remainingInput = inputString.substring(step.stepIndex) || 'ε';

        return (
          <div key={`pda-step-${step.stepIndex}-${idx}`}>
            <div style={{
              padding: '1rem',
              background: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                    {step.stepIndex === 0 ? 'Start' : `Step ${step.stepIndex}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {step.simMessage}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
                  <div>{step.pdaConfigs.length} path{step.pdaConfigs.length !== 1 ? 's' : ''}</div>
                  <div>Remaining input: <span style={{ color: '#22d3ee' }}>{remainingInput}</span></div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {step.pdaConfigs.map((config, configIdx) => {
                  const stackDisplay = formatPdaStoreBundle(config);

                  return (
                    <div
                      key={`pda-config-${step.stepIndex}-${config.state}-${configIdx}`}
                      style={{
                        padding: '0.85rem 1rem',
                        background: '#111827',
                        border: '1px solid #243244',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.45rem' }}>Path {configIdx + 1}</div>
                      <div style={{ overflowX: 'auto', paddingBottom: '0.15rem' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '1rem', display: 'inline-flex', gap: '0.45rem', alignItems: 'center', whiteSpace: 'nowrap', minWidth: 'max-content' }}>
                          <span style={{ color: '#94a3b8' }}>(</span>
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>{config.state}</span>
                          <span style={{ color: '#94a3b8' }}>,</span>
                          <span style={{ color: '#22d3ee' }}>{remainingInput}</span>
                          <span style={{ color: '#94a3b8' }}>,</span>
                          <span style={{ color: '#facc15' }}>{stackDisplay}</span>
                          <span style={{ color: '#94a3b8' }}>)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLegacyTmSteps = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {tmTimeline.map((step, idx) => (
        <div key={`tm-step-${step.stepIndex}-${idx}`}>
          <div style={{
            padding: '1rem',
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                  {step.stepIndex === 0 ? 'Start' : `Step ${step.stepIndex}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {step.simMessage}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
                <div>{step.tmConfigs.length} path{step.tmConfigs.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {step.tmConfigs.map((config, configIdx) => (
                <div
                  key={`tm-config-${step.stepIndex}-${config.state}-${configIdx}`}
                  style={{
                    padding: '0.85rem 1rem',
                    background: '#111827',
                    border: '1px solid #243244',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.2rem' }}>Path {configIdx + 1}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#4ade80', fontWeight: 600 }}>{config.state}</div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Heads: <span style={{ color: '#22d3ee' }}>[{config.heads.join(', ')}]</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.65rem' }}>
                    {config.tapes.map((tape, tapeIdx) => (
                      <div key={`tm-tape-${configIdx}-${tapeIdx}`}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Tape {tapeIdx + 1}</div>
                        {renderTmTape(tape, config.heads, tapeIdx)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTextbookPdaSteps = () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {pdaTimeline.map((step, idx) => (
        <div
          key={`pda-text-step-${step.stepIndex}-${idx}`}
          style={{
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                {step.stepIndex === 0 ? 'Start' : `Step ${step.stepIndex}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {step.simMessage}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {step.pdaConfigs.length} ID{step.pdaConfigs.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '0.2rem' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre', minWidth: 'max-content', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '1.7', color: '#e2e8f0' }}>
              {step.pdaConfigs.length > 0
                ? step.pdaConfigs.map((config) => formatPdaIdTuple(config.state, step.stepIndex, config)).join('\n')
                : '∅'}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTextbookTmSteps = () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {tmTimeline.map((step, idx) => (
        <div
          key={`tm-text-step-${step.stepIndex}-${idx}`}
          style={{
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                {step.stepIndex === 0 ? 'Start' : `Step ${step.stepIndex}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {step.simMessage}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {step.tmConfigs.length} ID{step.tmConfigs.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '0.2rem' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre', minWidth: 'max-content', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '1.7', color: '#e2e8f0' }}>
              {step.tmConfigs.length > 0
                ? step.tmConfigs.map((config) => formatTmIdLine(config)).join('\n')
                : '∅'}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
      color: '#e2e8f0'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
              Instantaneous Description
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              {mode} • Input: <span style={{ color: '#22d3ee', fontFamily: 'monospace' }}>{inputString || '(empty)'}</span>
              {isPDA && acceptMode && (
                <span> • Accept by: <span style={{ color: '#a78bfa' }}>{acceptMode}</span></span>
              )}
              {isPDA && (
                <span> • Setup: <span style={{ color: '#facc15' }}>{formatPdaExtensionSummary(pdaSettings)} ({getPdaStoreCount(pdaSettings)} store{getPdaStoreCount(pdaSettings) > 1 ? 's' : ''})</span></span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(pdaTimeline.length > 0 || tmTimeline.length > 0) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}>
                <button
                  onClick={() => setIdViewMode('visual')}
                  style={{
                    padding: '0.45rem 0.8rem',
                    background: idViewMode === 'visual' ? '#0ea5e9' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Visual Tree
                </button>
                <button
                  onClick={() => setIdViewMode('textbook')}
                  style={{
                    padding: '0.45rem 0.8rem',
                    background: idViewMode === 'textbook' ? '#0ea5e9' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Textbook ID
                </button>
              </div>
            )}
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.5rem 1rem',
                background: '#334155',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#475569';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#334155';
              }}
            >
              ← Back to Visualizer
            </button>
          </div>
        </div>

        {isPDA && pdaTimeline.length > 0 && (
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#cbd5e1' }}>
              {idViewMode === 'textbook' ? 'Textbook ID Listing' : 'Detailed Computation Tree'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              {idViewMode === 'textbook'
                ? 'Each step is rendered as plain-text instantaneous descriptions. Long rows stay on one line and can be scrolled horizontally.'
                : 'Each branch now stays attached to its parent PDA configuration, so you can follow the run from the root down to each child step instead of reading one flat bucket per depth.'}
            </p>

            {idViewMode === 'textbook' ? (
              renderTextbookPdaSteps()
            ) : pdaPathNodes.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto', paddingBottom: '0.35rem' }}>
                  <div style={{ display: 'grid', gap: '1rem', minWidth: 'max-content' }}>
                    {pdaTree.roots.map((root) => renderPdaBranch(root))}
                  </div>
                </div>

                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  background: '#0f172a',
                  borderRadius: '6px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    <strong>Summary:</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
                    • Tree roots: {pdaTree.roots.length}<br />
                    • Total recorded nodes: {pdaPathNodes.length}<br />
                    • Terminal branches: {pdaLeaves.length}<br />
                    • Final states: <span style={{ color: '#facc15' }}>{pdaLeaves.map((node) => node.state).join(', ') || '∅'}</span>
                  </div>
                </div>
              </>
            ) : renderLegacyPdaSteps()}
          </div>
        )}

        {isTM && tmTimeline.length > 0 && (
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#cbd5e1' }}>
              {idViewMode === 'textbook' ? 'Textbook ID Listing' : 'Detailed Computation Tree'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              {idViewMode === 'textbook'
                ? 'Each TM configuration is rendered as a plain-text ID, with every tape kept on one line so long runs can be inspected with horizontal scrolling.'
                : 'Each TM branch is now rendered as a real parent-child tree, so duplicated configurations reached from different parents stay separated all the way down the run.'}
            </p>

            {idViewMode === 'textbook' ? (
              renderTextbookTmSteps()
            ) : tmPathNodes.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto', paddingBottom: '0.35rem' }}>
                  <div style={{ display: 'grid', gap: '1rem', minWidth: 'max-content' }}>
                    {tmTree.roots.map((root) => renderTmBranch(root))}
                  </div>
                </div>

                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  background: '#0f172a',
                  borderRadius: '6px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    <strong>Summary:</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
                    • Tree roots: {tmTree.roots.length}<br />
                    • Total recorded nodes: {tmPathNodes.length}<br />
                    • Terminal branches: {tmLeaves.length}<br />
                    • Final states: <span style={{ color: '#facc15' }}>{tmLeaves.map((node) => node.state).join(', ') || '∅'}</span>
                  </div>
                </div>
              </>
            ) : renderLegacyTmSteps()}
          </div>
        )}

        {isWaitingForHashTimeline && (
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '3rem',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Loading computation data</p>
            <p style={{ fontSize: '0.9rem' }}>
              Preparing the instantaneous description timeline from the client-side payload.
            </p>
          </div>
        )}

        {!isWaitingForHashTimeline && pdaTimeline.length === 0 && tmTimeline.length === 0 && (
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '3rem',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No computation data available</p>
            <p style={{ fontSize: '0.9rem' }}>
              Run a simulation in the visualizer first, then click &quot;View ID&quot; to inspect the detailed computation tree.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstantaneousDescriptionPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <InstantaneousDescriptionContent />
    </Suspense>
  );
}
