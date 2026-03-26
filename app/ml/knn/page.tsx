'use client';

import Link from 'next/link';
import { ArrowLeft, Home, Play, RotateCcw, Plus, Trash2, Target } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

interface DataPoint {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface ClassificationResult {
  point: { x: number; y: number };
  predictedLabel: string;
  neighbors: { point: DataPoint; distance: number }[];
  avgDistances: Record<string, number>;
}

// Euclidean distance
function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// K-NN classification using average distance
function classifyKNN(
  testPoint: { x: number; y: number },
  trainingData: DataPoint[],
  k: number
): ClassificationResult {
  // Calculate distances to all training points
  const distances = trainingData.map(point => ({
    point,
    distance: euclideanDistance(testPoint, point),
  }));

  // Sort by distance and get k nearest neighbors
  distances.sort((a, b) => a.distance - b.distance);
  const neighbors = distances.slice(0, k);

  // Calculate average distance per class
  const classSums: Record<string, { sum: number; count: number }> = {};
  for (const neighbor of neighbors) {
    const label = neighbor.point.label;
    if (!classSums[label]) {
      classSums[label] = { sum: 0, count: 0 };
    }
    classSums[label].sum += neighbor.distance;
    classSums[label].count += 1;
  }

  const avgDistances: Record<string, number> = {};
  for (const [label, data] of Object.entries(classSums)) {
    avgDistances[label] = data.sum / data.count;
  }

  // Find class with minimum average distance
  let predictedLabel = '';
  let minAvgDistance = Infinity;
  for (const [label, avgDist] of Object.entries(avgDistances)) {
    if (avgDist < minAvgDistance) {
      minAvgDistance = avgDist;
      predictedLabel = label;
    }
  }

  return {
    point: testPoint,
    predictedLabel,
    neighbors,
    avgDistances,
  };
}

// Default training data
const DEFAULT_DATA: DataPoint[] = [
  { id: '1', x: 2, y: 3, label: 'A' },
  { id: '2', x: 3, y: 2, label: 'A' },
  { id: '3', x: 3, y: 4, label: 'A' },
  { id: '4', x: 5, y: 3, label: 'A' },
  { id: '5', x: 7, y: 8, label: 'B' },
  { id: '6', x: 8, y: 7, label: 'B' },
  { id: '7', x: 8, y: 9, label: 'B' },
  { id: '8', x: 9, y: 8, label: 'B' },
  { id: '9', x: 4, y: 7, label: 'C' },
  { id: '10', x: 5, y: 8, label: 'C' },
  { id: '11', x: 3, y: 8, label: 'C' },
  { id: '12', x: 4, y: 9, label: 'C' },
];

const COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  A: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', fill: '#22d3ee' },
  B: { bg: 'bg-violet-500/20', border: 'border-violet-500', text: 'text-violet-400', fill: '#a78bfa' },
  C: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', fill: '#fb923c' },
  D: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', fill: '#4ade80' },
};

export default function KNNPage() {
  const [trainingData, setTrainingData] = useState<DataPoint[]>(DEFAULT_DATA);
  const [k, setK] = useState(3);
  const [testX, setTestX] = useState(5);
  const [testY, setTestY] = useState(5);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [newPointLabel, setNewPointLabel] = useState('A');

  const uniqueLabels = useMemo(() => {
    return [...new Set(trainingData.map(d => d.label))].sort();
  }, [trainingData]);

  const classify = useCallback(() => {
    const res = classifyKNN({ x: testX, y: testY }, trainingData, k);
    setResult(res);
  }, [testX, testY, trainingData, k]);

  const addPoint = () => {
    const newId = (Math.max(...trainingData.map(d => parseInt(d.id))) + 1).toString();
    setTrainingData([...trainingData, {
      id: newId,
      x: Math.round(Math.random() * 10),
      y: Math.round(Math.random() * 10),
      label: newPointLabel,
    }]);
  };

  const removePoint = (id: string) => {
    setTrainingData(trainingData.filter(d => d.id !== id));
  };

  const resetData = () => {
    setTrainingData(DEFAULT_DATA);
    setResult(null);
    setK(3);
    setTestX(5);
    setTestY(5);
  };

  // Calculate bounds for visualization
  const bounds = useMemo(() => {
    const allX = [...trainingData.map(d => d.x), testX];
    const allY = [...trainingData.map(d => d.y), testY];
    return {
      minX: Math.min(...allX) - 1,
      maxX: Math.max(...allX) + 1,
      minY: Math.min(...allY) - 1,
      maxY: Math.max(...allY) + 1,
    };
  }, [trainingData, testX, testY]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-orange-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">K-NN Classifier</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent">Akawatmor</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">
        {/* Back buttons */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/ml" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to ML
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            <Home className="w-4 h-4" />
            Main
          </Link>
        </div>

        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/30 rounded-full">
            <Target className="w-4 h-4" />
            Interactive Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent pb-2">
            K-NN Classifier
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Classify data points using K-Nearest Neighbors with average distance calculation.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Configuration</h2>
            
            {/* K Value */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-2">
                K (Neighbors): {k}
              </label>
              <input
                type="range"
                min="1"
                max={Math.min(10, trainingData.length)}
                value={k}
                onChange={e => setK(parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            {/* Test Point */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Test Point X</label>
                <input
                  type="number"
                  value={testX}
                  onChange={e => setTestX(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Test Point Y</label>
                <input
                  type="number"
                  value={testY}
                  onChange={e => setTestY(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={resetData}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={classify}
                className="flex-1 py-2 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                Classify
              </button>
            </div>

            {/* Add Point */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Add Training Point</h3>
              <div className="flex gap-2">
                <select
                  value={newPointLabel}
                  onChange={e => setNewPointLabel(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                >
                  {['A', 'B', 'C', 'D'].map(l => (
                    <option key={l} value={l}>Class {l}</option>
                  ))}
                </select>
                <button
                  onClick={addPoint}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Scatter Plot</h2>
            
            <div className="relative aspect-square bg-slate-800/50 rounded-lg overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Grid */}
                {[...Array(11)].map((_, i) => (
                  <g key={i}>
                    <line
                      x1={i * 10}
                      y1={0}
                      x2={i * 10}
                      y2={100}
                      stroke="#334155"
                      strokeWidth="0.2"
                    />
                    <line
                      x1={0}
                      y1={i * 10}
                      x2={100}
                      y2={i * 10}
                      stroke="#334155"
                      strokeWidth="0.2"
                    />
                  </g>
                ))}

                {/* Draw lines to neighbors if result exists */}
                {result && result.neighbors.map((n, i) => (
                  <line
                    key={i}
                    x1={(testX / 10) * 100}
                    y1={100 - (testY / 10) * 100}
                    x2={(n.point.x / 10) * 100}
                    y2={100 - (n.point.y / 10) * 100}
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Training points */}
                {trainingData.map(point => {
                  const color = COLORS[point.label] || COLORS.A;
                  const isNeighbor = result?.neighbors.some(n => n.point.id === point.id);
                  return (
                    <circle
                      key={point.id}
                      cx={(point.x / 10) * 100}
                      cy={100 - (point.y / 10) * 100}
                      r={isNeighbor ? 4 : 3}
                      fill={color.fill}
                      stroke={isNeighbor ? '#fff' : 'none'}
                      strokeWidth={isNeighbor ? 1 : 0}
                    />
                  );
                })}

                {/* Test point */}
                <circle
                  cx={(testX / 10) * 100}
                  cy={100 - (testY / 10) * 100}
                  r={5}
                  fill={result ? (COLORS[result.predictedLabel]?.fill || '#fff') : '#fff'}
                  stroke="#000"
                  strokeWidth="2"
                />
                <text
                  x={(testX / 10) * 100}
                  y={100 - (testY / 10) * 100 - 8}
                  textAnchor="middle"
                  className="text-[8px] fill-white font-bold"
                >
                  ?
                </text>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-2 right-2 flex gap-2">
                {uniqueLabels.map(label => {
                  const color = COLORS[label] || COLORS.A;
                  return (
                    <div key={label} className="flex items-center gap-1 text-xs">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color.fill }} />
                      <span className="text-slate-400">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Classification Result</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="text-sm text-slate-400">Test Point</div>
                <div className="text-xl font-bold text-white">({testX}, {testY})</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="text-sm text-slate-400">K Value</div>
                <div className="text-xl font-bold text-orange-400">{k}</div>
              </div>
              <div className={`p-4 rounded-lg ${COLORS[result.predictedLabel]?.bg || 'bg-slate-800/50'} border ${COLORS[result.predictedLabel]?.border || 'border-slate-700'}`}>
                <div className="text-sm text-slate-400">Predicted Class</div>
                <div className={`text-2xl font-bold ${COLORS[result.predictedLabel]?.text || 'text-white'}`}>
                  {result.predictedLabel}
                </div>
              </div>
            </div>

            {/* Average Distances */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-300 mb-3">Average Distance per Class</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.avgDistances)
                  .sort((a, b) => a[1] - b[1])
                  .map(([label, dist], i) => {
                    const color = COLORS[label] || COLORS.A;
                    const isMin = i === 0;
                    return (
                      <div 
                        key={label} 
                        className={`p-3 rounded-lg ${color.bg} border ${isMin ? color.border : 'border-transparent'}`}
                      >
                        <div className="text-sm text-slate-400">Class {label}</div>
                        <div className={`text-xl font-bold ${color.text}`}>
                          {dist.toFixed(3)}
                        </div>
                        {isMin && <span className="text-xs text-green-400">← Minimum</span>}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Neighbors Table */}
            <h3 className="text-lg font-semibold text-slate-300 mb-3">K Nearest Neighbors</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="py-2 px-4 text-left">#</th>
                    <th className="py-2 px-4 text-left">Point</th>
                    <th className="py-2 px-4 text-left">Class</th>
                    <th className="py-2 px-4 text-left">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.neighbors.map((n, i) => {
                    const color = COLORS[n.point.label] || COLORS.A;
                    return (
                      <tr key={i} className="border-b border-slate-800">
                        <td className="py-2 px-4 text-slate-500">{i + 1}</td>
                        <td className="py-2 px-4 font-mono">({n.point.x}, {n.point.y})</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded ${color.bg} ${color.text} text-xs font-semibold`}>
                            {n.point.label}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-mono text-orange-400">{n.distance.toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Training Data Table */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Training Data ({trainingData.length} points)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-2 px-4 text-left">ID</th>
                  <th className="py-2 px-4 text-left">X</th>
                  <th className="py-2 px-4 text-left">Y</th>
                  <th className="py-2 px-4 text-left">Class</th>
                  <th className="py-2 px-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {trainingData.map(point => {
                  const color = COLORS[point.label] || COLORS.A;
                  return (
                    <tr key={point.id} className="border-b border-slate-800">
                      <td className="py-2 px-4 text-slate-500">{point.id}</td>
                      <td className="py-2 px-4 font-mono">{point.x}</td>
                      <td className="py-2 px-4 font-mono">{point.y}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded ${color.bg} ${color.text} text-xs font-semibold`}>
                          {point.label}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => removePoint(point.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Algorithm Explanation */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">How it Works</h2>
          <div className="space-y-4 text-slate-300">
            <div className="p-4 rounded-lg bg-slate-800/50">
              <h3 className="font-semibold text-orange-400 mb-2">1. Calculate Distances</h3>
              <p className="text-sm">Compute Euclidean distance from test point to all training points:</p>
              <code className="text-xs text-cyan-400 block mt-2">d = √((x₂-x₁)² + (y₂-y₁)²)</code>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <h3 className="font-semibold text-orange-400 mb-2">2. Find K Nearest Neighbors</h3>
              <p className="text-sm">Sort distances and select the K closest points.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <h3 className="font-semibold text-orange-400 mb-2">3. Calculate Average Distance per Class</h3>
              <p className="text-sm">For each class among the K neighbors, compute the average distance.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <h3 className="font-semibold text-orange-400 mb-2">4. Classify</h3>
              <p className="text-sm">Assign the test point to the class with the <strong>minimum average distance</strong>.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} K-NN Classifier · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
