'use client';

import Link from 'next/link';
import { ArrowLeft, Home, Play, RotateCcw, Plus, Minus, Network } from 'lucide-react';
import { useState, useCallback, useEffect, ReactElement } from 'react';

// Activation functions and their derivatives
const activations = {
  relu: {
    fn: (x: number) => Math.max(0, x),
    derivative: (x: number) => (x > 0 ? 1 : 0),
  },
  sigmoid: {
    fn: (x: number) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))),
    derivative: (x: number) => {
      const s = activations.sigmoid.fn(x);
      return s * (1 - s);
    },
  },
  tanh: {
    fn: (x: number) => Math.tanh(x),
    derivative: (x: number) => 1 - Math.pow(Math.tanh(x), 2),
  },
  linear: {
    fn: (x: number) => x,
    derivative: () => 1,
  },
};

type ActivationType = keyof typeof activations;

interface Layer {
  neurons: number;
  activation: ActivationType;
}

interface NetworkState {
  weights: number[][][]; // [layer][neuron][weight]
  biases: number[][];    // [layer][neuron]
}

interface ForwardResult {
  activations: number[][];  // [layer][neuron]
  zValues: number[][];      // pre-activation values
}

// Initialize network with random weights
function initializeNetwork(layers: Layer[], inputSize: number): NetworkState {
  const weights: number[][][] = [];
  const biases: number[][] = [];
  
  let prevSize = inputSize;
  for (const layer of layers) {
    const layerWeights: number[][] = [];
    const layerBiases: number[] = [];
    
    for (let n = 0; n < layer.neurons; n++) {
      const neuronWeights: number[] = [];
      // Xavier initialization
      const scale = Math.sqrt(2 / (prevSize + layer.neurons));
      for (let w = 0; w < prevSize; w++) {
        neuronWeights.push((Math.random() * 2 - 1) * scale);
      }
      layerWeights.push(neuronWeights);
      layerBiases.push((Math.random() * 2 - 1) * 0.1);
    }
    
    weights.push(layerWeights);
    biases.push(layerBiases);
    prevSize = layer.neurons;
  }
  
  return { weights, biases };
}

// Forward propagation
function forward(input: number[], network: NetworkState, layers: Layer[]): ForwardResult {
  const allActivations: number[][] = [input];
  const zValues: number[][] = [];
  
  let currentInput = input;
  
  for (let l = 0; l < layers.length; l++) {
    const layerZ: number[] = [];
    const layerActivations: number[] = [];
    const activation = activations[layers[l].activation];
    
    for (let n = 0; n < layers[l].neurons; n++) {
      let z = network.biases[l][n];
      for (let w = 0; w < currentInput.length; w++) {
        z += currentInput[w] * network.weights[l][n][w];
      }
      layerZ.push(z);
      layerActivations.push(activation.fn(z));
    }
    
    zValues.push(layerZ);
    allActivations.push(layerActivations);
    currentInput = layerActivations;
  }
  
  return { activations: allActivations, zValues };
}

// Backpropagation
function backward(
  network: NetworkState,
  layers: Layer[],
  forwardResult: ForwardResult,
  target: number[],
  learningRate: number
): { newNetwork: NetworkState; loss: number } {
  const { activations: acts, zValues } = forwardResult;
  const output = acts[acts.length - 1];
  
  // Calculate MSE loss
  let loss = 0;
  for (let i = 0; i < output.length; i++) {
    loss += Math.pow(output[i] - target[i], 2);
  }
  loss /= output.length;
  
  // Clone network for updates
  const newWeights = network.weights.map(layer => 
    layer.map(neuron => [...neuron])
  );
  const newBiases = network.biases.map(layer => [...layer]);
  
  // Calculate deltas (error gradients)
  const deltas: number[][] = [];
  
  // Output layer deltas
  const outputDeltas: number[] = [];
  const outputActivation = activations[layers[layers.length - 1].activation];
  for (let n = 0; n < output.length; n++) {
    const error = output[n] - target[n];
    outputDeltas.push(error * outputActivation.derivative(zValues[layers.length - 1][n]));
  }
  deltas.unshift(outputDeltas);
  
  // Hidden layer deltas (backpropagate)
  for (let l = layers.length - 2; l >= 0; l--) {
    const layerDeltas: number[] = [];
    const activation = activations[layers[l].activation];
    
    for (let n = 0; n < layers[l].neurons; n++) {
      let error = 0;
      for (let nextN = 0; nextN < layers[l + 1].neurons; nextN++) {
        error += deltas[0][nextN] * network.weights[l + 1][nextN][n];
      }
      layerDeltas.push(error * activation.derivative(zValues[l][n]));
    }
    deltas.unshift(layerDeltas);
  }
  
  // Update weights and biases
  for (let l = 0; l < layers.length; l++) {
    for (let n = 0; n < layers[l].neurons; n++) {
      newBiases[l][n] -= learningRate * deltas[l][n];
      for (let w = 0; w < acts[l].length; w++) {
        newWeights[l][n][w] -= learningRate * deltas[l][n] * acts[l][w];
      }
    }
  }
  
  return { newNetwork: { weights: newWeights, biases: newBiases }, loss };
}

// XOR training data
const XOR_DATA = [
  { input: [0, 0], target: [0] },
  { input: [0, 1], target: [1] },
  { input: [1, 0], target: [1] },
  { input: [1, 1], target: [0] },
];

export default function NeuralNetworkBuilder() {
  const [layers, setLayers] = useState<Layer[]>([
    { neurons: 4, activation: 'relu' },
    { neurons: 1, activation: 'sigmoid' },
  ]);
  const [inputSize] = useState(2);
  const [network, setNetwork] = useState<NetworkState | null>(null);
  const [learningRate, setLearningRate] = useState(0.5);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState<number | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [predictions, setPredictions] = useState<{ input: number[]; output: number; target: number }[]>([]);
  const [lossHistory, setLossHistory] = useState<number[]>([]);

  // Initialize network
  const initNetwork = useCallback(() => {
    const net = initializeNetwork(layers, inputSize);
    setNetwork(net);
    setEpoch(0);
    setLoss(null);
    setPredictions([]);
    setLossHistory([]);
  }, [layers, inputSize]);

  useEffect(() => {
    initNetwork();
  }, []);

  // Single training step
  const trainStep = useCallback(() => {
    if (!network) return;

    let totalLoss = 0;
    let currentNet = network;

    // Train on all XOR samples
    for (const sample of XOR_DATA) {
      const fwd = forward(sample.input, currentNet, layers);
      const result = backward(currentNet, layers, fwd, sample.target, learningRate);
      currentNet = result.newNetwork;
      totalLoss += result.loss;
    }

    totalLoss /= XOR_DATA.length;
    setNetwork(currentNet);
    setLoss(totalLoss);
    setEpoch(e => e + 1);
    setLossHistory(h => [...h.slice(-99), totalLoss]);

    // Calculate predictions
    const preds = XOR_DATA.map(sample => {
      const fwd = forward(sample.input, currentNet, layers);
      return {
        input: sample.input,
        output: fwd.activations[fwd.activations.length - 1][0],
        target: sample.target[0],
      };
    });
    setPredictions(preds);
  }, [network, layers, learningRate]);

  // Auto training
  useEffect(() => {
    if (!isTraining) return;
    const interval = setInterval(trainStep, 50);
    return () => clearInterval(interval);
  }, [isTraining, trainStep]);

  const addLayer = () => {
    if (layers.length >= 5) return;
    const newLayers = [...layers];
    newLayers.splice(layers.length - 1, 0, { neurons: 4, activation: 'relu' });
    setLayers(newLayers);
  };

  const removeLayer = (index: number) => {
    if (layers.length <= 1) return;
    setLayers(layers.filter((_, i) => i !== index));
  };

  const updateLayer = (index: number, field: 'neurons' | 'activation', value: number | ActivationType) => {
    const newLayers = [...layers];
    if (field === 'neurons') {
      newLayers[index].neurons = Math.max(1, Math.min(10, value as number));
    } else {
      newLayers[index].activation = value as ActivationType;
    }
    setLayers(newLayers);
  };

  // Calculate max neurons for visualization scaling
  const maxNeurons = Math.max(inputSize, ...layers.map(l => l.neurons));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">Neural Network Builder</div>
          <div className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Akawatmor</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">
        {/* Back buttons */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/ml" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to ML
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            <Home className="w-4 h-4" />
            Main
          </Link>
        </div>

        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full">
            <Network className="w-4 h-4" />
            Interactive Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent pb-2">
            Neural Network Builder
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Design and train feed-forward neural networks with backpropagation. Default: XOR problem.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Layer Configuration */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Network Architecture</h2>
            
            {/* Input Layer (fixed) */}
            <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Input Layer</div>
              <div className="text-lg font-semibold text-cyan-400">{inputSize} neurons</div>
            </div>

            {/* Hidden & Output Layers */}
            <div className="space-y-3 mb-4">
              {layers.map((layer, index) => (
                <div key={index} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">
                      {index === layers.length - 1 ? 'Output Layer' : `Hidden Layer ${index + 1}`}
                    </span>
                    {index !== layers.length - 1 && (
                      <button
                        onClick={() => removeLayer(index)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateLayer(index, 'neurons', layer.neurons - 1)}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-cyan-400">{layer.neurons}</span>
                      <button
                        onClick={() => updateLayer(index, 'neurons', layer.neurons + 1)}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <select
                      value={layer.activation}
                      onChange={e => updateLayer(index, 'activation', e.target.value as ActivationType)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="relu">ReLU</option>
                      <option value="sigmoid">Sigmoid</option>
                      <option value="tanh">Tanh</option>
                      <option value="linear">Linear</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addLayer}
              disabled={layers.length >= 5}
              className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Hidden Layer
            </button>

            {/* Learning Rate */}
            <div className="mt-6">
              <label className="text-sm text-slate-400 block mb-2">
                Learning Rate: {learningRate.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.01"
                max="2"
                step="0.01"
                value={learningRate}
                onChange={e => setLearningRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Controls */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={initNetwork}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => setIsTraining(!isTraining)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isTraining
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                {isTraining ? 'Stop' : 'Train'}
              </button>
            </div>

            <button
              onClick={trainStep}
              disabled={isTraining}
              className="w-full mt-3 py-2 px-4 rounded-lg border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
            >
              Single Step
            </button>
          </div>

          {/* Network Visualization */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Network Visualization</h2>
            
            <div className="relative h-64 bg-slate-800/50 rounded-lg overflow-hidden">
              <svg className="w-full h-full">
                {/* Draw layers */}
                {(() => {
                  const allLayers = [inputSize, ...layers.map(l => l.neurons)];
                  const layerSpacing = 100 / (allLayers.length + 1);
                  const elements: ReactElement[] = [];
                  
                  // Draw connections
                  for (let l = 0; l < allLayers.length - 1; l++) {
                    const x1 = (l + 1) * layerSpacing;
                    const x2 = (l + 2) * layerSpacing;
                    
                    for (let n1 = 0; n1 < allLayers[l]; n1++) {
                      const y1 = ((n1 + 1) / (allLayers[l] + 1)) * 100;
                      
                      for (let n2 = 0; n2 < allLayers[l + 1]; n2++) {
                        const y2 = ((n2 + 1) / (allLayers[l + 1] + 1)) * 100;
                        const weight = network?.weights[l]?.[n2]?.[n1] ?? 0;
                        const opacity = Math.min(Math.abs(weight) * 0.5, 1);
                        const color = weight >= 0 ? `rgba(34,211,238,${opacity})` : `rgba(239,68,68,${opacity})`;
                        
                        elements.push(
                          <line
                            key={`conn-${l}-${n1}-${n2}`}
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke={color}
                            strokeWidth="1"
                          />
                        );
                      }
                    }
                  }
                  
                  // Draw neurons
                  for (let l = 0; l < allLayers.length; l++) {
                    const x = (l + 1) * layerSpacing;
                    const isInput = l === 0;
                    const isOutput = l === allLayers.length - 1;
                    
                    for (let n = 0; n < allLayers[l]; n++) {
                      const y = ((n + 1) / (allLayers[l] + 1)) * 100;
                      const color = isInput ? '#60a5fa' : isOutput ? '#a78bfa' : '#22d3ee';
                      
                      elements.push(
                        <circle
                          key={`neuron-${l}-${n}`}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="8"
                          fill={color}
                          stroke="#1e293b"
                          strokeWidth="2"
                        />
                      );
                    }
                  }
                  
                  return elements;
                })()}
              </svg>
              
              {/* Layer labels */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-around text-xs text-slate-500">
                <span>Input</span>
                {layers.slice(0, -1).map((_, i) => (
                  <span key={i}>Hidden {i + 1}</span>
                ))}
                <span>Output</span>
              </div>
            </div>

            {/* Training Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-sm text-slate-400">Epoch</div>
                <div className="text-2xl font-bold text-cyan-400">{epoch}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-sm text-slate-400">Loss (MSE)</div>
                <div className="text-2xl font-bold text-orange-400">
                  {loss !== null ? loss.toFixed(6) : '—'}
                </div>
              </div>
            </div>

            {/* Loss History Chart */}
            {lossHistory.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-slate-400 mb-2">Loss History</div>
                <div className="h-16 bg-slate-800/50 rounded flex items-end gap-px p-1">
                  {lossHistory.map((l, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-cyan-500/60 rounded-t"
                      style={{ height: `${Math.min(l * 200, 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Predictions Table */}
        <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-4">XOR Predictions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-2 px-4 text-left">Input</th>
                  <th className="py-2 px-4 text-left">Target</th>
                  <th className="py-2 px-4 text-left">Output</th>
                  <th className="py-2 px-4 text-left">Rounded</th>
                  <th className="py-2 px-4 text-left">Correct</th>
                </tr>
              </thead>
              <tbody>
                {predictions.length > 0 ? predictions.map((pred, i) => {
                  const rounded = Math.round(pred.output);
                  const correct = rounded === pred.target;
                  return (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 px-4 font-mono">[{pred.input.join(', ')}]</td>
                      <td className="py-2 px-4 font-mono text-violet-400">{pred.target}</td>
                      <td className="py-2 px-4 font-mono text-cyan-400">{pred.output.toFixed(4)}</td>
                      <td className="py-2 px-4 font-mono">{rounded}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {correct ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Click "Train" or "Single Step" to see predictions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm mt-10 border-t border-slate-800 pt-6">
          <p>© {new Date().getFullYear()} Neural Network Builder · Owner: Akawatmor</p>
        </footer>
      </div>
    </div>
  );
}
