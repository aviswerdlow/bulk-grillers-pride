import { v } from 'convex/values';
import { mutation, query, internalMutation } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Start tracking a migration
export const startMigration = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    migrationName: v.string(),
    migrationVersion: v.string(),
    migrationFile: v.string(),
    totalRecords: v.optional(v.number()),
    isRollbackable: v.boolean(),
    userId: v.id('users'),
    userEmail: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    const migrationId = await ctx.db.insert('migrationHistory', {
      organizationId: args.organizationId,
      projectId: args.projectId,
      migrationName: args.migrationName,
      migrationVersion: args.migrationVersion,
      migrationFile: args.migrationFile,
      executionId,
      status: 'running',
      totalRecords: args.totalRecords,
      processedRecords: 0,
      successCount: 0,
      errorCount: 0,
      startedAt: now,
      isRollbackable: args.isRollbackable,
      executedBy: args.userId,
      executedByEmail: args.userEmail,
      metadata: args.metadata || {},
    });

    return { migrationId, executionId };
  },
});

// Update migration progress
export const updateMigrationProgress = internalMutation({
  args: {
    migrationId: v.id('migrationHistory'),
    processedRecords: v.optional(v.number()),
    successCount: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    errors: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          message: v.string(),
          details: v.optional(v.any()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const migration = await ctx.db.get(args.migrationId);
    if (!migration) throw new Error('Migration not found');

    const updates: any = {};
    if (args.processedRecords !== undefined) updates.processedRecords = args.processedRecords;
    if (args.successCount !== undefined) updates.successCount = args.successCount;
    if (args.errorCount !== undefined) updates.errorCount = args.errorCount;

    if (args.errors) {
      updates.errors = [...(migration.errors || []), ...args.errors];
    }

    await ctx.db.patch(args.migrationId, updates);
  },
});

// Complete a migration
export const completeMigration = internalMutation({
  args: {
    migrationId: v.id('migrationHistory'),
    status: v.union(v.literal('completed'), v.literal('failed'), v.literal('partially_completed')),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const migration = await ctx.db.get(args.migrationId);
    if (!migration) throw new Error('Migration not found');

    const now = Date.now();
    const duration = now - migration.startedAt;

    await ctx.db.patch(args.migrationId, {
      status: args.status,
      completedAt: now,
      duration,
      result: args.result,
    });
  },
});

// Get migration history
export const getMigrationHistory = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    migrationName: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('rolled_back'),
        v.literal('partially_completed')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    let query = ctx.db
      .query('migrationHistory')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId));

    // Apply filters
    const migrations = await query.collect();

    let filtered = migrations;
    if (args.projectId) {
      filtered = filtered.filter((m) => m.projectId === args.projectId);
    }
    if (args.migrationName) {
      filtered = filtered.filter((m) => m.migrationName === args.migrationName);
    }
    if (args.status) {
      filtered = filtered.filter((m) => m.status === args.status);
    }

    // Sort by startedAt descending
    filtered.sort((a, b) => b.startedAt - a.startedAt);

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

// Check if a migration can be run
export const canRunMigration = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    migrationName: v.string(),
    migrationVersion: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if there's already a running migration
    const runningMigrations = await ctx.db
      .query('migrationHistory')
      .withIndex('by_status', (q) =>
        q.eq('organizationId', args.organizationId).eq('status', 'running')
      )
      .collect();

    if (runningMigrations.length > 0) {
      return {
        canRun: false,
        reason: 'Another migration is currently running',
        runningMigration: {
          name: runningMigrations[0].migrationName,
          startedAt: runningMigrations[0].startedAt,
          executionId: runningMigrations[0].executionId,
        },
      };
    }

    // Check if this exact migration has already been completed
    const completedMigrations = await ctx.db
      .query('migrationHistory')
      .withIndex('by_name', (q) =>
        q.eq('organizationId', args.organizationId).eq('migrationName', args.migrationName)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('migrationVersion'), args.migrationVersion),
          q.eq(q.field('status'), 'completed')
        )
      )
      .collect();

    if (completedMigrations.length > 0) {
      const lastCompleted = completedMigrations[completedMigrations.length - 1];
      return {
        canRun: false,
        reason: 'This migration has already been completed',
        lastCompleted: {
          completedAt: lastCompleted.completedAt,
          executionId: lastCompleted.executionId,
          result: lastCompleted.result,
        },
      };
    }

    return {
      canRun: true,
      reason: 'Migration can be executed',
    };
  },
});

// Enhanced wrapper for migrations with tracking
export const trackedMigration = <Args extends Record<string, any>, Result>(migration: {
  name: string;
  version: string;
  file: string;
  isRollbackable: boolean;
  args: any; // Convex args schema
  handler: (
    ctx: any,
    args: Args & {
      migrationId: Id<'migrationHistory'>;
      updateProgress: (progress: {
        processedRecords?: number;
        successCount?: number;
        errorCount?: number;
        error?: { message: string; details?: any };
      }) => Promise<void>;
    }
  ) => Promise<Result>;
}) => {
  return mutation({
    args: migration.args,
    handler: async (ctx, args: Args) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error('Not authenticated');

      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
        .unique();

      if (!user) throw new Error('User not found');

      // Start migration tracking
      const { migrationId } = await ctx.runMutation(startMigration as any, {
        organizationId: args.organizationId,
        projectId: args.projectId,
        migrationName: migration.name,
        migrationVersion: migration.version,
        migrationFile: migration.file,
        isRollbackable: migration.isRollbackable,
        userId: user._id,
        userEmail: user.email,
        totalRecords: args.totalRecords,
        metadata: args.metadata,
      });

      // Progress update helper
      const updateProgress = async (progress: {
        processedRecords?: number;
        successCount?: number;
        errorCount?: number;
        error?: { message: string; details?: any };
      }) => {
        const updates: any = {};
        if (progress.processedRecords !== undefined)
          updates.processedRecords = progress.processedRecords;
        if (progress.successCount !== undefined) updates.successCount = progress.successCount;
        if (progress.errorCount !== undefined) updates.errorCount = progress.errorCount;

        if (progress.error) {
          updates.errors = [
            {
              timestamp: Date.now(),
              message: progress.error.message,
              details: progress.error.details,
            },
          ];
        }

        await ctx.runMutation(updateMigrationProgress as any, {
          migrationId,
          ...updates,
        });
      };

      try {
        // Run the actual migration
        const result = await migration.handler(ctx, {
          ...args,
          migrationId,
          updateProgress,
        });

        // Complete successfully
        await ctx.runMutation(completeMigration as any, {
          migrationId,
          status: 'completed',
          result,
        });

        return result;
      } catch (error) {
        // Mark as failed
        await ctx.runMutation(completeMigration as any, {
          migrationId,
          status: 'failed',
          result: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    },
  });
};
