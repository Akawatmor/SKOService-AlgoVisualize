// Cipher Utility Functions

/**
 * Normalize text: uppercase, remove non-letters (optional)
 */
export function normalizeText(text: string, preserveSpaces = false, preservePunctuation = false): string {
  let result = text.toUpperCase();
  
  if (!preserveSpaces && !preservePunctuation) {
    result = result.replace(/[^A-Z]/g, '');
  } else if (!preserveSpaces) {
    result = result.replace(/\s/g, '');
  } else if (!preservePunctuation) {
    result = result.replace(/[^A-Z\s]/g, '');
  }
  
  return result;
}

/**
 * Convert letter to number (A=0, B=1, ..., Z=25)
 */
export function letterToNum(char: string): number {
  return char.charCodeAt(0) - 65;
}

/**
 * Convert number to letter (0=A, 1=B, ..., 25=Z)
 */
export function numToLetter(num: number): string {
  return String.fromCharCode((num % 26 + 26) % 26 + 65);
}

/**
 * Modular arithmetic helper
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Calculate modular multiplicative inverse
 */
export function modInverse(a: number, m: number): number {
  a = mod(a, m);
  for (let x = 1; x < m; x++) {
    if (mod(a * x, m) === 1) {
      return x;
    }
  }
  return 1;
}

/**
 * Greatest Common Divisor
 */
export function gcd(a: number, b: number): number {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Validate affine cipher key
 */
export function isValidAffineKey(a: number): boolean {
  return gcd(a, 26) === 1;
}

/**
 * Generate Playfair 5x5 matrix from key
 */
export function generatePlayfairMatrix(key: string): string[][] {
  const normalized = normalizeText(key).replace(/J/g, 'I');
  const seen = new Set<string>();
  const matrix: string[] = [];
  
  // Add key characters
  for (const char of normalized) {
    if (!seen.has(char)) {
      seen.add(char);
      matrix.push(char);
    }
  }
  
  // Add remaining alphabet (excluding J)
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(65 + i);
    if (char !== 'J' && !seen.has(char)) {
      seen.add(char);
      matrix.push(char);
    }
  }
  
  // Convert to 5x5
  const result: string[][] = [];
  for (let i = 0; i < 5; i++) {
    result.push(matrix.slice(i * 5, i * 5 + 5));
  }
  
  return result;
}

/**
 * Find position in Playfair matrix
 */
export function findPlayfairPosition(matrix: string[][], char: string): [number, number] {
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (matrix[row][col] === char) {
        return [row, col];
      }
    }
  }
  return [0, 0];
}

/**
 * Prepare text for Playfair (add X between doubles, add X at end if odd length)
 */
export function preparePlayfairText(text: string): string {
  const normalized = normalizeText(text).replace(/J/g, 'I');
  const result: string[] = [];
  
  for (let i = 0; i < normalized.length; i++) {
    result.push(normalized[i]);
    
    // If next char is same, insert X
    if (i + 1 < normalized.length && normalized[i] === normalized[i + 1]) {
      result.push('X');
    }
  }
  
  // If odd length, add X
  if (result.length % 2 === 1) {
    result.push('X');
  }
  
  return result.join('');
}

/**
 * Matrix multiplication for Hill cipher (2x2)
 */
export function multiplyMatrix2x2(key: number[][], vector: number[]): number[] {
  return [
    mod(key[0][0] * vector[0] + key[0][1] * vector[1], 26),
    mod(key[1][0] * vector[0] + key[1][1] * vector[1], 26)
  ];
}

/**
 * Calculate determinant of 2x2 matrix
 */
export function determinant2x2(matrix: number[][]): number {
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

/**
 * Invert 2x2 matrix (modular)
 */
export function invertMatrix2x2(matrix: number[][]): number[][] | null {
  const det = mod(determinant2x2(matrix), 26);
  const detInv = modInverse(det, 26);
  
  if (gcd(det, 26) !== 1) {
    return null; // Not invertible
  }
  
  return [
    [mod(matrix[1][1] * detInv, 26), mod(-matrix[0][1] * detInv, 26)],
    [mod(-matrix[1][0] * detInv, 26), mod(matrix[0][0] * detInv, 26)]
  ];
}

/**
 * Generate Rail Fence pattern
 */
export function generateRailFencePattern(textLength: number, rails: number): number[] {
  const pattern: number[] = [];
  const cycle = 2 * (rails - 1);
  
  for (let rail = 0; rail < rails; rail++) {
    for (let i = rail; i < textLength; i += cycle) {
      pattern.push(i);
      
      // Middle rails have zigzag
      if (rail > 0 && rail < rails - 1) {
        const zigzag = i + cycle - 2 * rail;
        if (zigzag < textLength) {
          pattern.push(zigzag);
        }
      }
    }
  }
  
  return pattern;
}

/**
 * Generate random key for testing
 */
export function generateRandomKey(type: 'number' | 'text' | 'matrix', length = 5): string | number | number[][] {
  if (type === 'number') {
    return Math.floor(Math.random() * 26);
  } else if (type === 'text') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  } else {
    // 2x2 matrix
    return [
      [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)],
      [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)]
    ];
  }
}

/**
 * Validate key format
 */
export function validateKey(key: any, keyType: 'number' | 'text' | 'matrix' | 'rotor' | 'none'): boolean {
  if (keyType === 'none') return true;
  if (keyType === 'number') return typeof key === 'number' && key >= 0 && key < 26;
  if (keyType === 'text') return typeof key === 'string' && key.length > 0;
  if (keyType === 'matrix') return Array.isArray(key) && key.length === 2 && Array.isArray(key[0]);
  if (keyType === 'rotor') return typeof key === 'string';
  return false;
}
