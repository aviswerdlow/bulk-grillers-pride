# @bulk-grillers-pride/test-factories

Test data factories for consistent and realistic test data generation across the Bulk Grillers Pride codebase.

## Installation

```bash
npm install --save-dev @bulk-grillers-pride/test-factories
```

## Features

- 🏭 **Type-safe factories** for all Convex data models
- 🎲 **Realistic data generation** using Faker.js
- 🔄 **Deterministic generation** with seed support
- 🎯 **Specialized methods** for common scenarios
- 🧩 **Complete test scenarios** with related data
- 📦 **Zero production dependencies** (only Faker.js)

## Usage

### Basic Usage

```typescript
import { userFactory, organizationFactory, productFactory } from '@bulk-grillers-pride/test-factories';

// Create a single user
const user = userFactory.create();

// Create multiple users
const users = userFactory.createMany(5);

// Create with overrides
const admin = userFactory.create({
  overrides: {
    email: 'admin@example.com',
    status: 'active',
  }
});
```

### Specialized Factory Methods

Each factory includes specialized methods for common scenarios:

```typescript
// User Factory
const activeUser = userFactory.createActive();
const invitedUser = userFactory.createInvited();
const suspendedUser = userFactory.createSuspended();
const corpUser = userFactory.createWithEmailDomain('company.com');
const testUser = userFactory.createTest(1); // Predictable data

// Organization Factory
const trialOrg = organizationFactory.createTrial();
const enterpriseOrg = organizationFactory.createEnterprise();
const suspendedOrg = organizationFactory.createSuspended();

// Product Factory
const meatProduct = productFactory.createMeatProduct();
const seafoodProduct = productFactory.createSeafoodProduct();
const draftProduct = productFactory.createDraft();
const archivedProduct = productFactory.createArchived();

// Category Factory
const rootCategory = categoryFactory.createRoot();
const subCategory = categoryFactory.createSubcategory(parentId, parentPath);
const meatHierarchy = categoryFactory.createMeatHierarchy(orgId, projectId);

// AI Job Factory
const pendingJob = aiCategorizationJobFactory.createPending();
const runningJob = aiCategorizationJobFactory.createRunning();
const completedJob = aiCategorizationJobFactory.createCompleted();
const failedJob = aiCategorizationJobFactory.createFailed();
```

### Complete Test Scenarios

Create complete test scenarios with related data:

```typescript
import { createTestScenario } from '@bulk-grillers-pride/test-factories';

// Create a complete scenario
const scenario = createTestScenario({
  userCount: 3,
  categoryCount: 5,
  productCount: 10,
  includeAiJob: true,
  seed: 12345, // Optional: for deterministic data
});

// Access the created data
const { organization, users, categories, products, aiJob } = scenario;
```

### Deterministic Data Generation

Use seeds for consistent test data:

```typescript
import { UserFactory } from '@bulk-grillers-pride/test-factories';

// Create factory with seed
const seededFactory = new UserFactory(12345);

// These will always generate the same data
const user1 = seededFactory.create();
const user2 = seededFactory.create(); // Different from user1 but consistent
```

### Mock IDs

Generate mock Convex IDs for testing:

```typescript
import { createMockId, createMockIdFromString, createIdGenerator } from '@bulk-grillers-pride/test-factories';

// Random mock ID
const userId = createMockId('users');

// Deterministic mock ID
const productId = createMockIdFromString('products', 'product-1');

// ID generator with counter
const idGen = createIdGenerator('categories');
const id1 = idGen.next(); // Incremental IDs
const id2 = idGen.next();
idGen.reset(); // Reset counter
```

## Factory API

### Common Options

All factories support these options:

```typescript
interface FactoryOptions<T> {
  overrides?: Partial<T>;  // Override specific fields
  seed?: number;           // Seed for this instance
  locale?: string;         // Locale for generated data
}
```

### Base Factory Methods

All factories extend `BaseFactory` and include:

- `create(options?)` - Create a single instance
- `createMany(count, options?)` - Create multiple instances
- `createManyWithOverrides(overrides[])` - Create with specific overrides

## Available Factories

### UserFactory
Creates user documents with:
- Realistic names and emails
- Random avatar URLs
- Status management
- Login tracking

### OrganizationFactory
Creates organization documents with:
- Company names and slugs
- Subscription plans
- AI provider settings
- Storage limits

### ProductFactory
Creates product documents with:
- Product titles and descriptions
- Vendor information
- Categories and tags
- AI categorization suggestions
- Images and metadata

### CategoryFactory
Creates category documents with:
- Hierarchical structure
- SEO information
- Display properties
- AI suggestions

### AiCategorizationJobFactory
Creates AI job documents with:
- Job status and progress
- Provider and model configuration
- Results and errors
- Cost tracking

## Testing Best Practices

1. **Use specialized methods** when available:
   ```typescript
   // Good
   const activeUser = userFactory.createActive();
   
   // Less clear
   const user = userFactory.create({ overrides: { status: 'active' } });
   ```

2. **Use test scenarios** for integration tests:
   ```typescript
   const scenario = createTestScenario();
   // All data is properly related and consistent
   ```

3. **Use seeds** for deterministic tests:
   ```typescript
   const factory = new ProductFactory(12345);
   // Tests will be reproducible
   ```

4. **Reset factories** between test suites:
   ```typescript
   import { resetAllFactories } from '@bulk-grillers-pride/test-factories';
   
   beforeEach(() => {
     resetAllFactories();
   });
   ```

## Examples

### Unit Test Example

```typescript
import { userFactory, organizationFactory } from '@bulk-grillers-pride/test-factories';
import { authenticateAndAuthorize } from '../auth';

describe('authenticateAndAuthorize', () => {
  it('should authenticate active users', async () => {
    const user = userFactory.createActive();
    const org = organizationFactory.create();
    
    const result = await authenticateAndAuthorize(mockCtx, org._id, user._id);
    
    expect(result.user._id).toBe(user._id);
    expect(result.membership.status).toBe('active');
  });
});
```

### Integration Test Example

```typescript
import { createTestScenario } from '@bulk-grillers-pride/test-factories';

describe('Product Categorization', () => {
  it('should categorize products using AI', async () => {
    const scenario = createTestScenario({
      productCount: 20,
      categoryCount: 10,
      includeAiJob: true,
    });
    
    // Test with realistic, related data
    const result = await categorizeProducts(
      scenario.products,
      scenario.categories,
      scenario.aiJob
    );
    
    expect(result.categorized).toBe(20);
  });
});
```

## Contributing

When adding new factories:

1. Extend `BaseFactory<T>`
2. Implement the `create()` method
3. Add specialized creation methods
4. Export from `index.ts`
5. Update this README

## License

Private - See root LICENSE file