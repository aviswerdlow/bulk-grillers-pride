const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Applying surgical fixes to imports...\n');

// Find all test files
const testFiles = glob.sync('apps/web/src/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/test-helpers.tsx']
});

let fixedCount = 0;

// Common patterns to fix
const fixes = [
  // Remove duplicate React imports
  {
    pattern: /import React from ['"]react['"];\s*\nimport React from ['"]react['"];/g,
    replacement: "import React from 'react';"
  },
  // Remove duplicate imports from same module
  {
    pattern: /import { ([^}]+) } from ['"]([^'"]+)['"];\s*\nimport { ([^}]+) } from ['"]\\2['"];/g,
    replacement: (match, imports1, module, imports2) => {
      const allImports = new Set();
      imports1.split(',').forEach(i => allImports.add(i.trim()));
      imports2.split(',').forEach(i => allImports.add(i.trim()));
      return `import { ${Array.from(allImports).join(', ')} } from '${module}';`;
    }
  },
  // Fix duplicate render imports
  {
    pattern: /import { render[^}]* } from '@testing-library\/react';\s*import { [^}]*render[^}]* } from '@\/__tests__\/test-helpers';/g,
    replacement: "import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';\nimport { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';"
  },
  // Remove extra React declarations
  {
    pattern: /import React from ['"]react['"];\s*\n(.+)\s*\nimport React from ['"]react['"];/g,
    replacement: "import React from 'react';\n$1"
  }
];

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Apply all fixes
  fixes.forEach(fix => {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });
  
  // Additional specific fixes
  // 1. Ensure renderWithProviders is imported when used
  if (content.includes('renderWithProviders(') && !content.includes('renderWithProviders')) {
    content = content.replace(
      /@\/__tests__\/test-helpers';/,
      "@/__tests__/test-helpers';"
    ).replace(
      /from '@\/__tests__\/test-helpers';/,
      ", renderWithProviders } from '@/__tests__/test-helpers';"
    ).replace(
      /{ ,/g,
      '{ '
    );
    modified = true;
  }
  
  // 2. Clean up malformed imports
  content = content.replace(/import { , /g, 'import { ');
  content = content.replace(/, , /g, ', ');
  content = content.replace(/, }/g, ' }');
  
  // 3. Remove empty import statements
  content = content.replace(/import { } from ['"][^'"]+['"];\s*\n/g, '');
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✓ Fixed ${path.basename(file)}`);
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} test files!`);