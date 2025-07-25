const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Finding "tes" errors in test files...\n');

// Find all test files
const patterns = [
  'apps/web/src/**/*.test.tsx',
  'apps/web/src/**/*.test.ts',
  'convex/**/*.test.ts',
  'convex/**/*.test.tsx'
];

let totalErrors = 0;

patterns.forEach(pattern => {
  const files = glob.sync(pattern);
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Look for standalone "tes" that's not part of another word
      if (/\btes\b/.test(line) && 
          !line.includes('test') && 
          !line.includes('latest') && 
          !line.includes('ategori') &&
          !line.includes('manifest') &&
          !line.includes('contest')) {
        console.log(`${file}:${index + 1}: ${line.trim()}`);
        totalErrors++;
      }
      
      // Also look for "tes(" or "tes."
      if (/\btes[(.]/i.test(line)) {
        console.log(`${file}:${index + 1}: ${line.trim()}`);
        totalErrors++;
      }
    });
  });
});

console.log(`\nFound ${totalErrors} potential "tes" errors`);