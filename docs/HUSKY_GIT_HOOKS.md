# Git Hooks Configuration with Husky

This document describes the Git hooks configured for the Bulk Grillers Pride project using Husky v9.

## Overview

We use Husky to automatically run code quality checks before commits and pushes. This ensures code consistency and catches issues early in the development process.

## Configured Hooks

### 1. Pre-commit Hook

**File**: `.husky/pre-commit`

Runs before each commit to ensure code quality:
- **Prettier**: Formats all staged files
- **ESLint**: Fixes linting issues in JavaScript/TypeScript files

Configured via `lint-staged` in `package.json`:
```json
{
  "lint-staged": {
    "**/*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{json,css,scss,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 2. Post-commit Hook

**File**: `.husky/post-commit`

Runs after a successful commit:
- **TypeScript Type Check**: Ensures type safety across the codebase

### 3. Commit-msg Hook

**File**: `.husky/commit-msg`

Validates commit messages follow Conventional Commits format:
- Format: `<type>(<scope>): <subject>`
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

Examples:
- `feat: add product import feature`
- `fix(auth): resolve login redirect issue`
- `docs: update README with setup instructions`

### 4. Pre-push Hook

**File**: `.husky/pre-push`

Runs before pushing to remote:
- **Tests**: Runs all tests with bail on first failure
- **Lint**: Ensures no linting errors

## Setup Instructions

Husky is automatically set up when you run `npm install` due to the prepare script in `package.json`.

### Manual Setup

If hooks aren't working:

```bash
# Reinstall Husky
npm uninstall husky
npm install --save-dev husky@latest

# Initialize Husky
npx husky init

# Make hooks executable
chmod +x .husky/*
```

## Bypassing Hooks

In emergency situations, you can bypass hooks:

```bash
# Skip pre-commit and commit-msg hooks
git commit --no-verify -m "emergency fix"

# Skip pre-push hook
git push --no-verify
```

⚠️ **Warning**: Only bypass hooks in emergencies. Always fix any issues before merging to main.

## Troubleshooting

### Hook not running

1. Check hook is executable:
   ```bash
   ls -la .husky/
   # All hooks should have 'x' permission
   ```

2. Reinstall Husky:
   ```bash
   npm run prepare
   ```

### ESLint errors blocking commit

1. Fix manually:
   ```bash
   npx eslint . --fix
   ```

2. Or commit without fixing (not recommended):
   ```bash
   git commit --no-verify
   ```

### Type errors blocking commit

1. Fix type errors:
   ```bash
   npm run type-check
   ```

2. See specific errors:
   ```bash
   npx tsc --noEmit
   ```

## Configuration Files

- **Husky config**: `.husky/` directory
- **Lint-staged config**: `package.json` → `lint-staged` section
- **ESLint config**: `.eslintrc.js`
- **Prettier config**: `.prettierrc.json`

## Best Practices

1. **Keep commits small**: Easier to pass all checks
2. **Run checks locally**: Use `npm run lint` and `npm run type-check` before committing
3. **Fix issues immediately**: Don't accumulate technical debt
4. **Update hooks carefully**: Test changes thoroughly

## Adding New Hooks

To add a new Git hook:

1. Create file in `.husky/` directory:
   ```bash
   echo "npm run custom-check" > .husky/pre-commit
   ```

2. Make it executable:
   ```bash
   chmod +x .husky/pre-commit
   ```

3. Test it works:
   ```bash
   git commit -m "test: new hook"
   ```

## Related Documentation

- [Husky Documentation](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [lint-staged Documentation](https://github.com/lint-staged/lint-staged)