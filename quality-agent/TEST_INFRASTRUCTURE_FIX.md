# Test Infrastructure Fix for Issue #294

## Problem Identified

The test infrastructure is broken due to missing function exports in `/convex/__tests__/convex-test-standard.ts`. Test files are trying to import the following functions that don't exist in the file:

- `assertDocumentExists`
- `assertDocumentNotExists`
- `getTableData`

## Root Cause

These functions exist in the `@bulk-grillers-pride/convex-test-helpers` package but are not being re-exported from `convex-test-standard.ts`.

## Solution

Add the missing exports to `convex/__tests__/convex-test-standard.ts`:

```typescript
// Import missing functions from the convex-test-helpers package
import {
  assertDocumentExists as _assertDocumentExists,
  assertDocumentNotExists as _assertDocumentNotExists,
  getTableData as _getTableData,
} from '@bulk-grillers-pride/convex-test-helpers';

// ... existing code ...

// RE-EXPORT THE MISSING FUNCTIONS FROM THE PACKAGE
export const assertDocumentExists = _assertDocumentExists;
export const assertDocumentNotExists = _assertDocumentNotExists;
export const getTableData = _getTableData;
```

## Files That Need This Fix

Based on my analysis, the following test files are importing these missing functions:

1. `/convex/functions/categories/__tests__/mutations.test.ts`
2. Potentially other test files in the codebase

## Verification Steps

1. Apply the fix to `/convex/__tests__/convex-test-standard.ts`
2. Run `npm test` to verify tests can start without module resolution errors
3. Confirm no import errors in the test output

## Impact

- This fix will resolve ALL module resolution errors for test helper functions
- Tests will be able to run (they may still fail, but they will at least start)
- CI/CD pipeline will correctly report test status instead of false passes