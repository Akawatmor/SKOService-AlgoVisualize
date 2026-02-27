'use client';

import Link from 'next/link';
import { Network, ArrowRight, GitMerge, FileCode, FlaskConical, MoreHorizontal, BookOpen, ArrowLeft, Home } from 'lucide-react';

const tools = [
  {
    title: 'Visualize Step by Step',
    description: 'Interactive automata visualization and simulation. Build and test your automata.',
    href: '/automata/visualizer',
    icon: Network,
    color: 'text-blue-400 group-hover:text-blue-300',
    bg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    badge: 'Current',
  },
  {
    title: 'Convert NFA to DFA',
    description: 'Subset Construction → Lazy Evaluation algorithm. Visualize the conversion process.',
    href: '/automata/converter/nfa-to-dfa',
    icon: GitMerge,
    color: 'text-purple-400 group-hover:text-purple-300',
    bg: 'bg-purple-500/10 group-hover:bg-purple-500/20',
    border: 'border-purple-500/20 hover:border-purple-500/40',
  },
  {
    title: 'Convert ENFA to DFA',
    description: 'N-Closure → Subset Construction → Lazy Evaluation for Epsilon-NFA.',
    href: '/automata/converter/enfa-to-dfa',
    icon: FileCode,
    color: 'text-green-400 group-hover:text-green-300',
    bg: 'bg-green-500/10 group-hover:bg-green-500/20',
    border: 'border-green-500/20 hover:border-green-500/40',
  },
  {
    title: 'Convert RE to ENFA',
    description: 'Convert Regular Expressions to Epsilon-NFA.',
    href: '/automata/converter/re-to-enfa',
    icon: FlaskConical,
    color: 'text-orange-400 group-hover:text-orange-300',
    bg: 'bg-orange-500/10 group-hover:bg-orange-500/20',
    border: 'border-orange-500/20 hover:border-orange-500/40',
  },
  {
    title: 'Language Acceptance Checker',
    description: 'Check if a string is accepted by RL (RegEx/NFA), CFL (CFG/CYK), or REL (Turing Machine). Step-by-step trace with Chomsky hierarchy.',
    href: '/automata/language-checker',
    icon: BookOpen,
    color: 'text-teal-400 group-hover:text-teal-300',
    bg: 'bg-teal-500/10 group-hover:bg-teal-500/20',
    border: 'border-teal-500/20 hover:border-teal-500/40',
  },
  {
    title: 'Coming Soon',
    description: 'More automata tools and converters in the future.',
    href: '#',
    icon: MoreHorizontal,
    color: 'text-gray-400',
    bg: 'bg-gray-800/50',
    border: 'border-gray-800',
    disabled: true,
  },
];

export default function AutomataHome() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-blue-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-fuchsia-500/10 blur-3xl rounded-full" />
      </div>

      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Automata Collection</div>
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(99,102,241,0.25)]">
            AutomataViz
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            A comprehensive suite for visualizing, simulating, and converting finite automata and regular expressions.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link
                key={index}
                href={tool.disabled ? '#' : tool.href}
                className={`
                  relative group p-5 sm:p-6 rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-sm
                  ${tool.border} ${tool.bg}
                  ${tool.disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30'}
                `}
                aria-disabled={tool.disabled}
              >
                <div className="relative z-10 flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 w-fit border border-slate-800 backdrop-blur-sm ${tool.color}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    {tool.badge && (
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 shadow-inner shadow-blue-500/10">
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                      {tool.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">
                      {tool.description}
                    </p>
                  </div>

                  {!tool.disabled && (
                    <div className="mt-auto pt-4 flex items-center text-sm font-medium text-slate-500 group-hover:text-white transition-colors">
                      Launch Tool
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </div>

                {!tool.disabled && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                )}
              </Link>
            );
          })}
        </div>

        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} AutomataViz · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
