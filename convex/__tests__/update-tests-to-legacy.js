#!/usr/bin/env node

/**
 * Script to update all test files to use legacy adapters
 * This is a temporary migration script while we fix TypeScript issues
 */

const fs = require('fs');
const path = require('path');

const testFiles = [
  'categories/queries.test.ts',
  'categories/products.test.ts',
  'categories/mutations.test.ts',
  'categories/imports.test.ts',
  'categories/hierarchy.test.ts',
];

function updateTestFile(filePath) {
  console.log(`Updating ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update imports
  content = content.replace(
    /createQueryContext,/g,
    'createQueryContextLegacy,'
  );
  content = content.replace(
    /createMutationContext,/g,
    'createMutationContextLegacy,'
  );
  content = content.replace(
    /createActionContext,/g,
    'createActionContextLegacy,'
  );
  content = content.replace(
    /setupAuth,/g,
    'setupAuthLegacy,'
  );
  content = content.replace(
    /seedDatabase,/g,
    'seedDatabaseLegacy,'
  );
  content = content.replace(
    /clearDatabase,/g,
    'clearDatabaseLegacy,'
  );
  content = content.replace(
    /getTableData,/g,
    'getTableDataLegacy,'
  );
  
  // Update function calls
  content = content.replace(
    /createQueryContext\(t\)/g,
    'createQueryContextLegacy(t)'
  );
  content = content.replace(
    /createMutationContext\(t\)/g,
    'createMutationContextLegacy(t)'
  );
  content = content.replace(
    /createActionContext\(t\)/g,
    'createActionContextLegacy(t)'
  );
  content = content.replace(
    /setupAuth\(t,/g,
    'setupAuthLegacy(t,'
  );
  content = content.replace(
    /seedDatabase\(t,/g,
    'seedDatabaseLegacy(t,'
  );
  content = content.replace(
    /clearDatabase\(t\)/g,
    'clearDatabaseLegacy(t)'
  );
  content = content.replace(
    /getTableData\(t,/g,
    'getTableDataLegacy(t,'
  );
  
  // Add await for getTableData calls
  content = content.replace(
    /const (\w+) = getTableDataLegacy\(t, '(\w+)'\);/g,
    'const $1 = await getTableDataLegacy(t, \'$2\');'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✓ Updated ${filePath}`);
}

// Update all test files
testFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    updateTestFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${fullPath}`);
  }
});

console.log('\nDone! All test files have been updated to use legacy adapters.');