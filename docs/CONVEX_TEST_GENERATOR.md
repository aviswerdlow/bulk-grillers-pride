# Convex Test Scaffolding Generator

## Overview

The Convex Test Scaffolding Generator is a CLI tool that automatically creates comprehensive test files for Convex functions. It analyzes your Convex function signatures and generates test cases following best practices.

## Installation

The generator is included in the project and can be run via npm script:

```bash
npm run generate:test <path-to-convex-function>
```

## Usage

### Basic Usage

Generate tests for a specific Convex function file:

```bash
npm run generate:test convex/functions/products/products.ts
```

This will:
1. Analyze the function file for exported queries, mutations, and actions
2. Generate a corresponding test file in `convex/__tests__/`
3. Create test cases for:
   - Happy path scenarios
   - Authorization failures
   - Validation errors
   - Edge cases (as placeholders)

### Example

Given a Convex function like:

```typescript
// convex/functions/products/products.ts
export const getProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) throw new Error('Product not found');
    await authenticateAndAuthorize(ctx, product.organizationId);
    return product;
  },
});
```

The generator creates:

```typescript
// convex/__tests__/products/products.test.ts
describe('getProduct', () => {
  describe('Happy Path', () => {
    it('should execute successfully with valid inputs', async () => {
      // Arrange - sets up test data
      // Act - calls the function
      // Assert - verifies results
    });
  });

  describe('Authorization', () => {
    it('should fail for unauthenticated user', async () => {
      // Tests auth failure
    });
  });

  describe('Validation', () => {
    it('should fail with invalid arguments', async () => {
      // Tests validation
    });
  });

  describe('Edge Cases', () => {
    // Placeholder for edge cases
  });
});
```

## Features

### 1. Automatic Test Structure

- Generates proper imports for test utilities
- Creates describe blocks for each exported function
- Sets up test context with `beforeEach`
- Includes all necessary mock factories

### 2. Argument Detection

The generator parses function arguments and generates appropriate test data:

- `v.id('organizations')` → Uses `org._id` from mock
- `v.string()` → Generates `'test-string'`
- `v.number()` → Generates `10`
- `v.boolean()` → Generates `true`
- Optional arguments are handled appropriately

### 3. Context Type Detection

Automatically uses the correct context creator based on function type:
- `query` → `createQueryContext(test)`
- `mutation` → `createMutationContext(test)`
- `action` → `createActionContext(test)`

### 4. Test Categories

Each function gets tests for:

1. **Happy Path**: Valid inputs, expected outputs
2. **Authorization**: Unauthenticated and unauthorized access
3. **Validation**: Invalid arguments and missing required fields
4. **Edge Cases**: Placeholders for specific edge cases

## Best Practices

### 1. Review Generated Tests

The generator creates a starting point. Always:
- Replace TODO comments with actual test logic
- Add specific assertions based on function behavior
- Add edge cases specific to your function
- Verify mock data matches your schema

### 2. Customize Test Data

The generator uses generic mock data. Update it to:
- Match your actual data relationships
- Test specific business logic
- Cover all code paths
- Test error conditions

### 3. Add Integration Tests

Generated tests are unit tests. Also consider:
- Testing function interactions
- Testing real-world workflows
- Testing performance characteristics
- Testing concurrent operations

## Limitations

### 1. Re-exports Not Supported

The generator currently doesn't follow re-exports:
```typescript
// This won't be parsed correctly
export * from './other-file';
```

### 2. Complex Types

Some complex Convex types may not be parsed correctly:
- Union types
- Complex object schemas
- Custom validators

### 3. Manual Customization Required

The generator provides scaffolding but requires manual work to:
- Add specific test logic
- Create appropriate test data
- Add business-specific assertions
- Handle complex scenarios

## Troubleshooting

### "File not found" Error

Ensure you're providing the correct path relative to the project root:
```bash
# Correct
npm run generate:test convex/functions/products/products.ts

# Incorrect
npm run generate:test products.ts
```

### "0 exported functions found"

This can happen with:
- Files that only export types/schemas
- Files using re-exports
- Files without Convex functions

### Overwriting Existing Tests

The generator will warn before overwriting existing test files. Choose:
- `y` to overwrite and regenerate
- `n` to cancel and keep existing tests

## Future Improvements

Planned enhancements include:
- [ ] Support for re-exports and barrel files
- [ ] Better complex type parsing
- [ ] Integration test generation
- [ ] Snapshot testing support
- [ ] Performance test scaffolding
- [ ] Custom test templates
- [ ] Interactive mode for customization

## Contributing

To improve the generator:

1. The source code is in `scripts/generate-convex-test.js`
2. Uses TypeScript compiler API for parsing
3. Templates are embedded in the generator
4. Add new patterns to the parser as needed

## Related Documentation

- [Convex Test Infrastructure](../convex/__tests__/README.md)
- [Convex Test Migration Guide](../convex/__tests__/CONVEX_TEST_MIGRATION.md)
- [Test Best Practices](./TEST_BEST_PRACTICES.md)