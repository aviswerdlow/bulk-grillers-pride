/**
 * Convex test helpers for mocking hooks and mutations
 */

import type { ReactMutation, FunctionReference } from 'convex/react';

// Create a mock mutation that satisfies the ReactMutation interface
export function createMockMutation<T extends FunctionReference<'mutation'>>(
  mockFn = jest.fn()
): ReactMutation<T> {
  const mutation = mockFn as any;
  
  // Add the required withOptimisticUpdate method
  mutation.withOptimisticUpdate = jest.fn().mockReturnValue(mutation);
  
  return mutation as ReactMutation<T>;
}

// Helper to create a mock query result
export function createMockQuery<T>(data: T | undefined = undefined) {
  return jest.fn().mockReturnValue(data);
}

// Helper to mock useQuery results with loading states
export function createMockQueryWithStates<T>(states: { loading?: boolean; data?: T; error?: Error }[]) {
  let callCount = 0;
  
  return jest.fn(() => {
    const state = states[Math.min(callCount++, states.length - 1)];
    
    if (state.error) {
      throw state.error;
    }
    
    return state.loading ? undefined : state.data;
  });
}

// Helper to create a mock action
export function createMockAction<T extends FunctionReference<'action'>>(
  mockFn = jest.fn()
) {
  return mockFn;
}