const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Applying final comprehensive fixes...\n');

// Find all test files
const testFiles = glob.sync('apps/web/src/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/frontend-test-helpers.tsx']
});

let fixedCount = 0;

// Essential imports that many tests need
const essentialImports = `import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUseQuery, mockUseMutation, mockUseAction, resetAllMocks, setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
`;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Check what the file actually uses
  const usesReact = content.includes('<') || content.includes('React.');
  const usesRender = content.includes('render(') || content.includes('renderWithProviders(');
  const usesScreen = content.includes('screen.');
  const usesFireEvent = content.includes('fireEvent.');
  const usesWaitFor = content.includes('waitFor(');
  const usesWithin = content.includes('within(');
  const usesUserEvent = content.includes('userEvent') || content.includes('user.');
  const usesQuery = content.includes('useQuery') || content.includes('mockUseQuery');
  const usesMutation = content.includes('useMutation') || content.includes('mockUseMutation');
  const usesResetAllMocks = content.includes('resetAllMocks');
  const usesSetupTest = content.includes('setupTest');
  const usesCleanupTest = content.includes('cleanupTest');
  
  // Build the import statements needed
  const imports = [];
  
  // Always add React for TSX files
  if (file.endsWith('.tsx') && !content.includes("import React") && !content.includes("import * as React")) {
    imports.push("import React from 'react';");
  }
  
  // Build RTL imports
  const rtlImports = [];
  if (usesRender && !content.includes('import.*render.*from.*@testing-library/react')) {
    rtlImports.push('render');
  }
  if (usesScreen && !content.includes('import.*screen.*from.*@testing-library/react')) {
    rtlImports.push('screen');
  }
  if (usesFireEvent && !content.includes('import.*fireEvent.*from.*@testing-library/react')) {
    rtlImports.push('fireEvent');
  }
  if (usesWaitFor && !content.includes('import.*waitFor.*from.*@testing-library/react')) {
    rtlImports.push('waitFor');
  }
  if (usesWithin && !content.includes('import.*within.*from.*@testing-library/react')) {
    rtlImports.push('within');
  }
  
  if (rtlImports.length > 0) {
    imports.push(`import { ${rtlImports.join(', ')} } from '@testing-library/react';`);
  }
  
  // Add userEvent if needed
  if (usesUserEvent && !content.includes("import userEvent")) {
    imports.push("import userEvent from '@testing-library/user-event';");
  }
  
  // Build frontend-test-helpers imports
  const helperImports = [];
  if (usesRender && !content.includes('renderWithProviders')) {
    helperImports.push('renderWithProviders');
  }
  if (usesQuery && !content.includes('mockUseQuery')) {
    helperImports.push('mockUseQuery');
  }
  if (usesMutation && !content.includes('mockUseMutation')) {
    helperImports.push('mockUseMutation');
  }
  if (content.includes('useAction') && !content.includes('mockUseAction')) {
    helperImports.push('mockUseAction');
  }
  if (usesResetAllMocks && !content.includes('import.*resetAllMocks')) {
    helperImports.push('resetAllMocks');
  }
  if (usesSetupTest && !content.includes('import.*setupTest')) {
    helperImports.push('setupTest');
  }
  if (usesCleanupTest && !content.includes('import.*cleanupTest')) {
    helperImports.push('cleanupTest');
  }
  
  if (helperImports.length > 0) {
    imports.push(`import { ${helperImports.join(', ')} } from '@/__tests__/frontend-test-helpers';`);
  }
  
  // If we have imports to add, add them after the first line if it's a pragma
  if (imports.length > 0) {
    let insertPosition = 0;
    
    // Skip any initial comments or pragmas
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('//') && !line.startsWith('/*') && line !== '') {
        insertPosition = content.indexOf(lines[i]);
        break;
      }
    }
    
    // Remove any existing imports that we're replacing
    content = content.replace(/import React from ['"]react['"];?\s*\n?/g, '');
    content = content.replace(/import \* as React from ['"]react['"];?\s*\n?/g, '');
    
    // Insert new imports
    content = content.slice(0, insertPosition) + imports.join('\n') + '\n\n' + content.slice(insertPosition);
    modified = true;
  }
  
  // Replace direct hook usage with mocked versions
  if (content.match(/\buseQuery\s*\(/)) {
    content = content.replace(/\buseQuery\s*\(/g, 'mockUseQuery(');
    modified = true;
  }
  if (content.match(/\buseMutation\s*\(/)) {
    content = content.replace(/\buseMutation\s*\(/g, 'mockUseMutation(');
    modified = true;
  }
  if (content.match(/\buseAction\s*\(/)) {
    content = content.replace(/\buseAction\s*\(/g, 'mockUseAction(');
    modified = true;
  }
  
  // Fix render calls to use renderWithProviders
  if (content.includes('render(') && content.includes('<')) {
    // Only replace render calls that have JSX
    content = content.replace(/\brender\s*\(\s*</g, 'renderWithProviders(<');
    modified = true;
  }
  
  if (modified) {
    // Clean up duplicate imports and excessive newlines
    const lines = content.split('\n');
    const uniqueLines = [];
    const seenImports = new Set();
    let lastWasEmpty = false;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Skip duplicate imports
      if (trimmedLine.startsWith('import ') && trimmedLine.includes(' from ')) {
        if (seenImports.has(trimmedLine)) {
          return;
        }
        seenImports.add(trimmedLine);
      }
      
      // Skip excessive empty lines
      if (line === '') {
        if (lastWasEmpty) {
          return;
        }
        lastWasEmpty = true;
      } else {
        lastWasEmpty = false;
      }
      
      uniqueLines.push(line);
    });
    
    content = uniqueLines.join('\n');
    
    fs.writeFileSync(file, content);
    console.log(`✓ Fixed ${path.basename(file)}`);
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} test files!`);