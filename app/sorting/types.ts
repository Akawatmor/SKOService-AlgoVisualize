// ─── Sorting Visualizer — Type Definitions ───

export type SortAlgorithm =
  // Comparison Sorts
  | 'bubble-sort'
  | 'selection-sort'
  | 'insertion-sort'
  | 'merge-sort'
  | 'quick-sort'
  | 'heap-sort'
  | 'shell-sort'
  | 'tim-sort'
  | 'intro-sort'
  | 'tree-sort'
  | 'comb-sort'
  | 'cocktail-sort'
  | 'gnome-sort'
  | 'odd-even-sort'
  // Non-Comparison Sorts
  | 'counting-sort'
  | 'radix-sort'
  | 'bucket-sort'
  | 'pigeonhole-sort';

export type SortCategory = 'comparison' | 'non-comparison';

export interface SortAlgorithmInfo {
  id: SortAlgorithm;
  name: string;
  category: SortCategory;
  timeComplexity: {
    best: string;
    average: string;
    worst: string;
  };
  spaceComplexity: string;
  stable: boolean;
  description: string;
}

export interface ArrayElement {
  value: number;
  state: 'default' | 'comparing' | 'swapping' | 'sorted' | 'pivot' | 'current' | 'temp';
  originalIndex: number;
}

export interface SortStep {
  array: ArrayElement[];
  comparisons: number;
  swaps: number;
  accesses: number;
  message: string;
  highlightIndices?: number[];
}

export interface SortStatistics {
  algorithm: SortAlgorithm;
  arraySize: number;
  comparisons: number;
  swaps: number;
  accesses: number;
  timeElapsed: number;
  steps: number;
}

export interface VisualizerState {
  array: ArrayElement[];
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  speed: number;
  sortHistory: SortStep[];
  statistics: SortStatistics;
}
