# API Contract Tests

This directory contains contract tests that validate the API interface between frontend and backend services. These tests ensure that:

1. **Input validation** - All API inputs match expected schemas
2. **Output validation** - All API responses match documented schemas
3. **Authentication** - Proper role-based access control is enforced
4. **Error handling** - Invalid inputs are properly rejected

## Test Structure

Each API module has its own contract test file:

- `products.contract.test.ts` - Product management APIs
- `categories.contract.test.ts` - Category hierarchy APIs
- `organizations.contract.test.ts` - Organization and team management APIs
- `ai-categorization.contract.test.ts` - AI categorization workflow APIs

## Key Features

### Schema Validation

All contracts use Zod schemas to validate:
- Request parameters
- Response shapes
- Error formats
- Pagination structures

### Authentication Requirements

Each endpoint specifies:
- Whether authentication is required
- Which roles have access
- Special permissions needed

### Test Data Generation

Tests use `@bulk-grillers-pride/test-factories` for:
- Realistic test data
- Mock IDs
- Consistent scenarios

## Running Contract Tests

```bash
# Run all contract tests
npm test -- contracts

# Run specific contract test
npm test -- products.contract.test.ts

# Run with coverage
npm test -- --coverage contracts
```

## Adding New Contract Tests

1. Create a new file: `[module].contract.test.ts`
2. Define Zod schemas for inputs/outputs
3. Create contract configurations
4. Add validation tests
5. Include authentication tests
6. Test error scenarios

## Contract Test Configuration

```typescript
interface ContractTestConfig {
  functionRef: FunctionReference;      // Convex function
  name: string;                       // Display name
  description?: string;               // What it does
  inputSchema: ZodSchema;            // Input validation
  outputSchema: ZodSchema;           // Output validation
  validInputs: any[];               // Valid examples
  invalidInputs?: any[];            // Invalid examples
  auth?: {                          // Auth requirements
    required: boolean;
    roles?: string[];
    permissions?: string[];
  };
}
```

## Benefits

1. **Early Detection** - Catch API mismatches before runtime
2. **Documentation** - Schemas serve as API documentation
3. **Type Safety** - Ensures frontend/backend alignment
4. **Regression Prevention** - Detect breaking changes
5. **Security** - Validate authentication requirements

## Common Patterns

### Pagination

```typescript
const paginatedResponse = commonSchemas.paginationOutput(itemSchema);
// Validates: { items: T[], nextCursor?: string, hasMore: boolean }
```

### Status Enums

```typescript
const statusSchema = z.enum(['active', 'draft', 'archived']);
```

### ID Validation

```typescript
const idSchema = z.string(); // Convex IDs are strings
```

### Error Responses

```typescript
const errorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});
```

## Maintenance

- Update schemas when API changes
- Add new test cases for edge scenarios
- Keep valid/invalid examples current
- Document breaking changes