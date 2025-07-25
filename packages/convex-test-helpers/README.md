# @bulk-grillers-pride/convex-test-helpers

A comprehensive testing library for Convex backend functions. Provides type-safe mocks and utilities for testing queries, mutations, and actions without requiring a live Convex deployment.

## Installation

```bash
npm install --save-dev @bulk-grillers-pride/convex-test-helpers
```

## Features

- 🎯 **Type-safe mocks** for all Convex operations
- 🔍 **Complete query builder** implementation with indexes, filters, and pagination
- 🧪 **Test utilities** for setup, seeding, and assertions
- 🏭 **Data factories** for creating consistent test data
- 🔄 **Full API compatibility** with Convex's database operations
- ⚡ **Zero dependencies** on Convex runtime

## Quick Start

```typescript
import { 
  createConvexTest, 
  createQueryContext,
  setupAuth,
  seedDatabase,
  assertDocumentExists 
} from '@bulk-grillers-pride/convex-test-helpers';

describe('My Convex Function', () => {
  let test;
  
  beforeEach(() => {
    test = createConvexTest();
  });
  
  it('should create a user', async () => {
    // Set up authentication
    setupAuth(test, { tokenIdentifier: 'user_123' });
    
    // Seed initial data
    await seedDatabase(test, {
      users: [{ _id: 'user_123', email: 'test@example.com' }]
    });
    
    // Create context and run your function
    const ctx = createQueryContext(test);
    const user = await ctx.db.get('user_123');
    
    // Assert results
    expect(user.email).toBe('test@example.com');
    await assertDocumentExists(test, 'users', u => u.email === 'test@example.com');
  });
});
```

## API Reference

### Core Functions

#### `createConvexTest()`
Creates a new test context with all necessary mocks.

```typescript
const test = createConvexTest();
```

### Context Builders

#### `createQueryContext(test)`
Creates a context for testing Convex queries.

```typescript
const ctx = createQueryContext(test);
// ctx has: db, auth
```

#### `createMutationContext(test)`
Creates a context for testing Convex mutations.

```typescript
const ctx = createMutationContext(test);
// ctx has: db, auth, scheduler
```

#### `createActionContext(test)`
Creates a context for testing Convex actions.

```typescript
const ctx = createActionContext(test);
// ctx has: auth, scheduler, runQuery, runMutation, runAction
```

### Test Utilities

#### `setupAuth(test, user)`
Sets up authentication for the test context.

```typescript
// Authenticated user
setupAuth(test, { 
  tokenIdentifier: 'user_123',
  email: 'user@example.com'
});

// Unauthenticated
setupAuth(test, null);
```

#### `seedDatabase(test, data)`
Seeds the test database with initial data.

```typescript
await seedDatabase(test, {
  users: [
    { _id: 'user_1', name: 'Alice' },
    { _id: 'user_2', name: 'Bob' }
  ],
  posts: [
    { title: 'Hello World', authorId: 'user_1' }
  ]
});
```

#### `clearDatabase(test)`
Clears all data from the test database.

```typescript
clearDatabase(test);
```

#### `getTableData(test, table)`
Gets all documents from a specific table.

```typescript
const users = getTableData(test, 'users');
console.log(users); // Array of all users
```

### Assertions

#### `assertDocumentExists(test, table, predicate)`
Asserts that a document matching the predicate exists.

```typescript
await assertDocumentExists(
  test, 
  'users', 
  user => user.email === 'test@example.com'
);
```

#### `assertDocumentNotExists(test, table, predicate)`
Asserts that no document matches the predicate.

```typescript
await assertDocumentNotExists(
  test, 
  'users', 
  user => user.isDeleted === true
);
```

#### `assertTableCount(test, table, count)`
Asserts that a table has exactly `count` documents.

```typescript
assertTableCount(test, 'users', 5);
```

#### `assertQueryCalled(test, queryName, args?)`
Asserts that a query was called with optional arguments.

```typescript
assertQueryCalled(test, 'getUser', { userId: 'user_123' });
```

### Data Factories

#### `createFactory(defaults)`
Creates a factory function for generating test data.

```typescript
const createUser = createFactory({
  _id: 'user_1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user'
});

const user = createUser({ name: 'Alice' });
// { _id: 'user_1', name: 'Alice', email: 'test@example.com', role: 'user' }
```

#### `createBatch(factory, count, overrides?)`
Creates multiple documents using a factory.

```typescript
const users = createBatch(createUser, 5, (index) => ({
  _id: `user_${index}`,
  email: `user${index}@example.com`
}));
```

## Query Builder

The mock query builder supports all Convex query operations:

```typescript
// Basic queries
const users = await test.db.query('users').collect();
const firstUser = await test.db.query('users').first();

// Filters
const activeUsers = await test.db.query('users')
  .filter(u => u.status === 'active')
  .collect();

// Indexes
const userByEmail = await test.db.query('users')
  .withIndex('by_email', q => q.eq('email', 'test@example.com'))
  .unique();

// Comparisons
const expensiveProducts = await test.db.query('products')
  .filter(p => p.price > 100)
  .order('desc')
  .take(10)
  .collect();

// Pagination
const page1 = await test.db.query('posts')
  .paginate({ numItems: 10 });

const page2 = await test.db.query('posts')
  .paginate({ numItems: 10, cursor: page1.continueCursor });
```

## Advanced Usage

### Testing Scheduled Jobs

```typescript
it('should schedule a job', async () => {
  const ctx = createMutationContext(test);
  
  // Schedule a job
  await ctx.scheduler.runAfter(5000, 'sendEmail', { 
    to: 'user@example.com',
    subject: 'Hello'
  });
  
  // Verify it was scheduled
  assertJobScheduled(test, 'sendEmail', {
    to: 'user@example.com',
    subject: 'Hello'
  });
});
```

### Testing Actions with Mocked Queries/Mutations

```typescript
it('should run complex action', async () => {
  const ctx = createActionContext(test);
  
  // Mock query responses
  test.runQuery.mockImplementation(async (name, args) => {
    if (name === 'getUser') return { _id: args.userId, name: 'Test' };
    return null;
  });
  
  // Mock mutation responses
  test.runMutation.mockImplementation(async (name, args) => {
    if (name === 'updateUser') return args.userId;
    return null;
  });
  
  // Test your action
  const result = await myAction(ctx, { userId: 'user_123' });
  
  // Verify calls
  assertQueryCalled(test, 'getUser', { userId: 'user_123' });
  assertMutationCalled(test, 'updateUser', { userId: 'user_123' });
});
```

### Testing Error Cases

```typescript
it('should handle not found errors', async () => {
  const ctx = createMutationContext(test);
  
  // Attempt to update non-existent document
  await expect(
    test.db.patch('non_existent', { status: 'updated' })
  ).rejects.toThrow('Document non_existent not found');
});

it('should require authentication', async () => {
  setupAuth(test, null); // No auth
  
  const ctx = createQueryContext(test);
  const identity = await ctx.auth.getUserIdentity();
  
  expect(identity).toBeNull();
});
```

## Best Practices

1. **Always clear the database between tests** to ensure test isolation
2. **Use factories for consistent test data** instead of hardcoding objects
3. **Test both success and error cases** for comprehensive coverage
4. **Use assertion helpers** for clearer test intent
5. **Mock at the appropriate level** - don't over-mock

## TypeScript Support

This library is written in TypeScript and provides full type safety. For the best experience:

```typescript
import type { ConvexTestContext } from '@bulk-grillers-pride/convex-test-helpers';

// Type your test context
let test: ConvexTestContext;

// Cast contexts to Convex types if needed
import type { QueryCtx } from './_generated/server';
const ctx = createQueryContext(test) as unknown as QueryCtx;
```

## Contributing

Contributions are welcome! Please see our contributing guidelines.

## License

MIT