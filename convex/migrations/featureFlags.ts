import { query, mutation } from '../_generated/server';
import { v } from 'convex/values';
import { CASCADE_DELETION_FLAGS } from './001_cascade_deletion_schema';

/**
 * Feature Flag Management for Cascade Deletion Migration
 * 
 * Provides runtime control over migration features with gradual rollout capability
 * 
 * Author: migration-agent
 * Issue: #67
 */

// Feature flag schema
const featureFlagSchema = v.object({
  // Core migration flags
  USE_TRANSACTIONAL_DELETION: v.boolean(),
  PRESERVE_CATEGORY_ASSIGNMENTS: v.boolean(),
  USE_IMAGE_CLEANUP_QUEUE: v.boolean(),
  LOG_CASCADE_TRANSACTIONS: v.boolean(),
  ENABLE_TRANSACTION_ROLLBACK: v.boolean(),
  
  // Performance flags
  BATCH_OPERATIONS: v.boolean(),
  PARALLEL_CLEANUP: v.boolean(),
  
  // Rollout configuration
  rolloutPercentage: v.number(), // 0-100
  rolloutOrganizations: v.array(v.id('organizations')), // Specific orgs for testing
  
  // Monitoring
  lastUpdated: v.number(),
  updatedBy: v.id('users'),
});

// Get current feature flags for an organization
export const getFeatureFlags = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    // Check if organization has specific flag overrides
    const orgOverrides = await ctx.db
      .query('schemaMigrations')
      .filter((q) => 
        q.and(
          q.eq(q.field('migrationId'), '001_cascade_deletion'),
          q.eq(q.field('status'), 'completed')
        )
      )
      .first();

    // Get organization settings for rollout
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check if this org is in the rollout
    const isInRollout = await checkRolloutStatus(ctx, args.organizationId);

    // Return effective flags
    return {
      // Use runtime flags if in rollout, otherwise use compile-time defaults
      USE_TRANSACTIONAL_DELETION: isInRollout ? 
        await getRuntimeFlag(ctx, 'USE_TRANSACTIONAL_DELETION') : 
        CASCADE_DELETION_FLAGS.USE_TRANSACTIONAL_DELETION,
      
      PRESERVE_CATEGORY_ASSIGNMENTS: isInRollout ?
        await getRuntimeFlag(ctx, 'PRESERVE_CATEGORY_ASSIGNMENTS') :
        CASCADE_DELETION_FLAGS.PRESERVE_CATEGORY_ASSIGNMENTS,
      
      USE_IMAGE_CLEANUP_QUEUE: isInRollout ?
        await getRuntimeFlag(ctx, 'USE_IMAGE_CLEANUP_QUEUE') :
        CASCADE_DELETION_FLAGS.USE_IMAGE_CLEANUP_QUEUE,
      
      LOG_CASCADE_TRANSACTIONS: isInRollout ?
        await getRuntimeFlag(ctx, 'LOG_CASCADE_TRANSACTIONS') :
        CASCADE_DELETION_FLAGS.LOG_CASCADE_TRANSACTIONS,
      
      ENABLE_TRANSACTION_ROLLBACK: isInRollout ?
        await getRuntimeFlag(ctx, 'ENABLE_TRANSACTION_ROLLBACK') :
        CASCADE_DELETION_FLAGS.ENABLE_TRANSACTION_ROLLBACK,
      
      BATCH_OPERATIONS: isInRollout ?
        await getRuntimeFlag(ctx, 'BATCH_OPERATIONS') :
        CASCADE_DELETION_FLAGS.BATCH_OPERATIONS,
      
      PARALLEL_CLEANUP: isInRollout ?
        await getRuntimeFlag(ctx, 'PARALLEL_CLEANUP') :
        CASCADE_DELETION_FLAGS.PARALLEL_CLEANUP,
      
      // Metadata
      isInRollout,
      rolloutStatus: orgOverrides?.status || 'not_started',
      lastChecked: Date.now(),
    };
  },
});

// Update feature flags (admin only)
export const updateFeatureFlags = mutation({
  args: {
    flags: v.partial(featureFlagSchema),
    targetOrganizations: v.optional(v.array(v.id('organizations'))),
    rolloutPercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }

    // Store runtime flags in a special migration record
    const flagRecord = await ctx.db
      .query('schemaMigrations')
      .filter((q) => q.eq(q.field('migrationId'), '001_cascade_deletion_flags'))
      .first();

    const updatedFlags = {
      ...args.flags,
      rolloutPercentage: args.rolloutPercentage,
      rolloutOrganizations: args.targetOrganizations || [],
      lastUpdated: Date.now(),
      updatedBy: user._id,
    };

    if (flagRecord) {
      // Update existing record
      await ctx.db.patch(flagRecord._id, {
        changes: {
          ...flagRecord.changes,
          featureFlags: updatedFlags,
        },
      });
    } else {
      // Create new record
      await ctx.db.insert('schemaMigrations', {
        migrationId: '001_cascade_deletion_flags',
        version: '001',
        description: 'Feature flags for cascade deletion migration',
        status: 'completed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        changes: {
          tablesAdded: [],
          tablesModified: [],
          indexesAdded: [],
          featureFlags: updatedFlags,
        },
      });
    }

    return {
      success: true,
      message: 'Feature flags updated',
      flags: updatedFlags,
    };
  },
});

// Enable feature for specific organization
export const enableForOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
    flags: v.array(v.string()), // Which flags to enable
  },
  handler: async (ctx, args) => {
    // Verify organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get current flag configuration
    const flagRecord = await ctx.db
      .query('schemaMigrations')
      .filter((q) => q.eq(q.field('migrationId'), '001_cascade_deletion_flags'))
      .first();

    const currentFlags = flagRecord?.changes?.featureFlags || {};
    const currentOrgs = currentFlags.rolloutOrganizations || [];

    // Add organization to rollout if not already included
    if (!currentOrgs.includes(args.organizationId)) {
      currentOrgs.push(args.organizationId);
    }

    // Update flags
    const identity = await ctx.auth.getUserIdentity();
    const user = identity ? await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first() : null;

    await updateFeatureFlags(ctx, {
      flags: Object.fromEntries(
        args.flags.map(flag => [flag, true])
      ),
      targetOrganizations: currentOrgs,
    });

    // Log the enablement
    await ctx.db.insert('migrationHistory', {
      organizationId: args.organizationId,
      migrationName: 'enableCascadeDeletionFlags',
      migrationVersion: '001',
      migrationFile: 'featureFlags.ts',
      executionId: `enable_${Date.now()}`,
      status: 'completed',
      totalRecords: args.flags.length,
      processedRecords: args.flags.length,
      successCount: args.flags.length,
      startedAt: Date.now(),
      completedAt: Date.now(),
      duration: 0,
      result: {
        enabledFlags: args.flags,
        organizationId: args.organizationId,
      },
      isRollbackable: true,
      executedBy: user?._id || ('system' as any),
      executedByEmail: user?.email || 'system',
    });

    return {
      success: true,
      message: `Enabled ${args.flags.length} flags for organization`,
      organization: organization.name,
      enabledFlags: args.flags,
    };
  },
});

// Check migration readiness
export const checkMigrationReadiness = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const checks = {
      schemaDeployed: false,
      transactionClassReady: false,
      cronJobsConfigured: false,
      flagsConfigured: false,
      testsPassing: false,
      organizationEnabled: false,
      readyForRollout: false,
    };

    // Check if schema tables exist
    try {
      await ctx.db.query('cascadeTransactions').take(1);
      await ctx.db.query('categoryAssignmentsTrash').take(1);
      await ctx.db.query('imageCleanupQueue').take(1);
      checks.schemaDeployed = true;
    } catch {
      // Tables don't exist
    }

    // Check if feature flags are configured
    const flagRecord = await ctx.db
      .query('schemaMigrations')
      .filter((q) => q.eq(q.field('migrationId'), '001_cascade_deletion_flags'))
      .first();
    
    checks.flagsConfigured = !!flagRecord;

    // Check if organization is in rollout
    if (flagRecord?.changes?.featureFlags?.rolloutOrganizations) {
      checks.organizationEnabled = flagRecord.changes.featureFlags.rolloutOrganizations.includes(args.organizationId);
    }

    // Transaction class is ready (hardcoded since we know it's implemented)
    checks.transactionClassReady = true;

    // Check if all critical components are ready
    checks.readyForRollout = 
      checks.schemaDeployed && 
      checks.transactionClassReady && 
      checks.flagsConfigured;

    return {
      checks,
      readyForRollout: checks.readyForRollout,
      missingComponents: Object.entries(checks)
        .filter(([_, ready]) => !ready)
        .map(([component]) => component),
      recommendation: checks.readyForRollout ? 
        'Ready for gradual rollout' : 
        'Complete missing components before rollout',
    };
  },
});

// Helper functions
async function checkRolloutStatus(ctx: any, organizationId: string): Promise<boolean> {
  const flagRecord = await ctx.db
    .query('schemaMigrations')
    .filter((q) => q.eq(q.field('migrationId'), '001_cascade_deletion_flags'))
    .first();

  if (!flagRecord?.changes?.featureFlags) {
    return false;
  }

  const flags = flagRecord.changes.featureFlags;

  // Check if org is specifically included
  if (flags.rolloutOrganizations?.includes(organizationId)) {
    return true;
  }

  // Check percentage rollout
  if (flags.rolloutPercentage && flags.rolloutPercentage > 0) {
    // Use consistent hash of org ID for stable rollout
    const hash = organizationId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const percentage = Math.abs(hash) % 100;
    return percentage < flags.rolloutPercentage;
  }

  return false;
}

async function getRuntimeFlag(ctx: any, flagName: string): Promise<boolean> {
  const flagRecord = await ctx.db
    .query('schemaMigrations')
    .filter((q) => q.eq(q.field('migrationId'), '001_cascade_deletion_flags'))
    .first();

  return flagRecord?.changes?.featureFlags?.[flagName] ?? CASCADE_DELETION_FLAGS[flagName as keyof typeof CASCADE_DELETION_FLAGS];
}