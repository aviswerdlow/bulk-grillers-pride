# Integration Tests

This directory contains integration tests that verify the interaction between multiple components of the application.

## Directory Structure

```
integration-tests/
├── api/           # API integration tests
├── workflows/     # End-to-end workflow tests
├── fixtures/      # Test data and fixtures
└── utils/         # Integration test utilities
```

## What Are Integration Tests?

Integration tests sit between unit tests and E2E tests in the testing pyramid:
- **Unit tests**: Test individual functions/components in isolation
- **Integration tests**: Test how multiple components work together
- **E2E tests**: Test complete user workflows through the UI

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration:coverage

# Run in watch mode
npm run test:integration:watch

# Run a specific test file
npm run test:integration -- path/to/test.spec.ts
```

## Writing Integration Tests

### Example API Integration Test

```typescript
// integration-tests/api/products.integration.test.ts
import { setupTestDatabase, cleanupTestDatabase } from '../utils/database';
import { createTestUser, createTestOrganization } from '../fixtures/auth';

describe('Products API Integration', () => {
  let testUser;
  let testOrg;

  beforeAll(async () => {
    await setupTestDatabase();
    testUser = await createTestUser();
    testOrg = await createTestOrganization(testUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should create and retrieve a product', async () => {
    // Test implementation
  });
});
```

### Example Workflow Integration Test

```typescript
// integration-tests/workflows/product-categorization.test.ts
describe('Product Categorization Workflow', () => {
  it('should categorize products using AI and update database', async () => {
    // 1. Create test products
    // 2. Trigger AI categorization
    // 3. Verify categories are assigned
    // 4. Check audit logs
  });
});
```

## Best Practices

1. **Test Real Integrations**: Don't mock the components you're testing together
2. **Use Test Database**: Always use a separate test database
3. **Clean Up**: Ensure proper cleanup after each test
4. **Isolate Tests**: Each test should be independent
5. **Realistic Data**: Use realistic test data that matches production scenarios
6. **Performance**: Keep tests reasonably fast (< 5 seconds per test)

## Test Data Management

### Fixtures
Place reusable test data in the `fixtures/` directory:
- `auth.ts`: User and organization fixtures
- `products.ts`: Product test data
- `categories.ts`: Category test data

### Database Seeding
Use the utilities in `utils/database.ts` to:
- Set up test database before tests
- Seed initial data
- Clean up after tests

## Environment Variables

Integration tests use these environment variables:
- `INTEGRATION_TEST=true`: Indicates integration test environment
- `TEST_DATABASE_URL`: Test database connection string
- `MOCK_EXTERNAL_SERVICES`: Set to 'true' to mock external APIs

## CI/CD Integration

Integration tests run in the CI pipeline:
1. After unit tests pass
2. Before E2E tests
3. With a dedicated test database
4. In isolation from other test suites