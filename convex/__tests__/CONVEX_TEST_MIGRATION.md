# Convex Test Standardization Migration Guide

This guide helps migrate existing tests to the new standardized Convex test pattern.

## Overview

The new standardized pattern addresses these issues:
1. Type safety improvements
2. Consistent API across all tests
3. Better query builder implementation
4. Support for advanced Convex features
5. Clear separation of concerns

## Quick Migration

### 1. Update Imports

**Before:**
```typescript
import { convexTest } from '../test-helpers';
```

**After:**
```typescript
import { createConvexTest, createQueryContext, setupAuth, seedDatabase } from '../convex-test-standard';
```

### 2. Update Test Setup

**Before:**
```typescript
let ctx: any;

beforeEach(() => {
  ctx = convexTest();
  ctx.auth.getUserIdentity.mockResolvedValue({
    tokenIdentifier: 'user_123',
    email: 'test@example.com',
  });
});
```

**After:**
```typescript
let test: ConvexTestContext;
let ctx: QueryCtx; // or MutationCtx, ActionCtx

beforeEach(() => {
  test = createConvexTest();
  ctx = createQueryContext(test); // or createMutationContext, createActionContext
  setupAuth(test, { tokenIdentifier: 'user_123' });
});
```

### 3. Update Database Seeding

**Before:**
```typescript
await ctx.db.insert('users', userData);
await ctx.db.insert('organizations', orgData);
```

**After:**
```typescript
await seedDatabase(test, {
  users: [userData],
  organizations: [orgData],
});
```

### 4. Update Query Patterns

**Before:**
```typescript
const queryBuilder = ctx.db.query('products');
await queryBuilder.withIndex('by_organizationId').eq('organizationId', orgId).collect();
```

**After:**
```typescript
// Same API, but with better type safety and full implementation
const queryBuilder = test.db.query('products');
await queryBuilder.withIndex('by_organizationId').eq('organizationId', orgId).collect();
```

## New Features

### 1. Type-Safe Query Builders

```typescript
const products = await test.db.query('products')
  .withIndex('by_price')
  .gte('price', 10)
  .lte('price', 100)
  .order('desc')
  .take(5)
  .collect();
```

### 2. Pagination Support

```typescript
const result = await test.db.query('products')
  .paginate({ numItems: 10, cursor: null });

console.log(result.page); // First 10 items
console.log(result.continueCursor); // Cursor for next page
console.log(result.isDone); // Whether there are more pages
```

### 3. Test Utilities

```typescript
// Clear all data
clearDatabase(test);

// Get all documents from a table
const allUsers = getTableData(test, 'users');

// Assert document exists
await assertDocumentExists(test, 'products', doc => doc.sku === 'TEST-123');

// Assert document doesn't exist
await assertDocumentNotExists(test, 'products', doc => doc.status === 'deleted');
```

### 4. Scheduler Support

```typescript
const ctx = createMutationContext(test);

// Schedule a job
await ctx.scheduler.runAfter(5000, 'processOrder', { orderId: '123' });

// Verify it was scheduled
expect(test.scheduler.runAfter).toHaveBeenCalledWith(
  5000,
  'processOrder',
  { orderId: '123' }
);
```

## Migration Checklist

- [ ] Update all imports to use the new standard
- [ ] Replace `convexTest()` with `createConvexTest()`
- [ ] Use appropriate context creators (`createQueryContext`, etc.)
- [ ] Replace manual auth mocking with `setupAuth()`
- [ ] Use `seedDatabase()` for test data setup
- [ ] Update assertions to use new helper functions
- [ ] Remove any custom query builder implementations
- [ ] Test that all tests still pass

## Gradual Migration

The old `convexTest()` function is still available for backward compatibility. You can migrate tests incrementally:

1. Start with new tests using the new pattern
2. Migrate existing tests when modifying them
3. Run a full migration when ready

## Benefits After Migration

1. **Better Type Safety**: Full TypeScript support for all mocks
2. **Consistent API**: Same patterns across all tests
3. **Advanced Features**: Pagination, proper indexing, scheduler support
4. **Better Debugging**: Clear error messages and assertion helpers
5. **Maintainability**: Easier to update and extend test infrastructure