'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { PdaConfig, TmConfig } from '../visualizer/types';

function InstantaneousDescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pdaConfigs, setPdaConfigs] = useState<Array<PdaConfig & { input: string; index: number }>>([]);
  const [tmConfigs, setTmConfigs] = useState<TmConfig[]>([]);
  const [mode, setMode] = useState<string>('');
  const [inputString, setInputString] = useState<string>('');
  const [acceptMode, setAcceptMode] = useState<string>('final-state');

  useEffect(() => {
    try {
      const modeParam = searchParams.get('mode') || '';
      const configsParam = searchParams.get('configs');
      const inputParam = searchParams.get('input') || '';
      const acceptModeParam = searchParams.get('acceptMode') || 'final-state';

      setMode(modeParam);
      setInputString(inputParam);
      setAcceptMode(acceptModeParam);

      if (configsParam) {
        const decoded = JSON.parse(decodeURIComponent(configsParam));
        if (modeParam.includes('PDA')) {
          setPdaConfigs(decoded);
        } else if (modeParam.includes('TM')) {
          setTmConfigs(decoded);
        }
      }
    } catch (error) {
      console.error('Failed to parse configurations:', error);
    }
  }, [searchParams]);

  const isPDA = mode.includes('PDA');
  const isTM = mode.includes('TM');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
      color: '#e2e8f0'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
              Instantaneous Description
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              {mode} • Input: <span style={{ color: '#22d3ee', fontFamily: 'monospace' }}>{inputString || '(empty)'}</span>
              {isPDA && acceptMode && (
                <span> • Accept by: <span style={{ color: '#a78bfa' }}>{acceptMode}</span></span>
              )}
            </p>
          </div>
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

        {/* PDA Instantaneous Descriptions */}
        {isPDA && pdaConfigs.length > 0 && (
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#cbd5e1' }}>
              Computation Sequence
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Each step shows: (state, remaining input, stack content)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pdaConfigs.map((config, idx) => {
                const { state, stack, input, index } = config;
                const remainingInput = input.substring(index);
                const stackDisplay = stack.length === 0 ? 'ε' : stack.slice().reverse().join('');
                
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    {/* Step number */}
                    <div style={{
                      minWidth: '60px',
                      padding: '0.5rem',
                      background: '#0f172a',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      fontWeight: 600
                    }}>
                      Step {idx}
                    </div>

                    {/* ID Display */}
                    <div style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ color: '#94a3b8' }}>(</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>{state}</span>
                      <span style={{ color: '#94a3b8' }}>,</span>
                      <span style={{ color: '#22d3ee' }}>{remainingInput || 'ε'}</span>
                      <span style={{ color: '#94a3b8' }}>,</span>
                      <span style={{ color: '#facc15' }}>{stackDisplay}</span>
                      <span style={{ color: '#94a3b8' }}>)</span>
                    </div>

                    {/* Arrow */}
                    {idx < pdaConfigs.length - 1 && (
                      <div style={{ color: '#64748b', fontSize: '1.25rem', fontWeight: 600 }}>
                        ⊢
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {pdaConfigs.length > 0 && (
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
                  • Total steps: {pdaConfigs.length}<br />
                  • Initial state: <span style={{ color: '#4ade80' }}>{pdaConfigs[0]?.state}</span><br />
                  • Final state: <span style={{ color: '#4ade80' }}>{pdaConfigs[pdaConfigs.length - 1]?.state}</span><br />
                  • Final stack: <span style={{ color: '#facc15' }}>
                    {pdaConfigs[pdaConfigs.length - 1]?.stack.length === 0 
                      ? 'ε (empty)' 
                      : pdaConfigs[pdaConfigs.length - 1]?.stack.slice().reverse().join('')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TM Instantaneous Descriptions */}
        {isTM && tmConfigs.length > 0 && (
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#cbd5e1' }}>
              Computation Sequence
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Each step shows: (state, tape content with head position)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tmConfigs.map((config, idx) => {
                const { state, tapes, heads } = config;
                
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    {/* Step number */}
                    <div style={{
                      minWidth: '60px',
                      padding: '0.5rem',
                      background: '#0f172a',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                      fontWeight: 600
                    }}>
                      Step {idx}
                    </div>

                    {/* ID Display */}
                    <div style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.95rem'
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: '#94a3b8' }}>State: </span>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>{state}</span>
                      </div>
                      {tapes.map((tape, tapeIdx) => (
                        <div key={tapeIdx} style={{ marginTop: '0.25rem' }}>
                          <span style={{ color: '#94a3b8' }}>Tape {tapeIdx + 1}: </span>
                          {tape.map((symbol, pos) => (
                            <span
                              key={pos}
                              style={{
                                padding: '0.125rem 0.25rem',
                                marginRight: '0.125rem',
                                background: heads[tapeIdx] === pos ? '#7c3aed' : 'transparent',
                                color: heads[tapeIdx] === pos ? '#fff' : '#22d3ee',
                                borderRadius: '2px',
                                fontWeight: heads[tapeIdx] === pos ? 600 : 400
                              }}
                            >
                              {symbol}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Arrow */}
                    {idx < tmConfigs.length - 1 && (
                      <div style={{ color: '#64748b', fontSize: '1.25rem', fontWeight: 600 }}>
                        ⊢
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {pdaConfigs.length === 0 && tmConfigs.length === 0 && (
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
              Run a simulation in the visualizer first, then click "View ID" to see the instantaneous descriptions.
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
