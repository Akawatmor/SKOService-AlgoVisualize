'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Network, MoreHorizontal } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-6xl w-full flex flex-col gap-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full">
            <Bot className="w-4 h-4" />
            Machine Learning
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent pb-2">
            ML Visualize
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Interactive visual tools for machine learning concepts and model design.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link
                key={index}
                href={tool.disabled ? '#' : tool.href}
                className={`
                  relative group p-6 rounded-2xl border transition-all duration-300 overflow-hidden
                  ${tool.border} ${tool.bg}
                  ${tool.disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20'}
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
      </div>
    </div>
  );
}
