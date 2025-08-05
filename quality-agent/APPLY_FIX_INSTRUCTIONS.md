# Instructions to Apply Test Infrastructure Fix

## Issue #294 - Critical Test Helper Fix

### Quick Fix (Copy & Paste)

1. From the main repository root, create the missing file:

```bash
mkdir -p convex/__tests__
```

2. Create `/convex/__tests__/convex-test-standard.ts` with the content from:
   - `origin/main/quality-agent/convex-test-standard-fix.ts`
   - OR use the script: `origin/main/quality-agent/apply-test-fix.sh`

3. The file adds these missing exports:
```typescript
export const assertDocumentExists = _assertDocumentExists;
export const assertDocumentNotExists = _assertDocumentNotExists;  
export const getTableData = _getTableData;
```

### Alternative: Direct Application

From main repository:
```bash
# Run the fix script
bash origin/main/quality-agent/apply-test-fix.sh

# Verify tests can run
npm test

# Commit and push
git add convex/__tests__/convex-test-standard.ts
git commit -m "fix(tests): restore missing test helper exports (#294)

- Add missing assertDocumentExists export
- Add missing assertDocumentNotExists export  
- Add missing getTableData export
- Import functions from @bulk-grillers-pride/convex-test-helpers package

This fixes all module resolution errors preventing tests from running."
git push
```

### Verification

After applying the fix:
1. `npm test` should start without module resolution errors
2. Tests may fail on assertions, but they will at least run
3. CI/CD will properly report test results

### File Location
The complete fixed file is available at:
`/Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/origin/main/quality-agent/convex-test-standard-fix.ts`