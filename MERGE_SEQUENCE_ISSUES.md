# GitHub Issues for Merge Sequence

Create these issues in order to ensure proper merge sequence for TypeScript/ESLint fixes.

## Issue 1: Clean up infra/upgrade-turbo-v2 PR
**Title**: Clean up and merge infra/upgrade-turbo-v2 PR (Turbo v2 upgrade)
**Labels**: infrastructure, high-priority, merge-sequence
**Assignee**: infra-agent
**Description**:
```
The current PR from branch `infra/upgrade-turbo-v2` contains mixed changes that need to be separated.

**Current State**:
- Contains Turbo v2 upgrade 
- Contains CI/CD improvements
- Also contains frontend fixes that should be in separate PRs

**Actions Required**:
1. Update PR title to: "feat(infra): upgrade to Turbo v2 with CI/CD improvements"
2. Update PR description to clarify it's primarily infrastructure work
3. Note that frontend fixes have been extracted to separate PRs
4. Get review and merge FIRST (before other PRs)

**Verification**:
- [ ] PR title and description updated
- [ ] All CI checks pass
- [ ] No TypeScript/ESLint errors introduced
- [ ] Build performance improved with Turbo v2
```

## Issue 2: Create clean products/imports PR
**Title**: Create and merge clean PR for products/imports TypeScript fixes
**Labels**: frontend, typescript, merge-sequence
**Assignee**: frontend-agent
**Description**:
```
Extract products/imports TypeScript fixes from mixed PR into a clean, focused PR.

**Actions Required**:
1. Create new branch from main: `fix/products-imports-only`
2. Cherry-pick ONLY the commit with products/imports fixes
3. Verify changes only touch:
   - src/app/(dashboard)/[orgSlug]/products/**
   - src/app/(dashboard)/[orgSlug]/imports/**
   - src/components/products/**
   - src/components/imports/**
4. Create PR with title: "fix(frontend): resolve TypeScript and ESLint errors in products/imports"
5. Reference this extraction from the infra PR

**Dependencies**:
- Should be merged AFTER Issue #1 (infra/upgrade-turbo-v2)

**Verification**:
- [ ] Only products/imports files changed
- [ ] All TypeScript errors fixed
- [ ] All ESLint errors resolved
- [ ] Tests pass
```

## Issue 3: Create PR for team/auth/settings fixes
**Title**: Create and merge PR for team/auth/settings TypeScript fixes
**Labels**: frontend, typescript, merge-sequence
**Assignee**: frontend-agent-2
**Description**:
```
Create PR for already-committed team/auth/settings TypeScript fixes.

**Current State**:
- Work completed in commit 7258ef0
- Branch: `fix/team-auth-settings-cleanup`
- 18 files modified

**Actions Required**:
1. Push branch to origin: `git push -u origin fix/team-auth-settings-cleanup`
2. Create PR with title: "fix(frontend): resolve TypeScript and ESLint errors in team/auth/settings"
3. Ensure PR targets main branch
4. Get review and merge

**Dependencies**:
- Should be merged AFTER Issue #2 (products/imports PR)

**Verification**:
- [ ] Only team/auth/settings/categories files changed
- [ ] All TypeScript 'any' types fixed
- [ ] All unused variables removed
- [ ] All ESLint errors resolved
```

## Issue 4: Coordinate merge sequence
**Title**: Coordinate and execute merge sequence for TypeScript cleanup PRs
**Labels**: coordination, merge-sequence, high-priority
**Assignee**: orchestrator
**Description**:
```
Ensure all PRs are merged in the correct order to minimize conflicts.

**Merge Sequence**:
1. ✅ Issue #1: infra/upgrade-turbo-v2 (infrastructure changes)
2. ✅ Issue #2: fix/products-imports-only (frontend group A)
3. ✅ Issue #3: fix/team-auth-settings-cleanup (frontend group B)

**Coordination Steps**:
- [ ] Verify Issue #1 PR is ready and CI passes
- [ ] Merge Issue #1
- [ ] Have other branches pull latest main
- [ ] Verify Issue #2 PR has no conflicts
- [ ] Merge Issue #2
- [ ] Have remaining branches pull latest main
- [ ] Verify Issue #3 PR has no conflicts
- [ ] Merge Issue #3

**Conflict Resolution**:
- package-lock.json: regenerate with `npm install`
- turbo.json: take version from infra branch
- TypeScript files: usually combine both fixes
```

## Issue 5: Post-merge verification and cleanup
**Title**: Verify successful merge and close TypeScript/ESLint issues
**Labels**: verification, cleanup
**Assignee**: quality-agent
**Description**:
```
After all PRs are merged, verify the codebase and close related issues.

**Verification Steps**:
1. Run full test suite:
   ```bash
   npm install
   npm run lint        # Should show 0 errors
   npm run type-check  # Should pass
   npm run test        # All tests should pass
   npm run build       # Build should succeed
   ```

2. Close completed GitHub issues:
   - [ ] Close #203 (TypeScript 'any' in source files)
   - [ ] Close #204 (Unused variables in source files)
   - [ ] Close #205 (Remaining ESLint errors)
   - Reference all three merged PRs in closing comments

3. Clean up branches:
   - [ ] Delete fix/products-imports-only
   - [ ] Delete fix/team-auth-settings-cleanup
   - [ ] Consider cleaning up infra/upgrade-turbo-v2 if no longer needed

**Success Criteria**:
- Zero ESLint errors
- Zero TypeScript errors
- All tests passing
- Successful production build
```