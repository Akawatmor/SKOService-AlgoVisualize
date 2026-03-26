// ─── Tree Visualizer — Utility Functions ───

import type { TreeNode, TreeStatistics } from './types';

let nodeIdCounter = 0;

export function createNode(value: number, parent: TreeNode | null = null): TreeNode {
  return {
    id: `node-${nodeIdCounter++}`,
    value,
    left: null,
    right: null,
    parent,
    height: 1,
    balanceFactor: 0,
    color: 'red', // Default for Red-Black trees
    state: 'default',
  };
}

export function copyTree(node: TreeNode | null): TreeNode | null {
  if (!node) return null;
  
  const newNode: TreeNode = {
    ...node,
    left: null,
    right: null,
    parent: null,
  };
  
  newNode.left = copyTree(node.left);
  newNode.right = copyTree(node.right);
  
  if (newNode.left) newNode.left.parent = newNode;
  if (newNode.right) newNode.right.parent = newNode;
  
  return newNode;
}

export function getHeight(node: TreeNode | null): number {
  if (!node) return 0;
  return Math.max(getHeight(node.left), getHeight(node.right)) + 1;
}

export function getNodeCount(node: TreeNode | null): number {
  if (!node) return 0;
  return 1 + getNodeCount(node.left) + getNodeCount(node.right);
}

export function isBalanced(node: TreeNode | null): boolean {
  if (!node) return true;
  
  const leftHeight = getHeight(node.left);
  const rightHeight = getHeight(node.right);
  
  return (
    Math.abs(leftHeight - rightHeight) <= 1 &&
    isBalanced(node.left) &&
    isBalanced(node.right)
  );
}

export function findMin(node: TreeNode | null): TreeNode | null {
  if (!node) return null;
  while (node.left) node = node.left;
  return node;
}

export function findMax(node: TreeNode | null): TreeNode | null {
  if (!node) return null;
  while (node.right) node = node.right;
  return node;
}

export function getTreeStatistics(root: TreeNode | null): TreeStatistics {
  const minNode = findMin(root);
  const maxNode = findMax(root);
  
  return {
    nodeCount: getNodeCount(root),
    height: getHeight(root),
    isBalanced: isBalanced(root),
    minValue: minNode?.value ?? null,
    maxValue: maxNode?.value ?? null,
  };
}

export function inorderTraversal(node: TreeNode | null, result: number[] = []): number[] {
  if (!node) return result;
  inorderTraversal(node.left, result);
  result.push(node.value);
  inorderTraversal(node.right, result);
  return result;
}

export function preorderTraversal(node: TreeNode | null, result: number[] = []): number[] {
  if (!node) return result;
  result.push(node.value);
  preorderTraversal(node.left, result);
  preorderTraversal(node.right, result);
  return result;
}

export function postorderTraversal(node: TreeNode | null, result: number[] = []): number[] {
  if (!node) return result;
  postorderTraversal(node.left, result);
  postorderTraversal(node.right, result);
  result.push(node.value);
  return result;
}

export function levelorderTraversal(node: TreeNode | null): number[] {
  if (!node) return [];
  
  const result: number[] = [];
  const queue: TreeNode[] = [node];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current.value);
    
    if (current.left) queue.push(current.left);
    if (current.right) queue.push(current.right);
  }
  
  return result;
}

// Calculate positions for tree visualization
export function calculatePositions(
  node: TreeNode | null,
  x: number = 0,
  y: number = 0,
  horizontalSpacing: number = 100,
  level: number = 0
): void {
  if (!node) return;
  
  node.x = x;
  node.y = y;
  
  const offset = horizontalSpacing / Math.pow(2, level);
  
  if (node.left) {
    calculatePositions(node.left, x - offset, y + 80, horizontalSpacing, level + 1);
  }
  
  if (node.right) {
    calculatePositions(node.right, x + offset, y + 80, horizontalSpacing, level + 1);
  }
}

export function parseInputArray(input: string): number[] | null {
  try {
    const values = input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number);
    
    if (values.some(isNaN)) return null;
    if (values.length === 0) return null;
    
    return values;
  } catch {
    return null;
  }
}
