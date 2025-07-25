// Type declarations for Jest DOM matchers
// This file provides types for @testing-library/jest-dom when using @jest/globals

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module '@jest/globals' {
  interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}

declare global {
  namespace jest {
    interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
  }
}

export {};