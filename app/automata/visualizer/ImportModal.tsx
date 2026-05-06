'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { resolveAutomataImportUrl } from './shareUrl';

/* ────────── Types ────────── */

interface ExampleEntry {
  file: string;
  name: string;
  type: string;
  description: string;
  states: number;
  transitions: number;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (jsonString: string) => Promise<void>;
  isRunning: boolean;
}

type Tab = 'local' | 'url' | 'examples';

/* ────────── Badge color helper ────────── */

const TYPE_COLORS: Record<string, string> = {
  DFA: '#22d3ee',
  NFA: '#a78bfa',
  'ε-NFA': '#f472b6',
  DPDA: '#fb923c',
  NPDA: '#facc15',
  DTM: '#4ade80',
  NTM: '#34d399',
  LBA: '#2dd4bf',
};

function typeBadgeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#94a3b8';
}

/* ────────── Component ────────── */

export default function ImportModal({ open, onClose, onImport, isRunning }: ImportModalProps) {
  const [tab, setTab] = useState<Tab>('local');
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [examples, setExamples] = useState<ExampleEntry[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(false);
  const [exFilter, setExFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  /* ── Fetch example catalog when tab switches ── */
  useEffect(() => {
    if (tab === 'examples' && examples.length === 0 && !examplesLoading) {
      setExamplesLoading(true);
      fetch('/examples/index.json')
        .then(r => r.json())
        .then((data: ExampleEntry[]) => setExamples(data))
        .catch(() => setExamples([]))
        .finally(() => setExamplesLoading(false));
    }
  }, [tab, examples.length, examplesLoading]);

  /* ── Keyboard: Escape to close ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* ── Drag-and-drop handlers ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.json')) return;
    const text = await file.text();
    onClose();
    await onImport(text);
  }, [onImport, onClose]);

  /* ── File input handler ── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    e.target.value = '';
    onClose();
    await onImport(text);
  };

  /* ── URL fetch handler ── */
  const handleUrlImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setUrlLoading(true);
    try {
      const resolvedUrl = resolveAutomataImportUrl(trimmed, window.location.protocol);
      if (resolvedUrl.status !== 'ready') {
        throw new Error(resolvedUrl.errorMessage);
      }

      if (resolvedUrl.wasUpgradedToHttps) {
        setUrl(resolvedUrl.importUrl);
      }

      const res = await fetch(resolvedUrl.importUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      JSON.parse(text); // validate
      onClose();
      await onImport(text);
    } catch {
      // Show inline error – we avoid importing swal here to keep the component independent
      alert('Failed to fetch or parse JSON from the given URL. On HTTPS pages, HTTP URLs are upgraded to HTTPS automatically to avoid mixed content.');
    } finally {
      setUrlLoading(false);
    }
  };

  /* ── Example click handler ── */
  const handleExampleClick = async (entry: ExampleEntry) => {
    try {
      const res = await fetch(`/examples/${entry.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      onClose();
      await onImport(text);
    } catch {
      alert('Failed to load example file.');
    }
  };

  if (!open) return null;

  /* ── Filtered examples ── */
  const filteredExamples = exFilter
    ? examples.filter(ex => ex.name.toLowerCase().includes(exFilter.toLowerCase()) || ex.type.toLowerCase().includes(exFilter.toLowerCase()) || ex.description.toLowerCase().includes(exFilter.toLowerCase()))
    : examples;

  /* ── Tab button style helper ── */
  const tabBtn = (t: Tab, label: string, icon: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      style={{
        flex: 1,
        padding: '10px 0',
        border: 'none',
        borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
        background: tab === t ? '#1e293b' : 'transparent',
        color: tab === t ? '#e2e8f0' : '#94a3b8',
        fontWeight: tab === t ? 700 : 500,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}
    >
      <div style={{
        background: '#0f172a', border: '1px solid #334155', borderRadius: 12,
        width: 580, maxWidth: '95vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0', fontWeight: 700 }}>📂 Import Automaton</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginTop: 10, flexShrink: 0 }}>
          {tabBtn('local', 'Local File', '💻')}
          {tabBtn('url', 'From URL', '🌐')}
          {tabBtn('examples', 'Examples', '📚')}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>

          {/* ── Local File Tab ── */}
          {tab === 'local' && (
            <div>
              {/* Drag-and-drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isRunning && fileRef.current?.click()}
                style={{
                  border: dragging ? '2px dashed #6366f1' : '2px dashed #334155',
                  borderRadius: 10,
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: isRunning ? 'default' : 'pointer',
                  background: dragging ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'all 0.2s',
                  minHeight: 160,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                }}
              >
                <div style={{ fontSize: 40, lineHeight: 1 }}>{dragging ? '📥' : '📄'}</div>
                <div style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
                  {dragging ? 'Drop JSON file here' : 'Drag & drop a JSON file here'}
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>or click to browse files</div>
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} disabled={isRunning} />
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#475569', textAlign: 'center' }}>
                Accepts <code style={{ color: '#94a3b8' }}>.json</code> files exported from this tool or compatible formats.
              </div>
            </div>
          )}

          {/* ── URL Tab ── */}
          {tab === 'url' && (
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Enter a URL to a JSON file:
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUrlImport(); }}
                  placeholder="https://example.com/automaton.json"
                  style={{
                    flex: 1,
                    background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                    padding: '10px 12px', color: '#e2e8f0', fontSize: 13,
                    outline: 'none', fontFamily: 'monospace',
                  }}
                  disabled={urlLoading || isRunning}
                />
                <button
                  onClick={handleUrlImport}
                  disabled={urlLoading || isRunning || !url.trim()}
                  style={{
                    background: urlLoading || isRunning || !url.trim() ? '#1e293b' : '#6366f1',
                    color: urlLoading || isRunning || !url.trim() ? '#64748b' : 'white',
                    border: 'none', borderRadius: 6, padding: '0 16px',
                    cursor: urlLoading || isRunning || !url.trim() ? 'default' : 'pointer',
                    fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {urlLoading ? '⏳ Loading…' : '⬇ Fetch'}
                </button>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: '#1e293b', borderRadius: 6, border: '1px solid #21314a' }}>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>💡 Tips</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
                  <li>Use a direct link to a raw JSON file</li>
                  <li>For GitHub files, use the <em>Raw</em> URL</li>
                  <li>On HTTPS sites, pasted HTTP URLs are upgraded to HTTPS automatically</li>
                  <li>The URL must return valid JSON with nodes &amp; edges</li>
                  <li>CORS must be enabled on the server</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Examples Catalog Tab ── */}
          {tab === 'examples' && (
            <div>
              {/* Search / filter */}
              <input
                type="text"
                value={exFilter}
                onChange={e => setExFilter(e.target.value)}
                placeholder="🔍  Search examples…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                  padding: '8px 12px', color: '#e2e8f0', fontSize: 13,
                  outline: 'none', fontFamily: 'monospace', marginBottom: 12,
                }}
              />

              {examplesLoading ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>⏳ Loading examples…</div>
              ) : filteredExamples.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 13 }}>No examples found.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {filteredExamples.map((ex) => (
                    <button
                      key={ex.file}
                      onClick={() => handleExampleClick(ex)}
                      disabled={isRunning}
                      style={{
                        background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                        padding: 14, textAlign: 'left',
                        cursor: isRunning ? 'default' : 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                        display: 'flex', flexDirection: 'column', gap: 6,
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!isRunning) { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.background = '#1e2d4a'; } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.background = '#1e293b'; }}
                    >
                      {/* Badge + Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: typeBadgeColor(ex.type) + '22',
                          color: typeBadgeColor(ex.type),
                          flexShrink: 0,
                        }}>
                          {ex.type}
                        </span>
                        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex.name.replace(/^[^:]+:\s*/, '')}
                        </span>
                      </div>
                      {/* Description */}
                      <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ex.description}
                      </div>
                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        <span>⊙ {ex.states} states</span>
                        <span>→ {ex.transitions} transitions</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
