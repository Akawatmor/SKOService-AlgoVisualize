'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { SortAlgorithm, ArrayElement, SortStep, VisualizerState } from '../types';
import { ALGORITHM_INFO, ALL_ALGORITHMS, COMPARISON_SORTS, NON_COMPARISON_SORTS } from '../algorithms-info';
import { generateRandomArray, parseInputArray, createArrayElement } from '../utils';
import { bubbleSort, selectionSort, insertionSort, mergeSort, quickSort } from '../algorithms';

export default function SortingVisualizerPage() {
  // ─── State ───
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SortAlgorithm>('bubble-sort');
  const [arraySize, setArraySize] = useState(20);
  const [customInput, setCustomInput] = useState('');
  const [array, setArray] = useState<ArrayElement[]>([]);
  const [sortHistory, setSortHistory] = useState<SortStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [statistics, setStatistics] = useState({
    comparisons: 0,
    swaps: 0,
    accesses: 0,
    timeElapsed: 0,
  });

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // ─── Initialize array ───
  useEffect(() => {
    handleGenerateRandom();
  }, []);

  // ─── Handlers ───
  const handleGenerateRandom = () => {
    const newArray = generateRandomArray(arraySize, 5, 100);
    setArray(newArray);
    resetVisualization();
  };

  const handleCustomInput = () => {
    const parsed = parseInputArray(customInput);
    if (parsed) {
      setArray(parsed);
      setArraySize(parsed.length);
      resetVisualization();
    } else {
      alert('Invalid input! Please enter comma-separated numbers (e.g., 5,3,8,1,9)');
    }
  };

  const resetVisualization = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    setSortHistory([]);
    setStatistics({ comparisons: 0, swaps: 0, accesses: 0, timeElapsed: 0 });
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const getSortGenerator = (algorithm: SortAlgorithm, arr: ArrayElement[]) => {
    switch (algorithm) {
      case 'bubble-sort': return bubbleSort(arr);
      case 'selection-sort': return selectionSort(arr);
      case 'insertion-sort': return insertionSort(arr);
      case 'merge-sort': return mergeSort(arr);
      case 'quick-sort': return quickSort(arr);
      default: return bubbleSort(arr); // Fallback
    }
  };

  const handleSort = async () => {
    if (isRunning) {
      setIsPaused(!isPaused);
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();

    const generator = getSortGenerator(selectedAlgorithm, array);
    const steps: SortStep[] = [];

    // Collect all steps
    for (const step of generator) {
      steps.push(step);
    }

    setSortHistory(steps);

    // Animate through steps
    let step = 0;
    const animate = () => {
      if (step < steps.length && !isPaused) {
        const currentStepData = steps[step];
        setArray(currentStepData.array);
        setStatistics({
          comparisons: currentStepData.comparisons,
          swaps: currentStepData.swaps,
          accesses: currentStepData.accesses,
          timeElapsed: Date.now() - startTimeRef.current,
        });
        setCurrentStep(step);
        step++;

        const delay = Math.max(10, 1000 - speed * 10);
        animationRef.current = window.setTimeout(() => {
          animate();
        }, delay);
      } else if (step >= steps.length) {
        setIsRunning(false);
        setStatistics(prev => ({ ...prev, timeElapsed: Date.now() - startTimeRef.current }));
      }
    };

    animate();
  };

  const handleReset = () => {
    resetVisualization();
    setArray(prev => prev.map(el => ({ ...el, state: 'default' })));
  };

  const getBarColor = (state: ArrayElement['state']) => {
    switch (state) {
      case 'comparing': return '#facc15';
      case 'swapping': return '#f87171';
      case 'sorted': return '#4ade80';
      case 'pivot': return '#a78bfa';
      case 'current': return '#22d3ee';
      default: return '#60a5fa';
    }
  };

  const maxValue = Math.max(...array.map(el => el.value), 1);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
              Sorting Algorithm Visualizer
            </h1>
            <p style={{ color: '#94a3b8' }}>Compare and visualize different sorting algorithms</p>
          </div>
          <Link
            href="/"
            style={{
              padding: '0.5rem 1rem',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            ← Home
          </Link>
        </div>

        {/* Controls */}
        <div style={{
          background: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {/* Algorithm Selection */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                Algorithm
              </label>
              <select
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value as SortAlgorithm)}
                disabled={isRunning}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                }}
              >
                <optgroup label="Comparison Sorts">
                  {COMPARISON_SORTS.map(algo => (
                    <option key={algo} value={algo}>
                      {ALGORITHM_INFO[algo].name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Non-Comparison Sorts">
                  {NON_COMPARISON_SORTS.map(algo => (
                    <option key={algo} value={algo}>
                      {ALGORITHM_INFO[algo].name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Array Size */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                Array Size: {arraySize}
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={arraySize}
                onChange={(e) => setArraySize(Number(e.target.value))}
                disabled={isRunning}
                style={{ width: '100%' }}
              />
            </div>

            {/* Speed */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                Speed: {speed}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Custom Input */}
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              Custom Input (comma-separated numbers)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., 64, 34, 25, 12, 22, 11, 90"
                disabled={isRunning}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                }}
              />
              <button
                onClick={handleCustomInput}
                disabled={isRunning}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#7c3aed',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  opacity: isRunning ? 0.5 : 1,
                }}
              >
                Load
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateRandom}
              disabled={isRunning}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#0ea5e9',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                opacity: isRunning ? 0.5 : 1,
              }}
            >
              🎲 Generate Random
            </button>
            <button
              onClick={handleSort}
              style={{
                padding: '0.6rem 1.5rem',
                background: isRunning ? (isPaused ? '#10b981' : '#f59e0b') : '#10b981',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              {isRunning ? (isPaused ? '▶ Resume' : '⏸ Pause') : '▶ Sort'}
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Visualization Area */}
        <div style={{
          background: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '2rem',
          marginBottom: '2rem',
          minHeight: '400px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            height: '350px',
            gap: array.length > 50 ? '1px' : '2px',
          }}>
            {array.map((element, index) => (
              <div
                key={`${element.originalIndex}-${index}`}
                style={{
                  width: `${Math.max(100 / array.length - 0.5, 2)}%`,
                  height: `${(element.value / maxValue) * 100}%`,
                  background: getBarColor(element.state),
                  borderRadius: '2px 2px 0 0',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {array.length <= 30 && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#fff',
                    fontWeight: 600,
                    marginBottom: '4px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}>
                    {element.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Current Message */}
          {sortHistory[currentStep] && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#0f172a',
              borderRadius: '6px',
              border: '1px solid #334155',
              color: '#cbd5e1',
              textAlign: 'center',
              fontSize: '0.95rem',
            }}>
              {sortHistory[currentStep].message}
            </div>
          )}
        </div>

        {/* Statistics & Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Statistics */}
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
          }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
              Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Comparisons</div>
                <div style={{ color: '#22d3ee', fontSize: '1.5rem', fontWeight: 700 }}>{statistics.comparisons}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Swaps</div>
                <div style={{ color: '#f87171', fontSize: '1.5rem', fontWeight: 700 }}>{statistics.swaps}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Array Accesses</div>
                <div style={{ color: '#a78bfa', fontSize: '1.5rem', fontWeight: 700 }}>{statistics.accesses}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Time Elapsed</div>
                <div style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 700 }}>{statistics.timeElapsed}ms</div>
              </div>
            </div>
          </div>

          {/* Algorithm Info */}
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
          }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
              {ALGORITHM_INFO[selectedAlgorithm].name}
            </h3>
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '0.75rem' }}>{ALGORITHM_INFO[selectedAlgorithm].description}</p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Best: </span>
                  <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{ALGORITHM_INFO[selectedAlgorithm].timeComplexity.best}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Average: </span>
                  <span style={{ color: '#facc15', fontFamily: 'monospace' }}>{ALGORITHM_INFO[selectedAlgorithm].timeComplexity.average}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Worst: </span>
                  <span style={{ color: '#f87171', fontFamily: 'monospace' }}>{ALGORITHM_INFO[selectedAlgorithm].timeComplexity.worst}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Space: </span>
                  <span style={{ color: '#22d3ee', fontFamily: 'monospace' }}>{ALGORITHM_INFO[selectedAlgorithm].spaceComplexity}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Stable: </span>
                  <span style={{ color: ALGORITHM_INFO[selectedAlgorithm].stable ? '#4ade80' : '#f87171' }}>
                    {ALGORITHM_INFO[selectedAlgorithm].stable ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{
          marginTop: '1.5rem',
          background: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '1rem 1.5rem',
        }}>
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 20, height: 20, background: '#60a5fa', borderRadius: 3 }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Default</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 20, height: 20, background: '#facc15', borderRadius: 3 }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Comparing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 20, height: 20, background: '#f87171', borderRadius: 3 }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Swapping</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 20, height: 20, background: '#4ade80', borderRadius: 3 }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Sorted</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 20, height: 20, background: '#22d3ee', borderRadius: 3 }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Current</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 20, height: 20, background: '#a78bfa', borderRadius: 3 }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Pivot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
