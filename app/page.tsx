'use client';

import Link from 'next/link';
import { Network, ArrowRight, GitMerge, FileCode, FlaskConical, MoreHorizontal } from 'lucide-react';

const tools = [
  {
    title: "Visualize Step by Step",
    description: "Interactive automata visualization and simulation. Build and test your automata.",
    href: "/visualizer",
    icon: Network,
    color: "text-blue-400 group-hover:text-blue-300",
    bg: "bg-blue-500/10 group-hover:bg-blue-500/20",
    border: "border-blue-500/20 hover:border-blue-500/40",
    badge: "Current"
  },
  {
    title: "Convert NFA to DFA",
    description: "Subset Construction → Lazy Evaluation algorithm. Visualize the conversion process.",
    href: "/converter/nfa-to-dfa",
    icon: GitMerge,
    color: "text-purple-400 group-hover:text-purple-300",
    bg: "bg-purple-500/10 group-hover:bg-purple-500/20",
    border: "border-purple-500/20 hover:border-purple-500/40"
  },
  {
    title: "Convert ENFA to DFA",
    description: "N-Closure → Subset Construction → Lazy Evaluation for Epsilon-NFA.",
    href: "/converter/enfa-to-dfa",
    icon: FileCode,
    color: "text-green-400 group-hover:text-green-300",
    bg: "bg-green-500/10 group-hover:bg-green-500/20",
    border: "border-green-500/20 hover:border-green-500/40"
  },
  {
    title: "Convert RE to ENFA",
    description: "Convert Regular Expressions to Epsilon-NFA.",
    href: "/converter/re-to-enfa",
    icon: FlaskConical,
    color: "text-orange-400 group-hover:text-orange-300",
    bg: "bg-orange-500/10 group-hover:bg-orange-500/20",
    border: "border-orange-500/20 hover:border-orange-500/40"
  },
  {
    title: "Coming Soon",
    description: "More automata tools and converters in the future.",
    href: "#",
    icon: MoreHorizontal,
    color: "text-gray-400",
    bg: "bg-gray-800/50",
    border: "border-gray-800",
    disabled: true
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-6xl w-full flex flex-col gap-12">
        
        <header className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent pb-2">
            AutomataViz
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            A comprehensive suite for visualizing, simulating, and converting finite automata and regular expressions.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                
                {/* Decorative background gradient */}
                {!tool.disabled && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                )}
              </Link>
            );
          })}
        </div>
        
        <footer className="text-center text-slate-600 text-sm mt-12">
          <p>© {new Date().getFullYear()} AutomataViz Project. Built for education.</p>
        </footer>
      </div>
    </div>
  );
}
