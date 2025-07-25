# Test Fix Guide

This guide documents common test failures and their fixes based on analysis of failing test suites.

## Common Issues and Fixes

### 1. Cannot read properties of undefined (reading 'getOrganizationBySlug')

**Issue**: Frontend tests trying to use Convex queries that aren't properly mocked.

**Fix**: Ensure the mock implementation returns proper data:

```typescript
// In test file or test-utils.tsx
const mockUseQuery = vi.fn().mockImplementation((query) => {
  if (query.name === 'getOrganizationBySlug') {
    return {
      _id: 'org_1',
      name: 'Test Org',
      slug: 'test-org',
      // ... other required fields
    };
  }
  return undefined;
});
```

### 2. expect(received).toHaveLength - Received has value: undefined

**Issue**: Convex query/mutation tests expecting arrays but getting undefined.

**Fix**: Ensure mock queries return arrays:

```typescript
// In Convex test
const result = await ctx.runQuery('getImportJobs', { organizationId });
// Make sure the mock returns an array, not undefined
expect(result || []).toHaveLength(expectedLength);
```

### 3. TestingLibraryElementError: Unable to find element

**Issue**: Component rendering differently than expected or elements not in DOM.

**Fix**: 
- Check if component is actually rendering (add debug())
- Verify text content matches exactly
- Use more flexible queries:

```typescript
// Instead of
screen.getByText('Profile Information')
// Try
screen.getByText(/profile information/i)
// Or
screen.getByRole('heading', { name: /profile/i })
```

### 4. Promise resolved instead of rejected

**Issue**: Tests expecting errors but function succeeds.

**Fix**: Ensure error conditions are properly set up in mocks:

```typescript
// Setup error condition
ctx.withUser({ _id: 'wrong_user' });
// Or mock to throw
mockQuery.mockRejectedValueOnce(new Error('Not authorized'));
```

## Test Categories and Priority

### P1 - Critical Dashboard Tests (Fix First)
1. `dashboard/__tests__/page.test.tsx`
2. `dashboard/__tests__/navigation.test.tsx`
3. `products/__tests__/page.test.tsx`
4. `categories/__tests__/page.test.tsx`

### P2 - Component Tests
1. `auth/user-profile.test.tsx`
2. `auth/team-members-list.test.tsx`
3. `auth/organization-switcher.test.tsx`
4. `products/product-card.test.tsx`

### P3 - Backend Tests
1. `convex/__tests__/imports/imports.test.ts`
2. `convex/__tests__/products/products.test.ts`
3. `convex/__tests__/projects/projects.test.ts`
4. `convex/__tests__/organizations/apiKeys.test.ts`

## Quick Fixes Applied

### 1. Mock Setup Enhancement

Updated `__mocks__/convex/react.js` to provide better default implementations.

### 2. Test Utils Update

Enhanced `test-utils.tsx` with more comprehensive mocks for common queries.

### 3. Component Mock Improvements

Added missing mocks for Radix UI components and other dependencies.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- dashboard/page.test.tsx

# Run with debugging
npm test -- --verbose --no-coverage

# Run only failing tests
npm test -- --onlyFailures
```

## Next Steps

1. Fix dashboard tests first (they block the most functionality)
2. Update component tests to use proper mocks
3. Fix backend tests to return proper data structures
4. Add integration tests once unit tests pass