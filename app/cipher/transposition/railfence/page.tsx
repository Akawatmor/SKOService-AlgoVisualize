'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Shuffle, Copy, Check, RotateCw } from 'lucide-react';

export default function RailFenceCipherPage() {
  const [inputText, setInputText] = useState('');
  const [rails, setRails] = useState(3);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [visualization, setVisualization] = useState<string[][]>([]);

  const encryptRailFence = (text: string, numRails: number): { encrypted: string; grid: string[][] } => {
    if (numRails <= 1) return { encrypted: text, grid: [] };

    const cleanText = text.replace(/\s/g, '');
    const grid: string[][] = Array(numRails).fill(null).map(() => []);
    
    let row = 0;
    let direction = 1; // 1 for down, -1 for up

    for (let i = 0; i < cleanText.length; i++) {
      grid[row].push(cleanText[i]);
      
      // Change direction at top or bottom rail
      if (row === 0) {
        direction = 1;
      } else if (row === numRails - 1) {
        direction = -1;
      }
      
      row += direction;
    }

    // Read off rows
    const encrypted = grid.map(row => row.join('')).join('');
    
    return { encrypted, grid };
  };

  const decryptRailFence = (text: string, numRails: number): { decrypted: string; grid: string[][] } => {
    if (numRails <= 1) return { decrypted: text, grid: [] };

    const cleanText = text.replace(/\s/g, '');
    const grid: (string | null)[][] = Array(numRails).fill(null).map(() => []);
    
    // First, mark the positions
    let row = 0;
    let direction = 1;
    
    for (let i = 0; i < cleanText.length; i++) {
      grid[row].push(null);
      
      if (row === 0) {
        direction = 1;
      } else if (row === numRails - 1) {
        direction = -1;
      }
      
      row += direction;
    }

    // Fill in the characters
    let index = 0;
    for (let r = 0; r < numRails; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === null) {
          grid[r][c] = cleanText[index++];
        }
      }
    }

    // Read off in zigzag pattern
    let decrypted = '';
    row = 0;
    direction = 1;
    
    for (let i = 0; i < cleanText.length; i++) {
      decrypted += grid[row].shift() || '';
      
      if (row === 0) {
        direction = 1;
      } else if (row === numRails - 1) {
        direction = -1;
      }
      
      row += direction;
    }

    return { decrypted, grid: grid.map(r => r.filter(c => c !== null)) as string[][] };
  };

  const handleProcess = () => {
    if (!inputText) {
      setOutput('');
      setVisualization([]);
      return;
    }

    if (mode === 'encrypt') {
      const result = encryptRailFence(inputText, rails);
      setOutput(result.encrypted);
      setVisualization(result.grid);
    } else {
      const result = decryptRailFence(inputText, rails);
      setOutput(result.decrypted);
      setVisualization(result.grid);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-pink-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-orange-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Rail Fence Cipher</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Akawatmor
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/cipher/transposition"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transposition
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-pink-400 via-orange-400 to-amber-400 bg-clip-text text-transparent pb-2">
            Rail Fence Cipher
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Write text in zigzag pattern across multiple rails, then read row by row
          </p>
        </header>

        {/* Info Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-pink-400 font-semibold mb-1">How it works</div>
              <div className="text-slate-400">Text is arranged in a zigzag pattern across rails, then read horizontally</div>
            </div>
            <div>
              <div className="text-orange-400 font-semibold mb-1">Security</div>
              <div className="text-slate-400">Very low - pattern is easily recognizable</div>
            </div>
            <div>
              <div className="text-amber-400 font-semibold mb-1">Example</div>
              <div className="text-slate-400">HELLO → HOELL (3 rails)</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input & Controls */}
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Mode</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('encrypt')}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                    mode === 'encrypt'
                      ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Shuffle className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-semibold">Encrypt</div>
                </button>
                <button
                  onClick={() => setMode('decrypt')}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                    mode === 'decrypt'
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Shuffle className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-semibold">Decrypt</div>
                </button>
              </div>
            </div>

            {/* Rails Control */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Number of Rails: <span className="text-pink-400">{rails}</span>
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={rails}
                onChange={(e) => setRails(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>2</span>
                <span>6</span>
                <span>10</span>
              </div>
            </div>

            {/* Input Text */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Input Text</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.toUpperCase())}
                placeholder="Enter text to encrypt or decrypt..."
                className="w-full h-32 px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 resize-none font-mono"
              />
              <div className="text-xs text-slate-500 mt-2">
                Spaces will be removed automatically
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 rounded-lg font-semibold text-white transition-all shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
            </button>
          </div>

          {/* Right Panel - Output & Visualization */}
          <div className="space-y-6">
            {/* Output Text */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-300">Output</label>
                {output && (
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-all flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="w-full min-h-[80px] px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-pink-300 font-mono overflow-auto">
                {output || <span className="text-slate-500">Output will appear here...</span>}
              </div>
            </div>

            {/* Rail Pattern Visualization */}
            {visualization.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Rail Pattern</h3>
                <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                  <div className="space-y-2 font-mono text-sm">
                    {visualization.map((rail, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="text-slate-500 w-16 text-xs">Rail {idx + 1}:</div>
                        <div className="flex gap-1">
                          {rail.map((char, charIdx) => (
                            <div
                              key={charIdx}
                              className="w-8 h-8 flex items-center justify-center bg-pink-500/20 border border-pink-500/30 rounded text-pink-300"
                            >
                              {char}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-3">
                  {mode === 'encrypt' 
                    ? 'Characters are arranged in zigzag pattern, then read row by row'
                    : 'Pattern is reconstructed to decrypt the message'}
                </div>
              </div>
            )}

            {/* How it Works */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">How Rail Fence Works</h3>
              <div className="space-y-3 text-sm text-slate-400">
                <div>
                  <span className="text-pink-400 font-semibold">Step 1:</span> Write text in zigzag pattern across multiple rails
                </div>
                <div>
                  <span className="text-orange-400 font-semibold">Step 2:</span> Read off each rail from top to bottom
                </div>
                <div>
                  <span className="text-amber-400 font-semibold">Example:</span> "HELLO" with 3 rails:
                </div>
                <div className="bg-slate-950/50 border border-slate-700 rounded p-3 font-mono text-xs">
                  <div>H . . . O</div>
                  <div>. E . L .</div>
                  <div>. . L . .</div>
                  <div className="mt-2 text-pink-400">Result: HOELL</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} CS Visualize · Owner: Akawatmor</p>
        </footer>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ec4899;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ec4899;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }
      `}</style>
    </div>
  );
}
