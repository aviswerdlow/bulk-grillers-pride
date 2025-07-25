import type { Id } from '../types';

/**
 * Generate a mock Convex ID for testing
 * Convex IDs are base64url encoded strings with a specific format
 */
export function createMockId<T extends string>(table: T): Id<T> {
  // Generate a random 16-byte buffer
  const buffer = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  // Convert to base64url format (no padding, URL-safe characters)
  const base64 = buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Convex IDs have a specific format with table name prefix
  return base64 as Id<T>;
}

/**
 * Create a deterministic mock ID for consistent testing
 */
export function createMockIdFromString<T extends string>(table: T, seed: string): Id<T> {
  // Simple hash function for deterministic IDs
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to base64-like string
  const hashStr = Math.abs(hash).toString(36);
  const paddedStr = hashStr.padEnd(22, '0');
  
  return paddedStr.slice(0, 22) as Id<T>;
}

/**
 * Generate multiple mock IDs
 */
export function createMockIds<T extends string>(table: T, count: number): Id<T>[] {
  return Array.from({ length: count }, () => createMockId(table));
}

/**
 * Create a mock ID generator with incrementing counter
 */
export function createIdGenerator<T extends string>(table: T) {
  let counter = 1;
  
  return {
    next(): Id<T> {
      return createMockIdFromString(table, `${table}_${counter++}`);
    },
    
    reset(): void {
      counter = 1;
    }
  };
}