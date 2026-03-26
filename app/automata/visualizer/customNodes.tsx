'use client';
import React from 'react';
import {
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  type Node,
} from '@xyflow/react';
import type { StateNodeProps, TextNoteNodeData, FrameBoxNodeData } from './types';

// ─── Inline-Color text renderer ───
// Format: [[#f59e0b|highlight text]]
export const renderNoteTextWithInlineColors = (text: string, defaultColor: string): React.ReactNode[] => {
  const regex = /\[\[(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\|([\s\S]*?)\]\]/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      out.push(
        <span key={`plain-${last}`} style={{ color: defaultColor }}>
          {text.slice(last, match.index)}
        </span>
      );
    }
    out.push(
      <span key={`color-${match.index}`} style={{ color: match[1], fontWeight: 700 }}>
        {match[2]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    out.push(
      <span key={`plain-tail-${last}`} style={{ color: defaultColor }}>
        {text.slice(last)}
      </span>
    );
  }
  return out;
};

// ─── State Node (circle) ───
const HANDLE_STYLE = { width: 12, height: 12, background: '#94a3b8' };
const INVISIBLE_HANDLE: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  background: 'transparent', border: 'none', opacity: 0, pointerEvents: 'none',
};

export const StateNode: React.FC<StateNodeProps> = ({ data, isConnectable, selected }) => {
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
  if (data.isActive) {
    borderColor = '#fb923c';
    backgroundColor = '#431407';
    boxShadow = '0 0 20px #fb923c';
    textColor = '#fdba74';
  }
  if (selected) {
    boxShadow = (boxShadow !== 'none' ? boxShadow + ', ' : '') + '0 0 0 3px #22d3ee, 0 0 10px #22d3ee99';
  }

  return (
    <div
      style={{
        width: 60, height: 60, borderRadius: '50%',
        background: backgroundColor,
        border: `${borderWidth} ${borderStyle} ${borderColor}`,
        boxShadow,
        color: textColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div style={{ pointerEvents: 'none', userSelect: 'none' }}>{data.label}</div>

      {/* Primary connectable handles: t, r, b, l */}
      <Handle type="source" position={Position.Top}    id="t" isConnectable={isConnectable} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  id="r" isConnectable={isConnectable} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={isConnectable} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left}   id="l" isConnectable={isConnectable} style={HANDLE_STYLE} />

      {/* Invisible sub-handles for edge-routing separation (2 source + 2 target per direction) */}
      <Handle type="source" position={Position.Top}    id="t-s1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'32%' }} />
      <Handle type="source" position={Position.Top}    id="t-s2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'42%' }} />
      <Handle type="target" position={Position.Top}    id="t-t1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'58%' }} />
      <Handle type="target" position={Position.Top}    id="t-t2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'68%' }} />
      <Handle type="source" position={Position.Right}  id="r-s1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'32%' }} />
      <Handle type="source" position={Position.Right}  id="r-s2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'42%' }} />
      <Handle type="target" position={Position.Right}  id="r-t1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'58%' }} />
      <Handle type="target" position={Position.Right}  id="r-t2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'68%' }} />
      <Handle type="source" position={Position.Bottom} id="b-s1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'32%' }} />
      <Handle type="source" position={Position.Bottom} id="b-s2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'42%' }} />
      <Handle type="target" position={Position.Bottom} id="b-t1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'58%' }} />
      <Handle type="target" position={Position.Bottom} id="b-t2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, left:'68%' }} />
      <Handle type="source" position={Position.Left}   id="l-s1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'32%' }} />
      <Handle type="source" position={Position.Left}   id="l-s2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'42%' }} />
      <Handle type="target" position={Position.Left}   id="l-t1" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'58%' }} />
      <Handle type="target" position={Position.Left}   id="l-t2" isConnectable={false} style={{ ...INVISIBLE_HANDLE, top:'68%' }} />
    </div>
  );
};

// ─── Text Note Node ───
export const TextNoteNode: React.FC<{ id: string; data: TextNoteNodeData; selected?: boolean }> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  return (
    <div
      style={{
        width: Math.max(180, Number(data.width) || 240),
        height: Math.max(90, Number(data.height) || 120),
        background: data.bgColor || '#1f2937',
        color: data.textColor || '#e5e7eb',
        border: `${Math.max(1, Number(data.borderWidth) || 1)}px solid ${data.borderColor || '#64748b'}`,
        borderRadius: 10,
        padding: '10px 12px',
        boxShadow: selected ? '0 0 0 3px #22d3ee66' : '0 4px 18px rgba(2,6,23,0.35)',
        cursor: 'pointer',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.45,
        fontSize: 13,
      }}
      title="Double-click to edit note"
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={180}
        minHeight={90}
        lineStyle={{ borderColor: '#22d3ee' }}
        handleStyle={{ width: 8, height: 8, borderRadius: 3, border: '1px solid #0f172a', background: '#22d3ee' }}
        onResizeEnd={(_, params) => {
          setNodes((nds) => nds.map((n) => n.id === id
            ? { ...n, data: { ...(n.data as TextNoteNodeData), width: Math.round(params.width), height: Math.round(params.height) } }
            : n
          ));
        }}
      />
      {renderNoteTextWithInlineColors(data.text || '', data.textColor || '#e5e7eb')}
    </div>
  );
};

// ─── Frame Box Node ───
export const FrameBoxNode: React.FC<{ id: string; data: FrameBoxNodeData; selected?: boolean }> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
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
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        boxShadow: selected ? '0 0 0 3px #22d3ee66' : 'none',
      }}
      title="Double-click to edit frame"
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={120}
        minHeight={90}
        lineStyle={{ borderColor: '#22d3ee' }}
        handleStyle={{ width: 8, height: 8, borderRadius: 3, border: '1px solid #0f172a', background: '#22d3ee' }}
        onResizeEnd={(_, params) => {
          setNodes((nds: Node[]) => nds.map((n) => n.id === id
            ? { ...n, data: { ...(n.data as FrameBoxNodeData), width: Math.round(params.width), height: Math.round(params.height) } }
            : n
          ));
        }}
      />
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        background: 'rgba(15,23,42,0.75)',
        border: `1px solid ${data.borderColor || '#f59e0b'}`,
        borderRadius: 6,
        padding: '2px 8px',
      }}>
        {data.title || 'Thompson Rule'}
      </div>
    </div>
  );
};

// ─── Registered node types map ───
export const nodeTypes = {
  stateNode: StateNode,
  textNoteNode: TextNoteNode,
  frameBoxNode: FrameBoxNode,
};
