'use client';

import Link from 'next/link';
import { ArrowRight, BrainCircuit, GitBranch, Network, Bot } from 'lucide-react';

const categories = [
  {
    title: 'Automata',
    description: 'Visualizer, converters, and language checker for formal language topics.',
    href: '/automata',
    icon: Network,
    color: 'text-blue-400 group-hover:text-blue-300',
    bg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    badge: 'Available',
  },
  {
    title: 'ML Visualize',
    description: 'Interactive tools for machine learning concepts, starting with neural network design.',
    href: '/ml',
    icon: Bot,
    color: 'text-cyan-400 group-hover:text-cyan-300',
    bg: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    badge: 'Available',
  },
  {
    title: 'Tree',
    description: 'Tree algorithms and interactive traversal visualizations (coming soon).',
    href: '#',
    icon: GitBranch,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    title: 'Cryptography',
    description: 'Cryptography concepts and algorithm visual tools (coming soon).',
    href: '#',
    icon: BrainCircuit,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    badge: 'Coming soon',
    disabled: true,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-6xl w-full flex flex-col gap-12">
        <header className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent pb-2">
            CS Visualize
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            A hub of computer science visual tools by topic.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={index}
                href={category.disabled ? '#' : category.href}
                className={`
                  relative group p-6 rounded-2xl border transition-all duration-300 overflow-hidden
                  ${category.border} ${category.bg}
                  ${category.disabled ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20'}
                `}
                aria-disabled={category.disabled}
              >
                <div className="relative z-10 flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 w-fit border border-slate-800 backdrop-blur-sm ${category.color}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    {category.badge && (
                      <span className="px-3 py-1 text-xs font-semibold bg-slate-900/70 text-slate-300 rounded-full border border-slate-700/80">
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

                  {!category.disabled && (
                    <div className="mt-auto pt-4 flex items-center text-sm font-medium text-slate-500 group-hover:text-white transition-colors">
                      Open Category
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <footer className="text-center text-slate-600 text-sm mt-12">
          <p>© {new Date().getFullYear()} CS Visualize Project.</p>
        </footer>
      </div>
    </div>
  );
}
