# Lint-staged Configuration Fix Summary

## Issue #259: Fix lint-staged configuration to match main ESLint rules

### Problem
The lint-staged configuration was applying different ESLint rules than the main `npm run lint` command, causing commits to fail even when the code passed the standard lint check.

### Root Cause
1. ESLint v9 uses flat configuration format (ES modules)
2. .lintstagedrc.js is a CommonJS file
3. When lint-staged ran ESLint on files including .lintstagedrc.js itself, it failed because ESLint expected ES module syntax

### Solution
1. **Simplified lint-staged configuration** to use standard ESLint commands
2. **Updated ESLint configuration** to properly handle CommonJS files:
   - Added a specific configuration section for CommonJS files
   - Defined appropriate globals (module, require, __dirname, etc.)
   - Disabled rules that conflict with CommonJS syntax

### Changes Made

#### .lintstagedrc.js
```javascript
module.exports = {
  // TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'jest --bail --findRelatedTests --passWithNoTests'
  ],
  
  // JSON and configuration files
  '*.{json,md,yml,yaml}': [
    'prettier --write'
  ],
  
  // Run coverage check if test files are modified
  '**/*.{test,spec}.{js,jsx,ts,tsx}': [
    () => 'npm run test:coverage -- --silent'
  ]
};
```

#### eslint.config.js (added CommonJS configuration)
```javascript
// CommonJS configuration files
{
  files: ['.lintstagedrc.js', 'jest.config.js', '*.config.js', 'babel.config.js'],
  languageOptions: {
    sourceType: 'commonjs',
    globals: {
      module: true,
      require: true,
      __dirname: true,
      __filename: true,
      process: true,
    },
  },
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
    'no-undef': 'off', // CommonJS globals are defined above
  },
}
```

### Result
- Pre-commit hooks now pass when `npm run lint` passes
- Same ESLint rules are applied in both contexts
- No false positives blocking valid commits
- CommonJS configuration files are properly handled

### Testing
The configuration has been tested and works correctly. The ESLint configuration now properly handles both ES modules and CommonJS files, ensuring consistent linting behavior across the monorepo.