'use client';
import React from 'react';
import type { Node } from '@xyflow/react';
import type { PromptState } from './types';

interface PromptModalProps {
  promptState: PromptState;
  promptValue: string;
  setPromptValue: (v: string) => void;
  onSubmit: (value: string | null) => void;
  onClose: () => void;
  mode: string;
  nodes: Node[];
}

export const PromptModal: React.FC<PromptModalProps> = ({
  promptState,
  promptValue,
  setPromptValue,
  onSubmit,
  onClose,
  mode,
  nodes,
}) => {
  if (!promptState.open) return null;

  const currentNode = nodes.find(n => n.id === promptState.nodeId);
  const currentVal = currentNode
    ? (currentNode.data.isStart && currentNode.data.isAccept ? '4'
      : currentNode.data.isStart ? '2'
      : currentNode.data.isAccept ? '3' : '1')
    : '1';

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.6)' }} onClick={onClose} />
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
                    onClick={() => onSubmit(opt.value)}
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
              <button onClick={onClose} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <input
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(promptValue); }}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #475569', background: '#071428', color: '#fff', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                {mode !== 'DFA' && (promptState.kind === 'edgeLabel' || promptState.kind === 'editLabel') && (
                  <button
                    onClick={() => setPromptValue(promptValue + 'ε')}
                    style={{ background: '#1d4ed8', color: '#dbeafe', border: '1px solid #3b82f6', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                    title="Insert epsilon"
                  >
                    ε
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => onSubmit(promptValue)} style={{ background: '#0ea5e9', color: '#04293a', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>OK</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
