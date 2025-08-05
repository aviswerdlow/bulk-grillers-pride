# Branch Protection Configuration

This document describes the branch protection rules configured for the `main` branch to ensure code quality and prevent accidental issues.

## 🛡️ Protection Rules

### Pull Request Requirements
- **Minimum Reviews**: 1 approval required before merging
- **Dismiss Stale Reviews**: Approvals are dismissed when new commits are pushed
- **Conversation Resolution**: All PR conversations must be resolved before merging

### Status Check Requirements
All of the following CI checks must pass before a PR can be merged:

1. **lint** - ESLint code quality checks
2. **type-check** - TypeScript type validation
3. **test** - Unit and integration tests
4. **build** - Application build verification
5. **e2e** - End-to-end tests
6. **coverage** - Test coverage report generation
7. **security** - Dependency vulnerability scanning
8. **all-checks** - Meta-check ensuring all other checks passed

### Additional Protections
- **Up-to-date branches**: PRs must be up-to-date with main before merging
- **Admin enforcement**: Even administrators must follow these rules
- **No force pushes**: Force pushing to main is blocked
- **No deletions**: The main branch cannot be deleted
- **No direct pushes**: All changes must go through a PR

## 🚀 Setup Instructions

### Automated Setup
Run the provided script to configure branch protection:

```bash
node .github/scripts/setup-branch-protection.js
```

### Manual Setup
1. Go to Settings → Branches in your GitHub repository
2. Add a branch protection rule for `main`
3. Configure the settings as described above

### Prerequisites
- Admin access to the repository
- GitHub CLI (`gh`) installed and authenticated

## 🔍 Verification

### Check Protection Status
Run the branch protection workflow to verify settings:

```bash
gh workflow run branch-protection.yml
```

Or check manually:
```bash
gh api repos/{owner}/{repo}/branches/main/protection
```

### Automated Monitoring
A GitHub Action runs weekly to verify branch protection remains enabled. If protection is disabled, it will:
1. Report the status in the workflow summary
2. Create a P0 issue alerting the team

## 📊 Quality Gates

In addition to branch protection, the following quality gates are enforced:

### Test Coverage
- Minimum coverage threshold: 15% (gradually increasing)
- Coverage must not decrease in PRs
- All tests must actually execute (no false positives)

### Code Quality
- No ESLint errors
- No TypeScript errors
- Bundle size limits enforced
- Security vulnerabilities blocked

### Test Execution Validation
The CI system now validates that tests actually run by:
1. Checking for generated coverage reports
2. Parsing JUnit XML reports for test counts
3. Verifying non-zero test execution
4. Failing CI if tests are skipped or not found

## 🚨 Troubleshooting

### "Branch protection prevents merge"
This is working as intended! Fix the failing checks:
1. Check the PR status checks at the bottom
2. Click on failing checks for details
3. Fix the issues and push new commits
4. Wait for all checks to pass

### "Reviews dismissed after push"
This is expected behavior. When new code is pushed:
1. Previous approvals are dismissed
2. Request a new review from your reviewer
3. This ensures reviewers see the final code

### "Cannot push directly to main"
All changes must go through a PR:
1. Create a feature branch
2. Push your changes to the feature branch
3. Open a PR to main
4. Get approval and merge

## 📝 Exceptions

There are no exceptions to these rules. If you encounter a legitimate case where these rules block critical work:
1. Document the specific scenario
2. Propose a modification to the rules
3. Get team consensus before making changes

Remember: These protections exist to maintain code quality and prevent production issues.