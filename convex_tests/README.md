# Convex Testing Guide

This directory contains the testing infrastructure and test suites for the Convex backend.

## Testing Infrastructure

### Setup Files

- **`setup/convex_test_helpers.ts`** - Core testing utilities including:

  - Mock database implementation
  - Mock context creators (query/mutation)
  - Test data seeders
  - Assertion helpers
  - Mock user identities

- **`setup/convex_test_setup.ts`** - Jest configuration for Convex tests:

  - Environment setup
  - Global mocks (fetch, console)
  - OpenAI mock helpers
  - Exports all test utilities

- **`setup/mock_convex_server.ts`** - Server-side mocks:
  - Mock validator
  - Mock scheduler
  - Mock storage
  - Mock action runner

### Writing Tests

#### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  convexAssertions,
} from '../setup/convex_test_setup';
import * as myModule from '../../functions/myModule';

describe('My Module', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    db = new MockDatabase();
    testData = await seedTestData(db);
  });

  describe('queries', () => {
    it('should do something', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await myModule.myQuery.handler(ctx, {
        /* args */
      });

      expect(result).toBeDefined();
    });
  });

  describe('mutations', () => {
    it('should mutate data', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const id = await myModule.myMutation.handler(ctx, {
        /* args */
      });

      convexAssertions.expectToBeValidId(id, 'tableName');
    });
  });
});
```

#### Testing Authentication

```typescript
// Test authenticated user
const ctx = createMockQueryContext(mockIdentities.user, db);

// Test unauthenticated user
const ctx = createMockQueryContext(null, db);

// Test admin user
const ctx = createMockQueryContext(mockIdentities.admin, db);

// Test user without email
const ctx = createMockQueryContext(mockIdentities.noEmail, db);
```

#### Using Mock Database

```typescript
// Insert data
const id = await db.insert('users', {
  clerkId: 'test_123',
  email: 'test@example.com',
  // ... other fields
});

// Get document
const user = await db.get(id);

// Update document
await db.patch(id, { status: 'inactive' });

// Delete document
await db.delete(id);

// Query documents
const users = await db
  .query('users')
  .withIndex('by_email', (q) => q.eq('email', 'test@example.com'))
  .collect();
```

#### Assertion Helpers

```typescript
// Check authentication
convexAssertions.expectToBeAuthenticated(identity);

// Check permissions
convexAssertions.expectToHavePermission(permissions, 'write');

// Validate ID format
convexAssertions.expectToBeValidId(id, 'users');

// Check timestamps
convexAssertions.expectToHaveTimestamps(document);
```

#### Testing External APIs

```typescript
import { mockOpenAIResponse, mockFailedAPIResponse } from '../setup/convex_test_setup';

// Mock successful OpenAI response
mockOpenAIResponse(
  JSON.stringify({
    categories: {
      level1: 'Food & Beverage',
      level2: 'Condiments',
    },
  })
);

// Mock failed API response
mockFailedAPIResponse(429, 'Rate limit exceeded');
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only Convex tests
npm test -- --selectProjects convex

# Run specific test file
npm test -- convex/__tests__/functions/products/products.test.ts
```

## Test Coverage Goals

- **Critical Functions**: 90% coverage
  - Authentication (auth/\*)
  - Core business logic (products, categories)
- **Standard Functions**: 80% coverage
  - CRUD operations
  - Import/export functions
- **Utility Functions**: 70% coverage
  - Helper functions
  - AI integrations

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Clear Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
4. **Mock External Dependencies**: Always mock external APIs and services
5. **Test Edge Cases**: Include tests for error conditions and edge cases
6. **Use Test Data Builders**: Create reusable functions for generating test data

## Common Testing Patterns

### Testing Permissions

```typescript
it('should require write permission', async () => {
  const ctx = createMockMutationContext(mockIdentities.user, db);

  // Set up user with limited permissions
  await db.insert('organizationMemberships', {
    userId: testData.userId,
    organizationId: testData.orgId,
    role: 'viewer',
    permissions: ['read'], // No write permission
    status: 'active',
  });

  await expect(
    myModule.createSomething.handler(ctx, {
      /* args */
    })
  ).rejects.toThrow('Insufficient permissions');
});
```

### Testing Validation

```typescript
it('should validate required fields', async () => {
  const ctx = createMockMutationContext(mockIdentities.user, db);

  await expect(
    myModule.createProduct.handler(ctx, {
      // Missing required 'name' field
      sku: 'TEST-001',
    })
  ).rejects.toThrow('Missing required field: name');
});
```

### Testing Async Operations

```typescript
it('should schedule background job', async () => {
  const scheduler = new MockScheduler();
  const ctx = createFullMockContext({
    identity: mockIdentities.user,
    db,
    scheduler,
  });

  await myModule.startImport.handler(ctx, {
    /* args */
  });

  const scheduled = scheduler.getScheduled();
  expect(scheduled).toHaveLength(1);
  expect(scheduled[0].functionName).toBe('processImport');
});
```

## Debugging Tests

1. **Use console.log**: Temporarily add console.log statements (they're normally suppressed)
2. **Run single test**: Use `it.only()` to run a single test
3. **Check mock calls**: Use `expect(mockFn).toHaveBeenCalledWith()`
4. **Inspect database state**: Log `db.query('table').collect()` to see all records

## Contributing

When adding new functionality:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Check coverage meets targets
4. Update this README if adding new patterns
