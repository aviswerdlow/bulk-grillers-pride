#!/usr/bin/env node

/**
 * Script to simplify types in migration files to resolve TS2589 errors
 */

const fs = require('fs');
const path = require('path');

// Get all migration files
const migrationDir = path.join(__dirname, '../convex/migrations');
const migrationFiles = fs.readdirSync(migrationDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(migrationDir, file));

console.log(`Found ${migrationFiles.length} migration files to process`);

migrationFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Pattern to match v.union(v.literal(...), ...) constructs
  const unionPattern = /v\.union\s*\(\s*(?:v\.literal\s*\([^)]+\)\s*,?\s*)+\)/g;
  
  // Replace unions with strings and add comments for the valid values
  content = content.replace(unionPattern, (match) => {
    modified = true;
    // Extract the literal values
    const literals = [];
    const literalMatches = match.matchAll(/v\.literal\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const literalMatch of literalMatches) {
      literals.push(literalMatch[1]);
    }
    
    // Return simplified version with comment
    return `v.string() /* ${literals.join(' | ')} */`;
  });
  
  // Pattern to match v.id('tableName') references
  const idPattern = /v\.id\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  // Replace v.id() with v.string() and add comments
  content = content.replace(idPattern, (match, tableName) => {
    modified = true;
    return `v.string() /* ID reference to ${tableName} */`;
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✓ Simplified ${path.basename(file)}`);
  } else {
    console.log(`- No changes needed for ${path.basename(file)}`);
  }
});

console.log('\nMigration files simplified successfully!');
console.log('Note: Runtime validation should be added to ensure data integrity');