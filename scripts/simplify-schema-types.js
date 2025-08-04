#!/usr/bin/env node

/**
 * Script to simplify schema types by converting v.union(v.literal(...)) to v.string()
 * This helps resolve TypeScript TS2589 errors (type instantiation depth)
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../convex/schema.ts');

// Read the schema file
let content = fs.readFileSync(schemaPath, 'utf8');

// Pattern to match v.union(v.literal(...), ...) constructs
const unionPattern = /v\.union\s*\(\s*(?:v\.literal\s*\([^)]+\)\s*,?\s*)+\)/g;

// Replace unions with strings and add comments for the valid values
content = content.replace(unionPattern, (match) => {
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
  return `v.string() /* ID reference to ${tableName} */`;
});

// Write the simplified schema
fs.writeFileSync(schemaPath, content);

console.log('Schema simplified successfully!');
console.log('- Converted v.union(v.literal(...)) to v.string() with comments');
console.log('- Converted v.id("table") to v.string() with comments');
console.log('\nNote: Runtime validation should be added to ensure data integrity');