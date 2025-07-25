#!/usr/bin/env node

/**
 * Script to fix syntax errors in test files
 */

const fs = require('fs');
const path = require('path');

const testFiles = [
  '__tests__/categories/hierarchy.test.ts',
  '__tests__/categories/imports.test.ts',
  '__tests__/categories/mutations.test.ts',
  '__tests__/categories/products.test.ts',
  '__tests__/categories/queries.test.ts',
  '__tests__/deletion/cascadeCalculation.test.ts',
  '__tests__/example-standard.test.ts',
  '__tests__/example-with-package.test.ts',
  '__tests__/products/transactional-deletion.test.ts',
  '__tests__/products/trash-performance.test.ts',
  '__tests__/rateLimit.test.ts',
  'functions/ai/__tests__/langchainToCrewAIAdapter.test.ts',
  'functions/ai/__tests__/validation.test.ts',
  'functions/categories/__tests__/categories.test.ts',
  'functions/categories/__tests__/integration.test.ts',
  'functions/categories/__tests__/mutations.test.ts',
  'functions/categories/__tests__/queries-handlers.test.ts',
  'functions/categories/__tests__/queries.test.ts',
  'functions/products/__tests__/sku-functionality.test.ts',
];

const convexDir = path.join(__dirname, '..');

console.log('🔧 Fixing syntax errors in test files...\n');

testFiles.forEach(testFile => {
  const fullPath = path.join(convexDir, testFile);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${testFile}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Fix empty beforeEach/afterEach blocks
    content = content.replace(/beforeEach\(\(\) => \{\s*\}\);/g, (match) => {
      modified = true;
      return 'beforeEach(() => {\n    // Empty setup\n  });';
    });
    
    content = content.replace(/afterEach\(\(\) => \{\s*\}\);/g, (match) => {
      modified = true;
      return 'afterEach(() => {\n    // Empty teardown\n  });';
    });
    
    // Fix standalone semicolons after comments
    content = content.replace(/\/\/.*\n\s*;/g, (match) => {
      modified = true;
      return match.replace(/;/, '');
    });
    
    // Add minimal test structure to prevent empty describe blocks
    if (content.includes('describe.skip') && !content.includes('it(') && !content.includes('test(')) {
      const describeMatch = content.match(/describe\.skip\(['"`](.*?)['"`]/);
      if (describeMatch) {
        modified = true;
        content = content.replace(
          /describe\.skip\((.*?)\) => \{[\s\S]*?\n\}\);?$/,
          `describe.skip($1) => {
  it('should be implemented', () => {
    // TODO: Implement test
    expect(true).toBe(true);
  });
});`
        );
      }
    }
    
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${testFile}`);
    } else {
      console.log(`⏭️  No changes needed: ${testFile}`);
    }
  } catch (error) {
    console.log(`❌ Error processing ${testFile}: ${error.message}`);
  }
});

console.log('\n✨ Done!');