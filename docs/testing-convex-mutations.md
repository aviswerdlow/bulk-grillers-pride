# Testing Convex Mutations in Jest

## Overview

The `useMutation` hook from Convex returns a `ReactMutation` object, which is a function that can be called to execute a mutation on the server. This document explains how to properly mock `useMutation` in Jest tests.

## What `useMutation` Returns

According to the Convex type definitions:

```typescript
export interface ReactMutation<Mutation extends FunctionReference<"mutation">> {
  // The mutation can be called as a function
  (...args: OptionalRestArgs<Mutation>): Promise<FunctionReturnType<Mutation>>;
  
  // It also has a method for optimistic updates
  withOptimisticUpdate(optimisticUpdate: OptimisticUpdate<FunctionArgs<Mutation>>): ReactMutation<Mutation>;
}

// The hook signature:
export declare function useMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation
): ReactMutation<Mutation>;
```

In practice, `useMutation` returns a **function** that:
1. Can be called with the mutation arguments
2. Returns a Promise that resolves to the mutation's return value
3. Has a `withOptimisticUpdate` method for optimistic updates

## How to Mock `useMutation` in Jest

### Basic Mock Setup

```typescript
import { useMutation } from 'convex/react';

// Mock the convex/react module
jest.mock('convex/react');

// Create a mock mutation function
const mockMutationFn = jest.fn().mockResolvedValue(undefined);

// Setup the mock before each test
beforeEach(() => {
  jest.clearAllMocks();
  (useMutation as jest.Mock).mockReturnValue(mockMutationFn);
});
```

### Complete Example

Here's a complete example from the codebase:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMutation } from 'convex/react';

// Mock convex/react
jest.mock('convex/react');

describe('MyComponent', () => {
  const mockEnsureUser = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    // useMutation returns a function
    (useMutation as jest.Mock).mockReturnValue(mockEnsureUser);
  });

  it('should call mutation with correct arguments', async () => {
    // Your test code that uses the mutation
    
    // Verify the mutation was called
    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledWith({
        // expected arguments
      });
    });
  });

  it('should handle errors', async () => {
    mockEnsureUser.mockRejectedValue(new Error('Failed'));
    
    // Test error handling
  });
});
```

### Testing Components with Mutations

For components that use mutations:

```typescript
import { useMutation } from 'convex/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
}));

const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('CreateProductDialog', () => {
  const mockCreateProduct = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue(mockCreateProduct);
  });

  it('submits form with correct data', async () => {
    render(<CreateProductDialog />);
    
    // Fill form and submit
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith({
        // expected form data
      });
    });
  });
});
```

### Advanced Patterns

#### Multiple Mutations in Same Component

```typescript
mockUseMutation.mockImplementation((mutation) => {
  if (mutation.toString().includes('updateUserRole')) {
    return mockUpdateUserRole;
  }
  if (mutation.toString().includes('removeUser')) {
    return mockRemoveUser;
  }
  return jest.fn();
});
```

#### Testing Loading States

```typescript
it('shows loading state during mutation', async () => {
  mockCreateProduct.mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 100))
  );

  render(<MyComponent />);
  
  const submitButton = screen.getByRole('button');
  fireEvent.click(submitButton);

  expect(submitButton).toBeDisabled();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

#### Testing Optimistic Updates

While the mock doesn't need to implement `withOptimisticUpdate`, you can create a more complete mock if needed:

```typescript
const mockMutation = Object.assign(
  jest.fn().mockResolvedValue(undefined),
  {
    withOptimisticUpdate: jest.fn().mockReturnThis()
  }
);

(useMutation as jest.Mock).mockReturnValue(mockMutation);
```

## Common Patterns in the Codebase

From analyzing the existing test files, here are the common patterns used:

1. **Simple function mock**: Most tests just mock the mutation as a simple async function
2. **Type assertion**: Use `as jest.Mock` or `as jest.MockedFunction<typeof useMutation>`
3. **Clear mocks**: Always clear mocks in `beforeEach` to prevent test interference
4. **Async handling**: Use `waitFor` from Testing Library for async assertions
5. **Error handling**: Test both success and error cases by using `mockResolvedValue` and `mockRejectedValue`

## References

- [use-ensure-user.test.tsx](/apps/web/src/__tests__/hooks/use-ensure-user.test.tsx) - Simple mutation mocking
- [product-dialogs.test.tsx](/apps/web/src/__tests__/components/products/product-dialogs.test.tsx) - Component with mutation
- [team-members-list.test.tsx](/apps/web/src/__tests__/components/auth/team-members-list.test.tsx) - Multiple mutations in one component