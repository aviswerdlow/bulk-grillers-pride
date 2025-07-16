# Testing Quick Start Guide

Quick reference for agents to start writing tests immediately. For comprehensive guide, see [TESTING.md](./TESTING.md).

## Frontend Agent - React Component Testing

### Quick Setup for Component Test

```typescript
// apps/web/src/__tests__/components/YourComponent.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YourComponent } from '@/components/your-component';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(<YourComponent onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Common Frontend Testing Commands

```bash
# Run your component tests
npm test -- YourComponent.test.tsx

# Run all web tests in watch mode
npm test -- --selectProjects=web --watch

# Check coverage for components
npm test -- --coverage --collectCoverageFrom='apps/web/src/components/**'
```

## Backend Agent - Convex Function Testing

### Quick Setup for Convex Test

```typescript
// convex/__tests__/functions/yourFunction.test.ts
import { testRunner } from '../setup/test-runner';
import { yourQuery, yourMutation } from '../../functions/yourFunction';
import { mockIdentity } from '../setup/auth-helpers';

describe('yourFunction', () => {
  it('should query data correctly', async () => {
    // Setup context with auth
    const ctx = testRunner.createQueryCtx({
      identity: mockIdentity({ orgId: 'org_123' }),
    });

    // Seed test data
    await testRunner.seed('yourTable', [{ field: 'value', organizationId: 'org_123' }]);

    // Test the query
    const result = await yourQuery(ctx, { param: 'value' });
    expect(result).toHaveLength(1);
  });

  it('should create data correctly', async () => {
    const ctx = testRunner.createMutationCtx({
      identity: mockIdentity({
        orgId: 'org_123',
        permissions: ['write'],
      }),
    });

    const id = await yourMutation(ctx, { field: 'value' });

    const created = await testRunner.get('yourTable', id);
    expect(created.field).toBe('value');
  });
});
```

### Common Backend Testing Commands

```bash
# Run your Convex tests
npm test -- yourFunction.test.ts

# Run all Convex tests
npm test -- --selectProjects=convex

# Check coverage for Convex functions
npm test -- --coverage --collectCoverageFrom='convex/functions/**'
```

## Quality Agent - Writing Any Test

### Testing Utilities

```typescript
// Test a utility function
import { formatPrice, slugify } from '@/lib/utils';

describe('utils', () => {
  it('should format price', () => {
    expect(formatPrice(29.99)).toBe('$29.99');
  });

  it('should create slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
});
```

### E2E Test Example

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('feature flow', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Get Started")');
  await expect(page).toHaveURL('/dashboard');
});
```

## Infra Agent - Test Infrastructure

### Check Test Coverage

```bash
# Generate full coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html

# Run tests in CI mode
npm run test:ci
```

### Update Jest Config

```javascript
// jest.config.js
module.exports = {
  projects: ['<rootDir>/apps/web', '<rootDir>/convex'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Common Testing Patterns

### 1. Mock Convex Hooks

```typescript
import { mockUseQuery, mockUseMutation } from '../setup/convex-mocks';

mockUseQuery.mockReturnValue({
  data: { your: 'data' },
  isLoading: false,
  error: null,
});
```

### 2. Test Async Operations

```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### 3. Test Error States

```typescript
mockUseQuery.mockReturnValue({
  data: null,
  isLoading: false,
  error: new Error('Failed to load')
});

render(<Component />);
expect(screen.getByText(/error/i)).toBeInTheDocument();
```

### 4. Test Loading States

```typescript
mockUseQuery.mockReturnValue({
  data: null,
  isLoading: true,
  error: null
});

render(<Component />);
expect(screen.getByRole('progressbar')).toBeInTheDocument();
```

## Priority Testing Areas

1. **Authentication flows** - 100% coverage required
2. **Core business logic** - 80% coverage minimum
3. **API endpoints** - All queries/mutations tested
4. **Critical UI components** - User-facing features
5. **Utility functions** - 100% coverage for shared utils

## Getting Help

- Full guide: [TESTING.md](./TESTING.md)
- Convex testing: `convex/__tests__/TESTING.md`
- React Testing Library: [Docs](https://testing-library.com/docs/react-testing-library/intro/)
- Jest: [Docs](https://jestjs.io/docs/getting-started)
