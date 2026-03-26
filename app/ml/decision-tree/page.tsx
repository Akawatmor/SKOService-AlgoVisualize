'use client';

import Link from 'next/link';
import { ArrowLeft, Home, Play, RotateCcw, Plus, Trash2, TreeDeciduous } from 'lucide-react';
import { useState, useCallback } from 'react';

interface DataRow {
  features: Record<string, string>;
  label: string;
}

interface TreeNode {
  type: 'leaf' | 'decision';
  label?: string;
  feature?: string;
  children?: Record<string, TreeNode>;
  gain?: number;
  samples?: number;
}

// Calculate entropy
function entropy(labels: string[]): number {
  if (labels.length === 0) return 0;
  
  const counts: Record<string, number> = {};
  for (const label of labels) {
    counts[label] = (counts[label] || 0) + 1;
  }
  
  let ent = 0;
  for (const count of Object.values(counts)) {
    const p = count / labels.length;
    if (p > 0) {
      ent -= p * Math.log2(p);
    }
  }
  return ent;
}

// Calculate Gini impurity
function gini(labels: string[]): number {
  if (labels.length === 0) return 0;
  
  const counts: Record<string, number> = {};
  for (const label of labels) {
    counts[label] = (counts[label] || 0) + 1;
  }
  
  let giniVal = 1;
  for (const count of Object.values(counts)) {
    const p = count / labels.length;
    giniVal -= p * p;
  }
  return giniVal;
}

// Calculate Information Gain (ID3)
function informationGain(data: DataRow[], feature: string): { gain: number; splits: Record<string, DataRow[]> } {
  const labels = data.map(d => d.label);
  const parentEntropy = entropy(labels);
  
  // Split by feature values
  const splits: Record<string, DataRow[]> = {};
  for (const row of data) {
    const value = row.features[feature];
    if (!splits[value]) splits[value] = [];
    splits[value].push(row);
  }
  
  // Calculate weighted entropy of children
  let childEntropy = 0;
  for (const subset of Object.values(splits)) {
    const weight = subset.length / data.length;
    childEntropy += weight * entropy(subset.map(d => d.label));
  }
  
  return { gain: parentEntropy - childEntropy, splits };
}

// Calculate Gini Gain
function giniGain(data: DataRow[], feature: string): { gain: number; splits: Record<string, DataRow[]> } {
  const parentGini = gini(data.map(d => d.label));
  
  // Split by feature values
  const splits: Record<string, DataRow[]> = {};
  for (const row of data) {
    const value = row.features[feature];
    if (!splits[value]) splits[value] = [];
    splits[value].push(row);
  }
  
  // Calculate weighted Gini of children
  let childGini = 0;
  for (const subset of Object.values(splits)) {
    const weight = subset.length / data.length;
    childGini += weight * gini(subset.map(d => d.label));
  }
  
  return { gain: parentGini - childGini, splits };
}

// Build decision tree
function buildTree(data: DataRow[], features: string[], method: 'id3' | 'gini', depth = 0, maxDepth = 5): TreeNode {
  const labels = data.map(d => d.label);
  const uniqueLabels = [...new Set(labels)];
  
  // Base cases
  if (uniqueLabels.length === 1) {
    return { type: 'leaf', label: uniqueLabels[0], samples: data.length };
  }
  
  if (features.length === 0 || depth >= maxDepth) {
    // Return most common label
    const counts: Record<string, number> = {};
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { type: 'leaf', label: mostCommon, samples: data.length };
  }
  
  // Find best feature
  let bestFeature = '';
  let bestGain = -1;
  let bestSplits: Record<string, DataRow[]> = {};
  
  const gainFn = method === 'id3' ? informationGain : giniGain;
  
  for (const feature of features) {
    const { gain, splits } = gainFn(data, feature);
    if (gain > bestGain) {
      bestGain = gain;
      bestFeature = feature;
      bestSplits = splits;
    }
  }
  
  if (bestGain <= 0) {
    const counts: Record<string, number> = {};
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { type: 'leaf', label: mostCommon, samples: data.length };
  }
  
  // Build subtrees
  const remainingFeatures = features.filter(f => f !== bestFeature);
  const children: Record<string, TreeNode> = {};
  
  for (const [value, subset] of Object.entries(bestSplits)) {
    children[value] = buildTree(subset, remainingFeatures, method, depth + 1, maxDepth);
  }
  
  return {
    type: 'decision',
    feature: bestFeature,
    gain: bestGain,
    children,
    samples: data.length,
  };
}

// Default dataset (Play Tennis)
const DEFAULT_DATA: DataRow[] = [
  { features: { Outlook: 'Sunny', Temperature: 'Hot', Humidity: 'High', Wind: 'Weak' }, label: 'No' },
  { features: { Outlook: 'Sunny', Temperature: 'Hot', Humidity: 'High', Wind: 'Strong' }, label: 'No' },
  { features: { Outlook: 'Overcast', Temperature: 'Hot', Humidity: 'High', Wind: 'Weak' }, label: 'Yes' },
  { features: { Outlook: 'Rain', Temperature: 'Mild', Humidity: 'High', Wind: 'Weak' }, label: 'Yes' },
  { features: { Outlook: 'Rain', Temperature: 'Cool', Humidity: 'Normal', Wind: 'Weak' }, label: 'Yes' },
  { features: { Outlook: 'Rain', Temperature: 'Cool', Humidity: 'Normal', Wind: 'Strong' }, label: 'No' },
  { features: { Outlook: 'Overcast', Temperature: 'Cool', Humidity: 'Normal', Wind: 'Strong' }, label: 'Yes' },
  { features: { Outlook: 'Sunny', Temperature: 'Mild', Humidity: 'High', Wind: 'Weak' }, label: 'No' },
  { features: { Outlook: 'Sunny', Temperature: 'Cool', Humidity: 'Normal', Wind: 'Weak' }, label: 'Yes' },
  { features: { Outlook: 'Rain', Temperature: 'Mild', Humidity: 'Normal', Wind: 'Weak' }, label: 'Yes' },
  { features: { Outlook: 'Sunny', Temperature: 'Mild', Humidity: 'Normal', Wind: 'Strong' }, label: 'Yes' },
  { features: { Outlook: 'Overcast', Temperature: 'Mild', Humidity: 'High', Wind: 'Strong' }, label: 'Yes' },
  { features: { Outlook: 'Overcast', Temperature: 'Hot', Humidity: 'Normal', Wind: 'Weak' }, label: 'Yes' },
  { features: { Outlook: 'Rain', Temperature: 'Mild', Humidity: 'High', Wind: 'Strong' }, label: 'No' },
];

// Tree visualization component
function TreeVisualization({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const indent = level * 24;
  
  if (node.type === 'leaf') {
    return (
      <div style={{ marginLeft: indent }} className="flex items-center gap-2 py-1">
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          node.label === 'Yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {node.label}
        </span>
        <span className="text-xs text-slate-500">({node.samples} samples)</span>
      </div>
    );
  }
  
  return (
    <div style={{ marginLeft: indent }}>
      <div className="flex items-center gap-2 py-1">
        <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold">
          {node.feature}?
        </span>
        <span className="text-xs text-slate-500">
          gain: {node.gain?.toFixed(4)} ({node.samples} samples)
        </span>
      </div>
      {node.children && Object.entries(node.children).map(([value, child]) => (
        <div key={value} className="border-l border-slate-700 ml-2">
          <div className="text-xs text-violet-400 pl-4 py-1">= {value}</div>
          <TreeVisualization node={child} level={level + 1} />
        </div>
      ))}
    </div>
  );
}

export default function DecisionTreePage() {
  const [data, setData] = useState<DataRow[]>(DEFAULT_DATA);
  const [method, setMethod] = useState<'id3' | 'gini'>('id3');
  const [maxDepth, setMaxDepth] = useState(5);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [features, setFeatures] = useState<string[]>(() => 
    Object.keys(DEFAULT_DATA[0].features)
  );

  const buildTreeHandler = useCallback(() => {
    const result = buildTree(data, features, method, 0, maxDepth);
    setTree(result);
  }, [data, features, method, maxDepth]);

  const resetData = () => {
    setData(DEFAULT_DATA);
    setFeatures(Object.keys(DEFAULT_DATA[0].features));
    setTree(null);
  };

  // Calculate metrics for display
  const calculateMetrics = () => {
    const labels = data.map(d => d.label);
    const uniqueLabels = [...new Set(labels)];
    
    const metrics = features.map(feature => {
      const { gain: igGain } = informationGain(data, feature);
      const { gain: giniG } = giniGain(data, feature);
      return { feature, infoGain: igGain, giniGain: giniG };
    });
    
    return { metrics, totalEntropy: entropy(labels), totalGini: gini(labels), uniqueLabels };
  };

  const { metrics, totalEntropy, totalGini, uniqueLabels } = calculateMetrics();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-green-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Decision Tree</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">Akawatmor</div>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-300 border border-green-500/30 rounded-full">
            <TreeDeciduous className="w-4 h-4" />
            Interactive Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent pb-2">
            Decision Tree
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Build decision trees using ID3 (Information Gain) and Gini Index algorithms.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Configuration</h2>
            
            {/* Method Selection */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-2">Algorithm</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMethod('id3')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    method === 'id3'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  ID3 (Entropy)
                </button>
                <button
                  onClick={() => setMethod('gini')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    method === 'gini'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Gini Index
                </button>
              </div>
            </div>

            {/* Max Depth */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-2">
                Max Depth: {maxDepth}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={maxDepth}
                onChange={e => setMaxDepth(parseInt(e.target.value))}
                className="w-full accent-green-500"
              />
            </div>

            {/* Dataset Info */}
            <div className="p-4 rounded-lg bg-slate-800/50 mb-4">
              <div className="text-sm text-slate-400 mb-2">Dataset: Play Tennis ({data.length} samples)</div>
              <div className="text-sm">
                <span className="text-slate-400">Features: </span>
                <span className="text-green-400">{features.join(', ')}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="text-slate-400">Labels: </span>
                <span className="text-violet-400">{uniqueLabels.join(', ')}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={resetData}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={buildTreeHandler}
                className="flex-1 py-2 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                Build Tree
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Feature Metrics</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-sm text-slate-400">Total Entropy</div>
                <div className="text-2xl font-bold text-cyan-400">{totalEntropy.toFixed(4)}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-sm text-slate-400">Total Gini</div>
                <div className="text-2xl font-bold text-orange-400">{totalGini.toFixed(4)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="py-2 px-3 text-left">Feature</th>
                    <th className="py-2 px-3 text-left">Info Gain</th>
                    <th className="py-2 px-3 text-left">Gini Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.sort((a, b) => b.infoGain - a.infoGain).map((m, i) => (
                    <tr key={m.feature} className="border-b border-slate-800">
                      <td className="py-2 px-3 font-medium text-slate-300">{m.feature}</td>
                      <td className="py-2 px-3">
                        <span className={`font-mono ${i === 0 && method === 'id3' ? 'text-green-400 font-bold' : 'text-cyan-400'}`}>
                          {m.infoGain.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`font-mono ${metrics.sort((a, b) => b.giniGain - a.giniGain)[0].feature === m.feature && method === 'gini' ? 'text-green-400 font-bold' : 'text-orange-400'}`}>
                          {m.giniGain.toFixed(4)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tree Visualization */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Decision Tree Structure</h2>
          
          {tree ? (
            <div className="p-4 rounded-lg bg-slate-800/30 overflow-x-auto">
              <TreeVisualization node={tree} />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Click "Build Tree" to generate the decision tree
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Training Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-2 px-3 text-left">#</th>
                  {features.map(f => (
                    <th key={f} className="py-2 px-3 text-left">{f}</th>
                  ))}
                  <th className="py-2 px-3 text-left">Play Tennis</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                    {features.map(f => (
                      <td key={f} className="py-2 px-3 text-slate-300">{row.features[f]}</td>
                    ))}
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.label === 'Yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {row.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulas */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Formulas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Entropy (ID3)</h3>
              <div className="p-3 rounded-lg bg-slate-800/50 font-mono text-sm">
                <p>H(S) = -Σ p(x) · log₂(p(x))</p>
                <p className="text-slate-400 mt-2 text-xs">
                  Information Gain = H(parent) - Σ(|Sv|/|S|) · H(Sv)
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-400 mb-2">Gini Index</h3>
              <div className="p-3 rounded-lg bg-slate-800/50 font-mono text-sm">
                <p>Gini(S) = 1 - Σ p(x)²</p>
                <p className="text-slate-400 mt-2 text-xs">
                  Gini Gain = Gini(parent) - Σ(|Sv|/|S|) · Gini(Sv)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} Decision Tree · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
