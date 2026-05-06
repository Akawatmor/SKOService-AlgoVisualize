'use client';

import React, { useEffect, useState } from 'react';

import { PDA_MAX_STACKS } from './constants';
import type { PdaSettings } from './types';
import {
  formatPdaExtensionSummary,
  getDefaultPdaRuleLabel,
  getPdaStoreCount,
  normalizePdaSettings,
} from './utils';

interface PdaSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: PdaSettings) => void;
  initialSettings: PdaSettings;
  isRunning: boolean;
}

type PdaPreset = 'classic' | 'two-stack' | 'multi-stack' | 'nested-stack' | 'queue';

const getPresetFromSettings = (settings: PdaSettings): PdaPreset => {
  const normalized = normalizePdaSettings(settings);
  if (normalized.storageModel === 'queue') return 'queue';
  if (normalized.storageModel === 'nested-stack') return 'nested-stack';
  if (normalized.stackCount === 2) return 'two-stack';
  if (normalized.stackCount > 2) return 'multi-stack';
  return 'classic';
};

const buildSettingsFromPreset = (
  preset: PdaPreset,
  stackCount: number
): PdaSettings => {
  switch (preset) {
    case 'queue':
      return normalizePdaSettings({ variant: 'queue', storageModel: 'queue' });
    case 'nested-stack':
      return normalizePdaSettings({
        variant: 'nested-stack',
        storageModel: 'nested-stack',
      });
    case 'two-stack':
      return normalizePdaSettings({
        variant: 'multi-stack',
        storageModel: 'stack',
        stackCount: 2,
      });
    case 'multi-stack':
      return normalizePdaSettings({
        variant: 'multi-stack',
        storageModel: 'stack',
        stackCount: Math.max(3, stackCount),
      });
    default:
      return normalizePdaSettings({
        variant: 'classic',
        storageModel: 'stack',
        stackCount: 1,
      });
  }
};

const buildExample = (settings: PdaSettings) => {
  const normalized = normalizePdaSettings(settings);
  if (normalized.storageModel === 'queue') {
    return 'a,Z->AZ';
  }
  if (normalized.storageModel === 'nested-stack') {
    return 'a,[AZ]->[BZ]Z';
  }
  const storeCount = getPdaStoreCount(normalized);
  if (storeCount <= 1) {
    return 'a,Z->AZ';
  }
  const pops = Array.from({ length: storeCount }, (_, index) =>
    index === 0 ? 'Z' : 'ε'
  ).join(',');
  const pushes = Array.from({ length: storeCount }, (_, index) =>
    index === 0 ? 'AZ' : 'ε'
  ).join(',');
  return `a,(${pops})->(${pushes})`;
};

const presetCards: Array<{
  key: PdaPreset;
  title: string;
  description: string;
}> = [
  {
    key: 'classic',
    title: 'Classic PDA',
    description: 'สแตกเดียวแบบมาตรฐาน เหมาะกับงาน PDA ปกติ',
  },
  {
    key: 'two-stack',
    title: 'Two-Stack PDA',
    description: 'เพิ่ม Stack 2 กอง แบบ 2-PDA โดยใช้ tuple syntax',
  },
  {
    key: 'multi-stack',
    title: 'k-Stack PDA',
    description: 'กำหนดจำนวน stack ได้สูงสุด 20 กอง',
  },
  {
    key: 'nested-stack',
    title: 'Nested Stack',
    description: 'รองรับ frame token แบบ [AZ] สำหรับ nested stack automata',
  },
  {
    key: 'queue',
    title: 'Queue Automata',
    description: 'ใช้คิว 1 ชุด โดย pop อ่านจากด้านหน้า และ push เติมด้านท้าย',
  },
];

export default function PdaSettingsModal({
  open,
  onClose,
  onSave,
  initialSettings,
  isRunning,
}: PdaSettingsModalProps) {
  const [draft, setDraft] = useState<PdaSettings>(() =>
    normalizePdaSettings(initialSettings)
  );

  useEffect(() => {
    if (!open) return;
    setDraft(normalizePdaSettings(initialSettings));
  }, [initialSettings, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const preset = getPresetFromSettings(draft);
  const example = buildExample(draft);
  const summary = formatPdaExtensionSummary(draft);

  const selectPreset = (nextPreset: PdaPreset) => {
    setDraft((prev) =>
      buildSettingsFromPreset(nextPreset, prev.stackCount)
    );
  };

  const updateStackCount = (value: number) => {
    setDraft((prev) =>
      buildSettingsFromPreset('multi-stack', value)
    );
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
              PDA Extension Setup
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              เลือกรูปแบบ storage ของ PDA ก่อนสร้างหรือแก้ transition labels
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
              gap: 10,
            }}
          >
            {presetCards.map((card) => {
              const selected = preset === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => selectPreset(card.key)}
                  disabled={isRunning}
                  style={{
                    textAlign: 'left',
                    borderRadius: 12,
                    border: selected ? '1px solid #38bdf8' : '1px solid #334155',
                    background: selected ? 'rgba(14, 165, 233, 0.12)' : '#111827',
                    color: '#e2e8f0',
                    padding: 14,
                    cursor: isRunning ? 'default' : 'pointer',
                    display: 'grid',
                    gap: 6,
                    opacity: isRunning ? 0.7 : 1,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{card.title}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                    {card.description}
                  </span>
                </button>
              );
            })}
          </div>

          {preset === 'multi-stack' && (
            <div
              style={{
                border: '1px solid #1e293b',
                borderRadius: 12,
                background: '#071024',
                padding: 14,
                display: 'grid',
                gap: 8,
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                  STACK COUNT
                </span>
                <select
                  value={draft.stackCount}
                  onChange={(event) => updateStackCount(Number(event.target.value))}
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
                  {Array.from({ length: PDA_MAX_STACKS - 2 }, (_, index) => index + 3).map((count) => (
                    <option key={count} value={count}>
                      {count} stacks
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

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
              Summary
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              {summary}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>
              Rule example: <span style={{ color: '#e2e8f0' }}>{example}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>
              Default seed rule: <span style={{ color: '#e2e8f0' }}>{getDefaultPdaRuleLabel(draft)}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>
              {draft.storageModel === 'queue'
                ? 'Queue mode uses the same rule surface as PDA, but reads from the queue front and appends to the rear.'
                : draft.storageModel === 'nested-stack'
                ? 'Nested mode treats bracketed tokens like [AZ] as a single movable frame on the stack.'
                : getPdaStoreCount(draft) > 1
                ? 'Each rule must provide one pop slot and one push slot per stack using tuple syntax.'
                : 'Classic PDA keeps the existing single-stack label syntax and behavior.'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '0 18px 18px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(normalizePdaSettings(draft))}
            style={{
              background: '#0ea5e9',
              color: '#082f49',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Save Setup
          </button>
        </div>
      </div>
    </div>
  );
}
