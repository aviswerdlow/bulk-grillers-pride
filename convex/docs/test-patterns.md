# Convex Test Patterns Documentation

## Overview

This document describes the testing patterns used in the Convex backend, specifically the direct handler import pattern that provides better type safety and maintainability compared to string-based function calls.

## Migration from String-Based to Direct Handler Import Pattern

### Old Pattern (String-Based)
```typescript
// ❌ Old pattern - uses string references
const result = await t.runQuery('products.getProductBySku', { 
  organizationId, 
  sku: 'TEST-SKU' 
});
```

### New Pattern (Direct Handler Import)
```typescript
// ✅ New pattern - direct handler imports
const result = await testCtx.handlers.getProductBySku({ 
  organizationId, 
  sku: 'TEST-SKU' 
});
```

## Key Components

### 1. Handler Functions
Handler functions are extracted from Convex functions to make them testable:

```typescript
// In functions/products/handlers/queries.ts
export async function getProductBySkuHandler(
  ctx: QueryCtx,
  args: { organizationId: Id<'organizations'>; sku: string }
) {
  // Authentication and authorization
  const { user, membership } = await authenticateAndAuthorize(ctx, args.organizationId);
  
  // Business logic
  const product = await ctx.db
    .query('products')
    .withIndex('by_organization_sku', (q) => 
      q.eq('organizationId', args.organizationId).eq('sku', args.sku)
    )
    .unique();
    
  return product;
}
```

### 2. Test Context Helper
The `convexTestCtx.ts` file provides a centralized test context:

```typescript
import { createTestContext } from '../../../tests/helpers/convexTestCtx';

describe('Products', () => {
  let testCtx: TestContext;
  
  beforeEach(() => {
    testCtx = createTestContext();
  });
  
  it('should get product by SKU', async () => {
    const result = await testCtx.handlers.getProductBySku({
      organizationId,
      sku: 'TEST-SKU'
    });
    expect(result).toBeDefined();
  });
});
```

### 3. Mock Implementation
The `convex-test-v2.js` mock provides a complete testing environment:

- Chainable query interface with proper filtering
- Support for complex queries (withIndex, filter, order, etc.)
- Storage API mocking
- Authentication mocking
- Proper handling of null values and edge cases

## Test Structure

### 1. Setup Phase
```typescript
beforeEach(async () => {
  resetMockState(); // Clear all mock data
  ctx = await t.run(async (ctx) => ctx);
  testCtx = createTestContext();
  
  // Create test data
  userId = await ctx.db.insert('users', { /* user data */ });
  orgId = await ctx.db.insert('organizations', { /* org data */ });
  
  // Setup authentication
  t.auth.getUserIdentity.mockResolvedValue({
    tokenIdentifier: 'test_user_123',
    subject: 'test_user_123',
    email: 'test@example.com',
  });
});
```

### 2. Test Cases
Organize tests by functionality:

```typescript
describe('Query Operations', () => {
  it('should handle successful queries', async () => {
    // Test implementation
  });
  
  it('should handle authentication failures', async () => {
    t.auth.getUserIdentity.mockResolvedValue(null);
    await expect(testCtx.handlers.someQuery(args))
      .rejects.toThrow('Not authenticated');
  });
  
  it('should handle authorization failures', async () => {
    // Create user without proper permissions
    await expect(testCtx.handlers.someQuery(args))
      .rejects.toThrow('Access denied');
  });
});
```

### 3. Common Test Patterns

#### Testing Authentication
```typescript
it('should fail for unauthenticated user', async () => {
  t.auth.getUserIdentity.mockResolvedValue(null);
  await expect(testCtx.handlers.someQuery(args))
    .rejects.toThrow('Not authenticated');
});
```

#### Testing Authorization
```typescript
it('should fail for non-member', async () => {
  // Create user without membership
  const otherUserId = await ctx.db.insert('users', { /* data */ });
  t.auth.getUserIdentity.mockResolvedValue({
    tokenIdentifier: 'other_user',
    subject: 'other_user',
  });
  
  await expect(testCtx.handlers.someQuery(args))
    .rejects.toThrow('Access denied');
});
```

#### Testing Complex Queries
```typescript
it('should filter and order results correctly', async () => {
  // Create test data with specific ordering
  const results = await testCtx.handlers.getImportJobs({
    organizationId,
    status: 'completed',
    limit: 5
  });
  
  // Verify ordering
  expect(results[0]._creationTime).toBeGreaterThan(results[1]._creationTime);
});
```

## Mock Enhancements

### Key Mock Features
1. **Chainable Query Interface**: Supports `withIndex`, `filter`, `order`, `take`, `collect`
2. **Filter Operations**: Supports `eq`, `neq`, `gte`, `and`, `or`
3. **Ordering**: Properly sorts by `_creationTime` or other fields
4. **Storage API**: Mocks file upload/download operations
5. **Null Handling**: Correctly handles null values in queries

### Example Mock Usage
```typescript
// Mock supports complex queries
const results = await ctx.db
  .query('products')
  .withIndex('by_organization', (q) => q.eq('organizationId', orgId))
  .filter((q) => q.or(
    q.eq(q.field('status'), 'active'),
    q.eq(q.field('status'), 'draft')
  ))
  .order('desc')
  .take(10)
  .collect();
```

## Best Practices

### 1. Test Data Isolation
- Use `resetMockState()` in `beforeEach` to ensure test isolation
- Create fresh test data for each test
- Don't rely on data from other tests

### 2. Type Safety
- Always use typed handlers from `convexTestCtx.ts`
- Define proper types for all test data
- Use `Id<'tableName'>` types for IDs

### 3. Error Testing
- Test both success and failure paths
- Verify specific error messages
- Test edge cases and boundary conditions

### 4. Performance Testing
- Use reasonable data sizes in tests
- Test pagination and limits
- Verify query efficiency

### 5. Comprehensive Coverage
- Test all CRUD operations
- Test authorization at different permission levels
- Test data validation and constraints

## Adding New Tests

### 1. Create Handler Function
Extract the business logic into a handler function in the appropriate `handlers/` directory.

### 2. Add to Test Context
Add the handler wrapper to `convexTestCtx.ts`:

```typescript
newFeature: async (args: { /* typed args */ }) => {
  const queryCtx = { db: ctx.db, auth: ctx.auth } as QueryCtx;
  return newFeatureHandler(queryCtx, args);
},
```

### 3. Write Tests
Create comprehensive tests following the patterns above.

### 4. Update Mock if Needed
If new Convex features are used, update the mock in `convex-test-v2.js`.

## Common Issues and Solutions

### Issue: "Cannot read property 'collect' of undefined"
**Solution**: Ensure query chains return the chainable object and call `.collect()` at the end.

### Issue: "Order not working correctly"
**Solution**: The mock's `order()` method now properly sorts by `_creationTime`.

### Issue: "Filter with or() not supported"
**Solution**: The mock now supports `or()` filters for combining conditions.

### Issue: "Null values not handled correctly"
**Solution**: The mock properly handles null checks in both `withIndex` and `filter`.

## Migration Checklist

When converting tests from string-based to direct handler pattern:

- [ ] Extract handler functions from Convex functions
- [ ] Add handler wrappers to `convexTestCtx.ts`
- [ ] Update test imports to use `createTestContext`
- [ ] Replace `t.runQuery/runMutation` with `testCtx.handlers.*`
- [ ] Update error message expectations if needed
- [ ] Verify all tests pass with proper type safety
- [ ] Remove any skip flags from converted tests

## Future Improvements

1. **Mock Enhancements**: Continue improving the mock to support more Convex features
2. **Test Utilities**: Create helper functions for common test scenarios
3. **Performance Testing**: Add benchmarking for query performance
4. **Integration Tests**: Add tests that span multiple handlers
5. **Snapshot Testing**: Consider adding snapshot tests for complex data structures