#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing test configuration issues...\n');

// Find all test files
const testFiles = glob.sync('**/*.{test,spec}.{ts,tsx,js,jsx}', {
  ignore: ['node_modules/**', '.next/**', '_generated/**', 'coverage/**']
});

let fixedCount = 0;
const issues = [];

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Fix vitest imports to jest
  if (content.includes("from 'vitest'")) {
    content = content.replace(
      /import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/g,
      (match, imports) => {
        // Remove 'vi' from imports as it's vitest specific
        const cleanedImports = imports
          .split(',')
          .map(i => i.trim())
          .filter(i => i !== 'vi')
          .join(', ');
        
        if (cleanedImports) {
          return `// Jest doesn't need explicit imports for ${cleanedImports}`;
        }
        return '// Removed vitest import';
      }
    );
    modified = true;
    issues.push(`${file}: Replaced vitest imports`);
  }

  // Replace vi.mock with jest.mock
  if (content.includes('vi.mock')) {
    content = content.replace(/\bvi\.mock\(/g, 'jest.mock(');
    modified = true;
    issues.push(`${file}: Replaced vi.mock with jest.mock`);
  }

  // Replace vi.fn with jest.fn
  if (content.includes('vi.fn')) {
    content = content.replace(/\bvi\.fn\(/g, 'jest.fn(');
    modified = true;
    issues.push(`${file}: Replaced vi.fn with jest.fn`);
  }

  // Replace vi.spyOn with jest.spyOn
  if (content.includes('vi.spyOn')) {
    content = content.replace(/\bvi\.spyOn\(/g, 'jest.spyOn(');
    modified = true;
    issues.push(`${file}: Replaced vi.spyOn with jest.spyOn`);
  }

  // Fix import paths for Convex generated API
  if (content.includes('convex/_generated/api.js')) {
    content = content.replace(/convex\/_generated\/api\.js/g, 'convex/_generated/api');
    modified = true;
    issues.push(`${file}: Fixed Convex API import path`);
  }

  if (modified) {
    fs.writeFileSync(file, content);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} test files:`);
issues.forEach(issue => console.log(`   - ${issue}`));

// Check for other common issues
console.log('\n🔍 Checking for additional issues...\n');

// Check if jest is installed
try {
  require.resolve('jest');
  console.log('✅ Jest is installed');
} catch {
  console.log('❌ Jest is not installed. Run: npm install --save-dev jest');
}

// Check if ts-jest is installed
try {
  require.resolve('ts-jest');
  console.log('✅ ts-jest is installed');
} catch {
  console.log('❌ ts-jest is not installed. Run: npm install --save-dev ts-jest');
}

// Check if @testing-library packages are installed
const testingLibraries = ['@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event'];
testingLibraries.forEach(lib => {
  try {
    require.resolve(lib);
    console.log(`✅ ${lib} is installed`);
  } catch {
    console.log(`❌ ${lib} is not installed. Run: npm install --save-dev ${lib}`);
  }
});

console.log('\n📊 Summary:');
console.log(`   Total test files found: ${testFiles.length}`);
console.log(`   Files fixed: ${fixedCount}`);
console.log('\n🎯 Next steps:');
console.log('   1. Run "npm test" to see if tests pass');
console.log('   2. Fix any remaining import or type errors');
console.log('   3. Update failing tests to match current implementation');