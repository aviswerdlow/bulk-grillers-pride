import { v } from 'convex/values';
import { mutation } from '../../_generated/server';

// Rollback a category import based on audit log entry
export const rollbackCategoryImport = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    importTimestamp: v.number(), // Timestamp from the original import audit log
  },
  handler: async (ctx, { organizationId, projectId, importTimestamp }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Verify user has admin permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Find the original import audit log
    const importAuditLog = await ctx.db
      .query('auditLogs')
      .withIndex('by_timestamp', (q) => q.eq('organizationId', organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field('timestamp'), importTimestamp),
          q.eq(q.field('entityType'), 'categories'),
          q.eq(q.field('entityId'), 'bulk_import'),
          q.eq(q.field('eventType'), 'CREATE')
        )
      )
      .unique();

    if (!importAuditLog) {
      throw new Error('Import audit log not found');
    }

    // Extract category IDs from the audit log
    const importedCount = importAuditLog.changes[0]?.newValue?.importedCount || 0;
    const totalCount = importAuditLog.changes[0]?.newValue?.totalCategories || 0;

    // Find all categories created during this import
    const categoriesToDelete = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', organizationId).eq('projectId', projectId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('metadata.importedAt'), importTimestamp),
          q.gte(q.field('metadata.legacyId'), '') // Has legacy ID (not null/undefined)
        )
      )
      .collect();

    const deletedIds: string[] = [];
    const errors: Array<{ categoryId: string; error: string }> = [];

    // Delete categories in reverse order (deepest level first to avoid orphans)
    const sortedCategories = categoriesToDelete.sort((a, b) => b.level - a.level);

    for (const category of sortedCategories) {
      try {
        // Check if category has any products through assignments
        const productsCount = await ctx.db
          .query('categoryProductAssignments')
          .withIndex('by_category', (q) => q.eq('categoryId', category._id))
          .take(1);

        if (productsCount.length > 0) {
          errors.push({
            categoryId: category._id,
            error: 'Category has associated products',
          });
          continue;
        }

        // Check if category has child categories
        const childCategories = await ctx.db
          .query('categories')
          .withIndex('by_parent', (q) =>
            q
              .eq('organizationId', organizationId)
              .eq('projectId', projectId)
              .eq('parentId', category._id)
          )
          .take(1);

        if (childCategories.length > 0) {
          errors.push({
            categoryId: category._id,
            error: 'Category has child categories',
          });
          continue;
        }

        // Safe to delete
        await ctx.db.delete(category._id);
        deletedIds.push(category._id);
      } catch (error) {
        errors.push({
          categoryId: category._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check if we should also remove the category level definitions
    // Only if they were created during the import and no other categories exist
    const remainingCategories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', organizationId).eq('projectId', projectId)
      )
      .take(1);

    let deletedLevelDefinitions = false;
    if (remainingCategories.length === 0) {
      // Check if level definitions were created during import
      const levelDefs = await ctx.db
        .query('categoryLevelDefinitions')
        .withIndex('by_project_order', (q) => q.eq('projectId', projectId))
        .filter((q) =>
          q.and(q.eq(q.field('createdAt'), importTimestamp), q.eq(q.field('isActive'), true))
        )
        .collect();

      if (levelDefs.length > 0) {
        for (const levelDef of levelDefs) {
          await ctx.db.delete(levelDef._id);
        }
        deletedLevelDefinitions = true;
      }
    }

    // Create rollback audit log
    await ctx.db.insert('auditLogs', {
      organizationId,
      eventType: 'DELETE',
      entityType: 'categories',
      entityId: 'bulk_rollback',
      changes: [
        {
          field: 'rollback_import',
          oldValue: {
            importTimestamp,
            importedCount,
            totalCategories: totalCount,
          },
          newValue: {
            deletedCount: deletedIds.length,
            errorCount: errors.length,
            deletedLevelDefinitions,
          },
          changeType: 'removed' as const,
        },
      ],
      context: {
        action: 'rollback_category_import',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        projectId,
        deletedCategoryIds: deletedIds,
        errors: errors.length > 0 ? errors : undefined,
        originalImportTimestamp: importTimestamp,
      },
      timestamp: Date.now(),
      isRollbackable: false,
    });

    return {
      success: deletedIds.length > 0,
      deletedCount: deletedIds.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      deletedLevelDefinitions,
      message:
        errors.length > 0
          ? `Partially rolled back. ${deletedIds.length} categories deleted, ${errors.length} errors encountered.`
          : `Successfully rolled back ${deletedIds.length} categories.`,
    };
  },
});

// Get import history for rollback selection
export const getImportHistory = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, projectId, limit = 10 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Verify user has access
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) throw new Error('Access denied');

    // Get import audit logs
    const imports = await ctx.db
      .query('auditLogs')
      .withIndex('by_timestamp', (q) => q.eq('organizationId', organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field('entityType'), 'categories'),
          q.eq(q.field('entityId'), 'bulk_import'),
          q.eq(q.field('eventType'), 'CREATE'),
          q.eq(q.field('metadata.projectId'), projectId)
        )
      )
      .order('desc')
      .take(limit);

    // Check which imports have been rolled back
    const importHistory = await Promise.all(
      imports.map(async (importLog) => {
        // Check for rollback
        const rollback = await ctx.db
          .query('auditLogs')
          .withIndex('by_timestamp', (q) => q.eq('organizationId', organizationId))
          .filter((q) =>
            q.and(
              q.eq(q.field('entityType'), 'categories'),
              q.eq(q.field('entityId'), 'bulk_rollback'),
              q.eq(q.field('eventType'), 'DELETE'),
              q.eq(q.field('metadata.originalImportTimestamp'), importLog.timestamp)
            )
          )
          .first();

        const importedCount = importLog.changes[0]?.newValue?.importedCount || 0;
        const totalCategories = importLog.changes[0]?.newValue?.totalCategories || 0;

        return {
          timestamp: importLog.timestamp,
          importedCount,
          totalCategories,
          importedBy: importLog.performedBy,
          isRolledBack: !!rollback,
          rollbackTimestamp: rollback?.timestamp,
          rollbackBy: rollback?.performedBy,
        };
      })
    );

    return importHistory;
  },
});
