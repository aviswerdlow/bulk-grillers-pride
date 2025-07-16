# Migration System Documentation

This directory contains the migration system for data imports, transformations, and schema evolution.

## Overview

The migration system provides:

- **Import capabilities** for legacy data
- **Validation and dry-run** functionality
- **Rollback support** for reversing imports
- **Migration history tracking** for audit and monitoring
- **Progress tracking** for long-running migrations

## Core Components

### 1. Import Functions (`importCategories.ts`)

- `importLegacyCategories`: Imports category data from legacy systems
- Handles parent-child relationships and hierarchy
- Creates default category levels if needed

### 2. Validation (`validateCategoryImport.ts`)

- `validateCategoryImport`: Validates data before import with dry-run option
- `previewCategoryImport`: Shows what would be imported
- Checks for:
  - Data format and required fields
  - Duplicate handles
  - Missing parent categories
  - Existing conflicts

### 3. Rollback Support (`rollbackCategoryImport.ts`)

- `rollbackCategoryImport`: Reverses a category import
- `getImportHistory`: Shows import history for rollback selection
- Safety checks:
  - Won't delete categories with products
  - Won't delete categories with children
  - Tracks errors for partial rollbacks

### 4. Migration Tracking (`migrationTracking.ts`)

- `getMigrationHistory`: View all migrations
- `canRunMigration`: Check if migration can be executed
- `trackedMigration`: Wrapper for creating tracked migrations
- Tracks:
  - Progress (processed/success/error counts)
  - Timing and duration
  - Errors and results
  - Rollback capability

## Usage Examples

### Basic Import

```typescript
// 1. First validate the data
const validation = await validateCategoryImport({
  organizationId,
  projectId,
  categoriesData: JSON.stringify(categories),
  dryRun: true,
});

if (!validation.importPreview.canProceed) {
  // Handle validation errors
  console.error(validation.validationResults.errors);
  return;
}

// 2. Run the actual import
const result = await importLegacyCategories({
  organizationId,
  projectId,
  categoriesData: JSON.stringify(categories),
});
```

### Import with Rollback

```typescript
// 1. Get import history
const history = await getImportHistory({
  organizationId,
  projectId,
  limit: 10,
});

// 2. Rollback a specific import
const rollbackResult = await rollbackCategoryImport({
  organizationId,
  projectId,
  importTimestamp: history[0].timestamp,
});
```

### Creating a Tracked Migration

```typescript
import { trackedMigration } from './migrationTracking';
import { v } from 'convex/values';

export const myDataMigration = trackedMigration({
  name: 'myDataMigration',
  version: '1.0.0',
  file: 'convex/functions/migrations/myDataMigration.ts',
  isRollbackable: true,
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
  },
  handler: async (ctx, { organizationId, projectId, updateProgress }) => {
    // Get data to migrate
    const items = await ctx.db.query('oldTable').collect();

    await updateProgress({
      totalRecords: items.length,
      processedRecords: 0,
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      try {
        // Transform and insert data
        await ctx.db.insert('newTable', {
          // ... transformed data
        });

        successCount++;
      } catch (error) {
        errorCount++;
        await updateProgress({
          error: {
            message: `Failed to migrate item ${i}`,
            details: error,
          },
        });
      }

      // Update progress every 100 items
      if (i % 100 === 0) {
        await updateProgress({
          processedRecords: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    return {
      migrated: successCount,
      failed: errorCount,
      total: items.length,
    };
  },
});
```

## Migration Best Practices

1. **Always validate first**: Use dry-run to check data before importing
2. **Track progress**: Update progress for long-running migrations
3. **Handle errors gracefully**: Continue processing when possible
4. **Make migrations idempotent**: Safe to run multiple times
5. **Document rollback strategy**: Know how to undo changes
6. **Test with small datasets**: Verify behavior before full import

## Schema Evolution Process

1. **Add to schema.ts**: Define new tables/fields
2. **Create migration**: Write migration to populate new structure
3. **Test migration**: Run on development data
4. **Deploy schema**: Push schema changes to production
5. **Run migration**: Execute migration on production data
6. **Verify results**: Check migration history and data

## Error Handling

Migrations should:

- Log detailed errors with context
- Continue processing when possible
- Track partial successes
- Provide clear rollback instructions
- Never leave data in inconsistent state

## Future Enhancements

- [ ] Schema versioning system
- [ ] Automatic migration scheduling
- [ ] Migration dependencies
- [ ] Batch processing for large datasets
- [ ] Migration templates generator
