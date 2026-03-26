'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Key, Lock, Unlock, RotateCw, Copy, Check } from 'lucide-react';

export default function CaesarCipherPage() {
  const [inputText, setInputText] = useState('');
  const [shift, setShift] = useState(3);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const caesarCipher = (text: string, shiftAmount: number, isDecrypt: boolean = false) => {
    const actualShift = isDecrypt ? -shiftAmount : shiftAmount;
    let result = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char.match(/[a-z]/i)) {
        const code = char.charCodeAt(0);
        const isUpperCase = char === char.toUpperCase();
        const baseCode = isUpperCase ? 65 : 97;
        
        const shifted = ((code - baseCode + actualShift + 26) % 26) + baseCode;
        result += String.fromCharCode(shifted);
      } else {
        result += char;
      }
    }
    
    return result;
  };

  const handleProcess = () => {
    const result = caesarCipher(inputText, shift, mode === 'decrypt');
    setOutput(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCharacterBreakdown = () => {
    if (!inputText) return [];
    
    return inputText.split('').map((char, idx) => {
      if (!char.match(/[a-z]/i)) {
        return { original: char, shifted: char, shiftValue: 0 };
      }

      const code = char.charCodeAt(0);
      const isUpperCase = char === char.toUpperCase();
      const baseCode = isUpperCase ? 65 : 97;
      const actualShift = mode === 'decrypt' ? -shift : shift;
      
      const charPosition = code - baseCode;
      const newPosition = (charPosition + actualShift + 26) % 26;
      const shifted = String.fromCharCode(baseCode + newPosition);
      
      return { 
        original: char, 
        shifted, 
        shiftValue: actualShift,
        originalPos: charPosition,
        newPos: newPosition
      };
    });
  };

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
          <div className="text-sm text-slate-400">Caesar Cipher</div>
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
            href="/cipher/substitution"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Substitution
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent pb-2">
            Caesar Cipher
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Classical shift cipher used by Julius Caesar (~100 BC)
          </p>
        </header>

        {/* Info Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-cyan-400 font-semibold mb-1">How it works</div>
              <div className="text-slate-400">Each letter is shifted by a fixed number of positions in the alphabet</div>
            </div>
            <div>
              <div className="text-blue-400 font-semibold mb-1">Security</div>
              <div className="text-slate-400">Very low - only 26 possible keys, easily broken</div>
            </div>
            <div>
              <div className="text-purple-400 font-semibold mb-1">Example</div>
              <div className="text-slate-400">HELLO → KHOOR (shift of 3)</div>
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
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Lock className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-semibold">Encrypt</div>
                </button>
                <button
                  onClick={() => setMode('decrypt')}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                    mode === 'decrypt'
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Unlock className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-semibold">Decrypt</div>
                </button>
              </div>
            </div>

            {/* Shift Control */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Shift Amount: <span className="text-cyan-400">{shift}</span>
              </label>
              <input
                type="range"
                min="0"
                max="25"
                value={shift}
                onChange={(e) => setShift(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>0</span>
                <span>13</span>
                <span>25</span>
              </div>
            </div>

            {/* Input Text */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Input Text</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.toUpperCase())}
                placeholder="Enter text to encrypt or decrypt..."
                className="w-full h-32 px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none font-mono"
              />
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold text-white transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 flex items-center justify-center gap-2"
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
              <div className="w-full h-32 px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-cyan-300 font-mono overflow-auto">
                {output || <span className="text-slate-500">Output will appear here...</span>}
              </div>
            </div>

            {/* Character Breakdown */}
            {inputText && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Character Breakdown</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getCharacterBreakdown().slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-700 rounded-lg text-sm hover:border-cyan-500/50 transition-all"
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseLeave={() => setHighlightIndex(-1)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-lg text-slate-100">{item.original}</span>
                        {item.shiftValue !== 0 && (
                          <>
                            <span className="text-slate-500">→</span>
                            <span className="font-mono text-lg text-cyan-400">{item.shifted}</span>
                          </>
                        )}
                      </div>
                      {item.shiftValue !== 0 && (
                        <div className="text-xs text-slate-500">
                          {item.originalPos} → {item.newPos}
                        </div>
                      )}
                    </div>
                  ))}
                  {getCharacterBreakdown().length > 10 && (
                    <div className="text-center text-xs text-slate-500 pt-2">
                      ... and {getCharacterBreakdown().length - 10} more characters
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alphabet Reference */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Alphabet Shift Reference</h3>
              <div className="grid grid-cols-13 gap-1 mb-2">
                {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((char, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-mono text-slate-400 p-1"
                  >
                    {char}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-13 gap-1">
                {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((char, idx) => {
                  const shifted = String.fromCharCode(65 + ((idx + shift) % 26));
                  return (
                    <div
                      key={idx}
                      className="text-center text-xs font-mono text-cyan-400 p-1 bg-cyan-500/10 rounded"
                    >
                      {shifted}
                    </div>
                  );
                })}
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
          background: #22d3ee;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
        }
      `}</style>
    </div>
  );
}
