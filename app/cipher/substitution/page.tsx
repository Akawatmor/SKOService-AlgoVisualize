'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Key, Shield, Lock, Unlock, ChevronRight, History } from 'lucide-react';

interface Cipher {
  id: string;
  name: string;
  description: string;
  complexity: string;
  security: 'Very Low' | 'Low' | 'Medium' | 'High';
  keyType: string;
  example: {
    plaintext: string;
    key: string;
    ciphertext: string;
  };
  historical?: {
    year: string;
    inventor?: string;
    usage?: string;
  };
  color: string;
  icon: any;
  hasVisualizer?: boolean;
}

const substitutionCiphers: Cipher[] = [
  {
    id: 'caesar',
    name: 'Caesar Cipher',
    description: 'Simple shift cipher where each letter is replaced by a letter some fixed number of positions down the alphabet.',
    complexity: 'O(n)',
    security: 'Very Low',
    keyType: 'Number (0-25)',
    example: {
      plaintext: 'HELLO',
      key: '3',
      ciphertext: 'KHOOR',
    },
    historical: {
      year: '~100 BC',
      inventor: 'Julius Caesar',
      usage: 'Military communications in the Roman Empire',
    },
    color: 'cyan',
    icon: Key,
    hasVisualizer: true,
  },
  {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    description: 'Polyalphabetic substitution cipher using a keyword to determine shift values for each position.',
    complexity: 'O(n)',
    security: 'Low',
    keyType: 'Text (Keyword)',
    example: {
      plaintext: 'HELLO',
      key: 'KEY',
      ciphertext: 'RIJVS',
    },
    historical: {
      year: '1553',
      inventor: 'Giovan Battista Bellaso',
      usage: 'European diplomacy and military',
    },
    color: 'blue',
    icon: Shield,
  },
  {
    id: 'affine',
    name: 'Affine Cipher',
    description: 'Mathematical cipher using modular arithmetic: E(x) = (ax + b) mod 26.',
    complexity: 'O(n)',
    security: 'Very Low',
    keyType: 'Two numbers (a, b)',
    example: {
      plaintext: 'HELLO',
      key: '(5, 8)',
      ciphertext: 'RCLLA',
    },
    historical: {
      year: 'Ancient',
      usage: 'Mathematical encryption',
    },
    color: 'purple',
    icon: Lock,
  },
  {
    id: 'atbash',
    name: 'Atbash Cipher',
    description: 'Monoalphabetic substitution cipher where A→Z, B→Y, C→X, etc. No key needed.',
    complexity: 'O(n)',
    security: 'Very Low',
    keyType: 'None',
    example: {
      plaintext: 'HELLO',
      key: 'N/A',
      ciphertext: 'SVOOL',
    },
    historical: {
      year: '~500 BC',
      usage: 'Hebrew alphabet encryption',
    },
    color: 'green',
    icon: Unlock,
  },
  {
    id: 'rot13',
    name: 'ROT13',
    description: 'Special case of Caesar cipher with a shift of 13. Self-inverse (encrypting twice returns original).',
    complexity: 'O(n)',
    security: 'Very Low',
    keyType: 'Fixed (13)',
    example: {
      plaintext: 'HELLO',
      key: '13',
      ciphertext: 'URYYB',
    },
    historical: {
      year: 'Modern',
      usage: 'Obscuring spoilers and jokes online',
    },
    color: 'orange',
    icon: Key,
  },
  {
    id: 'playfair',
    name: 'Playfair Cipher',
    description: 'Digraph substitution cipher using a 5×5 matrix of letters based on a keyword.',
    complexity: 'O(n)',
    security: 'Low',
    keyType: 'Text (Keyword)',
    example: {
      plaintext: 'HELLO',
      key: 'MONARCHY',
      ciphertext: 'GATLMZ',
    },
    historical: {
      year: '1854',
      inventor: 'Charles Wheatstone',
      usage: 'British military in WWI',
    },
    color: 'pink',
    icon: Shield,
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
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      hover: 'hover:border-purple-500/40',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    green: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      hover: 'hover:border-green-500/40',
      badge: 'bg-green-500/20 text-green-300 border-green-500/30',
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

const getSecurityColor = (security: string) => {
  switch (security) {
    case 'Very Low':
      return 'text-red-400';
    case 'Low':
      return 'text-orange-400';
    case 'Medium':
      return 'text-yellow-400';
    case 'High':
      return 'text-green-400';
    default:
      return 'text-slate-400';
  }
};

export default function SubstitutionCiphersPage() {
  const [selectedCipher, setSelectedCipher] = useState<Cipher | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-20 w-80 h-80 bg-violet-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-pink-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Substitution Ciphers</div>
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
            href="/cipher"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cipher
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-purple-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_16px_rgba(139,92,246,0.25)]">
            Substitution Ciphers
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Explore classical substitution ciphers that replace characters with other characters.
          </p>
        </header>

        {/* Introduction Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <History className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">About Substitution Ciphers</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Substitution ciphers are among the oldest encryption methods, where each character in the plaintext 
                is replaced with another character according to a fixed system. While not secure by modern standards, 
                they provide excellent educational value in understanding cryptographic principles.
              </p>
            </div>
          </div>
        </div>

        {/* Ciphers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {substitutionCiphers.map((cipher) => {
            const Icon = cipher.icon;
            const colors = getColorClasses(cipher.color);
            const securityColor = getSecurityColor(cipher.security);

            return (
              <Link
                key={cipher.id}
                href={cipher.hasVisualizer ? `/cipher/substitution/${cipher.id}` : '#'}
                onClick={(e) => {
                  if (!cipher.hasVisualizer) {
                    e.preventDefault();
                    setSelectedCipher(cipher);
                  }
                }}
                className={`
                  relative group p-5 rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-sm
                  ${colors.border} ${colors.bg} ${colors.hover}
                  hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30
                `}
              >
                <div className="relative z-10 flex flex-col h-full gap-4">
                  {/* Icon & Security Badge */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 w-fit border border-slate-800 backdrop-blur-sm ${colors.text}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${securityColor} bg-slate-900/70 border border-slate-700/80`}>
                      {cipher.security}
                    </span>
                  </div>

                  {/* Name & Description */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                      {cipher.name}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">
                      {cipher.description}
                    </p>
                  </div>

                  {/* Technical Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Complexity:</span>
                      <span className="font-mono font-bold text-slate-300">{cipher.complexity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Key Type:</span>
                      <span className="font-mono font-bold text-slate-300">{cipher.keyType}</span>
                    </div>
                  </div>

                  {/* Example */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-2">Example:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Plain:</span>
                        <span className="font-mono text-slate-200">{cipher.example.plaintext}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Key:</span>
                        <span className={`font-mono ${colors.text}`}>{cipher.example.key}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cipher:</span>
                        <span className="font-mono text-slate-200">{cipher.example.ciphertext}</span>
                      </div>
                    </div>
                  </div>

                  {/* Historical Info */}
                  {cipher.historical && (
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                      <div>📜 {cipher.historical.year}</div>
                      {cipher.historical.inventor && (
                        <div className="text-slate-400 mt-1">{cipher.historical.inventor}</div>
                      )}
                    </div>
                  )}

                  {/* Try Button */}
                  <div className="mt-auto flex items-center text-sm font-medium text-slate-500 group-hover:text-violet-400 transition-colors">
                    {cipher.hasVisualizer ? 'Try Visualizer' : 'View Details'}
                    <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                  
                  {cipher.hasVisualizer && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-500/20 border border-green-500/40 rounded text-xs font-semibold text-green-300">
                      Interactive
                    </div>
                  )}
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
              </Link>
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
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Cipher</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Key Type</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Security</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Era</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {substitutionCiphers.map((cipher) => {
                  const colors = getColorClasses(cipher.color);
                  const securityColor = getSecurityColor(cipher.security);
                  return (
                    <tr key={cipher.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${colors.text}`}>{cipher.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{cipher.keyType}</td>
                      <td className="py-3 px-4">
                        <span className={securityColor}>{cipher.security}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{cipher.historical?.year || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{cipher.complexity}</td>
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
            <div className="text-violet-400 font-bold mb-2 font-thai">🔐 Security Note</div>
            <div className="text-sm text-slate-400 leading-relaxed font-thai">
              All substitution ciphers are vulnerable to frequency analysis and should not be used for real security.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-pink-400 font-bold mb-2">📚 Learning Value</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              These ciphers are excellent for understanding basic cryptographic concepts and pattern recognition.
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-purple-400 font-bold mb-2">🎯 Best Practice</div>
            <div className="text-sm text-slate-400 leading-relaxed">
              Polyalphabetic ciphers like Vigenère offer better security than monoalphabetic ones like Caesar.
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} CS Visualize · Owner: Akawatmor</p>
        </footer>
      </div>

      {/* Selected Cipher Modal */}
      {selectedCipher && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCipher(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-slate-100 mb-4">{selectedCipher.name}</h3>
            <p className="text-slate-400 mb-4">{selectedCipher.description}</p>
            
            {selectedCipher.historical && (
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-slate-200 mb-2">Historical Context</h4>
                <div className="text-sm text-slate-400 space-y-1">
                  <div>📅 Year: {selectedCipher.historical.year}</div>
                  {selectedCipher.historical.inventor && (
                    <div>👤 Inventor: {selectedCipher.historical.inventor}</div>
                  )}
                  {selectedCipher.historical.usage && (
                    <div>🎯 Usage: {selectedCipher.historical.usage}</div>
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-slate-500">
              Click outside to close. Full interactive visualizer coming soon!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
