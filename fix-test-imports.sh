#!/bin/bash

# Fix test imports in backend test files

# Files to fix
FILES=(
  "convex/functions/dashboard/__tests__/dashboard.test.ts"
  "convex/functions/projects/__tests__/projects.test.ts"
  "convex/functions/organizations/__tests__/organizations.test.ts"
  "convex/functions/products/__tests__/products.test.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing imports in $file"
    
    # Replace the import paths
    sed -i '' "s|import { createTestContext } from '../../../tests/helpers/convexTestCtx';|import { createConvexTest, setupAuth, seedDatabase, createMockUser, createMockOrganization, createMockOrganizationMembership, createMockProject, createMockCategory, createMockProduct, type ConvexTestContext } from '../../../__tests__/convex-test-standard';|g" "$file"
    
    sed -i '' "s|import type { TestContext } from '../../../tests/helpers/convexTestCtx';||g" "$file"
    
    # Replace TestContext with ConvexTestContext
    sed -i '' "s|let testCtx: TestContext;|let testCtx: ConvexTestContext;|g" "$file"
    
    # Replace createTestContext() with t
    sed -i '' "s|testCtx = createTestContext();|testCtx = t;|g" "$file"
  fi
done

echo "Import fixes complete"