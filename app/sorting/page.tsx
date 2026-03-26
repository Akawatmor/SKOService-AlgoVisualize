'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, ArrowUpDown, Zap, TrendingUp, BarChart3, Activity, ChevronRight } from 'lucide-react';

interface SortCategory {
  id: string;
  name: string;
  description: string;
  timeComplexity: {
    best: string;
    average: string;
    worst: string;
  };
  spaceComplexity: string;
  stable: boolean;
  use_case: string;
  color: string;
  icon: any;
}

const sortingAlgorithms: SortCategory[] = [
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    description: 'Repeatedly steps through the list, compares adjacent elements and swaps them if in wrong order.',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    stable: true,
    use_case: 'Educational purposes, small datasets',
    color: 'cyan',
    icon: ArrowUpDown,
  },
  {
    id: 'selection-sort',
    name: 'Selection Sort',
    description: 'Divides array into sorted and unsorted regions, repeatedly selects smallest element.',
    timeComplexity: {
      best: 'O(n²)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    stable: false,
    use_case: 'Small datasets, memory constraints',
    color: 'blue',
    icon: Activity,
  },
  {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    description: 'Builds the final sorted array one item at a time by inserting each element into correct position.',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    stable: true,
    use_case: 'Nearly sorted data, small datasets',
    color: 'green',
    icon: TrendingUp,
  },
  {
    id: 'merge-sort',
    name: 'Merge Sort',
    description: 'Divide and conquer algorithm that divides array into halves, sorts and merges them back.',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(n)',
    stable: true,
    use_case: 'Large datasets, stable sorting needed',
    color: 'purple',
    icon: Zap,
  },
  {
    id: 'quick-sort',
    name: 'Quick Sort',
    description: 'Selects a pivot element and partitions the array around it, then recursively sorts partitions.',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(log n)',
    stable: false,
    use_case: 'General purpose, in-place sorting',
    color: 'orange',
    icon: BarChart3,
  },
  {
    id: 'heap-sort',
    name: 'Heap Sort',
    description: 'Builds a max heap from the array and repeatedly extracts the maximum element.',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(1)',
    stable: false,
    use_case: 'Guaranteed O(n log n), memory constraints',
    color: 'pink',
    icon: Activity,
  },
];

const getColorClasses = (color: string) => {
  const colors: { [key: string]: any } = {
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      hover: 'hover:border-cyan-500/40',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      hover: 'hover:border-blue-500/40',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    green: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      hover: 'hover:border-green-500/40',
      badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      hover: 'hover:border-purple-500/40',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    orange: {
      text: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      hover: 'hover:border-orange-500/40',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    pink: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      hover: 'hover:border-pink-500/40',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    },
  };
  return colors[color] || colors.cyan;
};

export default function SortingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-orange-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Sorting Algorithms</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Akawatmor
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 md:gap-12 relative z-10">
        {/* Navigation Buttons */}
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

        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(251,146,60,0.25)]">
            Sorting Algorithms
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Explore and compare 18+ sorting algorithms with interactive visualizations.
          </p>
        </header>

        {/* Quick Access to Visualizer */}
        <Link
          href="/sorting/visualizer"
          className="relative group p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 hover:from-amber-500/20 hover:via-orange-500/20 hover:to-red-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-500/20 rounded-xl border border-amber-500/30">
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-100 mb-1">Interactive Visualizer</h3>
                <p className="text-slate-400">Watch algorithms sort in real-time with step-by-step animations</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-amber-400 transition-transform group-hover:translate-x-2" />
          </div>
        </Link>

        {/* Algorithms Grid */}
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Featured Algorithms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sortingAlgorithms.map((algo) => {
              const Icon = algo.icon;
              const colors = getColorClasses(algo.color);

              return (
                <Link
                  key={algo.id}
                  href="/sorting/visualizer"
                  className={`
                    relative group p-5 rounded-2xl border transition-all duration-300 backdrop-blur-sm
                    ${colors.border} ${colors.bg} ${colors.hover}
                    hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30
                  `}
                >
                  <div className="relative z-10 flex flex-col h-full gap-4">
                    {/* Icon & Stable Badge */}
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl bg-slate-950/50 w-fit border border-slate-800 backdrop-blur-sm ${colors.text}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        algo.stable 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                      }`}>
                        {algo.stable ? 'Stable' : 'Unstable'}
                      </span>
                    </div>

                    {/* Name & Description */}
                    <div>
                      <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                        {algo.name}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">
                        {algo.description}
                      </p>
                    </div>

                    {/* Complexity */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Best:</span>
                        <span className={`font-mono font-bold ${colors.text}`}>{algo.timeComplexity.best}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Average:</span>
                        <span className={`font-mono font-bold ${colors.text}`}>{algo.timeComplexity.average}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Worst:</span>
                        <span className={`font-mono font-bold ${colors.text}`}>{algo.timeComplexity.worst}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-800">
                        <span className="text-slate-500">Space:</span>
                        <span className="font-mono font-bold text-slate-300">{algo.spaceComplexity}</span>
                      </div>
                    </div>

                    {/* Use Case */}
                    <div className="mt-auto pt-3 border-t border-slate-800">
                      <div className="text-xs text-slate-500 mb-1">Best for:</div>
                      <div className="text-xs text-slate-300">{algo.use_case}</div>
                    </div>

                    {/* View Button */}
                    <div className="flex items-center text-sm font-medium text-slate-500 group-hover:text-amber-400 transition-colors">
                      Try in Visualizer
                      <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Quick Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Algorithm</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Best</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Average</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Worst</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Space</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Stable</th>
                </tr>
              </thead>
              <tbody>
                {sortingAlgorithms.map((algo) => {
                  const colors = getColorClasses(algo.color);
                  return (
                    <tr key={algo.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${colors.text}`}>{algo.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.timeComplexity.best}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.timeComplexity.average}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.timeComplexity.worst}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.spaceComplexity}</td>
                      <td className="py-3 px-4">
                        <span className={algo.stable ? 'text-green-400' : 'text-slate-500'}>
                          {algo.stable ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-amber-400 font-bold mb-2">⚡ Performance</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              Quick Sort and Merge Sort are the most commonly used general-purpose algorithms.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-orange-400 font-bold mb-2">🎯 Stability</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              Stable sorts maintain relative order of equal elements - important for multi-key sorting.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-red-400 font-bold mb-2">💾 Memory</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              In-place algorithms like Quick Sort and Heap Sort use O(1) or O(log n) extra space.
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} CS Visualize · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
