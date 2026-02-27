'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Network, MoreHorizontal, ArrowLeft, Home } from 'lucide-react';

const tools = [
  {
    title: 'Neural Network Builder',
    description: 'Design a feed-forward neural network architecture and inspect model size.',
    href: '/ml/neural-network',
    icon: Network,
    color: 'text-cyan-400 group-hover:text-cyan-300',
    bg: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    badge: 'Current',
  },
  {
    title: 'Coming Soon',
    description: 'More ML visual tools will be added in upcoming updates.',
    href: '#',
    icon: MoreHorizontal,
    color: 'text-gray-400',
    bg: 'bg-gray-800/50',
    border: 'border-gray-800',
    disabled: true,
  },
];

export default function MLHome() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full" />
      </div>

      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">ML Collection</div>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full">
            <Bot className="w-4 h-4" />
            Machine Learning
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(34,211,238,0.2)]">
            ML Visualize
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Interactive visual tools for machine learning concepts and model design.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                      <span className="px-3 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/30">
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
              </Link>
            );
          })}
        </div>

        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} ML Visualize · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
