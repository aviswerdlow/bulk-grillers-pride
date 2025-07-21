module.exports = {
  // TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    // Run tests for changed files
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