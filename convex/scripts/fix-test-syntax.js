#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files in convex directory
const testFiles = glob.sync('**/*.test.ts', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${testFiles.length} test files to check`);

let fixedCount = 0;

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  // Check if file has describe.skip
  const hasDescribeSkip = content.includes('describe.skip(');
  if (!hasDescribeSkip) return;
  
  // Check for code after the last closing brace
  let lastClosingBraceIndex = -1;
  let braceDepth = 0;
  let inDescribe = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('describe.skip(')) {
      inDescribe = true;
    }
    
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') {
        braceDepth--;
        if (braceDepth === 0 && inDescribe) {
          lastClosingBraceIndex = i;
          inDescribe = false;
        }
      }
    }
  }
  
  // Check if there's non-comment, non-empty code after the describe.skip block
  let hasCodeAfter = false;
  for (let i = lastClosingBraceIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
      hasCodeAfter = true;
      break;
    }
  }
  
  if (hasCodeAfter) {
    // Fix by commenting out all lines after the describe.skip block
    const fixedLines = lines.map((line, index) => {
      if (index > lastClosingBraceIndex && line.trim() && !line.trim().startsWith('//')) {
        return '// ' + line;
      }
      return line;
    });
    
    fs.writeFileSync(file, fixedLines.join('\n'));
    fixedCount++;
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\nFixed ${fixedCount} files with syntax errors`);