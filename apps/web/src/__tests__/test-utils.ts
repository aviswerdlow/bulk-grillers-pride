import { expect as jestExpect } from '@jest/globals';
import '@testing-library/jest-dom';

// Re-export expect with extended matchers
export const expect = jestExpect;

// Re-export all jest globals for convenience
export * from '@jest/globals';