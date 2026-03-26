'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Hash, Database, ArrowRight, ArrowLeft, Home } from 'lucide-react';

interface SearchCategory {
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  algorithms: string[];
  badge?: string;
  disabled?: boolean;
}

const searchCategories: SearchCategory[] = [
  {
    title: 'Search Algorithms',
    description: 'Visualize linear search, binary search, interpolation search, and more.',
    href: '/search/algorithms',
    icon: Search,
    color: 'text-cyan-400 group-hover:text-cyan-300',
    bg: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    algorithms: [
      'Linear Search',
      'Binary Search',
      'Jump Search',
      'Interpolation Search',
      'Exponential Search',
      'Ternary Search'
    ],
    badge: 'Available'
  },
  {
    title: 'Hash Tables',
    description: 'Interactive hash table visualization with collision resolution strategies.',
    href: '#',
    icon: Hash,
    color: 'text-gray-400',
    bg: 'bg-gray-800/50',
    border: 'border-gray-800',
    algorithms: [
      'Separate Chaining',
      'Linear Probing',
      'Quadratic Probing',
      'Double Hashing',
      'Cuckoo Hashing'
    ],
    badge: 'Coming Soon',
    disabled: true
  }
];

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full" />
      </div>

      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Search Collection</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Akawatmor</div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 md:gap-12 relative z-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            <Home className="w-4 h-4" />
            Main
          </Link>
        </div>

        <header className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(34,211,238,0.25)]">
            Search & Hash
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Explore searching algorithms and hash table implementations with interactive visualizations.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {searchCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={index}
                href={category.disabled ? '#' : category.href}
                className={`
                  relative group p-5 sm:p-6 rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-sm
                  ${category.border} ${category.bg}
                  ${category.disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30'}
                `}
                aria-disabled={category.disabled}
              >
                <div className="relative z-10 flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 w-fit border border-slate-800 backdrop-blur-sm ${category.color}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    {category.badge && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        category.badge === 'Available' 
                          ? 'bg-slate-900/70 text-slate-300 border-slate-700/80'
                          : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                      }`}>
                        {category.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                      {category.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">
                      {category.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {category.algorithms.map((algo, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-slate-900/50 text-slate-400 rounded border border-slate-800"
                      >
                        {algo}
                      </span>
                    ))}
                  </div>

                  {!category.disabled && (
                    <div className="mt-auto pt-4 flex items-center text-sm font-medium text-slate-500 group-hover:text-white transition-colors">
                      Explore Algorithms
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </div>

                {!category.disabled && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                )}
              </Link>
            );
          })}
        </div>

        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} CS Visualize · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
