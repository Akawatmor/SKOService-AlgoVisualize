'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Search, Zap, TrendingUp, Activity, BarChart3, Clock, ChevronRight } from 'lucide-react';

interface Algorithm {
  id: string;
  name: string;
  timeComplexity: {
    best: string;
    average: string;
    worst: string;
  };
  spaceComplexity: string;
  requirement: string;
  description: string;
  use_case: string;
  color: string;
  icon: any;
}

const searchAlgorithms: Algorithm[] = [
  {
    id: 'linear',
    name: 'Linear Search',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    requirement: 'None',
    description: 'Simple sequential search through all elements one by one.',
    use_case: 'Small datasets, unsorted data',
    color: 'cyan',
    icon: Search,
  },
  {
    id: 'binary',
    name: 'Binary Search',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log n)',
      worst: 'O(log n)',
    },
    spaceComplexity: 'O(1)',
    requirement: 'Sorted array',
    description: 'Divide and conquer algorithm that repeatedly divides search interval in half.',
    use_case: 'Large sorted datasets',
    color: 'blue',
    icon: Zap,
  },
  {
    id: 'jump',
    name: 'Jump Search',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(√n)',
      worst: 'O(√n)',
    },
    spaceComplexity: 'O(1)',
    requirement: 'Sorted array',
    description: 'Jump ahead by fixed steps, then perform linear search in the block.',
    use_case: 'Sorted data, better than linear',
    color: 'green',
    icon: TrendingUp,
  },
  {
    id: 'interpolation',
    name: 'Interpolation Search',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log log n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    requirement: 'Sorted array, uniformly distributed',
    description: 'Improved binary search using position estimation based on value.',
    use_case: 'Uniformly distributed sorted data',
    color: 'purple',
    icon: Activity,
  },
  {
    id: 'exponential',
    name: 'Exponential Search',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log n)',
      worst: 'O(log n)',
    },
    spaceComplexity: 'O(1)',
    requirement: 'Sorted array',
    description: 'Find range where element is present, then do binary search in that range.',
    use_case: 'Unbounded/infinite arrays',
    color: 'orange',
    icon: BarChart3,
  },
  {
    id: 'ternary',
    name: 'Ternary Search',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log₃ n)',
      worst: 'O(log₃ n)',
    },
    spaceComplexity: 'O(1)',
    requirement: 'Sorted array',
    description: 'Divide-and-conquer algorithm that divides array into three parts.',
    use_case: 'Finding maximum/minimum in unimodal functions',
    color: 'pink',
    icon: Clock,
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

export default function SearchAlgorithmsPage() {
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Search Algorithms</div>
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
            href="/search"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(34,211,238,0.25)]">
            Search Algorithms
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Explore and compare different searching algorithms with detailed complexity analysis.
          </p>
        </header>

        {/* Algorithms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {searchAlgorithms.map((algo) => {
            const Icon = algo.icon;
            const colors = getColorClasses(algo.color);

            return (
              <div
                key={algo.id}
                onClick={() => setSelectedAlgo(algo)}
                className={`
                  relative group p-5 rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-sm
                  ${colors.border} ${colors.bg} ${colors.hover}
                  hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30
                `}
              >
                <div className="relative z-10 flex flex-col h-full gap-4">
                  {/* Icon & Name */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 w-fit border border-slate-800 backdrop-blur-sm ${colors.text}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${colors.badge}`}>
                      {algo.requirement}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                      {algo.name}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 mb-3">
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
                  <div className="flex items-center text-sm font-medium text-slate-500 group-hover:text-cyan-400 transition-colors">
                    View Details
                    <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
              </div>
            );
          })}
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
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Requirement</th>
                </tr>
              </thead>
              <tbody>
                {searchAlgorithms.map((algo, idx) => {
                  const colors = getColorClasses(algo.color);
                  return (
                    <tr key={algo.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors`}>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${colors.text}`}>{algo.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.timeComplexity.best}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.timeComplexity.average}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.timeComplexity.worst}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{algo.spaceComplexity}</td>
                      <td className="py-3 px-4 text-slate-400">{algo.requirement}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-cyan-400 font-bold mb-2">💡 Tip</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              For small datasets (&lt;100 items), Linear Search is often fast enough and simpler to implement.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-blue-400 font-bold mb-2">⚡ Performance</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              Binary Search is the go-to choice for large sorted datasets, offering O(log n) performance.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-purple-400 font-bold mb-2">🎯 Use Case</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              Interpolation Search works best with uniformly distributed data for even better performance.
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} CS Visualize · Owner: Akawatmor</p>
        </footer>
      </div>

      {/* Selected Algorithm Modal (Optional - for future enhancement) */}
      {selectedAlgo && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAlgo(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-slate-100 mb-4">{selectedAlgo.name}</h3>
            <p className="text-slate-400 mb-4">{selectedAlgo.description}</p>
            <div className="text-sm text-slate-500">
              Click outside to close. Full visualizer coming soon!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
