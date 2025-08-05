# 🚨 CRITICAL: Fix Test Infrastructure Module Resolution Errors

## Overview
This PR fixes the critical test infrastructure issue (#294) where all tests fail with module resolution errors.

## Problem
Tests were failing with:
```
Cannot find module '../../../__tests__/convex-test-standard' 
```

The file exists but was missing critical function exports that test files were trying to import:
- `assertDocumentExists`
- `assertDocumentNotExists`
- `getTableData`

## Solution
Added the missing exports to `/convex/__tests__/convex-test-standard.ts` by importing them from the `@bulk-grillers-pride/convex-test-helpers` package where they are defined.

## Changes
- ✅ Added imports from `@bulk-grillers-pride/convex-test-helpers`
- ✅ Re-exported the three missing functions
- ✅ Maintained all existing functionality

## Testing
After this fix:
- Tests can import all required helper functions
- No module resolution errors occur
- Tests can run (they may fail on assertions, but they will at least start)
- CI/CD will correctly report test status

## Impact
- **Severity**: P0 - Blocking all test execution
- **Scope**: All test files using these helper functions
- **Risk**: None - Only adds missing exports

Fixes #294