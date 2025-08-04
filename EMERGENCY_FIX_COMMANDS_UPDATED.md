# 🚨 EMERGENCY FIX COMMANDS - Main Branch Still Broken

## GitHub Issue References
- **Issue #287**: Fix CI cache configuration (infra-agent) - BLOCKER
- **Issue #288**: Fix TypeScript TS2589 errors (backend-agent)
- **Issue #289**: Fix test syntax errors (quality-agent)
- **Issue #94**: Update dependencies (ON HOLD)
- **Issue #240**: Master stabilization tracker
- **Issue #227**: Backend test failures (blocked)
- **Issue #228**: Frontend test failures (blocked)

## infra-agent - FIX CI NOW (Issue #287, Priority 1 - BLOCKER)

```bash
# 1. Fix CI Cache Configuration
cd ~/bulk-grillers-pride/.worktrees/infra-agent
git checkout -b infra/fix-ci-cache-287

# Find the problematic cache configuration
grep -r "fail-on-cache-miss" .github/workflows/

# Edit these files and change to:
# fail-on-cache-miss: false

# OR fix the cache key generation:
# The failing key: Linux-node-18-1b9290c7f4905a3e7f45817241e374c56751fc7a5024880981a0c0516fa77215

# 2. Add missing environment variable
# In .github/workflows/ci.yml and ci-optimized.yml add:
env:
  NEXT_PUBLIC_CONVEX_URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL }}

# Test locally first:
act -j build --secret-file .env.local

# Commit and push
git add .github/workflows/
git commit -m "fix: CI cache configuration and missing env vars (#287)"
git push -u origin infra/fix-ci-cache-287
```

## backend-agent - FIX TYPESCRIPT (Issue #288, Priority 2)

```bash
# Fix TS2589 errors in migration files
cd ~/bulk-grillers-pride/.worktrees/backend-agent
git checkout -b backend/fix-ts2589-288

# The problem file:
/sc:analyze --file convex/migrations/schema_additions_001.ts --typescript

# Likely fix - simplify the schema definition:
# Replace complex v.union(v.literal(...)) with v.string()
# Or split the migration into smaller files

# Test TypeScript compilation:
cd convex && npx tsc --noEmit

# If still failing, check other migration files:
find convex/migrations -name "*.ts" -exec npx tsc --noEmit {} \;

# Commit and push
git add convex/
git commit -m "fix: TypeScript TS2589 errors in Convex schemas (#288)"
git push -u origin backend/fix-ts2589-288
```

## quality-agent - FIX TEST SYNTAX (Issue #289, Priority 3)

```bash
# Fix test syntax errors
cd ~/bulk-grillers-pride/.worktrees/quality-agent
git checkout -b quality/fix-test-syntax-289

# The failing test file:
/sc:analyze --file packages/test-factories/src/__tests__/factories.test.ts --line 232

# Also fix ESLint violation:
/sc:fix --file src/__tests__/setup.ts --line 26
# Change require() to import statement

# Run tests locally:
npm test -- --no-coverage

# Fix each syntax error one by one

# Commit and push
git add .
git commit -m "fix: Test syntax errors and ESLint violations (#289)"
git push -u origin quality/fix-test-syntax-289
```

## VERIFICATION CHECKLIST

After each fix, verify:

```bash
# 1. Check TypeScript
npm run type-check

# 2. Check ESLint  
npm run lint

# 3. Check Tests (might still fail but should compile)
npm test -- --passWithNoTests

# 4. Check Build
npm run build

# 5. Check CI locally (requires act)
act -j lint
act -j type-check
act -j build
```

## DO NOT:
- ❌ Work on any features
- ❌ Update dependencies unless absolutely necessary
- ❌ Make large refactors
- ❌ Merge without CI passing

## CRITICAL PATH:
1. infra-agent fixes CI (#287) → Unblocks everything
2. backend-agent fixes TypeScript (#288) → Allows type checking
3. quality-agent fixes tests (#289) → Allows test running
4. All verify together → Main branch green

## If CI still fails after cache fix:
- Check if package-lock.json changed recently
- Verify Node version matches (v18)
- Look for other environment variables needed
- Check if Turbo cache is corrupted

## After All Fixes Complete:
1. Update issue #240 with success status
2. Unblock issues #227 and #228
3. Resume work on issue #94 (dependency updates)
4. Close the automated security audit issues

REMEMBER: Small, focused fixes. One problem at a time. Each agent should work on their assigned issue in parallel.