'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Plus, RotateCcw, Search } from 'lucide-react';
import type { TreeNode, TreeStep, TreeType } from './types';
import { TREE_INFO, TREE_TYPES } from './tree-info';
import { calculatePositions, getTreeStatistics, parseInputArray } from './utils';
import { avlInsert, bstInsert, bstSearch, redBlackInsert } from './operations';

export default function TreeVisualizerPage() {
  const [selectedTreeType, setSelectedTreeType] = useState<TreeType>('bst');
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [history, setHistory] = useState<TreeStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [speed, setSpeed] = useState(50);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const clearAnimation = () => {
    if (animationRef.current !== null) {
      window.clearTimeout(animationRef.current);
      animationRef.current = null;
    }
  };

  const getInsertGenerator = (treeType: TreeType, currentRoot: TreeNode | null, value: number) => {
    switch (treeType) {
      case 'bst':
      case 'binary':
        return bstInsert(currentRoot, value);
      case 'avl':
        return avlInsert(currentRoot, value);
      case 'red-black':
        return redBlackInsert(currentRoot, value);
      default:
        return bstInsert(currentRoot, value);
    }
  };

  const runSteps = (steps: TreeStep[], onFinish?: () => void) => {
    if (steps.length === 0) {
      setIsAnimating(false);
      onFinish?.();
      return;
    }

    setHistory(steps);
    setCurrentStep(0);
    setIsAnimating(true);

    let stepIndex = 0;

    const animate = () => {
      if (stepIndex < steps.length) {
        const currentStepData = steps[stepIndex];
        setRoot(currentStepData.tree);
        setCurrentStep(stepIndex);
        stepIndex += 1;

        const delay = Math.max(100, 1500 - speed * 10);
        animationRef.current = window.setTimeout(() => {
          animate();
        }, delay);
      } else {
        clearAnimation();
        setIsAnimating(false);
        onFinish?.();
      }
    };

    animate();
  };

  const handleInsert = () => {
    const value = Number.parseInt(inputValue, 10);
    if (Number.isNaN(value)) {
      alert('Please enter a valid number');
      return;
    }

    const steps = Array.from(getInsertGenerator(selectedTreeType, root, value));
    runSteps(steps, () => {
      if (steps.length > 0) {
        setRoot(steps[steps.length - 1].tree);
      }
    });
    setInputValue('');
  };

  const handleSearch = () => {
    const value = Number.parseInt(searchValue, 10);
    if (Number.isNaN(value)) {
      alert('Please enter a valid number');
      return;
    }

    if (!root) {
      alert('Tree is empty!');
      return;
    }

    const steps = Array.from(bstSearch(root, value));
    runSteps(steps);
    setSearchValue('');
  };

  const handleBuildFromArray = () => {
    const values = parseInputArray(customInput);
    if (!values) {
      alert('Invalid input! Please enter comma-separated numbers.');
      return;
    }

    clearAnimation();
    setIsAnimating(false);

    let currentRoot: TreeNode | null = null;
    for (const value of values) {
      const generator = getInsertGenerator(selectedTreeType, currentRoot, value);
      let lastStep: TreeStep | null = null;
      for (const step of generator) {
        lastStep = step;
      }
      if (lastStep) {
        currentRoot = lastStep.tree;
      }
    }

    setRoot(currentRoot);
    setHistory([]);
    setCurrentStep(0);
    setCustomInput('');
  };

  const handleClear = () => {
    clearAnimation();
    setRoot(null);
    setHistory([]);
    setCurrentStep(0);
    setIsAnimating(false);
  };

  useEffect(() => {
    return () => {
      clearAnimation();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!root) {
      return;
    }

    calculatePositions(root, canvas.width / 2, 50, 400);
    drawTree(ctx, root, selectedTreeType);
  }, [root, selectedTreeType]);

  const statistics = getTreeStatistics(root);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full" />
      </div>

      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Tree Visualizer</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            Akawatmor
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 md:gap-10 relative z-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(16,185,129,0.25)]">
            Tree Structure Visualizer
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Visualize Binary Tree, BST, AVL, and Red-Black Tree operations in real time.
          </p>
        </header>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Tree Type</label>
              <select
                value={selectedTreeType}
                onChange={(e) => setSelectedTreeType(e.target.value as TreeType)}
                disabled={isAnimating}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {TREE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TREE_INFO[type].name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Insert Value</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
                  placeholder="Enter number"
                  disabled={isAnimating}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleInsert}
                  disabled={isAnimating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Insert
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Search Value</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter number"
                  disabled={isAnimating}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isAnimating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-500/40 bg-sky-500/20 text-sky-200 text-sm font-semibold hover:bg-sky-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Animation Speed: {speed}%</label>
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Build from Array (comma-separated)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g., 50, 30, 70, 20, 40, 60, 80"
                  disabled={isAnimating}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleBuildFromArray}
                  disabled={isAnimating}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-violet-500/40 bg-violet-500/20 text-violet-200 text-sm font-semibold hover:bg-violet-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Build
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-rose-500/40 bg-rose-500/20 text-rose-200 text-sm font-semibold hover:bg-rose-500/30 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            {isAnimating ? 'Animating operation...' : 'Ready'}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-h-[420px]">
            <canvas
              ref={canvasRef}
              width={1200}
              height={600}
              className="w-full h-auto rounded-lg"
            />
            {!root && (
              <div className="text-center text-sm text-slate-500 mt-4">
                Tree is empty. Insert a value or build from an input array.
              </div>
            )}
          </div>

          {history[currentStep] && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 text-center">
              {history[currentStep].message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-5">Tree Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Nodes</div>
                <div className="text-2xl font-bold text-cyan-300">{statistics.nodeCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Height</div>
                <div className="text-2xl font-bold text-violet-300">{statistics.height}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Balanced</div>
                <div className={statistics.isBalanced ? 'text-2xl font-bold text-emerald-300' : 'text-2xl font-bold text-rose-300'}>
                  {statistics.isBalanced ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Range</div>
                <div className="text-xl font-bold text-amber-300">
                  {statistics.minValue ?? '-'} to {statistics.maxValue ?? '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-3">{TREE_INFO[selectedTreeType].name}</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">{TREE_INFO[selectedTreeType].description}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Search</span>
                <span className="font-mono text-cyan-300">{TREE_INFO[selectedTreeType].complexities.search}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Insert</span>
                <span className="font-mono text-emerald-300">{TREE_INFO[selectedTreeType].complexities.insert}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delete</span>
                <span className="font-mono text-rose-300">{TREE_INFO[selectedTreeType].complexities.delete}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-500 mb-2">Properties</div>
              <ul className="space-y-1 text-sm text-slate-300">
                {TREE_INFO[selectedTreeType].properties.map((property) => (
                  <li key={property}>• {property}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function drawTree(ctx: CanvasRenderingContext2D, node: TreeNode | null, treeType: TreeType): void {
  if (!node) {
    return;
  }

  if (
    node.left &&
    node.x !== undefined &&
    node.y !== undefined &&
    node.left.x !== undefined &&
    node.left.y !== undefined
  ) {
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(node.x, node.y);
    ctx.lineTo(node.left.x, node.left.y);
    ctx.stroke();
    drawTree(ctx, node.left, treeType);
  }

  if (
    node.right &&
    node.x !== undefined &&
    node.y !== undefined &&
    node.right.x !== undefined &&
    node.right.y !== undefined
  ) {
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(node.x, node.y);
    ctx.lineTo(node.right.x, node.right.y);
    ctx.stroke();
    drawTree(ctx, node.right, treeType);
  }

  if (node.x === undefined || node.y === undefined) {
    return;
  }

  const radius = 24;

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

  if (node.state === 'comparing') {
    ctx.fillStyle = '#facc15';
  } else if (node.state === 'found') {
    ctx.fillStyle = '#4ade80';
  } else if (node.state === 'inserting') {
    ctx.fillStyle = '#f87171';
  } else if (treeType === 'red-black') {
    ctx.fillStyle = node.color === 'red' ? '#ef4444' : '#1e293b';
  } else {
    ctx.fillStyle = '#3b82f6';
  }

  ctx.fill();
  ctx.strokeStyle = treeType === 'red-black' && node.color === 'black' ? '#cbd5e1' : '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.value.toString(), node.x, node.y);

  if (treeType === 'avl' && node.balanceFactor !== undefined) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`BF:${node.balanceFactor}`, node.x, node.y + radius + 12);
  }
}