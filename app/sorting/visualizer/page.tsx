'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Home,
  PlayCircle,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
} from 'lucide-react';
import type { ArrayElement, SortAlgorithm, SortStep } from '../types';
import { ALGORITHM_INFO, COMPARISON_SORTS, NON_COMPARISON_SORTS } from '../algorithms-info';
import { generateRandomArray, parseInputArray } from '../utils';
import { bubbleSort, insertionSort, mergeSort, quickSort, selectionSort } from '../algorithms';

const EMPTY_STATS = {
  comparisons: 0,
  swaps: 0,
  accesses: 0,
  timeElapsed: 0,
};

function cloneArray(array: ArrayElement[]): ArrayElement[] {
  return array.map((item) => ({ ...item }));
}

function normalizeArray(array: ArrayElement[]): ArrayElement[] {
  return array.map((item, index) => ({
    ...item,
    originalIndex: typeof item.originalIndex === 'number' ? item.originalIndex : index,
    state: 'default',
  }));
}

export default function SortingVisualizerPage() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SortAlgorithm>('bubble-sort');
  const [arraySize, setArraySize] = useState(20);
  const [customInput, setCustomInput] = useState('');
  const [array, setArray] = useState<ArrayElement[]>([]);
  const [sortHistory, setSortHistory] = useState<SortStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [statistics, setStatistics] = useState(EMPTY_STATS);

  const timerRef = useRef<number | null>(null);
  const sourceArrayRef = useRef<ArrayElement[]>([]);
  const historyRef = useRef<SortStep[]>([]);
  const currentStepRef = useRef(-1);
  const isRunningRef = useRef(false);
  const speedRef = useRef(50);
  const runStartedAtRef = useRef(0);
  const elapsedBeforeRunRef = useRef(0);

  const setStep = (value: number) => {
    currentStepRef.current = value;
    setCurrentStep(value);
  };

  const clearPlaybackTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetRunState = (restoreSourceArray: boolean) => {
    clearPlaybackTimer();
    isRunningRef.current = false;
    setIsRunning(false);
    setStep(-1);
    setSortHistory([]);
    historyRef.current = [];
    elapsedBeforeRunRef.current = 0;
    setStatistics(EMPTY_STATS);

    if (restoreSourceArray) {
      setArray(cloneArray(sourceArrayRef.current));
    }
  };

  const initializeSimulation = (nextArray: ArrayElement[]) => {
    const normalized = normalizeArray(nextArray);
    sourceArrayRef.current = cloneArray(normalized);
    setArray(cloneArray(normalized));
    resetRunState(false);
  };

  const getSortGenerator = (algorithm: SortAlgorithm, arr: ArrayElement[]) => {
    switch (algorithm) {
      case 'bubble-sort':
        return bubbleSort(arr);
      case 'selection-sort':
        return selectionSort(arr);
      case 'insertion-sort':
        return insertionSort(arr);
      case 'merge-sort':
        return mergeSort(arr);
      case 'quick-sort':
        return quickSort(arr);
      default:
        return bubbleSort(arr);
    }
  };

  const buildSortHistory = (): SortStep[] => {
    if (historyRef.current.length > 0) {
      return historyRef.current;
    }

    if (sourceArrayRef.current.length === 0) {
      return [];
    }

    const steps = Array.from(getSortGenerator(selectedAlgorithm, cloneArray(sourceArrayRef.current)));
    historyRef.current = steps;
    setSortHistory(steps);
    return steps;
  };

  const applyStep = (steps: SortStep[], stepIndex: number, elapsedMs?: number) => {
    const step = steps[stepIndex];
    if (!step) {
      return;
    }

    setArray(cloneArray(step.array));
    setStep(stepIndex);
    setStatistics((prev) => ({
      comparisons: step.comparisons,
      swaps: step.swaps,
      accesses: step.accesses,
      timeElapsed: elapsedMs ?? prev.timeElapsed,
    }));
  };

  const finishRun = () => {
    clearPlaybackTimer();

    const elapsed = elapsedBeforeRunRef.current + (Date.now() - runStartedAtRef.current);
    elapsedBeforeRunRef.current = elapsed;
    isRunningRef.current = false;
    setIsRunning(false);
    setStatistics((prev) => ({ ...prev, timeElapsed: elapsed }));
  };

  const playNextStep = (steps: SortStep[]) => {
    if (!isRunningRef.current) {
      return;
    }

    const nextStep = currentStepRef.current + 1;

    if (nextStep >= steps.length) {
      finishRun();
      return;
    }

    const elapsed = elapsedBeforeRunRef.current + (Date.now() - runStartedAtRef.current);
    applyStep(steps, nextStep, elapsed);

    const delay = Math.max(20, 1020 - speedRef.current * 10);
    timerRef.current = window.setTimeout(() => {
      playNextStep(steps);
    }, delay);
  };

  const handleGenerateRandom = () => {
    initializeSimulation(generateRandomArray(arraySize, 5, 100));
  };

  const handleCustomInput = () => {
    const parsed = parseInputArray(customInput);
    if (!parsed) {
      alert('Invalid input! Please enter comma-separated numbers (e.g., 5,3,8,1,9)');
      return;
    }

    setArraySize(parsed.length);
    initializeSimulation(parsed);
  };

  const handleRun = () => {
    if (isRunningRef.current) {
      return;
    }

    const steps = buildSortHistory();
    if (steps.length === 0) {
      return;
    }

    if (currentStepRef.current >= steps.length - 1) {
      setArray(cloneArray(sourceArrayRef.current));
      setStep(-1);
      elapsedBeforeRunRef.current = 0;
      setStatistics(EMPTY_STATS);
    }

    isRunningRef.current = true;
    setIsRunning(true);
    runStartedAtRef.current = Date.now();
    playNextStep(steps);
  };

  const handleStop = () => {
    if (!isRunningRef.current) {
      return;
    }

    clearPlaybackTimer();
    const elapsed = elapsedBeforeRunRef.current + (Date.now() - runStartedAtRef.current);
    elapsedBeforeRunRef.current = elapsed;
    isRunningRef.current = false;
    setIsRunning(false);
    setStatistics((prev) => ({ ...prev, timeElapsed: elapsed }));
  };

  const handleNextStep = () => {
    if (isRunningRef.current) {
      return;
    }

    const steps = buildSortHistory();
    if (steps.length === 0) {
      return;
    }

    const nextStep = Math.min(currentStepRef.current + 1, steps.length - 1);
    if (nextStep === currentStepRef.current) {
      return;
    }

    applyStep(steps, nextStep);
  };

  const handlePrevStep = () => {
    if (isRunningRef.current || currentStepRef.current < 0) {
      return;
    }

    if (currentStepRef.current === 0) {
      setArray(cloneArray(sourceArrayRef.current));
      setStep(-1);
      setStatistics((prev) => ({
        ...prev,
        comparisons: 0,
        swaps: 0,
        accesses: 0,
      }));
      return;
    }

    const steps = historyRef.current.length > 0 ? historyRef.current : buildSortHistory();
    applyStep(steps, currentStepRef.current - 1);
  };

  const handleReset = () => {
    if (sourceArrayRef.current.length === 0) {
      return;
    }

    resetRunState(true);
  };

  const getBarColor = (state: ArrayElement['state']) => {
    switch (state) {
      case 'comparing':
        return '#facc15';
      case 'swapping':
        return '#f87171';
      case 'sorted':
        return '#4ade80';
      case 'pivot':
        return '#a78bfa';
      case 'current':
        return '#22d3ee';
      default:
        return '#60a5fa';
    }
  };

  useEffect(() => {
    initializeSimulation(generateRandomArray(20, 5, 100));
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (sourceArrayRef.current.length === 0) {
      return;
    }

    resetRunState(true);
  }, [selectedAlgorithm]);

  useEffect(() => {
    return () => {
      clearPlaybackTimer();
    };
  }, []);

  const maxValue = Math.max(...array.map((item) => item.value), 1);
  const currentMessage =
    currentStep >= 0 && sortHistory[currentStep]
      ? sortHistory[currentStep].message
      : 'Press Run to animate or use Next Step / Prev Step for manual walkthrough.';

  const canStepBack = !isRunning && currentStep >= 0;
  const canStepForward = !isRunning && (currentStep < sortHistory.length - 1 || sortHistory.length === 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-orange-500/10 blur-3xl rounded-full" />
      </div>

      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Sorting Visualizer</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Akawatmor
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 md:gap-10 relative z-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/sorting"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sorting
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Main
          </Link>
        </div>

        <header className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(251,146,60,0.25)]">
            Sorting Algorithm Visualizer
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Run the full animation or stop and inspect each step manually.
          </p>
        </header>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Algorithm</label>
              <select
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value as SortAlgorithm)}
                disabled={isRunning}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <optgroup label="Comparison Sorts">
                  {COMPARISON_SORTS.map((algo) => (
                    <option key={algo} value={algo}>
                      {ALGORITHM_INFO[algo].name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Non-Comparison Sorts">
                  {NON_COMPARISON_SORTS.map((algo) => (
                    <option key={algo} value={algo}>
                      {ALGORITHM_INFO[algo].name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Array Size: {arraySize}</label>
              <input
                type="range"
                min="5"
                max="100"
                value={arraySize}
                onChange={(e) => setArraySize(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Speed: {speed}%</label>
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-orange-400"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Custom Input (comma-separated)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., 64, 34, 25, 12, 22, 11, 90"
                disabled={isRunning}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleCustomInput}
                disabled={isRunning}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-violet-500/40 bg-violet-500/20 text-violet-200 text-sm font-semibold hover:bg-violet-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Load Input
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateRandom}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-500/40 bg-sky-500/20 text-sky-200 text-sm font-semibold hover:bg-sky-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Shuffle className="w-4 h-4" />
              Random
            </button>

            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning || array.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" />
              Run
            </button>

            <button
              type="button"
              onClick={handleStop}
              disabled={!isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-200 text-sm font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>

            <button
              type="button"
              onClick={handlePrevStep}
              disabled={!canStepBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/60 text-slate-200 text-sm font-semibold hover:bg-slate-700/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-4 h-4" />
              Prev Step
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              disabled={!canStepForward}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/60 text-slate-200 text-sm font-semibold hover:bg-slate-700/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-4 h-4" />
              Next Step
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={array.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/40 bg-rose-500/20 text-rose-200 text-sm font-semibold hover:bg-rose-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <div className="ml-auto text-xs text-slate-400 border border-slate-700 rounded-md px-3 py-2 bg-slate-950/60">
              Step: {currentStep + 1 < 0 ? 0 : currentStep + 1} / {sortHistory.length}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="h-72 sm:h-80 flex items-end justify-center gap-[2px] rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-3 overflow-hidden">
            {array.map((element, index) => (
              <div
                key={`${element.originalIndex}-${index}`}
                style={{
                  width: `${Math.max(100 / Math.max(array.length, 1) - 0.5, 2)}%`,
                  height: `${(element.value / maxValue) * 100}%`,
                  background: getBarColor(element.state),
                }}
                className="rounded-t-sm transition-all duration-200 flex items-end justify-center"
              >
                {array.length <= 30 && (
                  <span className="text-[10px] sm:text-xs font-semibold text-white pb-1">{element.value}</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 text-center">
            {currentMessage}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-5">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Comparisons</div>
                <div className="text-2xl font-bold text-cyan-300">{statistics.comparisons}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Swaps</div>
                <div className="text-2xl font-bold text-rose-300">{statistics.swaps}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Array Accesses</div>
                <div className="text-2xl font-bold text-violet-300">{statistics.accesses}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Elapsed</div>
                <div className="text-2xl font-bold text-emerald-300">{statistics.timeElapsed} ms</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-3">{ALGORITHM_INFO[selectedAlgorithm].name}</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">{ALGORITHM_INFO[selectedAlgorithm].description}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Best</span>
                <span className="font-mono text-emerald-300">{ALGORITHM_INFO[selectedAlgorithm].timeComplexity.best}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Average</span>
                <span className="font-mono text-amber-300">{ALGORITHM_INFO[selectedAlgorithm].timeComplexity.average}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Worst</span>
                <span className="font-mono text-rose-300">{ALGORITHM_INFO[selectedAlgorithm].timeComplexity.worst}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Space</span>
                <span className="font-mono text-cyan-300">{ALGORITHM_INFO[selectedAlgorithm].spaceComplexity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stable</span>
                <span className={ALGORITHM_INFO[selectedAlgorithm].stable ? 'text-emerald-300' : 'text-rose-300'}>
                  {ALGORITHM_INFO[selectedAlgorithm].stable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm" style={{ background: '#60a5fa' }} />
              Default
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm" style={{ background: '#facc15' }} />
              Comparing
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm" style={{ background: '#f87171' }} />
              Swapping
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm" style={{ background: '#4ade80' }} />
              Sorted
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm" style={{ background: '#22d3ee' }} />
              Current
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm" style={{ background: '#a78bfa' }} />
              Pivot
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}