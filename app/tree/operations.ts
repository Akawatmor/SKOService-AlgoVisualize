// ─── Tree Operations — BST, AVL, Red-Black ───

import type { TreeNode, TreeStep, TreeOperation } from './types';
import { createNode, copyTree, getHeight } from './utils';

// ════════════════════════════════════════════════════════════════════════
// BINARY SEARCH TREE (BST)
// ════════════════════════════════════════════════════════════════════════

export function* bstInsert(root: TreeNode | null, value: number): Generator<TreeStep> {
  const operation: TreeOperation = { type: 'insert', value, message: `Inserting ${value}` };
  
  if (!root) {
    const newNode = createNode(value);
    newNode.state = 'inserting';
    yield {
      tree: newNode,
      operation,
      highlightedNodes: [newNode.id],
      message: `Created root node with value ${value}`,
    };
    newNode.state = 'default';
    return newNode;
  }
  
  const newRoot = copyTree(root);
  let current: TreeNode = newRoot!;
  const path: TreeNode[] = [];
  
  while (true) {
    path.push(current);
    current.state = 'comparing';
    
    yield {
      tree: copyTree(newRoot),
      operation,
      highlightedNodes: path.map(n => n.id),
      message: `Comparing ${value} with ${current.value}`,
    };
    
    if (value < current.value) {
      if (!current.left) {
        current.left = createNode(value, current);
        current.left.state = 'inserting';
        yield {
          tree: copyTree(newRoot),
          operation,
          highlightedNodes: [current.left.id],
          message: `Inserted ${value} as left child of ${current.value}`,
        };
        current.left.state = 'default';
        break;
      }
      current = current.left;
    } else if (value > current.value) {
      if (!current.right) {
        current.right = createNode(value, current);
        current.right.state = 'inserting';
        yield {
          tree: copyTree(newRoot),
          operation,
          highlightedNodes: [current.right.id],
          message: `Inserted ${value} as right child of ${current.value}`,
        };
        current.right.state = 'default';
        break;
      }
      current = current.right;
    } else {
      current.state = 'found';
      yield {
        tree: copyTree(newRoot),
        operation,
        highlightedNodes: [current.id],
        message: `Value ${value} already exists`,
      };
      return newRoot;
    }
    
    current.state = 'default';
  }
  
  path.forEach(n => n.state = 'default');
  return newRoot;
}

export function* bstSearch(root: TreeNode | null, value: number): Generator<TreeStep> {
  const operation: TreeOperation = { type: 'search', value, message: `Searching for ${value}` };
  
  if (!root) {
    yield {
      tree: null,
      operation,
      highlightedNodes: [],
      message: `Tree is empty`,
    };
    return null;
  }
  
  const treeCopy = copyTree(root);
  let current: TreeNode | null = treeCopy;
  const path: string[] = [];
  
  while (current) {
    current.state = 'comparing';
    path.push(current.id);
    
    yield {
      tree: copyTree(treeCopy),
      operation,
      highlightedNodes: path,
      message: `Comparing ${value} with ${current.value}`,
    };
    
    if (value === current.value) {
      current.state = 'found';
      yield {
        tree: copyTree(treeCopy),
        operation,
        highlightedNodes: [current.id],
        message: `Found ${value}!`,
      };
      return current;
    } else if (value < current.value) {
      current.state = 'default';
      current = current.left;
    } else {
      current.state = 'default';
      current = current.right;
    }
  }
  
  yield {
    tree: copyTree(treeCopy),
    operation,
    highlightedNodes: path,
    message: `Value ${value} not found`,
  };
  
  return null;
}

// ════════════════════════════════════════════════════════════════════════
// AVL TREE
// ════════════════════════════════════════════════════════════════════════

function updateHeight(node: TreeNode): void {
  const leftHeight = node.left?.height ?? 0;
  const rightHeight = node.right?.height ?? 0;
  node.height = Math.max(leftHeight, rightHeight) + 1;
  node.balanceFactor = rightHeight - leftHeight;
}

function rotateLeft(node: TreeNode): TreeNode {
  const newRoot = node.right!;
  node.right = newRoot.left;
  if (newRoot.left) newRoot.left.parent = node;
  
  newRoot.left = node;
  newRoot.parent = node.parent;
  node.parent = newRoot;
  
  updateHeight(node);
  updateHeight(newRoot);
  
  return newRoot;
}

function rotateRight(node: TreeNode): TreeNode {
  const newRoot = node.left!;
  node.left = newRoot.right;
  if (newRoot.right) newRoot.right.parent = node;
  
  newRoot.right = node;
  newRoot.parent = node.parent;
  node.parent = newRoot;
  
  updateHeight(node);
  updateHeight(newRoot);
  
  return newRoot;
}

function balance(node: TreeNode): TreeNode {
  updateHeight(node);
  
  if (node.balanceFactor! > 1) {
    // Right heavy
    if (node.right && node.right.balanceFactor! < 0) {
      node.right = rotateRight(node.right);
    }
    return rotateLeft(node);
  }
  
  if (node.balanceFactor! < -1) {
    // Left heavy
    if (node.left && node.left.balanceFactor! > 0) {
      node.left = rotateLeft(node.left);
    }
    return rotateRight(node);
  }
  
  return node;
}

export function* avlInsert(root: TreeNode | null, value: number): Generator<TreeStep> {
  const operation: TreeOperation = { type: 'insert', value, message: `Inserting ${value} into AVL` };
  
  if (!root) {
    const newNode = createNode(value);
    newNode.state = 'inserting';
    yield {
      tree: newNode,
      operation,
      highlightedNodes: [newNode.id],
      message: `Created root node with value ${value}`,
    };
    newNode.state = 'default';
    return newNode;
  }
  
  function* insertHelper(node: TreeNode | null, val: number): Generator<TreeStep, TreeNode | null> {
    if (!node) {
      const newNode = createNode(val);
      newNode.state = 'inserting';
      return newNode;
    }
    
    node.state = 'comparing';
    yield {
      tree: copyTree(root),
      operation,
      highlightedNodes: [node.id],
      message: `Comparing ${val} with ${node.value}`,
    };
    
    if (val < node.value) {
      node.left = yield* insertHelper(node.left, val);
      if (node.left) node.left.parent = node;
    } else if (val > node.value) {
      node.right = yield* insertHelper(node.right, val);
      if (node.right) node.right.parent = node;
    } else {
      node.state = 'default';
      return node;
    }
    
    node.state = 'default';
    updateHeight(node);
    
    const balanced = balance(node);
    if (balanced !== node) {
      yield {
        tree: copyTree(root),
        operation: { type: 'rotate-left', message: 'Rebalancing tree' },
        highlightedNodes: [balanced.id],
        message: `Rotated at node ${node.value}`,
      };
    }
    
    return balanced;
  }
  
  const newRoot = yield* insertHelper(copyTree(root), value);
  
  if (newRoot) {
    yield {
      tree: copyTree(newRoot),
      operation,
      highlightedNodes: [],
      message: `Inserted ${value} and rebalanced tree`,
    };
  }
  
  return newRoot;
}

// ════════════════════════════════════════════════════════════════════════
// RED-BLACK TREE
// ════════════════════════════════════════════════════════════════════════

export function* redBlackInsert(root: TreeNode | null, value: number): Generator<TreeStep> {
  const operation: TreeOperation = { type: 'insert', value, message: `Inserting ${value} into Red-Black Tree` };
  
  if (!root) {
    const newNode = createNode(value);
    newNode.color = 'black'; // Root is always black
    newNode.state = 'inserting';
    yield {
      tree: newNode,
      operation,
      highlightedNodes: [newNode.id],
      message: `Created black root node with value ${value}`,
    };
    newNode.state = 'default';
    return newNode;
  }
  
  // For now, basic BST insert with red color
  // Full Red-Black implementation would include recoloring and rotations
  const newRoot = copyTree(root);
  let current: TreeNode = newRoot!;
  
  while (true) {
    current.state = 'comparing';
    
    yield {
      tree: copyTree(newRoot),
      operation,
      highlightedNodes: [current.id],
      message: `Comparing ${value} with ${current.value}`,
    };
    
    if (value < current.value) {
      if (!current.left) {
        current.left = createNode(value, current);
        current.left.color = 'red'; // New nodes are red
        current.left.state = 'inserting';
        yield {
          tree: copyTree(newRoot),
          operation,
          highlightedNodes: [current.left.id],
          message: `Inserted ${value} as red left child of ${current.value}`,
        };
        current.left.state = 'default';
        break;
      }
      current.state = 'default';
      current = current.left;
    } else if (value > current.value) {
      if (!current.right) {
        current.right = createNode(value, current);
        current.right.color = 'red';
        current.right.state = 'inserting';
        yield {
          tree: copyTree(newRoot),
          operation,
          highlightedNodes: [current.right.id],
          message: `Inserted ${value} as red right child of ${current.value}`,
        };
        current.right.state = 'default';
        break;
      }
      current.state = 'default';
      current = current.right;
    } else {
      current.state = 'default';
      return newRoot;
    }
  }
  
  return newRoot;
}
