const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Updating all test imports to use new test-helpers...\n');

// Find all test files
const testFiles = glob.sync('apps/web/src/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/test-helpers.tsx', '**/frontend-test-helpers.tsx']
});

let fixedCount = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Replace imports from frontend-test-helpers with test-helpers
  if (content.includes('@/__tests__/frontend-test-helpers')) {
    content = content.replace(/@\/__tests__\/frontend-test-helpers/g, '@/__tests__/test-helpers');
    modified = true;
  }
  
  // Add React import if missing for TSX files
  if (file.endsWith('.tsx') && !content.includes("import React") && !content.includes("import * as React")) {
    content = "import React from 'react';\n" + content;
    modified = true;
  }
  
  // Clean up duplicate imports
  const lines = content.split('\n');
  const cleanedLines = [];
  const seenImports = new Map();
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Handle import lines
    if (trimmedLine.startsWith('import ')) {
      const fromMatch = trimmedLine.match(/from\s+['"]([^'"]+)['"]/);
      if (fromMatch) {
        const module = fromMatch[1];
        
        // For specific modules, merge imports
        if (module === '@testing-library/react' || module === '@/__tests__/test-helpers') {
          const existingImport = seenImports.get(module);
          if (existingImport) {
            // Extract imports from both lines
            const currentImports = new Set();
            const match1 = existingImport.match(/import\s*{\s*([^}]+)\s*}/);
            const match2 = trimmedLine.match(/import\s*{\s*([^}]+)\s*}/);
            
            if (match1) {
              match1[1].split(',').forEach(imp => currentImports.add(imp.trim()));
            }
            if (match2) {
              match2[1].split(',').forEach(imp => currentImports.add(imp.trim()));
            }
            
            // Update the stored import
            if (currentImports.size > 0) {
              const mergedImport = `import { ${Array.from(currentImports).join(', ')} } from '${module}';`;
              seenImports.set(module, mergedImport);
            }
            return; // Skip this line as it's merged
          } else {
            seenImports.set(module, line);
          }
        }
      }
    }
    
    cleanedLines.push(line);
  });
  
  // Replace the content with cleaned version
  if (seenImports.size > 0) {
    // Rebuild the file with merged imports
    const finalLines = [];
    const addedImports = new Set();
    
    cleanedLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('import ')) {
        const fromMatch = trimmedLine.match(/from\s+['"]([^'"]+)['"]/);
        if (fromMatch) {
          const module = fromMatch[1];
          if (seenImports.has(module) && !addedImports.has(module)) {
            finalLines.push(seenImports.get(module));
            addedImports.add(module);
            return;
          } else if (addedImports.has(module)) {
            return; // Skip duplicate
          }
        }
      }
      finalLines.push(line);
    });
    
    content = finalLines.join('\n');
    modified = true;
  }
  
  if (modified) {
    // Final cleanup of excessive newlines
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    fs.writeFileSync(file, content);
    console.log(`✓ Updated ${path.basename(file)}`);
    fixedCount++;
  }
});

console.log(`\nUpdated ${fixedCount} test files!`);