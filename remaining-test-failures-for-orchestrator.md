# Remaining Test Infrastructure Issues for Orchestrator

## Overview
This document outlines the remaining test failures and TypeScript errors discovered during the fix of GitHub Issue #139 (Fix CI failures in Turbo v2 upgrade PR #12). These issues are outside the scope of the infra-agent and need to be assigned to the appropriate agents.

## Issues to Create

### 1. TypeScript Errors in Convex Backend Code
**Title**: Fix TypeScript errors in Convex backend code
**Assignee**: backend-agent
**Labels**: bug, typescript, backend
**Priority**: P0
**Description**:
Multiple TypeScript errors were found in the Convex backend code during type checking:

#### Files with errors:
1. **convex/functions/migrations/schemaVersion.ts**
   - Lines 125, 141, 149, 166, 221: Property 'settings' does not exist on audit logs
   - Lines 156, 209: Type instantiation is excessively deep

2. **convex/functions/migrations/validateCategoryImport.ts**
   - Multiple lines: Type instantiation is excessively deep

3. **convex/functions/monitoring/aggregation.ts**
   - Property mismatches between different metric types
   - Type instantiation depth issues

4. **convex/functions/monitoring/alerts.ts**
   - Lines 231, 248: RegisteredQuery type has no call signatures

5. **convex/functions/monitoring/dashboard.ts**
   - Multiple RegisteredQuery call signature errors
   - Type instantiation depth issues

6. **convex/functions/monitoring/performance.ts**
   - Line 33, 51: Property 'monitoring' does not exist
   - Line 89: Missing required properties in argument

7. **convex/functions/products/deletion.ts**
   - Line 568: Property 'functions' does not exist
   - Line 761: Missing required properties in user type

8. **convex/functions/products/handlers/mutations.ts**
   - Line 63: Property 'defaultProductStatus' does not exist
   - Line 79: Type mismatch for product creation
   - Lines 84, 184, 255: Object literal specifying unknown properties
   - Line 246: 'archivedAt' does not exist in product type

9. **convex/migrations/validateMigration001.ts**
   - Multiple lines: Property 'migrations' does not exist

**Action Required**: Review and fix all TypeScript errors in these files. Many appear to be schema mismatches or missing property definitions.

### 2. ESLint Errors in Test Mock Files
**Title**: Fix ESLint errors in test mock files
**Assignee**: frontend-agent
**Labels**: bug, eslint, frontend, testing
**Priority**: P1
**Description**:
Several ESLint errors were found in test mock files:

1. **apps/web/src/__tests__/__mocks__/@clerk/nextjs.tsx** and **@clerk/nextjs 2.tsx**
   - Lines 338, 355, 367: Component definition is missing display name
   - Multiple warnings about using `<img>` instead of Next.js `<Image>`

2. **apps/web/src/components/accessibility/patterns/__tests__/usePattern.test.tsx**
   - Lines 52, 92: Forbidden require() imports

3. **apps/web/src/types/global-overrides.d 2.ts**
   - Line 28: ES2015 module syntax preferred over namespaces

4. **apps/web/src/types/jest-dom.d.ts**
   - Line 1: Triple slash reference should use import style

5. **Multiple component files**
   - Unused eslint-disable directives

**Action Required**: Fix all ESLint errors and warnings. Consider updating ESLint configuration if some rules are too strict.

### 3. Complete Test Suite Failures
**Title**: Investigate and fix remaining test suite failures
**Assignee**: backend-agent, frontend-agent (collaborate)
**Labels**: bug, testing, high-priority
**Priority**: P0
**Description**:
After fixing the infrastructure issues, there are still test failures that need investigation:

1. Run full test suite to identify all failing tests
2. Categorize failures by domain (frontend vs backend)
3. Fix or update tests as needed

**Prerequisites**: TypeScript errors should be fixed first as they may be causing some test failures.

### 4. Jest Configuration Optimization
**Title**: Optimize Jest configuration for better performance
**Assignee**: infra-agent
**Labels**: enhancement, performance, testing
**Priority**: P2
**Description**:
The test suite is timing out when running all tests. Consider:

1. Increasing worker count for parallel execution
2. Implementing test sharding for CI
3. Optimizing transform configurations
4. Adding test result caching

## Immediate Actions for Infra-Agent

Before creating these issues, the infra-agent should:
1. Fix remaining ESLint errors in mock files that are within scope
2. Update Jest configuration to handle route groups properly
3. Ensure all test infrastructure is properly configured

## Success Criteria

- All TypeScript errors resolved
- All ESLint errors fixed
- Full test suite runs without timeouts
- All tests pass in CI environment
- Type checking passes without errors
- Linting passes without errors

## Notes

- The TypeScript "Type instantiation is excessively deep" errors may indicate circular dependencies or overly complex type definitions that need refactoring
- The missing properties on schema objects suggest the schema may be out of sync with the code
- Some errors may be resolved by regenerating Convex types after schema updates