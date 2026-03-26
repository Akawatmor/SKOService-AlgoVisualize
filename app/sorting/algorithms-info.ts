// ─── Sorting Visualizer — Algorithm Information ───

import type { SortAlgorithm, SortAlgorithmInfo } from './types';

export const ALGORITHM_INFO: Record<SortAlgorithm, SortAlgorithmInfo> = {
  // ─── Comparison Sorts ───
  'bubble-sort': {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    description: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in wrong order.'
  },
  'selection-sort': {
    id: 'selection-sort',
    name: 'Selection Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: false,
    description: 'Divides the array into sorted and unsorted regions, repeatedly selects the smallest element from unsorted region.'
  },
  'insertion-sort': {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    description: 'Builds the final sorted array one item at a time by inserting each element into its correct position.'
  },
  'merge-sort': {
    id: 'merge-sort',
    name: 'Merge Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)',
    stable: true,
    description: 'Divide and conquer algorithm that divides the array into halves, sorts them and merges them back.'
  },
  'quick-sort': {
    id: 'quick-sort',
    name: 'Quick Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(log n)',
    stable: false,
    description: 'Selects a pivot element and partitions the array around it, then recursively sorts the partitions.'
  },
  'heap-sort': {
    id: 'heap-sort',
    name: 'Heap Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)',
    stable: false,
    description: 'Builds a max heap from the array and repeatedly extracts the maximum element.'
  },
  'shell-sort': {
    id: 'shell-sort',
    name: 'Shell Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n^(3/2))', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: false,
    description: 'Generalization of insertion sort that allows exchanging of items that are far apart.'
  },
  'tim-sort': {
    id: 'tim-sort',
    name: 'Tim Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)',
    stable: true,
    description: 'Hybrid sorting algorithm derived from merge sort and insertion sort. Used in Python and Java.'
  },
  'intro-sort': {
    id: 'intro-sort',
    name: 'Intro Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(log n)',
    stable: false,
    description: 'Hybrid algorithm using quick sort, heap sort and insertion sort. Used in C++ std::sort.'
  },
  'tree-sort': {
    id: 'tree-sort',
    name: 'Tree Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(n)',
    stable: false,
    description: 'Builds a binary search tree from the elements and then traverses the tree in-order.'
  },
  'comb-sort': {
    id: 'comb-sort',
    name: 'Comb Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n log n)', average: 'O(n²/2^p)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: false,
    description: 'Improvement over bubble sort that eliminates turtles (small values near the end).'
  },
  'cocktail-sort': {
    id: 'cocktail-sort',
    name: 'Cocktail Shaker Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    description: 'Variation of bubble sort that sorts in both directions on each pass through the list.'
  },
  'gnome-sort': {
    id: 'gnome-sort',
    name: 'Gnome Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    description: 'Similar to insertion sort but moving an element to its proper place by swapping.'
  },
  'odd-even-sort': {
    id: 'odd-even-sort',
    name: 'Odd-Even (Brick) Sort',
    category: 'comparison',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    description: 'Variation of bubble sort that compares all odd/even indexed pairs of adjacent elements.'
  },

  // ─── Non-Comparison Sorts ───
  'counting-sort': {
    id: 'counting-sort',
    name: 'Counting Sort',
    category: 'non-comparison',
    timeComplexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)' },
    spaceComplexity: 'O(k)',
    stable: true,
    description: 'Counts the number of objects having distinct key values, then calculates positions.'
  },
  'radix-sort': {
    id: 'radix-sort',
    name: 'Radix Sort',
    category: 'non-comparison',
    timeComplexity: { best: 'O(nk)', average: 'O(nk)', worst: 'O(nk)' },
    spaceComplexity: 'O(n + k)',
    stable: true,
    description: 'Sorts integers by processing individual digits, starting from least significant digit.'
  },
  'bucket-sort': {
    id: 'bucket-sort',
    name: 'Bucket Sort',
    category: 'non-comparison',
    timeComplexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n²)' },
    spaceComplexity: 'O(n + k)',
    stable: true,
    description: 'Distributes elements into buckets, sorts individual buckets, then concatenates them.'
  },
  'pigeonhole-sort': {
    id: 'pigeonhole-sort',
    name: 'Pigeonhole Sort',
    category: 'non-comparison',
    timeComplexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)' },
    spaceComplexity: 'O(k)',
    stable: true,
    description: 'Similar to counting sort but works by creating pigeonholes for each possible value.'
  },
};

export const COMPARISON_SORTS: SortAlgorithm[] = [
  'bubble-sort',
  'selection-sort',
  'insertion-sort',
  'merge-sort',
  'quick-sort',
  'heap-sort',
  'shell-sort',
  'tim-sort',
  'intro-sort',
  'tree-sort',
  'comb-sort',
  'cocktail-sort',
  'gnome-sort',
  'odd-even-sort',
];

export const NON_COMPARISON_SORTS: SortAlgorithm[] = [
  'counting-sort',
  'radix-sort',
  'bucket-sort',
  'pigeonhole-sort',
];

export const ALL_ALGORITHMS: SortAlgorithm[] = [
  ...COMPARISON_SORTS,
  ...NON_COMPARISON_SORTS,
];
