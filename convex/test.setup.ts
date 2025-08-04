// Use mock in test environment to avoid import.meta issues
const { convexTest } = process.env.NODE_ENV === 'test' 
  ? require('../__mocks__/convex-test')
  : require('convex-test');

import schema from './schema';

export const t = convexTest(schema);

// Helper to reset mock state between tests
export function resetMockState() {
  // Clear all mock function calls
  jest.clearAllMocks();
  
  // If using the mock, reset its internal state
  if (process.env.NODE_ENV === 'test') {
    // The mock should handle this internally on each convexTest() call
    // but we can also manually clear mocks here if needed
  }
}
