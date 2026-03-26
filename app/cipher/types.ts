// Cipher Visualizer Type Definitions

export type CipherCategory = 'substitution' | 'transposition' | 'machine';

export type SubstitutionCipherType = 
  | 'caesar'
  | 'vigenere'
  | 'atbash'
  | 'rot13'
  | 'affine'
  | 'playfair'
  | 'hill'
  | 'beaufort'
  | 'polybius'
  | 'autokey'
  | 'onetimepad';

export type TranspositionCipherType =
  | 'railfence'
  | 'scytale'
  | 'columnar'
  | 'myszkowski';

export type MachineCipherType =
  | 'enigma'
  | 'lorenz'
  | 'sigaba'
  | 'typex';

export type CipherType = SubstitutionCipherType | TranspositionCipherType | MachineCipherType;

export type CipherOperation = 'encrypt' | 'decrypt';

export interface CipherStep {
  index: number;
  operation: string;
  plaintext?: string;
  ciphertext?: string;
  key?: string | number;
  intermediate?: string;
  explanation: string;
  highlightIndices?: number[];
}

export interface CipherResult {
  output: string;
  steps: CipherStep[];
  statistics: CipherStatistics;
}

export interface CipherStatistics {
  inputLength: number;
  outputLength: number;
  keyLength?: number;
  operationsCount: number;
  timeMs?: number;
}

export interface CipherInfo {
  id: CipherType;
  name: string;
  category: CipherCategory;
  description: string;
  complexity: {
    encryption: string;
    decryption: string;
    keySpace: string;
  };
  security: 'very-low' | 'low' | 'medium' | 'high';
  keyType: 'number' | 'text' | 'matrix' | 'rotor' | 'none';
  keyDescription?: string;
  example: {
    plaintext: string;
    key: string | number;
    ciphertext: string;
  };
  historical?: {
    invented: string;
    inventor?: string;
    usage?: string;
  };
}

export interface CipherConfig {
  type: CipherType;
  operation: CipherOperation;
  text: string;
  key?: string | number | number[][];
  options?: {
    preserveSpaces?: boolean;
    preservePunctuation?: boolean;
    caseSensitive?: boolean;
  };
}

// State types for visualization
export type CharacterState = 
  | 'default'
  | 'processing'
  | 'encrypted'
  | 'decrypted'
  | 'key-char'
  | 'highlight';

export interface CharacterDisplay {
  char: string;
  state: CharacterState;
  index: number;
  transformation?: string;
}
