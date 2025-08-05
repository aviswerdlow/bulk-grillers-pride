# Test Import Patterns Guide

This guide documents the correct import patterns for test files in the Convex directory.

## Core Test Setup Import

All test files should import from `test.setup` (not `t.setup`):

```typescript
import { t } from '../../../test.setup';  // Adjust path based on file location
```

## Test Standard Utilities

Import test utilities from `convex-test-standard.ts`:

```typescript
import {
  createConvexTest,
  createQueryContext,
  createMutationContext,
  setupAuth,
  seedDatabase,
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  createMockCategory,
  createMockProduct,
  resetMockState,
  assertDocumentExists,
  assertDocumentNotExists,
  getTableData,
  type ConvexTestContext
} from '../../../__tests__/convex-test-standard';
```

## Test Factories

When using test factories, import from the full package name:

```typescript
import { productFactory, categoryFactory } from '@bulk-grillers-pride/test-factories';
```

## Generated Types and API

Import generated files using relative paths:

```typescript
import { Id } from '../../../_generated/dataModel';
import { api, internal } from '../../../_generated/api';
```

## Path Reference by Test Location

### For tests in `convex/functions/*/tests/`:
- `test.setup`: `../../../test.setup`
- `convex-test-standard`: `../../../__tests__/convex-test-standard`
- `_generated/*`: `../../../_generated/*`

### For tests in `convex/functions/*/*/tests/`:
- `test.setup`: `../../../../test.setup`
- `convex-test-standard`: `../../../../__tests__/convex-test-standard`
- `_generated/*`: `../../../../_generated/*`

### For tests in `convex/migrations/tests/`:
- `test.setup`: `../../test.setup`
- `convex-test-standard`: `../../__tests__/convex-test-standard`
- `_generated/*`: `../../_generated/*`

## Common Test Setup Pattern

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { t, resetMockState } from '../../../test.setup';
import {
  createConvexTest,
  setupAuth,
  seedDatabase,
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  type ConvexTestContext
} from '../../../__tests__/convex-test-standard';
import { Id } from '../../../_generated/dataModel';

describe('Test Suite', () => {
  let user: any;
  let org: any;
  let project: any;
  let membership: any;

  beforeEach(async () => {
    // Reset mock state
    resetMockState();
    
    // Create test data
    user = createMockUser({ _id: 'user_1' as Id<'users'> });
    org = createMockOrganization({ _id: 'org_1' as Id<'organizations'> });
    project = createMockProject({
      _id: 'project_1' as Id<'projects'>,
      organizationId: org._id,
    });
    membership = createMockOrganizationMembership({
      userId: user._id,
      organizationId: org._id,
      role: 'owner',
    });

    // Seed database
    await seedDatabase(t, {
      users: [user],
      organizations: [org],
      projects: [project],
      organizationMemberships: [membership],
    });

    // Setup authentication
    await setupAuth(t, user);
  });

  // Your tests here
});
```

## Migration-Specific Files

For migration tests that mock feature flags:

```typescript
jest.mock('../001_cascade_deletion_schema', () => ({
  CASCADE_DELETION_FLAGS: {
    // Your flag values
  },
  MIGRATION_CONFIG: {
    // Your config values
  },
}));
```

## Common Mistakes to Avoid

1. ❌ Don't import from `t.setup` - use `test.setup`
2. ❌ Don't import from `@test-factories` - use `@bulk-grillers-pride/test-factories`
3. ❌ Don't use relative imports for test factories
4. ❌ Don't forget to count directory levels correctly for relative imports
5. ❌ Don't import setupAuthenticatedContext from test-helpers (use setupAuth instead)

## File Structure Reference

```
convex/
├── test.setup.ts
├── __tests__/
│   └── convex-test-standard.ts
├── _generated/
│   ├── api.js
│   └── dataModel.d.ts
├── functions/
│   ├── categories/
│   │   └── __tests__/
│   │       └── *.test.ts (use ../../../ for imports)
│   └── ai/
│       └── memory/
│           └── __tests__/
│               └── *.test.ts (use ../../../../ for imports)
└── migrations/
    ├── 001_cascade_deletion_schema.ts
    └── __tests__/
        └── *.test.ts (use ../../ for imports)
```