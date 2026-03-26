// ─── Tree Visualizer — Type Definitions ───

export type TreeType = 'binary' | 'bst' | 'avl' | 'red-black';

export type NodeColor = 'red' | 'black';

export interface TreeNode {
  id: string;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
  parent: TreeNode | null;
  
  // AVL specific
  height?: number;
  balanceFactor?: number;
  
  // Red-Black specific
  color?: NodeColor;
  
  // Visualization
  x?: number;
  y?: number;
  state?: 'default' | 'active' | 'comparing' | 'found' | 'inserting' | 'deleting';
}

export interface TreeOperation {
  type: 'insert' | 'delete' | 'search' | 'rotate-left' | 'rotate-right' | 'recolor';
  value?: number;
  nodeId?: string;
  message: string;
}

export interface TreeStep {
  tree: TreeNode | null;
  operation: TreeOperation;
  highlightedNodes: string[];
  message: string;
}

export interface TreeTraversal {
  type: 'inorder' | 'preorder' | 'postorder' | 'levelorder';
  sequence: number[];
  currentIndex: number;
}

export interface TreeStatistics {
  nodeCount: number;
  height: number;
  isBalanced: boolean;
  minValue: number | null;
  maxValue: number | null;
}

export interface TreeInfo {
  id: TreeType;
  name: string;
  description: string;
  properties: string[];
  complexities: {
    search: string;
    insert: string;
    delete: string;
  };
}
