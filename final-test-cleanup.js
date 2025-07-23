const fs = require('fs');
const path = require('path');

console.log('Performing final test cleanup...\n');

// 1. Remove frontend-test-helpers.tsx since it conflicts with the central mock
const helperPath = 'apps/web/src/__tests__/frontend-test-helpers.tsx';
if (fs.existsSync(helperPath)) {
  // First, check what exports it has that we need to preserve
  const content = fs.readFileSync(helperPath, 'utf8');
  
  // Create a simpler version that just re-exports from the main mock
  const newContent = `// Re-export from central mock
export * from '@testing-library/react';
export { render, waitFor } from '@testing-library/react';

// Import mocks from central location
import { useQuery, useMutation, useAction } from 'convex/react';

export const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
export const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
export const mockUseAction = useAction as jest.MockedFunction<typeof useAction>;

// Simple test utilities
export const resetAllMocks = () => {
  jest.clearAllMocks();
};

export const setupTest = () => {
  jest.clearAllMocks();
};

export const cleanupTest = () => {
  jest.clearAllMocks();
};

export const resetMockStorage = () => {
  jest.clearAllMocks();
};

// Re-export render as renderWithProviders for compatibility
export { render as renderWithProviders };
`;

  fs.writeFileSync(helperPath, newContent);
  console.log('✓ Simplified frontend-test-helpers.tsx');
}

// 2. Clean up jest.setup.js to avoid conflicts
const jestSetupContent = `// Jest Setup
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLElement.prototype.releasePointerCapture = jest.fn();
HTMLElement.prototype.hasPointerCapture = jest.fn();

// Global console mocks
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
`;

fs.writeFileSync('jest.setup.js', jestSetupContent);
console.log('✓ Cleaned up jest.setup.js');

// 3. Remove duplicate test-utils.tsx if it exists
const testUtilsPath = 'apps/web/src/__tests__/test-utils.tsx';
if (fs.existsSync(testUtilsPath)) {
  fs.unlinkSync(testUtilsPath);
  console.log('✓ Removed duplicate test-utils.tsx');
}

console.log('\nFinal cleanup complete!');