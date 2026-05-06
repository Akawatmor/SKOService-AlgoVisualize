'use client';

import React, { useEffect, useState } from 'react';

import {
  TM_BLANK,
  TM_DEFAULT_HEAD_COUNT,
  TM_DEFAULT_TAPE_COUNT,
  TM_MAX_HEADS,
  TM_MAX_TAPES,
} from './constants';
import type { TmInputMode, TmSettings } from './types';

const TM_DEFAULT_SHEET_COLUMNS = 8;
const TM_MIN_SHEET_COLUMNS = 2;
const TM_MAX_SHEET_COLUMNS = 16;

interface TmSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: TmSettings) => void;
  initialSettings: TmSettings;
  inputString: string;
  isRunning: boolean;
}

const buildDefaultHeadToTape = (headCount: number, tapeCount: number) =>
  Array.from({ length: headCount }, (_, index) =>
    Math.min(index, Math.max(0, tapeCount - 1))
  );

type LegacyTmSettingsInput = TmSettings & { trackMode?: boolean };

const normalizeTrackList = (
  rawTracks: unknown,
  tapeCount: number,
  fallbackTrack: number
) => {
  const source = Array.isArray(rawTracks) ? rawTracks : [];
  const normalized: number[] = [];
  const seen = new Set<number>();

  source.forEach((entry) => {
    if (typeof entry !== 'number' || Number.isNaN(entry)) return;
    const track = Math.max(0, Math.min(tapeCount - 1, Math.trunc(entry)));
    if (seen.has(track)) return;
    seen.add(track);
    normalized.push(track);
  });

  if (normalized.length > 0) return normalized;
  return [Math.max(0, Math.min(tapeCount - 1, fallbackTrack))];
};

const normalizeHeadTrackMap = (
  settings: LegacyTmSettingsInput,
  headCount: number,
  tapeCount: number,
  fallbackHeadToTape: number[]
) => {
  const rawHeadTrackMap = Array.isArray(settings.headTrackMap) ? settings.headTrackMap : [];
  const legacySharedTrackPreset = settings.trackMode === true && headCount === 1;

  return Array.from({ length: headCount }, (_, headIndex) => {
    const fallbackTrack = fallbackHeadToTape[headIndex] ?? 0;
    if (legacySharedTrackPreset && headIndex === 0 && rawHeadTrackMap.length === 0) {
      return Array.from({ length: tapeCount }, (_, tapeIndex) => tapeIndex);
    }
    return normalizeTrackList(rawHeadTrackMap[headIndex], tapeCount, fallbackTrack);
  });
};

const normalizeSheetColumns = (value?: number | null) =>
  Math.max(
    TM_MIN_SHEET_COLUMNS,
    Math.min(TM_MAX_SHEET_COLUMNS, Number(value) || TM_DEFAULT_SHEET_COLUMNS)
  );

const getRuleArity = (settings: TmSettings) =>
  settings.headTrackMap.reduce((sum, tracks) => sum + tracks.length, 0);

const formatExtensionSummary = (settings: TmSettings) => {
  const parts: string[] = [];
  if (settings.sheetMode === 'sheet-2d') parts.push(`2D sheet ${settings.sheetColumns} cols`);
  if (settings.ramEnabled) parts.push('RAM jump');
  if (settings.stateStorageEnabled) parts.push('State storage');
  return parts.length > 0 ? parts.join(' · ') : 'Classic tape';
};

const buildTupleExample = (settings: TmSettings) => {
  const arity = getRuleArity(settings);
  const moveToken = settings.ramEnabled ? '@4' : settings.sheetMode === 'sheet-2d' ? 'D' : 'R';
  if (arity === 1) return `0->1,${moveToken}`;
  return `(${Array.from({ length: arity }, () => 'a').join(',')})->(${Array.from({ length: arity }, () => 'a').join(',')}),(${Array.from({ length: arity }, () => moveToken).join(',')})`;
};

const normalizeTmSettings = (settings: LegacyTmSettingsInput): TmSettings => {
  const legacySharedTrackPreset = settings.trackMode === true;
  const tapeCount = Math.max(
    1,
    Math.min(TM_MAX_TAPES, Number(settings.tapeCount) || TM_DEFAULT_TAPE_COUNT)
  );
  const headCount = Math.max(
    1,
    Math.min(TM_MAX_HEADS, legacySharedTrackPreset ? 1 : Number(settings.headCount) || TM_DEFAULT_HEAD_COUNT)
  );
  const fallback = buildDefaultHeadToTape(headCount, tapeCount);
  const rawHeadToTape = Array.isArray(settings.headToTape) ? settings.headToTape : [];
  const headToTape = Array.from({ length: headCount }, (_, index) => {
    const raw = rawHeadToTape[index];
    if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback[index];
    return Math.max(0, Math.min(tapeCount - 1, Math.trunc(raw)));
  });
  const headTrackMap = normalizeHeadTrackMap(settings, headCount, tapeCount, headToTape);

  return {
    tapeCount,
    headCount,
    headToTape: headTrackMap.map((tracks) => tracks[0] ?? 0),
    headTrackMap,
    inputMode: settings.inputMode === 'textbook' ? 'textbook' : 'machine',
    sheetMode: settings.sheetMode === 'sheet-2d' ? 'sheet-2d' : 'linear',
    sheetColumns: normalizeSheetColumns(settings.sheetColumns),
    ramEnabled: settings.ramEnabled === true,
    stateStorageEnabled: settings.stateStorageEnabled === true,
  };
};

const buildPreviewTapes = (
  inputString: string,
  tapeCount: number,
  inputMode: TmInputMode
) => {
  const rawInput = inputString.length > 0 ? inputString.split('').slice(0, 10) : [TM_BLANK];
  const baseTape = rawInput.length > 0 ? rawInput : [TM_BLANK];
  const tapes = Array.from({ length: tapeCount }, (_, index) => {
    if (inputMode === 'textbook') return [...baseTape];
    return index === 0 ? [...baseTape] : [TM_BLANK];
  });

  if (inputString.length > 10) {
    tapes.forEach((tape) => tape.push('...'));
  }

  return tapes;
};

const inputModeCopy = {
  textbook: {
    label: 'Textbook',
    description: 'คัดลอก input เดียวกันลงทุก tape ตั้งแต่เริ่มต้น',
  },
  machine: {
    label: 'Machine',
    description: 'ใส่ input ที่ Tape 1 เท่านั้น ส่วน tape อื่นเริ่มจาก blank',
  },
} satisfies Record<TmInputMode, { label: string; description: string }>;

export default function TmSettingsModal({
  open,
  onClose,
  onSave,
  initialSettings,
  inputString,
  isRunning,
}: TmSettingsModalProps) {
  const [draft, setDraft] = useState<TmSettings>(() => normalizeTmSettings(initialSettings));

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const previewTapes = buildPreviewTapes(inputString, draft.tapeCount, draft.inputMode);
    const mappingSummary = draft.headTrackMap
      .map((tracks, headIndex) => `H${headIndex + 1}->${tracks.map((tapeIndex) => `T${tapeIndex + 1}`).join('+')}`)
        .join(', ');
  const extensionSummary = formatExtensionSummary(draft);

  const updateDraft = (updates: Partial<TmSettings>) => {
    setDraft((prev) => normalizeTmSettings({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSave(normalizeTmSettings(draft));
  };

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          width: 760,
          maxWidth: '96vw',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 14,
          border: '1px solid #334155',
          background: '#0f172a',
          boxShadow: '0 25px 50px rgba(15, 23, 42, 0.65)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 18px 12px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>
              TM Tape and Head Setup
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              กำหนดจำนวน tape, จำนวนหัวอ่าน, การผูกหัวกับ tape และรูปแบบการวาง input ก่อนเริ่ม simulation
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>TAPES</span>
              <select
                value={draft.tapeCount}
                onChange={(event) => updateDraft({ tapeCount: Number(event.target.value) })}
                disabled={isRunning}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              >
                {Array.from({ length: TM_MAX_TAPES }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count} tape{count > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>HEADS</span>
              <select
                value={draft.headCount}
                onChange={(event) => updateDraft({ headCount: Number(event.target.value) })}
                disabled={isRunning}
                style={{
                  background: '#1e293b',
                  color: isRunning ? '#94a3b8' : '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              >
                {Array.from({ length: TM_MAX_HEADS }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count} head{count > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              border: '1px solid #1e293b',
              borderRadius: 12,
              background: '#071024',
              padding: 14,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>
              TM Extensions
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              เปิดโหมดขยาย TM สำหรับ matrix movement, random access memory และการฝังข้อมูลในชื่อ state
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>TOPOLOGY</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {[
                    { key: 'linear', title: 'Linear Tape', desc: 'TM มาตรฐาน เดิน L / R / S' },
                    { key: 'sheet-2d', title: '2D Sheet', desc: 'เพิ่ม U / D โดยมอง tape เป็น flattened matrix' },
                  ].map((option) => {
                    const selected = draft.sheetMode === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => updateDraft({ sheetMode: option.key as TmSettings['sheetMode'] })}
                        disabled={isRunning}
                        style={{
                          textAlign: 'left',
                          borderRadius: 10,
                          padding: '10px 12px',
                          border: selected ? '1px solid #0ea5e9' : '1px solid #334155',
                          background: selected ? 'rgba(14, 165, 233, 0.14)' : '#0f172a',
                          color: '#e2e8f0',
                          cursor: isRunning ? 'default' : 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{option.title}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {draft.sheetMode === 'sheet-2d' && (
                <label style={{ display: 'grid', gap: 6, maxWidth: 220 }}>
                  <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>SHEET COLUMNS</span>
                  <select
                    value={draft.sheetColumns}
                    onChange={(event) => updateDraft({ sheetColumns: Number(event.target.value) })}
                    disabled={isRunning}
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      fontSize: 13,
                    }}
                  >
                    {Array.from({ length: TM_MAX_SHEET_COLUMNS - TM_MIN_SHEET_COLUMNS + 1 }, (_, index) => TM_MIN_SHEET_COLUMNS + index).map((count) => (
                      <option key={count} value={count}>
                        {count} columns
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                {[
                  {
                    key: 'ramEnabled',
                    title: 'RAM Access',
                    desc: 'ใช้ move แบบ @12 เพื่อกระโดดไป address โดยตรง',
                  },
                  {
                    key: 'stateStorageEnabled',
                    title: 'Storage in State',
                    desc: 'โชว์ label suffix เช่น qCarry{a} เป็นหน่วยความจำเบาใน state',
                  },
                ].map((option) => {
                  const selected = draft[option.key as 'ramEnabled' | 'stateStorageEnabled'];
                  return (
                    <button
                      key={option.key}
                      onClick={() =>
                        updateDraft({
                          [option.key]: !selected,
                        } as Pick<TmSettings, 'ramEnabled' | 'stateStorageEnabled'>)
                      }
                      disabled={isRunning}
                      style={{
                        textAlign: 'left',
                        borderRadius: 10,
                        padding: '10px 12px',
                        border: selected ? '1px solid #22c55e' : '1px solid #334155',
                        background: selected ? 'rgba(34, 197, 94, 0.12)' : '#0f172a',
                        color: '#e2e8f0',
                        cursor: isRunning ? 'default' : 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{option.title}</span>
                        <span style={{ color: selected ? '#4ade80' : '#64748b', fontSize: 11, fontWeight: 700 }}>
                          {selected ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #1e293b',
              borderRadius: 12,
              background: '#071024',
              padding: 14,
            }}
          >
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              Input Seeding Mode
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(['textbook', 'machine'] as TmInputMode[]).map((mode) => {
                const selected = draft.inputMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => updateDraft({ inputMode: mode })}
                    disabled={isRunning}
                    style={{
                      textAlign: 'left',
                      borderRadius: 10,
                      padding: '10px 12px',
                      border: selected ? '1px solid #0ea5e9' : '1px solid #334155',
                      background: selected ? 'rgba(14, 165, 233, 0.14)' : '#0f172a',
                      color: '#e2e8f0',
                      cursor: isRunning ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {inputModeCopy[mode].label}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                      {inputModeCopy[mode].description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              border: '1px solid #1e293b',
              borderRadius: 12,
              background: '#071024',
              padding: 14,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>
              Head to Track Mapping
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              กำหนดว่าแต่ละหัวจะเข้าถึง track ไหนได้บ้าง โดย tuple ของ TM rule จะเรียงเป็นกลุ่มตามหัว แล้วตาม track ของหัวนั้น
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {Array.from({ length: draft.headCount }, (_, headIndex) => {
                const headTracks = draft.headTrackMap[headIndex] ?? [draft.headToTape[headIndex] ?? 0];
                return (
                  <div
                    key={`head-map-${headIndex}`}
                    style={{
                      display: 'grid',
                      gap: 8,
                      padding: 10,
                      borderRadius: 10,
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700 }}>
                      Head {headIndex + 1}
                    </span>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {Array.from({ length: draft.tapeCount }, (_, tapeIndex) => {
                        const checked = headTracks.includes(tapeIndex);
                        return (
                          <label
                            key={`head-${headIndex}-track-${tapeIndex}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 12 }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isRunning}
                              onChange={(event) => {
                                const nextHeadTrackMap = draft.headTrackMap.map((tracks) => [...tracks]);
                                const current = nextHeadTrackMap[headIndex] ?? [];
                                if (event.target.checked) {
                                  nextHeadTrackMap[headIndex] = Array.from(new Set([...current, tapeIndex])).sort((a, b) => a - b);
                                } else if (current.length > 1) {
                                  nextHeadTrackMap[headIndex] = current.filter((track) => track !== tapeIndex);
                                }
                                updateDraft({
                                  headTrackMap: nextHeadTrackMap,
                                });
                              }}
                            />
                            <span>Tape {tapeIndex + 1}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>
                      Order in tuple: {headTracks.map((track) => `T${track + 1}`).join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              border: '1px solid #1e293b',
              borderRadius: 12,
              background: '#071024',
              padding: 14,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>Current Layout Preview</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                  ทุกหัวเริ่มที่ตำแหน่ง 0 และ preview นี้แสดงสภาพก่อนกด Start
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#cbd5e1', fontSize: 12 }}>{mappingSummary}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                  {inputModeCopy[draft.inputMode].label} input seeding
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                  {extensionSummary}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {previewTapes.map((tape, tapeIndex) => {
                const headsHere = draft.headTrackMap
                  .map((tracks, headIndex) => ({ tracks, headIndex }))
                  .filter((entry) => entry.tracks.includes(tapeIndex))
                  .map((entry) => entry.headIndex);
                return (
                  <div key={`preview-tape-${tapeIndex}`} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                      Tape {tapeIndex + 1}
                    </div>
                    <div
                      style={
                        draft.sheetMode === 'sheet-2d'
                          ? {
                              display: 'grid',
                              gridTemplateColumns: `repeat(${draft.sheetColumns}, minmax(42px, 1fr))`,
                              gap: 6,
                            }
                          : { display: 'flex', gap: 6, flexWrap: 'wrap' }
                      }
                    >
                      {tape.map((symbol, cellIndex) => {
                        const atCellHeads = cellIndex === 0 ? headsHere : [];
                        const rowIndex = Math.floor(cellIndex / draft.sheetColumns);
                        const columnIndex = cellIndex % draft.sheetColumns;
                        return (
                          <div
                            key={`preview-cell-${tapeIndex}-${cellIndex}`}
                            style={{
                              minWidth: 42,
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <div style={{ minHeight: 18, fontSize: 10, color: '#22d3ee', fontWeight: 700 }}>
                              {atCellHeads.length > 0
                                ? atCellHeads.map((headIndex) => `H${headIndex + 1}`).join(', ')
                                : ' '}
                            </div>
                            <div
                              style={{
                                minWidth: 34,
                                padding: '6px 8px',
                                textAlign: 'center',
                                borderRadius: 8,
                                border: atCellHeads.length > 0 ? '2px solid #22d3ee' : '1px solid #334155',
                                background: atCellHeads.length > 0 ? '#082f49' : '#0f172a',
                                color: '#f8fafc',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {symbol}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              {draft.sheetMode === 'sheet-2d' ? `r${rowIndex}c${columnIndex}` : cellIndex}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: '#0f172a',
                border: '1px solid #1e293b',
                color: '#94a3b8',
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              ตัวอย่าง tuple เมื่อมี {draft.headCount} หัว และ mapping แบบ {mappingSummary}:
              <span style={{ color: '#e2e8f0', marginLeft: 6 }}>
                {buildTupleExample(draft)}
              </span>
              <div style={{ marginTop: 8 }}>
                {draft.headTrackMap.some((tracks) => tracks.length > 1) && 'Tuple slot จะเรียงเป็นกลุ่มตามหัว แล้วตาม track ของหัวนั้น'}
                {draft.headTrackMap.some((tracks) => tracks.length > 1) && (draft.sheetMode === 'sheet-2d' || draft.ramEnabled || draft.stateStorageEnabled) ? ' · ' : ''}
                {draft.sheetMode === 'sheet-2d' && '2D Sheet: ใช้ U / D เพื่อขยับตามแถวของ matrix'}
                {draft.sheetMode === 'sheet-2d' && (draft.ramEnabled || draft.stateStorageEnabled) ? ' · ' : ''}
                {draft.ramEnabled && 'RAM: ใช้ @addr เพื่อ jump ไป index ตรง ๆ'}
                {draft.ramEnabled && draft.stateStorageEnabled ? ' · ' : ''}
                {draft.stateStorageEnabled && 'State Storage: suffix เช่น qCarry{a} จะถูกโชว์เป็นหน่วยความจำของ state'}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 18px 18px',
            borderTop: '1px solid #1e293b',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isRunning}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #0284c7',
              background: isRunning ? '#1e293b' : '#0ea5e9',
              color: isRunning ? '#64748b' : '#f8fafc',
              cursor: isRunning ? 'default' : 'pointer',
              fontFamily: 'inherit',
              fontWeight: 700,
            }}
          >
            Save TM Setup
          </button>
        </div>
      </div>
    </div>
  );
}
