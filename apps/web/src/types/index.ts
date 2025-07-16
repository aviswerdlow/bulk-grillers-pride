/**
 * Central export file for all shared types
 * Import types from this file in components to ensure consistency
 */

// Re-export all model types
export * from './models';

// Re-export all UI types
export * from './ui';

// Re-export all form types
export * from './forms';

// Re-export all API types
export * from './api';

// Additional utility types that don't fit in other categories
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Utility type for making specific fields optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Utility type for making specific fields required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Deep partial type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Async function type
export type AsyncFunction<T = void, R = void> = (arg: T) => Promise<R>;

// Value of type helper
export type ValueOf<T> = T[keyof T];

// Array element type helper
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;
