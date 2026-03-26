// ─── Sorting Visualizer — Utility Functions ───

import type { ArrayElement, SortStep } from './types';

export function createArrayElement(value: number, index: number): ArrayElement {
  return {
    value,
    state: 'default',
    originalIndex: index,
  };
}

export function generateRandomArray(size: number, min: number = 5, max: number = 100): ArrayElement[] {
  const array: ArrayElement[] = [];
  for (let i = 0; i < size; i++) {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    array.push(createArrayElement(value, i));
  }
  return array;
}

export function parseInputArray(input: string): ArrayElement[] | null {
  try {
    const values = input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number);
    
    if (values.some(isNaN)) return null;
    if (values.length === 0) return null;
    
    return values.map((value, index) => createArrayElement(value, index));
  } catch {
    return null;
  }
}

export function copyArray(array: ArrayElement[]): ArrayElement[] {
  return array.map(el => ({ ...el }));
}

export function createStep(
  array: ArrayElement[],
  comparisons: number,
  swaps: number,
  accesses: number,
  message: string,
  highlightIndices?: number[]
): SortStep {
  return {
    array: copyArray(array),
    comparisons,
    swaps,
    accesses,
    message,
    highlightIndices,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isSorted(array: ArrayElement[]): boolean {
  for (let i = 1; i < array.length; i++) {
    if (array[i].value < array[i - 1].value) return false;
  }
  return true;
}
