// Cipher Information Database

import { CipherInfo, CipherType } from './types';

export const cipherInfo: Record<CipherType, CipherInfo> = {
  // ========== SUBSTITUTION CIPHERS ==========
  caesar: {
    id: 'caesar',
    name: 'Caesar Cipher',
    category: 'substitution',
    description: 'Simple shift cipher where each letter is replaced by a letter some fixed number of positions down the alphabet.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '26 possible keys'
    },
    security: 'very-low',
    keyType: 'number',
    keyDescription: 'Shift value (0-25)',
    example: {
      plaintext: 'HELLO',
      key: 3,
      ciphertext: 'KHOOR'
    },
    historical: {
      invented: '~100 BC',
      inventor: 'Julius Caesar',
      usage: 'Used by Julius Caesar for military communications'
    }
  },

  vigenere: {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    category: 'substitution',
    description: 'Polyalphabetic substitution cipher using a keyword to determine shift values.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '26^k where k is key length'
    },
    security: 'low',
    keyType: 'text',
    keyDescription: 'Keyword (any text)',
    example: {
      plaintext: 'HELLO',
      key: 'KEY',
      ciphertext: 'RIJVS'
    },
    historical: {
      invented: '1553',
      inventor: 'Giovan Battista Bellaso',
      usage: 'Named after Blaise de Vigenère, resisted cryptanalysis for centuries'
    }
  },

  atbash: {
    id: 'atbash',
    name: 'Atbash Cipher',
    category: 'substitution',
    description: 'Substitution cipher where A↔Z, B↔Y, C↔X, etc. No key needed.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '1 (no key)'
    },
    security: 'very-low',
    keyType: 'none',
    example: {
      plaintext: 'HELLO',
      key: '',
      ciphertext: 'SVOOL'
    },
    historical: {
      invented: '~600 BC',
      usage: 'Originally used for Hebrew alphabet'
    }
  },

  rot13: {
    id: 'rot13',
    name: 'ROT13',
    category: 'substitution',
    description: 'Caesar cipher with fixed shift of 13. Encrypting twice returns original text.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '1 (fixed shift of 13)'
    },
    security: 'very-low',
    keyType: 'none',
    example: {
      plaintext: 'HELLO',
      key: 13,
      ciphertext: 'URYYB'
    },
    historical: {
      invented: '~1980s',
      usage: 'Used in Usenet forums to hide spoilers and offensive content'
    }
  },

  affine: {
    id: 'affine',
    name: 'Affine Cipher',
    category: 'substitution',
    description: 'Substitution using mathematical function: E(x) = (ax + b) mod 26',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '312 possible keys'
    },
    security: 'very-low',
    keyType: 'text',
    keyDescription: 'Two numbers (a, b) where gcd(a, 26) = 1',
    example: {
      plaintext: 'HELLO',
      key: '5,8',
      ciphertext: 'RCLLA'
    }
  },

  playfair: {
    id: 'playfair',
    name: 'Playfair Cipher',
    category: 'substitution',
    description: 'Digraph substitution using a 5×5 matrix of letters generated from a keyword.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '26! ≈ 2^88'
    },
    security: 'low',
    keyType: 'text',
    keyDescription: 'Keyword for matrix generation',
    example: {
      plaintext: 'HELLO',
      key: 'MONARCHY',
      ciphertext: 'GATLMZORRO'
    },
    historical: {
      invented: '1854',
      inventor: 'Charles Wheatstone',
      usage: 'Used in WWI and WWII'
    }
  },

  hill: {
    id: 'hill',
    name: 'Hill Cipher',
    category: 'substitution',
    description: 'Polygraphic substitution using linear algebra and matrix multiplication.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Large (matrix combinations)'
    },
    security: 'low',
    keyType: 'matrix',
    keyDescription: '2×2 invertible matrix',
    example: {
      plaintext: 'HELLO',
      key: '[[3,3],[2,5]]',
      ciphertext: 'HGWXB'
    },
    historical: {
      invented: '1929',
      inventor: 'Lester S. Hill'
    }
  },

  beaufort: {
    id: 'beaufort',
    name: 'Beaufort Cipher',
    category: 'substitution',
    description: 'Similar to Vigenère but uses reciprocal alphabet: C = K - P (mod 26)',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '26^k where k is key length'
    },
    security: 'low',
    keyType: 'text',
    keyDescription: 'Keyword',
    example: {
      plaintext: 'HELLO',
      key: 'KEY',
      ciphertext: 'DGOSU'
    },
    historical: {
      invented: '1857',
      inventor: 'Sir Francis Beaufort'
    }
  },

  polybius: {
    id: 'polybius',
    name: 'Polybius Square',
    category: 'substitution',
    description: 'Converts letters to coordinates in a 5×5 grid. Each letter becomes two digits.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Small (grid arrangement)'
    },
    security: 'very-low',
    keyType: 'text',
    keyDescription: 'Optional keyword for grid',
    example: {
      plaintext: 'HELLO',
      key: '',
      ciphertext: '2315313134'
    },
    historical: {
      invented: '~200 BC',
      inventor: 'Polybius',
      usage: 'Ancient Greek historian'
    }
  },

  autokey: {
    id: 'autokey',
    name: 'Autokey Cipher',
    category: 'substitution',
    description: 'Vigenère variant where plaintext itself becomes part of the key.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: '26^k (initial key length)'
    },
    security: 'low',
    keyType: 'text',
    keyDescription: 'Initial keyword',
    example: {
      plaintext: 'HELLO',
      key: 'KEY',
      ciphertext: 'RIJTP'
    },
    historical: {
      invented: '1586',
      inventor: 'Blaise de Vigenère'
    }
  },

  onetimepad: {
    id: 'onetimepad',
    name: 'One-Time Pad',
    category: 'substitution',
    description: 'Theoretically unbreakable cipher using a random key as long as the message.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Infinite (truly random)'
    },
    security: 'high',
    keyType: 'text',
    keyDescription: 'Random key (same length as plaintext)',
    example: {
      plaintext: 'HELLO',
      key: 'XMCKL',
      ciphertext: 'EQNVZ'
    },
    historical: {
      invented: '1882',
      inventor: 'Frank Miller',
      usage: 'Only provably unbreakable cipher when used correctly'
    }
  },

  // ========== TRANSPOSITION CIPHERS ==========
  railfence: {
    id: 'railfence',
    name: 'Rail Fence Cipher',
    category: 'transposition',
    description: 'Text is written in a zigzag pattern across multiple rails, then read row by row.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Small (number of rails)'
    },
    security: 'very-low',
    keyType: 'number',
    keyDescription: 'Number of rails',
    example: {
      plaintext: 'HELLO',
      key: 3,
      ciphertext: 'HOELL'
    }
  },

  scytale: {
    id: 'scytale',
    name: 'Scytale',
    category: 'transposition',
    description: 'Ancient Greek cipher using a cylinder. Text written along the length, read around circumference.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Small (cylinder diameter)'
    },
    security: 'very-low',
    keyType: 'number',
    keyDescription: 'Number of columns',
    example: {
      plaintext: 'HELLO',
      key: 2,
      ciphertext: 'HLOEL'
    },
    historical: {
      invented: '~400 BC',
      usage: 'Used by Spartans'
    }
  },

  columnar: {
    id: 'columnar',
    name: 'Columnar Transposition',
    category: 'transposition',
    description: 'Text written in rows, then columns read in order determined by keyword.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'k! where k is key length'
    },
    security: 'low',
    keyType: 'text',
    keyDescription: 'Keyword for column order',
    example: {
      plaintext: 'HELLO',
      key: 'KEY',
      ciphertext: 'EOHLL'
    }
  },

  myszkowski: {
    id: 'myszkowski',
    name: 'Myszkowski Transposition',
    category: 'transposition',
    description: 'Variant of columnar transposition that handles repeated letters in the key.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'k! where k is key length'
    },
    security: 'low',
    keyType: 'text',
    keyDescription: 'Keyword (may have repeats)',
    example: {
      plaintext: 'HELLO',
      key: 'ZEBRA',
      ciphertext: 'LLEHO'
    }
  },

  // ========== MACHINE CIPHERS ==========
  enigma: {
    id: 'enigma',
    name: 'Enigma Machine',
    category: 'machine',
    description: 'Simplified Enigma rotor cipher simulation with basic rotor mechanics.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Astronomical (rotor positions)'
    },
    security: 'medium',
    keyType: 'rotor',
    keyDescription: 'Rotor settings (simplified)',
    example: {
      plaintext: 'HELLO',
      key: 'ABC',
      ciphertext: 'MFNLP'
    },
    historical: {
      invented: '1918',
      inventor: 'Arthur Scherbius',
      usage: 'Used by Nazi Germany in WWII'
    }
  },

  lorenz: {
    id: 'lorenz',
    name: 'Lorenz Cipher',
    category: 'machine',
    description: 'Simplified Lorenz machine simulation used for high-level communications.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Very large (wheel positions)'
    },
    security: 'medium',
    keyType: 'rotor',
    keyDescription: 'Wheel settings',
    example: {
      plaintext: 'HELLO',
      key: 'XYZ',
      ciphertext: 'QBNUP'
    },
    historical: {
      invented: '1940',
      usage: 'Used by Nazi Germany for high-command communications, broken by British codebreakers'
    }
  },

  sigaba: {
    id: 'sigaba',
    name: 'SIGABA (ECM Mark II)',
    category: 'machine',
    description: 'US cipher machine, considered one of the most secure of WWII.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Extremely large'
    },
    security: 'medium',
    keyType: 'rotor',
    keyDescription: 'Rotor configuration',
    example: {
      plaintext: 'HELLO',
      key: 'USA',
      ciphertext: 'XJTMQ'
    },
    historical: {
      invented: '1940',
      usage: 'Used by US military, never broken during WWII'
    }
  },

  typex: {
    id: 'typex',
    name: 'Typex',
    category: 'machine',
    description: 'British adaptation of Enigma with additional security features.',
    complexity: {
      encryption: 'O(n)',
      decryption: 'O(n)',
      keySpace: 'Very large'
    },
    security: 'medium',
    keyType: 'rotor',
    keyDescription: 'Rotor settings',
    example: {
      plaintext: 'HELLO',
      key: 'UK',
      ciphertext: 'PQRSM'
    },
    historical: {
      invented: '1937',
      usage: 'Used by British forces, more secure than Enigma'
    }
  }
};

export function getCipherInfo(type: CipherType): CipherInfo {
  return cipherInfo[type];
}

export function getCiphersByCategory(category: CipherInfo['category']): CipherInfo[] {
  return Object.values(cipherInfo).filter(info => info.category === category);
}

export const allCiphers = Object.values(cipherInfo);
