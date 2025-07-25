# Convex Test Mocking Solution

## Problem Statement

The onboarding page tests are failing because Convex mutations (`useMutation`) are not being properly mocked. The tests expect the mutations to be called, but the mock functions are never invoked.

## Root Cause Analysis

1. **Module Hoisting Issue**: Jest hoists `jest.mock()` calls to the top of the file, but the mock implementation needs access to variables that aren't available at hoist time.

2. **Conflicting Mock Patterns**: The codebase has two different patterns for mocking Convex:
   - Centralized mocking in `test-utils.tsx` 
   - Local mocking in individual test files

3. **Mock Function Return Type**: `useMutation` returns a function, not an object. The mock needs to return a Jest mock function.

## Solution

### Option 1: Fix the Centralized Mock (Recommended)

Update the onboarding test to properly set up the mock before rendering:

```typescript
// In the test file
import { mockUseMutation } from '@/__tests__/test-utils';

it('creates organization successfully', async () => {
  // Create mock functions
  const mockStoreUserFn = jest.fn().mockResolvedValue({});
  const mockCreateOrgFn = jest.fn().mockResolvedValue({});
  
  // Set up the mock to return our functions
  let callCount = 0;
  mockUseMutation.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return mockStoreUserFn;
    if (callCount === 2) return mockCreateOrgFn;
    return jest.fn().mockResolvedValue({});
  });

  render(<OnboardingPage />);
  
  // ... rest of test
});
```

### Option 2: Local Mock Pattern

Remove the centralized mock for this specific test and mock locally:

```typescript
// At the top of the test file
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  ConvexProvider: ({ children }) => children,
}));

const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
```

## Temporary Fix Applied

Updated `test-utils.tsx` to use global references to work around the hoisting issue:

```typescript
// Store references globally
(global as any).__mockUseMutation = mockUseMutation;

// In the mock
jest.mock('convex/react', () => ({
  useMutation: (...args) => (global as any).__mockUseMutation(...args),
}));
```

## Long-term Recommendation

1. **Standardize the mocking pattern**: Choose either centralized or local mocking and use it consistently across all tests.

2. **Create a Convex test helper**: Build a dedicated helper for mocking Convex operations that handles the complexity.

3. **Document the pattern**: Add clear documentation on how to mock Convex in tests.

## Example Test Pattern

```typescript
describe('Component with Convex mutations', () => {
  const setupMutationMocks = () => {
    const mockMutation1 = jest.fn().mockResolvedValue({});
    const mockMutation2 = jest.fn().mockResolvedValue({});
    
    let callCount = 0;
    mockUseMutation.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockMutation1;
      if (callCount === 2) return mockMutation2;
      return jest.fn();
    });
    
    return { mockMutation1, mockMutation2 };
  };
  
  it('should call mutations', async () => {
    const { mockMutation1 } = setupMutationMocks();
    
    render(<Component />);
    
    // Trigger mutation
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(mockMutation1).toHaveBeenCalled();
    });
  });
});
```

## Files Affected

- `/apps/web/src/__tests__/test-utils.tsx` - Contains centralized Convex mocks
- `/apps/web/src/app/(auth)/onboarding/__tests__/page.test.tsx` - Failing test
- Multiple other test files using different mocking patterns

## Next Steps

1. Apply the temporary fix to get tests passing
2. Refactor all Convex-dependent tests to use a consistent pattern
3. Create comprehensive documentation for testing Convex components
4. Consider creating a `@testing-library/convex` style helper package