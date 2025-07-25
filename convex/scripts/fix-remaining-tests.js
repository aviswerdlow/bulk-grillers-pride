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
  
  // Find all instances of uncommented code fragments that should be commented
  const fixedLines = lines.map((line, index) => {
    // Check if line contains problematic patterns
    const trimmedLine = line.trim();
    
    // Skip if already commented or empty
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
      return line;
    }
    
    // Check for specific patterns that indicate orphaned code
    const problematicPatterns = [
      /^if\s*\(/,                    // Orphaned if statements
      /^expect\(/,                   // Orphaned expect statements  
      /^}\s*else\s*{/,              // Orphaned else blocks
      /^const\s+\w+\s*=/,           // Orphaned const declarations outside functions
      /^let\s+\w+\s*=/,             // Orphaned let declarations
      /^var\s+\w+\s*=/,             // Orphaned var declarations
      /^\w+\s*=/,                   // Orphaned assignments
      /^\/\/ const/,                // Already commented const (skip)
      /^\/\/ let/,                  // Already commented let (skip)
    ];
    
    // Check if this line is inside a proper code block
    let isInsideBlock = false;
    let braceDepth = 0;
    let inDescribe = false;
    
    for (let i = 0; i <= index; i++) {
      const checkLine = lines[i];
      if (checkLine.includes('describe.skip(') || checkLine.includes('describe(') || 
          checkLine.includes('it(') || checkLine.includes('it.skip(') ||
          checkLine.includes('beforeEach(') || checkLine.includes('afterEach(')) {
        inDescribe = true;
      }
      
      for (const char of checkLine) {
        if (char === '{') braceDepth++;
        if (char === '}') {
          braceDepth--;
          if (braceDepth === 0) inDescribe = false;
        }
      }
    }
    
    isInsideBlock = inDescribe && braceDepth > 0;
    
    // If line is outside blocks and matches problematic patterns, comment it
    if (!isInsideBlock && problematicPatterns.some(pattern => pattern.test(trimmedLine))) {
      // Special handling for lines that are part of commented blocks
      const prevLines = lines.slice(Math.max(0, index - 5), index);
      const isPartOfCommentedBlock = prevLines.some(l => l.trim().startsWith('// '));
      
      if (!isPartOfCommentedBlock || trimmedLine.startsWith('if') || trimmedLine.startsWith('expect')) {
        console.log(`Commenting out orphaned code in ${path.basename(file)}: ${trimmedLine.substring(0, 50)}...`);
        return '// ' + line;
      }
    }
    
    return line;
  });
  
  // Check if we made any changes
  if (lines.join('\n') !== fixedLines.join('\n')) {
    fs.writeFileSync(file, fixedLines.join('\n'));
    fixedCount++;
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\nFixed ${fixedCount} files with orphaned code`);