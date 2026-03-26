// ─── Sorting Algorithms Implementation ───

import type { ArrayElement, SortStep } from './types';
import { copyArray, createStep } from './utils';

function createArrayElement(value: number, originalIndex: number): ArrayElement {
  return { value, state: 'default', originalIndex };
}

// ════════════════════════════════════════════════════════════════════════
// BUBBLE SORT
// ════════════════════════════════════════════════════════════════════════

export function* bubbleSort(array: ArrayElement[]): Generator<SortStep> {
  const arr = copyArray(array);
  let comparisons = 0;
  let swaps = 0;
  let accesses = 0;
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    
    for (let j = 0; j < n - i - 1; j++) {
      arr[j].state = 'comparing';
      arr[j + 1].state = 'comparing';
      accesses += 2;
      
      yield createStep(arr, comparisons, swaps, accesses, `Comparing ${arr[j].value} and ${arr[j + 1].value}`, [j, j + 1]);
      
      comparisons++;
      if (arr[j].value > arr[j + 1].value) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        arr[j].state = 'swapping';
        arr[j + 1].state = 'swapping';
        swaps++;
        accesses += 4;
        
        yield createStep(arr, comparisons, swaps, accesses, `Swapping ${arr[j + 1].value} and ${arr[j].value}`, [j, j + 1]);
        swapped = true;
      }
      
      arr[j].state = 'default';
      arr[j + 1].state = 'default';
    }
    
    arr[n - i - 1].state = 'sorted';
    yield createStep(arr, comparisons, swaps, accesses, `Element ${arr[n - i - 1].value} is in correct position`);
    
    if (!swapped) break;
  }
  
  for (let i = 0; i < n; i++) arr[i].state = 'sorted';
  yield createStep(arr, comparisons, swaps, accesses, 'Array is sorted!');
}

// ════════════════════════════════════════════════════════════════════════
// SELECTION SORT
// ════════════════════════════════════════════════════════════════════════

export function* selectionSort(array: ArrayElement[]): Generator<SortStep> {
  const arr = copyArray(array);
  let comparisons = 0;
  let swaps = 0;
  let accesses = 0;
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    arr[minIdx].state = 'current';
    
    yield createStep(arr, comparisons, swaps, accesses, `Finding minimum from index ${i}`, [i]);
    
    for (let j = i + 1; j < n; j++) {
      arr[j].state = 'comparing';
      accesses += 2;
      
      yield createStep(arr, comparisons, swaps, accesses, `Comparing ${arr[j].value} with current minimum ${arr[minIdx].value}`, [j, minIdx]);
      
      comparisons++;
      if (arr[j].value < arr[minIdx].value) {
        arr[minIdx].state = 'default';
        minIdx = j;
        arr[minIdx].state = 'current';
      } else {
        arr[j].state = 'default';
      }
    }
    
    if (minIdx !== i) {
      arr[i].state = 'swapping';
      arr[minIdx].state = 'swapping';
      
      yield createStep(arr, comparisons, swaps, accesses, `Swapping ${arr[i].value} with ${arr[minIdx].value}`, [i, minIdx]);
      
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      swaps++;
      accesses += 4;
    }
    
    arr[i].state = 'sorted';
    if (minIdx !== i) arr[minIdx].state = 'default';
    
    yield createStep(arr, comparisons, swaps, accesses, `Element ${arr[i].value} is in correct position`);
  }
  
  arr[n - 1].state = 'sorted';
  yield createStep(arr, comparisons, swaps, accesses, 'Array is sorted!');
}

// ════════════════════════════════════════════════════════════════════════
// INSERTION SORT
// ════════════════════════════════════════════════════════════════════════

export function* insertionSort(array: ArrayElement[]): Generator<SortStep> {
  const arr = copyArray(array);
  let comparisons = 0;
  let swaps = 0;
  let accesses = 0;
  const n = arr.length;

  arr[0].state = 'sorted';
  yield createStep(arr, comparisons, swaps, accesses, 'First element is already sorted');

  for (let i = 1; i < n; i++) {
    const key = arr[i].value;
    arr[i].state = 'current';
    accesses++;
    
    yield createStep(arr, comparisons, swaps, accesses, `Inserting ${key} into sorted portion`, [i]);
    
    let j = i - 1;
    while (j >= 0 && arr[j].value > key) {
      arr[j].state = 'comparing';
      arr[j + 1].state = 'comparing';
      
      yield createStep(arr, comparisons, swaps, accesses, `Comparing ${arr[j].value} with ${key}`, [j, j + 1]);
      
      comparisons++;
      accesses += 2;
      arr[j + 1] = { ...arr[j] };
      arr[j + 1].state = 'swapping';
      swaps++;
      accesses += 2;
      
      yield createStep(arr, comparisons, swaps, accesses, `Moving ${arr[j].value} to the right`, [j, j + 1]);
      
      arr[j + 1].state = 'sorted';
      j--;
    }
    
    if (j >= 0) {
      comparisons++;
    }
    
    arr[j + 1] = createArrayElement(key, arr[j + 1].originalIndex);
    arr[j + 1].state = 'sorted';
    accesses++;
    
    for (let k = 0; k <= i; k++) {
      if (arr[k].state !== 'sorted') arr[k].state = 'sorted';
    }
    
    yield createStep(arr, comparisons, swaps, accesses, `Inserted ${key} at correct position`);
  }
  
  yield createStep(arr, comparisons, swaps, accesses, 'Array is sorted!');
}

// ════════════════════════════════════════════════════════════════════════
// MERGE SORT
// ════════════════════════════════════════════════════════════════════════

export function* mergeSort(array: ArrayElement[]): Generator<SortStep> {
  const arr = copyArray(array);
  let comparisons = 0;
  let swaps = 0;
  let accesses = 0;

  function* mergeSortHelper(left: number, right: number): Generator<SortStep> {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);
    
    yield* mergeSortHelper(left, mid);
    yield* mergeSortHelper(mid + 1, right);
    yield* merge(left, mid, right);
  }

  function* merge(left: number, mid: number, right: number): Generator<SortStep> {
    const leftArr: ArrayElement[] = [];
    const rightArr: ArrayElement[] = [];

    for (let i = left; i <= mid; i++) {
      leftArr.push({ ...arr[i] });
      arr[i].state = 'comparing';
      accesses++;
    }
    for (let i = mid + 1; i <= right; i++) {
      rightArr.push({ ...arr[i] });
      arr[i].state = 'comparing';
      accesses++;
    }

    yield createStep(arr, comparisons, swaps, accesses, `Merging subarrays [${left}..${mid}] and [${mid + 1}..${right}]`);

    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
      comparisons++;
      accesses += 2;
      
      if (leftArr[i].value <= rightArr[j].value) {
        arr[k] = { ...leftArr[i] };
        arr[k].state = 'swapping';
        i++;
      } else {
        arr[k] = { ...rightArr[j] };
        arr[k].state = 'swapping';
        j++;
      }
      
      swaps++;
      accesses++;
      yield createStep(arr, comparisons, swaps, accesses, `Placing ${arr[k].value} at position ${k}`);
      k++;
    }

    while (i < leftArr.length) {
      arr[k] = { ...leftArr[i] };
      arr[k].state = 'swapping';
      accesses++;
      i++;
      k++;
      yield createStep(arr, comparisons, swaps, accesses, `Copying remaining element ${arr[k - 1].value}`);
    }

    while (j < rightArr.length) {
      arr[k] = { ...rightArr[j] };
      arr[k].state = 'swapping';
      accesses++;
      j++;
      k++;
      yield createStep(arr, comparisons, swaps, accesses, `Copying remaining element ${arr[k - 1].value}`);
    }

    for (let i = left; i <= right; i++) {
      arr[i].state = 'sorted';
    }
    yield createStep(arr, comparisons, swaps, accesses, `Merged subarray [${left}..${right}]`);
  }

  yield* mergeSortHelper(0, arr.length - 1);
  yield createStep(arr, comparisons, swaps, accesses, 'Array is sorted!');
}

// ════════════════════════════════════════════════════════════════════════
// QUICK SORT
// ════════════════════════════════════════════════════════════════════════

export function* quickSort(array: ArrayElement[]): Generator<SortStep> {
  const arr = copyArray(array);
  let comparisons = 0;
  let swaps = 0;
  let accesses = 0;

  function* quickSortHelper(low: number, high: number): Generator<SortStep> {
    if (low < high) {
      const pi = yield* partition(low, high);
      yield* quickSortHelper(low, pi - 1);
      yield* quickSortHelper(pi + 1, high);
    } else if (low === high) {
      arr[low].state = 'sorted';
    }
  }

  function* partition(low: number, high: number): Generator<SortStep, number> {
    const pivot = arr[high].value;
    arr[high].state = 'pivot';
    accesses++;
    
    yield createStep(arr, comparisons, swaps, accesses, `Pivot selected: ${pivot}`);

    let i = low - 1;

    for (let j = low; j < high; j++) {
      arr[j].state = 'comparing';
      accesses++;
      
      yield createStep(arr, comparisons, swaps, accesses, `Comparing ${arr[j].value} with pivot ${pivot}`);
      
      comparisons++;
      if (arr[j].value < pivot) {
        i++;
        
        arr[i].state = 'swapping';
        arr[j].state = 'swapping';
        
        [arr[i], arr[j]] = [arr[j], arr[i]];
        swaps++;
        accesses += 4;
        
        yield createStep(arr, comparisons, swaps, accesses, `Swapping ${arr[i].value} and ${arr[j].value}`);
        
        arr[i].state = 'default';
        arr[j].state = 'default';
      } else {
        arr[j].state = 'default';
      }
    }

    arr[i + 1].state = 'swapping';
    arr[high].state = 'swapping';
    
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    swaps++;
    accesses += 4;
    
    yield createStep(arr, comparisons, swaps, accesses, `Placing pivot ${pivot} at correct position ${i + 1}`);

    arr[i + 1].state = 'sorted';
    
    return i + 1;
  }

  yield* quickSortHelper(0, arr.length - 1);
  
  for (let i = 0; i < arr.length; i++) {
    arr[i].state = 'sorted';
  }
  yield createStep(arr, comparisons, swaps, accesses, 'Array is sorted!');
}
