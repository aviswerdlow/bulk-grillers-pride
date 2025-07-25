# Test Infrastructure Fix Guide

## Current Status
Most tests are failing due to various configuration and mock issues. Here's how to fix them:

## Common Issues and Solutions

### 1. **UI Component Mocks Missing**
Many tests fail because UI components from `@/components/ui/*` are not mocked.

**Solution**: Add this to your test file or create a setup file:
```javascript
// Mock all UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <div>{children}</div>,
}));

jest.mock('@/components/loading', () => ({
  PageLoading: ({ text }) => <div>Loading... {text}</div>,
}));
```

### 2. **Convex API Import Issues**
Tests importing from `convex/_generated/api` fail with module errors.

**Solution**: Mock the Convex API in your test:
```javascript
jest.mock('../path/to/convex/_generated/api', () => ({
  api: {
    functions: {
      // Add the functions your component uses
      dashboard: {
        getDashboardStats: jest.fn(),
      },
    },
  },
}));
```

### 3. **React Component Import Errors**
"Element type is invalid" errors indicate missing component mocks.

**Solution**: Check all imports in your component and mock them:
```javascript
// Check what the component imports
import { PageLoading } from '@/components/loading';

// Mock it in your test
jest.mock('@/components/loading', () => ({
  PageLoading: () => <div>Loading...</div>,
}));
```

### 4. **Clerk Auth Mocks**
Auth components fail because Clerk isn't properly mocked.

**Solution**: Add comprehensive Clerk mocks:
```javascript
jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }) => <div>{children}</div>,
  SignIn: () => <div>Sign In</div>,
  SignUp: () => <div>Sign Up</div>,
  useAuth: () => ({ isLoaded: true, userId: 'test-user' }),
  useUser: () => ({ user: { id: 'test-user' } }),
}));
```

### 5. **Convex React Hooks**
`useQuery` and `useMutation` need proper mocking.

**Solution**:
```javascript
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  ConvexProvider: ({ children }) => <div>{children}</div>,
}));
```

## Quick Fix Steps

1. **Run a single test to debug**:
   ```bash
   npm test -- apps/web/src/__tests__/lib/utils.test.ts --no-coverage
   ```

2. **Check the exact error**:
   - Module not found? → Add mock
   - Element invalid? → Mock the component
   - Cannot read property? → Return proper mock data

3. **Fix incrementally**:
   - Start with simplest tests (utils)
   - Move to component tests
   - Finally fix integration tests

## Example Fixed Test

Here's a working example for a dashboard test:

```javascript
import { render, screen } from '@testing-library/react';
import Dashboard from '../page';

// Mock all dependencies
jest.mock('next/navigation', () => ({
  useParams: () => ({ orgSlug: 'test-org' }),
}));

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => ({
    stats: { products: 10, categories: 5 },
  })),
}));

jest.mock('@/components/loading', () => ({
  PageLoading: () => <div>Loading...</div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

describe('Dashboard', () => {
  it('should render stats', () => {
    render(<Dashboard />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
```

## Next Steps

1. Start with `utils.test.ts` - it's the simplest
2. Fix one test file at a time
3. Create shared mock files for common components
4. Consider using `msw` for API mocking
5. Set up proper test utilities

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.ts

# Run with watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```