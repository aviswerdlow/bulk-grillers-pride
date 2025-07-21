import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Migration Script: Apply Cascade Deletion Schema Changes
 * 
 * This script tracks the migration status and provides rollback capability.
 * The actual schema changes are applied by updating schema.ts.
 * 
 * Author: migration-agent
 * Issue: #67
 */

export const applyMigration001 = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const migrationId = '001_cascade_deletion_schema';
    const timestamp = Date.now();
    
    // Check if migration already applied
    const existingMigration = await ctx.db
      .query('schemaMigrations')
      .filter((q) => q.eq(q.field('migrationId'), migrationId))
      .first();
    
    if (existingMigration && existingMigration.status === 'completed') {
      return {
        success: false,
        message: 'Migration already applied',
        migrationId,
      };
    }
    
    if (args.dryRun) {
      return {
        success: true,
        message: 'Dry run completed. Schema changes ready to apply.',
        migrationId,
        changes: [
          'Add table: categoryAssignmentsTrash',
          'Add table: cascadeTransactions',
          'Add table: imageCleanupQueue',
          'Add indexes for efficient querying',
        ],
      };
    }
    
    try {
      // Record migration start
      const migrationRecord = await ctx.db.insert('schemaMigrations', {
        migrationId,
        version: '001',
        description: 'Add tables for transactional cascade deletion',
        status: 'in_progress',
        startedAt: timestamp,
        changes: {
          tablesAdded: ['categoryAssignmentsTrash', 'cascadeTransactions', 'imageCleanupQueue'],
          tablesModified: [],
          indexesAdded: [
            'categoryAssignmentsTrash.by_product',
            'categoryAssignmentsTrash.by_transaction',
            'cascadeTransactions.by_transaction_id',
            'cascadeTransactions.by_status',
            'imageCleanupQueue.by_status',
            'imageCleanupQueue.by_priority_status',
          ],
        },
      });
      
      // Note: The actual schema changes are applied by updating schema.ts
      // This migration script just tracks the status
      
      // Verify tables exist (this will fail if schema.ts wasn't updated)
      const testTransaction = {
        transactionId: `test_${timestamp}`,
        organizationId: 'test' as any,
        operationType: 'single_delete' as const,
        status: 'pending' as const,
        primaryEntityId: 'test' as any,
        affectedEntities: {
          products: [],
          variants: [],
          assignments: [],
          images: [],
        },
        operations: [],
        startedAt: timestamp,
        executedBy: 'test' as any,
      };
      
      // This will throw if table doesn't exist
      const testId = await ctx.db.insert('cascadeTransactions', testTransaction);
      
      // Clean up test record
      await ctx.db.delete(testId);
      
      // Update migration record
      await ctx.db.patch(migrationRecord, {
        status: 'completed',
        completedAt: Date.now(),
      });
      
      return {
        success: true,
        message: 'Migration completed successfully',
        migrationId,
        duration: Date.now() - timestamp,
      };
      
    } catch (error: any) {
      // Record failure
      if (existingMigration) {
        await ctx.db.patch(existingMigration._id, {
          status: 'failed',
          error: error.message,
          failedAt: Date.now(),
        });
      }
      
      throw new Error(`Migration failed: ${error.message}`);
    }
  },
});

export const rollbackMigration001 = internalMutation({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const migrationId = '001_cascade_deletion_schema';
    
    const migration = await ctx.db
      .query('schemaMigrations')
      .filter((q) => q.eq(q.field('migrationId'), migrationId))
      .first();
    
    if (!migration) {
      return {
        success: false,
        message: 'Migration not found',
      };
    }
    
    if (migration.status !== 'completed' && !args.force) {
      return {
        success: false,
        message: 'Migration not in completed state. Use force=true to rollback anyway.',
      };
    }
    
    // Check for data in new tables
    const hasData = await checkForDataInNewTables(ctx);
    
    if (hasData && !args.force) {
      return {
        success: false,
        message: 'New tables contain data. Use force=true to rollback and lose data.',
        affectedTables: hasData,
      };
    }
    
    // Note: Actual schema rollback requires removing tables from schema.ts
    // This just updates the migration record
    
    await ctx.db.patch(migration._id, {
      status: 'rolled_back',
      rolledBackAt: Date.now(),
    });
    
    return {
      success: true,
      message: 'Migration rolled back. Remove new tables from schema.ts to complete.',
      migrationId,
    };
  },
});

async function checkForDataInNewTables(ctx: any) {
  const tables = [
    'categoryAssignmentsTrash',
    'cascadeTransactions', 
    'imageCleanupQueue',
  ];
  
  const dataFound: string[] = [];
  
  for (const table of tables) {
    try {
      const count = await ctx.db.query(table).take(1);
      if (count.length > 0) {
        dataFound.push(table);
      }
    } catch {
      // Table doesn't exist, ignore
    }
  }
  
  return dataFound.length > 0 ? dataFound : null;
}

export const getMigrationStatus = internalMutation({
  handler: async (ctx) => {
    const migrations = await ctx.db
      .query('schemaMigrations')
      .order('desc')
      .take(10);
    
    return migrations;
  },
});