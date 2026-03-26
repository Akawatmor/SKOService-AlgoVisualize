'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { TreeType, TreeNode, TreeStep } from './types';
import { TREE_INFO, TREE_TYPES } from './tree-info';
import { createNode, parseInputArray, calculatePositions, getTreeStatistics } from './utils';
import { bstInsert, bstSearch, avlInsert, redBlackInsert } from './operations';

export default function TreeVisualizerPage() {
  // ─── State ───
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

  // ─── Tree Operations ───
  const getInsertGenerator = (treeType: TreeType, root: TreeNode | null, value: number) => {
    switch (treeType) {
      case 'bst':
      case 'binary':
        return bstInsert(root, value);
      case 'avl':
        return avlInsert(root, value);
      case 'red-black':
        return redBlackInsert(root, value);
      default:
        return bstInsert(root, value);
    }
  };

  const handleInsert = async () => {
    const value = parseInt(inputValue);
    if (isNaN(value)) {
      alert('Please enter a valid number');
      return;
    }

    setIsAnimating(true);
    const generator = getInsertGenerator(selectedTreeType, root, value);
    const steps: TreeStep[] = [];

    for (const step of generator) {
      steps.push(step);
    }

    setHistory(steps);
    
    // Animate through steps
    let step = 0;
    const animate = () => {
      if (step < steps.length) {
        const currentStepData = steps[step];
        setRoot(currentStepData.tree);
        setCurrentStep(step);
        step++;

        const delay = Math.max(100, 1500 - speed * 10);
        animationRef.current = window.setTimeout(() => {
          animate();
        }, delay);
      } else {
        setIsAnimating(false);
        if (steps.length > 0) {
          setRoot(steps[steps.length - 1].tree);
        }
      }
    };

    animate();
    setInputValue('');
  };

  const handleSearch = async () => {
    const value = parseInt(searchValue);
    if (isNaN(value)) {
      alert('Please enter a valid number');
      return;
    }

    if (!root) {
      alert('Tree is empty!');
      return;
    }

    setIsAnimating(true);
    const generator = bstSearch(root, value);
    const steps: TreeStep[] = [];

    for (const step of generator) {
      steps.push(step);
    }

    setHistory(steps);
    
    let step = 0;
    const animate = () => {
      if (step < steps.length) {
        const currentStepData = steps[step];
        setRoot(currentStepData.tree);
        setCurrentStep(step);
        step++;

        const delay = Math.max(100, 1500 - speed * 10);
        animationRef.current = window.setTimeout(() => {
          animate();
        }, delay);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
    setSearchValue('');
  };

  const handleBuildFromArray = () => {
    const values = parseInputArray(customInput);
    if (!values) {
      alert('Invalid input! Please enter comma-separated numbers.');
      return;
    }

    setRoot(null);
    setHistory([]);
    setCurrentStep(0);

    // Insert all values sequentially
    let currentRoot = null;
    for (const value of values) {
      const generator = getInsertGenerator(selectedTreeType, currentRoot, value);
      let lastStep = null;
      for (const step of generator) {
        lastStep = step;
      }
      if (lastStep) {
        currentRoot = lastStep.tree;
      }
    }

    setRoot(currentRoot);
    setCustomInput('');
  };

  const handleClear = () => {
    setRoot(null);
    setHistory([]);
    setCurrentStep(0);
    setIsAnimating(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
  };

  // ─── Drawing ───
  useEffect(() => {
    if (!canvasRef.current || !root) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate positions
    calculatePositions(root, canvas.width / 2, 50, 400);

    // Draw tree
    drawTree(ctx, root);
  }, [root]);

  const drawTree = (ctx: CanvasRenderingContext2D, node: TreeNode | null) => {
    if (!node) return;

    // Draw edges first
    if (node.left && node.x !== undefined && node.y !== undefined && node.left.x !== undefined && node.left.y !== undefined) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.left.x, node.left.y);
      ctx.stroke();
      drawTree(ctx, node.left);
    }

    if (node.right && node.x !== undefined && node.y !== undefined && node.right.x !== undefined && node.right.y !== undefined) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.right.x, node.right.y);
      ctx.stroke();
      drawTree(ctx, node.right);
    }

    // Draw node
    if (node.x !== undefined && node.y !== undefined) {
      const radius = 25;
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      
      // Color based on state and type
      if (node.state === 'comparing') {
        ctx.fillStyle = '#facc15';
      } else if (node.state === 'found') {
        ctx.fillStyle = '#4ade80';
      } else if (node.state === 'inserting') {
        ctx.fillStyle = '#f87171';
      } else {
        // Red-Black tree coloring
        if (selectedTreeType === 'red-black') {
          ctx.fillStyle = node.color === 'red' ? '#ef4444' : '#1e293b';
        } else {
          ctx.fillStyle = '#3b82f6';
        }
      }
      
      ctx.fill();
      
      // Border
      ctx.strokeStyle = selectedTreeType === 'red-black' && node.color === 'black' ? '#cbd5e1' : '#1e293b';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Value text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.value.toString(), node.x, node.y);
      
      // AVL: Show balance factor
      if (selectedTreeType === 'avl' && node.balanceFactor !== undefined) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText(`BF:${node.balanceFactor}`, node.x, node.y + radius + 12);
      }
    }
  };

  const statistics = getTreeStatistics(root);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
              Tree Structure Visualizer
            </h1>
            <p style={{ color: '#94a3b8' }}>Visualize Binary Trees, BST, AVL, and Red-Black Trees</p>
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
          {/* Tree Type Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              Tree Type
            </label>
            <select
              value={selectedTreeType}
              onChange={(e) => setSelectedTreeType(e.target.value as TreeType)}
              disabled={isAnimating}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#e2e8f0',
              }}
            >
              {TREE_TYPES.map(type => (
                <option key={type} value={type}>
                  {TREE_INFO[type].name}
                </option>
              ))}
            </select>
          </div>

          {/* Operations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Insert */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Insert Value
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInsert()}
                  placeholder="Enter number"
                  disabled={isAnimating}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                  }}
                />
                <button
                  onClick={handleInsert}
                  disabled={isAnimating}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: isAnimating ? 0.5 : 1,
                  }}
                >
                  Insert
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Search Value
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter number"
                  disabled={isAnimating}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                  }}
                />
                <button
                  onClick={handleSearch}
                  disabled={isAnimating}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: isAnimating ? 0.5 : 1,
                  }}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Speed */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Animation Speed: {speed}%
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

          {/* Build from Array */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              Build from Array (comma-separated)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., 50, 30, 70, 20, 40, 60, 80"
                disabled={isAnimating}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                }}
              />
              <button
                onClick={handleBuildFromArray}
                disabled={isAnimating}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#7c3aed',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: isAnimating ? 0.5 : 1,
                }}
              >
                Build
              </button>
              <button
                onClick={handleClear}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div style={{
          background: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '2rem',
          marginBottom: '2rem',
          minHeight: '500px',
        }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            style={{
              width: '100%',
              height: 'auto',
              background: '#0f172a',
              borderRadius: '4px',
            }}
          />
          
          {/* Current Message */}
          {history[currentStep] && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#0f172a',
              borderRadius: '6px',
              border: '1px solid #334155',
              color: '#cbd5e1',
              textAlign: 'center',
            }}>
              {history[currentStep].message}
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
              Tree Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nodes</div>
                <div style={{ color: '#22d3ee', fontSize: '1.5rem', fontWeight: 700 }}>{statistics.nodeCount}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Height</div>
                <div style={{ color: '#a78bfa', fontSize: '1.5rem', fontWeight: 700 }}>{statistics.height}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Balanced</div>
                <div style={{ color: statistics.isBalanced ? '#4ade80' : '#f87171', fontSize: '1.5rem', fontWeight: 700 }}>
                  {statistics.isBalanced ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Range</div>
                <div style={{ color: '#facc15', fontSize: '1.2rem', fontWeight: 700 }}>
                  {statistics.minValue ?? '-'} to {statistics.maxValue ?? '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Tree Info */}
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '1.5rem',
          }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
              {TREE_INFO[selectedTreeType].name}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {TREE_INFO[selectedTreeType].description}
            </p>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              <div><strong>Search:</strong> {TREE_INFO[selectedTreeType].complexities.search}</div>
              <div><strong>Insert:</strong> {TREE_INFO[selectedTreeType].complexities.insert}</div>
              <div><strong>Delete:</strong> {TREE_INFO[selectedTreeType].complexities.delete}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
