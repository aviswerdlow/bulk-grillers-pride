# Testing Guide

This comprehensive guide covers testing practices for the Bulk Grillers Pride application. Our goal is to achieve 80% test coverage across critical business logic.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
   - [React Component Tests](#react-component-tests)
   - [Convex Function Tests](#convex-function-tests)
   - [Utility Function Tests](#utility-function-tests)
   - [E2E Tests](#e2e-tests)
5. [Test Coverage](#test-coverage)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Isolation**: Each test should be independent and not rely on other tests
3. **Clarity**: Tests should be readable and serve as documentation
4. **Speed**: Unit tests should run quickly to encourage frequent testing
5. **Coverage**: Aim for 80% coverage on business logic, 100% on critical paths

### Testing Pyramid

```
         /\
        /E2E\       <- Few, slow, high confidence
       /-----\
      / Integ \     <- Some, moderate speed
     /---------\
    /   Unit    \   <- Many, fast, focused
   /--------------\
```

## Testing Infrastructure

### Overview

The project uses Jest as the primary testing framework with specialized configurations:

- **React Components**: Jest + React Testing Library
- **Convex Functions**: Jest + Custom test helpers
- **E2E Tests**: Playwright
- **Type Checking**: TypeScript compiler

### Key Files

```
├── jest.config.js              # Root Jest configuration
├── apps/web/
│   ├── jest.config.js          # Web-specific Jest config
│   ├── jest.setup.js           # Web test setup
│   └── src/__tests__/
│       ├── setup/              # Test utilities and mocks
│       └── components/         # Component tests
├── convex/
│   ├── jest.config.js          # Convex-specific Jest config
│   └── __tests__/
│       ├── setup/              # Convex test helpers
│       ├── TESTING.md          # Convex testing guide
│       └── functions/          # Function tests
└── e2e/                        # Playwright E2E tests
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Run E2E tests
npm run test:e2e

# Run type checking
npm run type-check
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- CategorySelector.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should handle user selection"

# Run tests in a specific directory
npm test -- apps/web

# Run only Convex tests
npm test -- --selectProjects=convex

# Run only web tests
npm test -- --selectProjects=web
```

## Writing Tests

### React Component Tests

#### Basic Component Test Structure

```typescript
// apps/web/src/__tests__/components/CategorySelector.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategorySelector } from '@/components/categories/category-selector';
import { mockCategories } from '../setup/test-data';

describe('CategorySelector', () => {
  it('should render category tree', async () => {
    // Arrange
    const onSelect = jest.fn();

    // Act
    render(
      <CategorySelector
        onSelect={onSelect}
        selectedIds={[]}
      />
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Meat')).toBeInTheDocument();
      expect(screen.getByText('Produce')).toBeInTheDocument();
    });
  });

  it('should handle category selection', async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <CategorySelector
        onSelect={onSelect}
        selectedIds={[]}
      />
    );

    // Act
    const meatCategory = await screen.findByText('Meat');
    await user.click(meatCategory);

    // Assert
    expect(onSelect).toHaveBeenCalledWith(['category-1']);
  });
});
```

#### Testing Hooks

```typescript
// apps/web/src/__tests__/hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });
});
```

#### Testing with Mocked Convex

```typescript
// apps/web/src/__tests__/components/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/products/product-card';
import { mockUseQuery, mockUseMutation } from '../setup/convex-mocks';

describe('ProductCard', () => {
  it('should display product information', async () => {
    // Mock Convex query
    mockUseQuery.mockReturnValue({
      data: {
        _id: '1',
        name: 'Ribeye Steak',
        price: 29.99,
        category: 'Meat'
      },
      isLoading: false,
      error: null
    });

    render(<ProductCard productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Ribeye Steak')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
      expect(screen.getByText('Meat')).toBeInTheDocument();
    });
  });
});
```

### Convex Function Tests

#### Basic Query Test

```typescript
// convex/__tests__/functions/products.test.ts
import { testRunner } from '../setup/test-runner';
import { list, getById } from '../../functions/products/products';
import { mockIdentity } from '../setup/auth-helpers';

describe('products', () => {
  describe('list', () => {
    it('should return all products for organization', async () => {
      // Arrange
      const ctx = testRunner.createQueryCtx({
        identity: mockIdentity({ orgId: 'org_123' }),
      });

      // Seed test data
      await testRunner.seed('products', [
        { name: 'Product 1', organizationId: 'org_123' },
        { name: 'Product 2', organizationId: 'org_123' },
        { name: 'Product 3', organizationId: 'org_456' }, // Different org
      ]);

      // Act
      const result = await list(ctx, { limit: 10 });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Product 1');
      expect(result[1].name).toBe('Product 2');
    });
  });
});
```

#### Testing Mutations

```typescript
// convex/__tests__/functions/products.test.ts
describe('products', () => {
  describe('create', () => {
    it('should create a new product', async () => {
      // Arrange
      const ctx = testRunner.createMutationCtx({
        identity: mockIdentity({
          orgId: 'org_123',
          permissions: ['products:write'],
        }),
      });

      const input = {
        name: 'New Product',
        price: 19.99,
        categoryId: 'cat_1',
      };

      // Act
      const productId = await create(ctx, input);

      // Assert
      const product = await testRunner.get('products', productId);
      expect(product).toMatchObject({
        name: 'New Product',
        price: 19.99,
        categoryId: 'cat_1',
        organizationId: 'org_123',
      });
    });

    it('should throw error without permission', async () => {
      // Arrange
      const ctx = testRunner.createMutationCtx({
        identity: mockIdentity({
          orgId: 'org_123',
          permissions: [], // No permissions
        }),
      });

      // Act & Assert
      await expect(create(ctx, { name: 'Product' })).rejects.toThrow('Insufficient permissions');
    });
  });
});
```

#### Testing Actions with External APIs

```typescript
// convex/__tests__/functions/ai/categorization.test.ts
import { categorizeProduct } from '../../functions/ai/categorization';
import { testRunner } from '../setup/test-runner';

// Mock external API
jest.mock('node-fetch');
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AI categorization', () => {
  it('should categorize product using AI', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        category: 'Meat',
        confidence: 0.95,
      }),
    } as any);

    const ctx = testRunner.createActionCtx({
      identity: mockIdentity({ orgId: 'org_123' }),
    });

    // Act
    const result = await categorizeProduct(ctx, {
      productName: 'Ribeye Steak',
      description: 'Premium beef cut',
    });

    // Assert
    expect(result).toEqual({
      category: 'Meat',
      confidence: 0.95,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/categorize'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Ribeye Steak'),
      })
    );
  });
});
```

### Utility Function Tests

```typescript
// apps/web/src/__tests__/lib/utils.test.ts
import { cn, formatPrice, slugify } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('base', 'additional')).toBe('base additional');
      expect(cn('base', { active: true })).toBe('base active');
      expect(cn('base', { active: false })).toBe('base');
    });
  });

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(29.99)).toBe('$29.99');
      expect(formatPrice(1000)).toBe('$1,000.00');
      expect(formatPrice(0)).toBe('$0.00');
    });
  });

  describe('slugify', () => {
    it('should create URL-safe slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Special@#$Characters')).toBe('special-characters');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });
});
```

### E2E Tests

```typescript
// e2e/products.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'test@example.com');
  });

  test('should create a new product', async ({ page }) => {
    // Navigate to products page
    await page.goto('/dashboard/products');

    // Click create button
    await page.getByRole('button', { name: 'New Product' }).click();

    // Fill form
    await page.getByLabel('Product Name').fill('Test Product');
    await page.getByLabel('Price').fill('19.99');
    await page.getByLabel('Category').selectOption('Meat');

    // Submit
    await page.getByRole('button', { name: 'Create Product' }).click();

    // Verify success
    await expect(page.getByText('Product created successfully')).toBeVisible();
    await expect(page.getByText('Test Product')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    await page.goto('/dashboard/products/new');

    // Submit empty form
    await page.getByRole('button', { name: 'Create Product' }).click();

    // Check validation messages
    await expect(page.getByText('Product name is required')).toBeVisible();
    await expect(page.getByText('Price must be greater than 0')).toBeVisible();
  });
});
```

## Test Coverage

### Current Coverage Goals

| Area           | Target | Priority | Notes                 |
| -------------- | ------ | -------- | --------------------- |
| Business Logic | 80%    | P0       | Core functionality    |
| API Endpoints  | 80%    | P0       | All queries/mutations |
| Critical Paths | 100%   | P0       | Auth, payments        |
| UI Components  | 70%    | P1       | User-facing features  |
| Utilities      | 100%   | P1       | Shared functions      |
| E2E Flows      | Core   | P2       | Happy paths           |

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check specific directory coverage
npm test -- --coverage --collectCoverageFrom='apps/web/src/components/**'
```

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts', // Ignore barrel exports
  ],
};
```

## Best Practices

### 1. Test Organization

```
- Group related tests using describe blocks
- Use clear, descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- One assertion per test when possible
```

### 2. Test Data

```typescript
// Use test data builders
const createTestProduct = (overrides = {}) => ({
  _id: 'prod_123',
  name: 'Test Product',
  price: 10.0,
  organizationId: 'org_123',
  ...overrides,
});

// Use in tests
const product = createTestProduct({ price: 25.0 });
```

### 3. Async Testing

```typescript
// ✅ Good - Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ❌ Bad - Don't use arbitrary timeouts
await new Promise((resolve) => setTimeout(resolve, 1000));
```

### 4. Mocking

```typescript
// Mock at the correct level
jest.mock('@/lib/api', () => ({
  fetchProducts: jest.fn(),
}));

// Clean up mocks
afterEach(() => {
  jest.clearAllMocks();
});
```

### 5. Error Testing

```typescript
it('should handle errors gracefully', async () => {
  // Arrange
  mockUseQuery.mockReturnValue({
    data: null,
    isLoading: false,
    error: new Error('Failed to load')
  });

  // Act
  render(<ProductList />);

  // Assert
  expect(screen.getByText('Error: Failed to load')).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});
```

## Common Patterns

### Testing Loading States

```typescript
it('should show loading state', () => {
  mockUseQuery.mockReturnValue({
    data: null,
    isLoading: true,
    error: null
  });

  render(<ProductList />);

  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
});
```

### Testing User Interactions

```typescript
it('should handle form submission', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();

  render(<ProductForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'New Product');
  await user.type(screen.getByLabelText('Price'), '29.99');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'New Product',
    price: 29.99
  });
});
```

### Testing Conditional Rendering

```typescript
it('should show admin controls for admin users', () => {
  mockUseAuth.mockReturnValue({
    user: { role: 'admin' }
  });

  render(<ProductCard productId="1" />);

  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
});

it('should hide admin controls for regular users', () => {
  mockUseAuth.mockReturnValue({
    user: { role: 'user' }
  });

  render(<ProductCard productId="1" />);

  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

```bash
# Clear Jest cache
npm test -- --clearCache

# Check tsconfig paths are configured in Jest
```

#### 2. Async test timeouts

```typescript
// Increase timeout for specific test
it('should handle large dataset', async () => {
  // Test code
}, 10000); // 10 second timeout
```

#### 3. Flaky tests

```typescript
// Use waitFor instead of fixed delays
await waitFor(
  () => {
    expect(mockFn).toHaveBeenCalled();
  },
  { timeout: 3000 }
);
```

#### 4. Mock not working

```typescript
// Ensure mock is at correct scope
jest.mock('@/lib/api'); // Top of file, outside describe

// Or use manual mocks
jest.doMock('@/lib/api', () => ({
  fetchData: jest.fn(),
}));
```

### Debugging Tests

```bash
# Run single test in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.ts

# Use console.log in tests
console.log(screen.debug()); // Print DOM

# Run with verbose output
npm test -- --verbose
```

## Next Steps

1. **Start with Critical Paths**: Focus on authentication, core business logic
2. **Build Test Data Utilities**: Create reusable test data builders
3. **Document Patterns**: Add team-specific patterns to this guide
4. **Monitor Coverage**: Set up coverage tracking in CI
5. **Regular Reviews**: Review test quality in code reviews

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Convex Testing Guide](../convex/__tests__/TESTING.md)
