const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Final cleanup of duplicate imports...\n');

// Find all test files
const testFiles = glob.sync('apps/web/src/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**']
});

let fixedCount = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove duplicate import lines by parsing each import
  const lines = content.split('\n');
  const importMap = new Map(); // module -> Set of imports
  const otherLines = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('import ')) {
      // Check if it's a named import
      const namedImportMatch = trimmedLine.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
      if (namedImportMatch) {
        const [, imports, module] = namedImportMatch;
        const importSet = importMap.get(module) || new Set();
        
        // Add all imports to the set
        imports.split(',').forEach(imp => {
          const cleanImport = imp.trim();
          if (cleanImport) importSet.add(cleanImport);
        });
        
        importMap.set(module, importSet);
      } else {
        // Other types of imports (default, namespace, etc.)
        otherLines.push(line);
      }
    } else {
      otherLines.push(line);
    }
  });
  
  // Rebuild the file with consolidated imports
  const newLines = [];
  
  // Add React import first if needed
  if (importMap.has('react')) {
    newLines.push("import React from 'react';");
    importMap.delete('react');
  }
  
  // Add other imports in a consistent order
  const moduleOrder = [
    '@testing-library/react',
    '@testing-library/user-event',
    '@/__tests__/test-helpers',
    // Other modules will be added alphabetically
  ];
  
  // Add imports in order
  moduleOrder.forEach(module => {
    if (importMap.has(module)) {
      const imports = Array.from(importMap.get(module)).sort();
      newLines.push(`import { ${imports.join(', ')} } from '${module}';`);
      importMap.delete(module);
    }
  });
  
  // Add remaining imports alphabetically
  const remainingModules = Array.from(importMap.keys()).sort();
  remainingModules.forEach(module => {
    const imports = Array.from(importMap.get(module)).sort();
    newLines.push(`import { ${imports.join(', ')} } from '${module}';`);
  });
  
  // Add empty line after imports
  if (newLines.length > 0) {
    newLines.push('');
  }
  
  // Add the rest of the file
  let skipEmptyLines = true;
  otherLines.forEach(line => {
    if (skipEmptyLines && line.trim() === '') {
      return;
    }
    skipEmptyLines = false;
    newLines.push(line);
  });
  
  const newContent = newLines.join('\n');
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log(`✓ Cleaned ${path.basename(file)}`);
    fixedCount++;
  }
});

console.log(`\nCleaned ${fixedCount} test files!`);