# Frontend Test Pattern Documentation

## Overview

This document describes the standardized test pattern for frontend tests in the Bulk Grillers Pride web application. The pattern follows the Convex mock pattern established by the infrastructure team (T178/T179).

## Test Helpers

### Primary Test Helper: `frontend-test-helpers.tsx`

The new standardized test helper provides:

1. **Convex Mock Storage**: In-memory database simulation
2. **Mock Functions**: Standardized mocks for `useQuery`, `useMutation`, `useAction`
3. **Test Factories**: Functions to create mock data (`createMockProduct`, `createMockOrganization`, etc.)
4. **Setup/Cleanup**: Functions for test initialization and cleanup
5. **UI Component Mocks**: Common UI components are pre-mocked

### Usage Pattern

```typescript
import { 
  render, 
  screen, 
  fireEvent,
  setupTest, 
  cleanupTest,
  createMockProduct,
  seedMockData,
  mockUseQuery
} from '@/__tests__/frontend-test-helpers';

describe('MyComponent', () => {
  beforeEach(async () => {
    setupTest();
    
    // Seed mock data if needed
    await seedMockData({
      products: [createMockProduct({ title: 'Test Product' })],
      organizations: [createMockOrganization()],
    });
  });

  afterEach(() => {
    cleanupTest();
  });

  it('should render correctly', () => {
    // Mock specific query results
    mockUseQuery.mockReturnValue(mockData);
    
    render(<MyComponent />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
```

## Migration Guide

### For Component Tests

1. Import from `frontend-test-helpers.tsx` instead of `test-utils.tsx`
2. Use `setupTest()` and `cleanupTest()` in beforeEach/afterEach
3. Use factory functions for creating mock data
4. Use `mockUseQuery` instead of mocking `useQuery` directly

### For Page Tests

1. Replace direct `useQuery` mocks with `mockUseQuery`
2. Use `seedMockData` to populate the mock storage
3. Remove manual mock implementations for Convex

### For Integration Tests

1. Remove `ConvexProvider` wrappers (already included in test helpers)
2. Use the global mock references for dynamic mocking
3. Leverage the mock storage for data persistence across test steps

## Common Patterns

### Mocking Query Results

```typescript
// Static mock
mockUseQuery.mockReturnValue(mockData);

// Dynamic mock based on arguments
mockUseQuery.mockImplementation((query, args) => {
  if (query.toString().includes('getProducts')) {
    return mockProducts;
  }
  return undefined;
});
```

### Creating Test Data

```typescript
const product = createMockProduct({
  title: 'Custom Product',
  sku: 'TEST-123',
  status: 'active',
});

const org = createMockOrganization({
  name: 'Test Org',
  slug: 'test-org',
});
```

### Testing Mutations

```typescript
const mockMutation = mockUseMutation();

// In your test
await mockMutation({ title: 'New Product' });

// Verify the data was stored
const products = await mockDb.query('products').collect();
expect(products).toHaveLength(1);
```

## Best Practices

1. **Always use factories**: Don't manually create mock objects
2. **Clean up between tests**: Use `cleanupTest()` to prevent test pollution
3. **Seed realistically**: Use `seedMockData` to create realistic test scenarios
4. **Mock at the right level**: Mock Convex hooks, not individual functions
5. **Test behavior, not implementation**: Focus on user-visible behavior

## Troubleshooting

### Common Issues

1. **"Element type is invalid" errors**: Check that all UI components are properly mocked
2. **Mock not working**: Ensure you're using the global mock references
3. **Data not persisting**: Check that you're using the mock storage correctly

### Debug Tips

- Use `console.log(mockStorage)` to inspect the mock database state
- Check that mocks are being reset between tests
- Verify that the correct mock implementation is being used

## Future Improvements

As the test helper package (T179) is completed, this pattern will be packaged into a reusable library that can be shared across all frontend tests in the monorepo.

## Accessibility Testing

### Overview

Accessibility testing ensures our application is usable by everyone, including users with disabilities. We use jest-axe for automated testing and provide utilities for common accessibility test patterns.

### Quick Start

```typescript
import { expectNoA11yViolations, simulateKeyboardNavigation } from '@/__tests__/utils/accessibility';

it('should be accessible', async () => {
  const { container } = render(<MyComponent />);
  await expectNoA11yViolations(container);
});
```

### Available Utilities

Our accessibility test utilities are located in `__tests__/utils/accessibility.ts`:

#### 1. expectNoA11yViolations
Tests for accessibility violations using axe-core.

```typescript
await expectNoA11yViolations(container, {
  rules: {
    'color-contrast': { enabled: false } // Disable specific rules if needed
  }
});
```

#### 2. expectFocusable
Verifies an element can receive keyboard focus.

```typescript
const button = screen.getByRole('button');
expectFocusable(button);
```

#### 3. expectAnnouncement
Tests screen reader announcements.

```typescript
await expectAnnouncement('Item deleted', 'assertive');
```

#### 4. simulateKeyboardNavigation
Tests keyboard navigation patterns.

```typescript
await simulateKeyboardNavigation(['{Tab}', '{Enter}', '{Escape}']);
```

#### 5. testFocusTrap
Validates focus trap behavior in modals/dialogs.

```typescript
const modal = screen.getByRole('dialog');
await testFocusTrap(modal);
```

### Testing Patterns

#### Component Accessibility Test Template

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';
import {
  expectNoA11yViolations,
  expectFocusable,
  expectAccessibleLabeling,
  simulateKeyboardNavigation
} from '@/__tests__/utils/accessibility';

describe('MyComponent Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    await expectNoA11yViolations(container);
  });

  it('should support keyboard navigation', async () => {
    render(<MyComponent />);
    await simulateKeyboardNavigation(['{Tab}', '{Enter}']);
    // Add assertions for expected behavior
  });

  it('should have proper ARIA labels', () => {
    render(<MyComponent />);
    const button = screen.getByRole('button');
    expectAccessibleLabeling(button, 'Expected label');
  });
});
```

### Best Practices

1. **Test Early**: Add accessibility tests when creating new components
2. **Test Interactions**: Don't just test static rendering
3. **Use Semantic HTML**: Prefer testing by role over test-ids
4. **Test Error States**: Ensure errors are properly announced
5. **Test Loading States**: Verify loading indicators are accessible
6. **Test Dynamic Content**: Ensure updates are announced appropriately

### Running Accessibility Tests

```bash
# Run all accessibility tests
npm run test:a11y

# Run unit tests only
npm run test:a11y:unit

# Run E2E tests only
npm run test:a11y:e2e

# Run with coverage
npm run test:a11y -- --coverage
```

### CI Integration

Accessibility tests run automatically in CI and will:
- Block PR merges if tests fail
- Generate detailed reports with violations
- Comment on PRs with accessibility issues

### Resources

- [Manual Testing Guide](../../../../docs/ACCESSIBILITY_TESTING_MANUAL.md)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Library Accessibility](https://testing-library.com/docs/queries/about/#priority)