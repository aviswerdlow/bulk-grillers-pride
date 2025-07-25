#!/usr/bin/env node

/**
 * Type check only changed TypeScript files for better performance
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function getChangedFiles() {
  try {
    // Get staged TypeScript files
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(ts|tsx)$" || true', {
      encoding: 'utf8'
    }).trim();
    
    return staged ? staged.split('\n').filter(Boolean) : [];
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

function checkTypes() {
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log(`${colors.yellow}No TypeScript files to check.${colors.reset}`);
    return true;
  }

  console.log(`${colors.yellow}🔍 Type checking ${changedFiles.length} changed TypeScript file(s)...${colors.reset}`);
  
  try {
    // Run TypeScript compiler with --noEmit
    // We check the whole project because TypeScript needs context
    // but this is still fast with incremental compilation
    execSync('npx tsc --noEmit', {
      stdio: 'inherit'
    });
    
    console.log(`${colors.green}✅ TypeScript type check passed!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ TypeScript type check failed!${colors.reset}`);
    console.error(`${colors.yellow}Please fix the type errors before committing.${colors.reset}`);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const success = checkTypes();
  process.exit(success ? 0 : 1);
}

module.exports = { checkTypes };