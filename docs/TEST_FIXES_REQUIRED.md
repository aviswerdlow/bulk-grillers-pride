# Test Suite Fixes Required

**Date**: 2025-01-19  
**Severity**: Critical - Tests are failing and E2E tests are completely blocked  
**Coverage**: Currently at 7% (target: 70%)

## Executive Summary

The test suite has multiple critical failures preventing proper quality assurance:
- 200 out of 752 tests failing (26.6% failure rate)
- E2E tests completely blocked due to import errors
- API path mismatches causing widespread test failures
- Contract validation tests failing

## Critical Issues by Agent

### 1. Backend Agent - API Path Structure Issues

**Problem**: API paths in tests don't match actual Convex function structure
```typescript
// FAILING PATH IN TESTS:
api.functions.projects.projects.getOrganizationProjects

// LIKELY CORRECT PATH:
api.projects.getOrganizationProjects
// OR
api.functions.projects.getOrganizationProjects
```

**Affected Files**:
- `apps/web/src/app/(dashboard)/[orgSlug]/dashboard/page.tsx`
- All tests importing these APIs

**Root Cause Analysis**:
The API structure appears to have been refactored but tests weren't updated. The double `projects.projects` suggests either:
1. An extra nesting level was removed from the API
2. The import path structure changed

**Fix Required**:
1. Verify the correct API structure in `convex/_generated/api.d.ts`
2. Update all API imports to match the actual structure
3. Ensure consistency across all Convex function references

### 2. Backend Agent - Contract Validation Failures

**Problem**: Contract tests failing validation
```
FAIL: ai.categorization.getCategorizationJob - contract validation
FAIL: ai.categorization.cancelCategorizationJob - contract validation
FAIL: imports.* - multiple contract validation failures
```

**Affected Files**:
- `apps/web/src/__tests__/contracts/ai-categorization.contract.test.ts`
- `apps/web/src/__tests__/contracts/imports.contract.test.ts`

**Fix Required**:
1. Review actual API schemas in Convex functions
2. Update contract test schemas to match current implementation
3. Ensure all required fields and types are correctly defined

### 3. Infrastructure Agent - Test Factory Import Errors

**Problem**: E2E tests cannot import test factories
```typescript
// ERROR:
TypeError: (0 , _testFactories.createTestUser) is not a function
at e2e/sku-feature.spec.ts:6
```

**Affected Files**:
- `e2e/sku-feature.spec.ts`
- Potentially all E2E test files using test factories

**Root Cause Analysis**:
The test factories package exists but isn't properly exported or built for E2E tests.

**Fix Required**:
1. Check `packages/test-factories/src/index.ts` exports
2. Ensure test-factories package is built before E2E tests run
3. Verify import paths in E2E tests match package exports
4. May need to add test-factories to Playwright config dependencies

### 4. Frontend Agent - Async Test Timing Issues

**Problem**: Tests timing out waiting for async operations
```typescript
// Example failure:
await waitFor(() => {
  expect(
    screen.getByText('This organization URL is already taken.')
  ).toBeInTheDocument();
});
// Times out after default timeout
```

**Affected Files**:
- `apps/web/src/app/(auth)/onboarding/__tests__/page.test.tsx`
- Other async form validation tests

**Fix Required**:
1. Increase timeout for specific async operations
2. Ensure mocks return expected error states
3. Add proper loading state handling in tests
4. Consider using `findBy*` queries instead of `getBy*` with `waitFor`

## Test Execution Results

### Unit/Integration Tests (Jest)
- **Total**: 752 tests across 61 suites
- **Passing**: 552 (73.4%)
- **Failing**: 200 (26.6%)
- **Blocked**: 0

### E2E Tests (Playwright)
- **Total**: 11 spec files
- **Passing**: 0
- **Failing**: 0
- **Blocked**: ALL (due to import error)

### Coverage Report
```
Current: 7%
Target: 70%
Gap: 63%
```

## Priority Order for Fixes

### P0 - Unblock All Tests (Today)
1. **Backend Agent**: Fix API path structure
2. **Infra Agent**: Fix test factory imports for E2E

### P1 - Fix Major Failures (Tomorrow)
1. **Backend Agent**: Update contract validations
2. **Frontend Agent**: Fix async timing issues

### P2 - Improve Coverage (This Week)
1. **Quality Agent**: Coordinate coverage improvements
2. **All Agents**: Add tests for uncovered code in their domains

## Verification Steps

After fixes are applied:

1. **Backend fixes verification**:
   ```bash
   npm test -- --testPathPattern="dashboard|contract" --verbose
   ```

2. **E2E fixes verification**:
   ```bash
   npm run test:e2e -- --list  # Should list all tests
   npm run test:e2e -- --project=chromium  # Should run
   ```

3. **Frontend fixes verification**:
   ```bash
   npm test -- --testPathPattern="onboarding" --verbose
   ```

4. **Full suite verification**:
   ```bash
   npm test -- --coverage
   npm run test:e2e
   ```

## Success Criteria

- [ ] All 752 unit/integration tests passing
- [ ] All 11 E2E test specs executable
- [ ] No timeout errors in async tests
- [ ] Coverage increased to at least 20% (intermediate goal)
- [ ] CI/CD pipeline green

## Resources

- Jest Documentation: https://jestjs.io/docs/configuration
- Playwright Documentation: https://playwright.dev/docs/intro
- Testing Library: https://testing-library.com/docs/
- Convex Testing Guide: https://docs.convex.dev/testing