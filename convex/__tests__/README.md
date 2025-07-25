# Convex Test Infrastructure

This directory contains the standardized testing infrastructure for Convex backend functions.

## Overview

The test infrastructure provides a consistent, type-safe approach to testing Convex queries, mutations, and actions without requiring a live Convex deployment.

## Files

- **`convex-test-standard.ts`** - The new standardized test infrastructure (recommended)
- **`test-helpers.ts`** - Legacy test helpers (for backward compatibility)
- **`example-standard-test.ts`** - Example test file showing best practices
- **`CONVEX_TEST_MIGRATION.md`** - Migration guide from legacy to standard

## Quick Start

### 1. Generate Test Scaffolding (Recommended)

Use the test generator to quickly create test files:

```bash
npm run generate:test convex/functions/products/products.ts
```

This creates a complete test file with:
- All necessary imports
- Test cases for each exported function
- Happy path, authorization, validation, and edge case sections
- Proper TypeScript types

See [Convex Test Generator Documentation](../../docs/CONVEX_TEST_GENERATOR.md) for details.

### 2. Manual Test Setup

```typescript
import { createConvexTest, createQueryContext, setupAuth, seedDatabase } from './convex-test-standard';

describe('My Convex Function', () => {
  let test: ConvexTestContext;
  
  beforeEach(() => {
    test = createConvexTest();
  });
  
  it('should do something', async () => {
    const ctx = createQueryContext(test);
    setupAuth(test, { tokenIdentifier: 'user_123' });
    
    // Your test logic here
  });
});
```

### 2. Context Types

- **`createQueryContext(test)`** - For testing queries
- **`createMutationContext(test)`** - For testing mutations (includes scheduler)
- **`createActionContext(test)`** - For testing actions (includes runQuery/runMutation)

### 3. Common Patterns

#### Authentication Testing
```typescript
// Authenticated user
setupAuth(test, { tokenIdentifier: 'user_123' });

// Unauthenticated
setupAuth(test, null);
```

#### Database Seeding
```typescript
await seedDatabase(test, {
  users: [createMockUser()],
  organizations: [createMockOrganization()],
  products: [createMockProduct()],
});
```

#### Query Testing
```typescript
const products = await test.db.query('products')
  .withIndex('by_organizationId', q => q.eq('organizationId', 'org_123'))
  .filter(p => p.status === 'active')
  .order('desc')
  .collect();
```

#### Assertion Helpers
```typescript
await assertDocumentExists(test, 'products', doc => doc.sku === 'TEST-123');
await assertDocumentNotExists(test, 'products', doc => doc.deleted === true);
```

## Best Practices

1. **Always clear database between tests** to ensure isolation
2. **Use type-safe context creators** instead of casting
3. **Seed data with factory functions** for consistency
4. **Test error cases** including auth failures and missing documents
5. **Use assertion helpers** for clearer test intent

## Migration from Legacy

If you're using the old `convexTest()` pattern:

1. See `CONVEX_TEST_MIGRATION.md` for detailed migration guide
2. New tests should use the standardized pattern
3. Migrate existing tests when modifying them
4. Legacy pattern remains available for backward compatibility

## Running Tests

```bash
# Run all Convex tests
npm test convex

# Run tests in watch mode
npm test -- --watch convex

# Run with coverage
npm test -- --coverage convex
```

## Troubleshooting

### Common Issues

1. **Type errors**: Ensure you're using the correct context creator
2. **Document not found**: Check that you've seeded the database
3. **Auth failures**: Verify `setupAuth()` was called with correct user
4. **Query failures**: Ensure indexes match your schema definition

### Debug Tips

```typescript
// Log all data in a table
console.log(getTableData(test, 'products'));

// Check if document exists
const exists = getTableData(test, 'users').some(u => u.email === 'test@example.com');

// Inspect mock calls
console.log(test.db.insert.mock.calls);
console.log(test.auth.getUserIdentity.mock.calls);
```

## Contributing

When adding new test utilities:

1. Add them to `convex-test-standard.ts`
2. Include TypeScript types
3. Add examples to `example-standard-test.ts`
4. Update this README

## Advanced Features

### Transaction Testing

```typescript
it('should handle transactions correctly', async () => {
  const ctx = createMutationContext(test);
  
  await test.db.run(async (tx) => {
    await tx.insert('products', { name: 'Product 1' });
    await tx.insert('products', { name: 'Product 2' });
    // Transaction will rollback on error
  });
});
```

### Real-time Subscriptions

```typescript
it('should notify subscribers of changes', async () => {
  const callback = jest.fn();
  
  // Subscribe to a query
  const unsubscribe = test.subscriptions.subscribe(
    'getProducts',
    { organizationId: 'org_123' },
    callback
  );
  
  // Trigger notification
  test.subscriptions.notifySubscribers(
    'getProducts',
    { organizationId: 'org_123' },
    { products: [/* ... */] }
  );
  
  expect(callback).toHaveBeenCalledWith({ products: [/* ... */] });
  
  // Check active subscriptions
  const active = test.subscriptions.getActiveSubscriptions();
  expect(active).toHaveLength(1);
  
  // Cleanup
  unsubscribe();
});
```

### Debug Utilities

```typescript
import { debugTable, debugAllTables, debugMockCalls, findDocuments } from './convex-test-standard';

// Debug specific table
debugTable(test, 'products');

// Debug all tables
debugAllTables(test);

// Debug all mock calls
debugMockCalls(test);

// Find documents across all tables
const results = findDocuments(test, (doc) => doc.status === 'active');
```

## Future Improvements

- [ ] Add performance testing utilities
- [ ] Create snapshot testing helpers
- [ ] Add schema validation in tests
- [ ] Support for file storage mocking
- [ ] Add time travel testing utilities