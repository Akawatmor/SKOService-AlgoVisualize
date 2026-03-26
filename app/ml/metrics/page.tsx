'use client';

import Link from 'next/link';
import { ArrowLeft, Home, Calculator, RotateCcw } from 'lucide-react';
import { useState, useMemo } from 'react';

interface MetricResult {
  name: string;
  value: number;
  formula: string;
  description: string;
  color: string;
}

export default function MetricsPage() {
  const [tp, setTp] = useState(50);
  const [tn, setTn] = useState(40);
  const [fp, setFp] = useState(10);
  const [fn, setFn] = useState(5);
  const [beta, setBeta] = useState(1);

  const metrics = useMemo((): MetricResult[] => {
    const total = tp + tn + fp + fn;
    const actual_positive = tp + fn;
    const actual_negative = tn + fp;
    const predicted_positive = tp + fp;
    const predicted_negative = tn + fn;

    // Derived metrics
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const errorRate = total > 0 ? (fp + fn) / total : 0;
    const precision = predicted_positive > 0 ? tp / predicted_positive : 0;
    const recall = actual_positive > 0 ? tp / actual_positive : 0; // TPR / Sensitivity
    const specificity = actual_negative > 0 ? tn / actual_negative : 0; // TNR
    const fpr = actual_negative > 0 ? fp / actual_negative : 0;
    const fnr = actual_positive > 0 ? fn / actual_positive : 0;
    
    // F-scores
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const f05 = precision + recall > 0 ? (1.25 * precision * recall) / (0.25 * precision + recall) : 0;
    const f2 = precision + recall > 0 ? (5 * precision * recall) / (4 * precision + recall) : 0;
    const fBeta = precision + recall > 0 
      ? ((1 + beta * beta) * precision * recall) / (beta * beta * precision + recall) 
      : 0;

    return [
      { name: 'Accuracy', value: accuracy, formula: '(TP + TN) / Total', description: 'Overall correctness', color: 'text-green-400' },
      { name: 'Error Rate', value: errorRate, formula: '(FP + FN) / Total', description: 'Overall error', color: 'text-red-400' },
      { name: 'Precision', value: precision, formula: 'TP / (TP + FP)', description: 'Positive predictive value', color: 'text-cyan-400' },
      { name: 'Recall (TPR)', value: recall, formula: 'TP / (TP + FN)', description: 'Sensitivity / True Positive Rate', color: 'text-violet-400' },
      { name: 'Specificity (TNR)', value: specificity, formula: 'TN / (TN + FP)', description: 'True Negative Rate', color: 'text-blue-400' },
      { name: 'FPR', value: fpr, formula: 'FP / (FP + TN)', description: 'False Positive Rate', color: 'text-orange-400' },
      { name: 'FNR', value: fnr, formula: 'FN / (FN + TP)', description: 'False Negative Rate', color: 'text-amber-400' },
      { name: 'F1 Score', value: f1, formula: '2·(P·R)/(P+R)', description: 'Harmonic mean of P & R', color: 'text-pink-400' },
      { name: 'F0.5 Score', value: f05, formula: '1.25·(P·R)/(0.25P+R)', description: 'Precision-weighted F', color: 'text-rose-400' },
      { name: 'F2 Score', value: f2, formula: '5·(P·R)/(4P+R)', description: 'Recall-weighted F', color: 'text-fuchsia-400' },
      { name: `Fβ (β=${beta})`, value: fBeta, formula: `(1+β²)·(P·R)/(β²P+R)`, description: 'Custom β F-score', color: 'text-indigo-400' },
    ];
  }, [tp, tn, fp, fn, beta]);

  const resetValues = () => {
    setTp(50);
    setTn(40);
    setFp(10);
    setFn(5);
    setBeta(1);
  };

  const total = tp + tn + fp + fn;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-purple-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-violet-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Performance Metrics</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent">Akawatmor</div>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-full">
            <Calculator className="w-4 h-4" />
            Interactive Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-violet-400 to-pink-400 bg-clip-text text-transparent pb-2">
            Performance Metrics
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Calculate classification metrics from confusion matrix values.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confusion Matrix Input */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-100">Confusion Matrix</h2>
              <button
                onClick={resetValues}
                className="px-3 py-1 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-800 transition-colors text-sm flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            
            {/* Matrix Visualization */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div></div>
              <div className="text-center text-sm text-slate-400 font-medium">Predicted +</div>
              <div className="text-center text-sm text-slate-400 font-medium">Predicted -</div>
              
              <div className="text-right text-sm text-slate-400 font-medium pr-2 flex items-center justify-end">Actual +</div>
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                <label className="text-xs text-green-400 block mb-1">TP</label>
                <input
                  type="number"
                  value={tp}
                  onChange={e => setTp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-2xl font-bold text-green-400 text-center outline-none"
                />
              </div>
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <label className="text-xs text-red-400 block mb-1">FN</label>
                <input
                  type="number"
                  value={fn}
                  onChange={e => setFn(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-2xl font-bold text-red-400 text-center outline-none"
                />
              </div>
              
              <div className="text-right text-sm text-slate-400 font-medium pr-2 flex items-center justify-end">Actual -</div>
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <label className="text-xs text-red-400 block mb-1">FP</label>
                <input
                  type="number"
                  value={fp}
                  onChange={e => setFp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-2xl font-bold text-red-400 text-center outline-none"
                />
              </div>
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                <label className="text-xs text-green-400 block mb-1">TN</label>
                <input
                  type="number"
                  value={tn}
                  onChange={e => setTn(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-2xl font-bold text-green-400 text-center outline-none"
                />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-400">Total Samples</div>
                <div className="text-xl font-bold text-slate-100">{total}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-400">Actual Positive</div>
                <div className="text-xl font-bold text-violet-400">{tp + fn}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-400">Actual Negative</div>
                <div className="text-xl font-bold text-blue-400">{tn + fp}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-400">Predicted Positive</div>
                <div className="text-xl font-bold text-cyan-400">{tp + fp}</div>
              </div>
            </div>

            {/* Beta Slider */}
            <div>
              <label className="text-sm text-slate-400 block mb-2">
                Fβ Beta Value: {beta.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={beta}
                onChange={e => setBeta(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Precision-focused</span>
                <span>Balanced (1.0)</span>
                <span>Recall-focused</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Display */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Key Metrics</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {metrics.slice(0, 4).map(m => (
                <div key={m.name} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">{m.name}</div>
                  <div className={`text-3xl font-bold ${m.color}`}>
                    {(m.value * 100).toFixed(2)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">{m.formula}</div>
                </div>
              ))}
            </div>

            {/* F-Scores */}
            <div className="mt-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">F-Scores</h3>
              <div className="space-y-2">
                {metrics.slice(7).map(m => (
                  <div key={m.name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{m.name}</span>
                    <span className={`font-bold font-mono ${m.color}`}>
                      {(m.value * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All Metrics Table */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">All Metrics</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-4 text-left">Metric</th>
                  <th className="py-3 px-4 text-left">Value</th>
                  <th className="py-3 px-4 text-left">Percentage</th>
                  <th className="py-3 px-4 text-left">Formula</th>
                  <th className="py-3 px-4 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(m => (
                  <tr key={m.name} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className={`py-3 px-4 font-semibold ${m.color}`}>{m.name}</td>
                    <td className="py-3 px-4 font-mono">{m.value.toFixed(4)}</td>
                    <td className="py-3 px-4 font-mono font-bold">{(m.value * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{m.formula}</td>
                    <td className="py-3 px-4 text-slate-400">{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Definitions */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Definitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <h3 className="font-bold text-green-400 mb-2">True Positive (TP)</h3>
              <p className="text-sm text-slate-400">Model correctly predicts positive class</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <h3 className="font-bold text-green-400 mb-2">True Negative (TN)</h3>
              <p className="text-sm text-slate-400">Model correctly predicts negative class</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <h3 className="font-bold text-red-400 mb-2">False Positive (FP)</h3>
              <p className="text-sm text-slate-400">Model incorrectly predicts positive (Type I Error)</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <h3 className="font-bold text-red-400 mb-2">False Negative (FN)</h3>
              <p className="text-sm text-slate-400">Model incorrectly predicts negative (Type II Error)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} Performance Metrics · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
