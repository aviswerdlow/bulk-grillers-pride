#!/usr/bin/env node

/**
 * Test Scaffolding Generator for Convex Functions
 * 
 * Usage: npm run generate:test <path-to-convex-function>
 * Example: npm run generate:test convex/functions/products/products.ts
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseConvexFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  const exports = [];
  const imports = new Set();

  // Function to extract argument types from the args object
  function extractArgs(node) {
    const args = {};
    if (node && ts.isObjectLiteralExpression(node)) {
      node.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && prop.name) {
          const name = prop.name.getText();
          const value = prop.initializer.getText();
          args[name] = value;
        }
      });
    }
    return args;
  }

  // Visit all nodes in the AST
  function visit(node) {
    // Check for export declarations
    if (ts.isVariableStatement(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isVariableDeclaration(declaration)) {
        const name = declaration.name.getText();
        const initializer = declaration.initializer;
        
        if (initializer && ts.isCallExpression(initializer)) {
          const functionType = initializer.expression.getText();
          
          // Only process if it's a Convex function (query, mutation, or action)
          if (['query', 'mutation', 'action'].includes(functionType)) {
            let args = {};
            
            // Extract args from the object literal
            if (initializer.arguments[0] && ts.isObjectLiteralExpression(initializer.arguments[0])) {
              const argsProperty = initializer.arguments[0].properties.find(
                prop => ts.isPropertyAssignment(prop) && prop.name.getText() === 'args'
              );
              if (argsProperty && ts.isPropertyAssignment(argsProperty)) {
                args = extractArgs(argsProperty.initializer);
              }
            }
            
            exports.push({
              name,
              type: functionType, // 'query', 'mutation', or 'action'
              args,
            });
          }
        }
      }
    }

    // Collect imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
      imports.add(moduleSpecifier);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  
  return { exports, imports: Array.from(imports) };
}

function generateTestContent(functionPath, parsedData) {
  const { exports } = parsedData;
  const functionName = path.basename(functionPath, '.ts');
  const relativePath = path.relative(
    path.join(process.cwd(), 'convex', '__tests__'),
    functionPath
  ).replace(/\.ts$/, '');

  let content = `import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createConvexTest,
  createQueryContext,
  createMutationContext,
  createActionContext,
  setupAuth,
  seedDatabase,
  assertDocumentExists,
  assertDocumentNotExists,
  type ConvexTestContext,
} from '../convex-test-standard';
import {
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  createMockProduct,
  createMockCategory,
} from '../test-helpers';
`;

  // Add imports for the functions being tested
  const functionImports = exports.map(exp => exp.name).join(', ');
  content += `import { ${functionImports} } from '${relativePath}';\n\n`;

  content += `describe('${functionName}', () => {
  let test: ConvexTestContext;

  beforeEach(() => {
    test = createConvexTest();
  });
\n`;

  // Generate test cases for each exported function
  exports.forEach(exp => {
    const contextType = exp.type === 'query' ? 'createQueryContext' 
                     : exp.type === 'mutation' ? 'createMutationContext'
                     : 'createActionContext';

    content += `  describe('${exp.name}', () => {
    describe('Happy Path', () => {
      it('should execute successfully with valid inputs', async () => {
        // Arrange
        const user = createMockUser();
        const org = createMockOrganization();
        const membership = createMockOrganizationMembership({
          userId: user._id,
          organizationId: org._id,
          role: 'owner',
        });

        await seedDatabase(test, {
          users: [user],
          organizations: [org],
          organizationMemberships: [membership],
        });

        setupAuth(test, { tokenIdentifier: user.clerkId });
        const ctx = ${contextType}(test);

        // Act
        const args = {
`;

    // Add args based on parsed data
    Object.entries(exp.args).forEach(([argName, argType]) => {
      if (argType.includes("v.id('organizations')")) {
        content += `          ${argName}: org._id,\n`;
      } else if (argType.includes("v.id('projects')")) {
        content += `          ${argName}: 'project_123' as any, // TODO: Create mock project\n`;
      } else if (argType.includes("v.id('products')")) {
        content += `          ${argName}: 'product_123' as any, // TODO: Create mock product\n`;
      } else if (argType.includes('v.string()')) {
        content += `          ${argName}: 'test-string',\n`;
      } else if (argType.includes('v.number()')) {
        content += `          ${argName}: 10,\n`;
      } else if (argType.includes('v.boolean()')) {
        content += `          ${argName}: true,\n`;
      } else if (!argType.includes('v.optional')) {
        content += `          ${argName}: undefined, // TODO: Add appropriate value for ${argType}\n`;
      }
    });

    content += `        };

        // TODO: Add specific test logic based on function behavior
        const result = await ${exp.name}(ctx, args);

        // Assert
        expect(result).toBeDefined();
        // TODO: Add more specific assertions
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = ${contextType}(test);

        // Act & Assert
        await expect(${exp.name}(ctx, {} as any)).rejects.toThrow();
      });

      it('should fail for unauthorized user', async () => {
        // Arrange
        const user = createMockUser();
        const org = createMockOrganization();
        // Note: No membership created

        await seedDatabase(test, {
          users: [user],
          organizations: [org],
        });

        setupAuth(test, { tokenIdentifier: user.clerkId });
        const ctx = ${contextType}(test);

        // Act & Assert
        const args = {
`;

    // Add minimal required args
    Object.entries(exp.args).forEach(([argName, argType]) => {
      if (argType.includes("v.id('organizations')") && !argType.includes('v.optional')) {
        content += `          ${argName}: org._id,\n`;
      }
    });

    content += `        };
        await expect(${exp.name}(ctx, args as any)).rejects.toThrow();
      });
    });

    describe('Validation', () => {
      it('should fail with invalid arguments', async () => {
        // Arrange
        const user = createMockUser();
        setupAuth(test, { tokenIdentifier: user.clerkId });
        const ctx = ${contextType}(test);

        // Act & Assert
        await expect(${exp.name}(ctx, {} as any)).rejects.toThrow();
      });
    });

    describe('Edge Cases', () => {
      // TODO: Add edge case tests specific to this function
      it.todo('should handle edge case 1');
      it.todo('should handle edge case 2');
    });
  });
\n`;
  });

  content += `});
`;

  return content;
}

function generateTestPath(functionPath) {
  // Convert function path to test path
  // e.g., convex/functions/products/products.ts -> convex/__tests__/products/products.test.ts
  const relativePath = path.relative(path.join(process.cwd(), 'convex', 'functions'), functionPath);
  const testPath = path.join(
    process.cwd(),
    'convex',
    '__tests__',
    relativePath.replace(/\.ts$/, '.test.ts')
  );
  return testPath;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage: npm run generate:test <path-to-convex-function>', 'yellow');
    log('Example: npm run generate:test convex/functions/products/products.ts', 'yellow');
    process.exit(1);
  }

  const functionPath = path.resolve(args[0]);

  if (!fs.existsSync(functionPath)) {
    log(`Error: File not found: ${functionPath}`, 'red');
    process.exit(1);
  }

  if (!functionPath.includes('convex/functions/')) {
    log('Error: This generator only works with files in convex/functions/', 'red');
    process.exit(1);
  }

  log(`Analyzing ${functionPath}...`, 'blue');

  try {
    const parsedData = parseConvexFile(functionPath);
    log(`Found ${parsedData.exports.length} exported functions`, 'green');
    
    parsedData.exports.forEach(exp => {
      log(`  - ${exp.name} (${exp.type})`, 'blue');
    });

    const testPath = generateTestPath(functionPath);
    const testDir = path.dirname(testPath);

    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      log(`Created directory: ${testDir}`, 'green');
    }

    // Check if test file already exists
    if (fs.existsSync(testPath)) {
      log(`Warning: Test file already exists: ${testPath}`, 'yellow');
      log('Do you want to overwrite it? (y/N)', 'yellow');
      
      // Simple prompt for overwrite confirmation
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      readline.question('', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'y') {
          log('Aborted', 'yellow');
          process.exit(0);
        }
        
        writeTestFile(testPath, functionPath, parsedData);
      });
    } else {
      writeTestFile(testPath, functionPath, parsedData);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function writeTestFile(testPath, functionPath, parsedData) {
  const testContent = generateTestContent(functionPath, parsedData);
  fs.writeFileSync(testPath, testContent);
  log(`Generated test file: ${testPath}`, 'green');
  log('\nNext steps:', 'yellow');
  log('1. Review and customize the generated test cases', 'yellow');
  log('2. Replace TODO comments with appropriate test data', 'yellow');
  log('3. Add specific assertions based on function behavior', 'yellow');
  log('4. Run tests with: npm test ' + path.relative(process.cwd(), testPath), 'yellow');
}

// Run the generator
main().catch(error => {
  log(`Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});