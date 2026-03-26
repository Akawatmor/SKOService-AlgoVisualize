// ─── Tree Visualizer — Tree Information ───

import type { TreeType, TreeInfo } from './types';

export const TREE_INFO: Record<TreeType, TreeInfo> = {
  'binary': {
    id: 'binary',
    name: 'Binary Tree',
    description: 'A tree where each node has at most two children (left and right).',
    properties: [
      'Each node has at most 2 children',
      'No ordering constraints',
      'Can be unbalanced',
      'Used as base for other tree structures'
    ],
    complexities: {
      search: 'O(n)',
      insert: 'O(n)',
      delete: 'O(n)',
    },
  },
  'bst': {
    id: 'bst',
    name: 'Binary Search Tree',
    description: 'A binary tree where left child < parent < right child for all nodes.',
    properties: [
      'Left subtree < Node < Right subtree',
      'Enables efficient search',
      'Can become unbalanced',
      'In-order traversal gives sorted sequence'
    ],
    complexities: {
      search: 'O(log n) avg, O(n) worst',
      insert: 'O(log n) avg, O(n) worst',
      delete: 'O(log n) avg, O(n) worst',
    },
  },
  'avl': {
    id: 'avl',
    name: 'AVL Tree',
    description: 'Self-balancing BST where the height difference between left and right subtrees is at most 1.',
    properties: [
      'Height balanced: |BF| ≤ 1',
      'Automatic rebalancing via rotations',
      'Faster lookups than Red-Black',
      'More rotations on insert/delete'
    ],
    complexities: {
      search: 'O(log n)',
      insert: 'O(log n)',
      delete: 'O(log n)',
    },
  },
  'red-black': {
    id: 'red-black',
    name: 'Red-Black Tree',
    description: 'Self-balancing BST with color property ensuring the tree remains approximately balanced.',
    properties: [
      'Every node is Red or Black',
      'Root is always Black',
      'Red nodes cannot have Red children',
      'All paths have same number of Black nodes'
    ],
    complexities: {
      search: 'O(log n)',
      insert: 'O(log n)',
      delete: 'O(log n)',
    },
  },
};

export const TREE_TYPES: TreeType[] = ['binary', 'bst', 'avl', 'red-black'];
