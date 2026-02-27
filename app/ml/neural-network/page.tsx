'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Minus, Sigma, Layers, Home } from 'lucide-react';

type Activation = 'relu' | 'tanh' | 'sigmoid' | 'linear';

export default function NeuralNetworkBuilderPage() {
  const [inputSize, setInputSize] = useState(4);
  const [outputSize, setOutputSize] = useState(2);
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([8, 8]);
  const [activation, setActivation] = useState<Activation>('relu');

  const architecture = useMemo(() => [inputSize, ...hiddenLayers, outputSize], [inputSize, hiddenLayers, outputSize]);

  const totalParams = useMemo(() => {
    let params = 0;
    for (let i = 0; i < architecture.length - 1; i += 1) {
      const inUnits = architecture[i];
      const outUnits = architecture[i + 1];
      params += inUnits * outUnits + outUnits;
    }
    return params;
  }, [architecture]);

  const addHiddenLayer = () => setHiddenLayers((prev) => [...prev, 8]);

  const removeHiddenLayer = (index: number) => {
    setHiddenLayers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateHiddenUnits = (index: number, value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const safe = Math.max(1, Math.min(512, Math.floor(numeric)));
    setHiddenLayers((prev) => prev.map((units, idx) => (idx === index ? safe : units)));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-4 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Link href="/ml" className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Neural Network Builder
            </h1>
            <p className="text-sm text-slate-400">Configure a feed-forward model architecture and estimate trainable parameters.</p>
          </div>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm shrink-0">
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 sm:gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2"><Layers className="w-5 h-5 text-cyan-400" />Architecture</h2>
            <button
              onClick={addHiddenLayer}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 rounded-md font-medium w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Add Hidden Layer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-sm text-slate-300">Input Features</span>
              <input
                type="number"
                min={1}
                max={2048}
                value={inputSize}
                onChange={(e) => setInputSize(Math.max(1, Math.min(2048, Number(e.target.value) || 1)))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm text-slate-300">Output Units</span>
              <input
                type="number"
                min={1}
                max={2048}
                value={outputSize}
                onChange={(e) => setOutputSize(Math.max(1, Math.min(2048, Number(e.target.value) || 1)))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm text-slate-300">Hidden Activation</span>
              <select
                value={activation}
                onChange={(e) => setActivation(e.target.value as Activation)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value="relu">ReLU</option>
                <option value="tanh">Tanh</option>
                <option value="sigmoid">Sigmoid</option>
                <option value="linear">Linear</option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Hidden Layers</h3>
            {hiddenLayers.length === 0 ? (
              <div className="text-sm text-slate-400 border border-dashed border-slate-700 rounded-md p-3">
                No hidden layers. Current model is equivalent to logistic/linear regression.
              </div>
            ) : (
              hiddenLayers.map((units, index) => (
                <div key={`${index}-${units}`} className="flex flex-wrap items-center gap-3 border border-slate-800 rounded-md p-3 bg-slate-950/40">
                  <span className="text-sm text-slate-300 w-full sm:w-28">Layer {index + 1}</span>
                  <input
                    type="number"
                    min={1}
                    max={512}
                    value={units}
                    onChange={(e) => updateHiddenUnits(index, e.target.value)}
                    className="w-24 sm:w-28 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
                  />
                  <span className="text-sm text-slate-400">neurons</span>
                  <button
                    onClick={() => removeHiddenLayer(index)}
                    className="sm:ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-rose-700/80 hover:bg-rose-700 rounded"
                  >
                    <Minus className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2"><Sigma className="w-5 h-5 text-violet-400" />Model Summary</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-400">Layers</div>
              <div className="text-xl font-bold text-cyan-300">{architecture.length}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-400">Trainable Params</div>
              <div className="text-xl font-bold text-violet-300">{totalParams.toLocaleString()}</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-200">Architecture Path</div>
            <div className="flex flex-wrap gap-2">
              {architecture.map((units, index) => (
                <div key={`${units}-${index}`} className="inline-flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-100 text-sm border border-slate-700">
                    {index === 0 ? `Input (${units})` : index === architecture.length - 1 ? `Output (${units})` : `Dense (${units})`}
                  </span>
                  {index < architecture.length - 1 && <span className="text-slate-500">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300 leading-relaxed">
            <div><span className="text-slate-400">Hidden activation:</span> <span className="font-semibold text-cyan-300 uppercase">{activation}</span></div>
            <div className="mt-2 text-slate-400">
              Parameter formula per dense layer: <span className="text-slate-200">(in_units × out_units) + out_units</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
