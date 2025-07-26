import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';

// Schema version constants
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const SCHEMA_VERSION_HISTORY = [
  {
    version: '1.0.0',
    date: '2025-01-15',
    description:
      'Initial schema with multi-tenant support, products, categories, and AI categorization',
    changes: [
      'Added organizations table for multi-tenancy',
      'Added users and organizationMemberships tables',
      'Added projects table for organization projects',
      'Added products and productVariants tables',
      'Added categories with hierarchical support',
      'Added categoryLevelDefinitions for flexible category structures',
      'Added AI categorization workflow tables',
      'Added import jobs and audit logging',
      'Added data versioning support',
      'Added migration history tracking',
    ],
  },
];

// Get current schema version for an organization
export const getSchemaVersion = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, { organizationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Check if organization has a specific schema version
    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error('Organization not found');

    // Get schema version from organization metadata or use current
    const schemaVersion = org.settings?.schemaVersion || CURRENT_SCHEMA_VERSION;

    // Get migration history to see applied migrations
    const migrations = await ctx.db
      .query('migrationHistory')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .collect();

    // Get version history up to current version
    const versionIndex = SCHEMA_VERSION_HISTORY.findIndex((v) => v.version === schemaVersion);
    const appliedVersions = SCHEMA_VERSION_HISTORY.slice(0, versionIndex + 1);

    return {
      currentVersion: schemaVersion,
      isLatest: schemaVersion === CURRENT_SCHEMA_VERSION,
      versionHistory: appliedVersions,
      appliedMigrations: migrations.map((m) => ({
        name: m.migrationName,
        version: m.migrationVersion,
        completedAt: m.completedAt,
      })),
      availableUpgrade: schemaVersion !== CURRENT_SCHEMA_VERSION ? CURRENT_SCHEMA_VERSION : null,
    };
  },
});

// Update schema version after migrations
export const updateSchemaVersion = mutation({
  args: {
    organizationId: v.id('organizations'),
    version: v.string(),
  },
  handler: async (ctx, { organizationId, version }) => {
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

    // Validate version exists
    const versionExists = SCHEMA_VERSION_HISTORY.some((v) => v.version === version);
    if (!versionExists) {
      throw new Error(`Unknown schema version: ${version}`);
    }

    // Update organization settings
    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error('Organization not found');

    await ctx.db.patch(organizationId, {
      settings: {
        ...org.settings,
        schemaVersion: version,
      },
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId,
      eventType: 'UPDATE',
      entityType: 'schema_version',
      entityId: organizationId,
      changes: [
        {
          field: 'schemaVersion',
          oldValue: (org.settings as any)?.schemaVersion || 'unknown',
          newValue: version,
          changeType: 'modified' as const,
        },
      ],
      context: {
        action: 'update_schema_version',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        version,
        previousVersion: (org.settings as any)?.schemaVersion,
      },
      timestamp: Date.now(),
      isRollbackable: false,
    });

    return {
      success: true,
      previousVersion: (org.settings as any)?.schemaVersion || 'unknown',
      newVersion: version,
    };
  },
});

// Check schema compatibility before operations
export const checkSchemaCompatibility = query({
  args: {
    organizationId: v.id('organizations'),
    requiredVersion: v.optional(v.string()),
    operation: v.string(),
  },
  handler: async (ctx, { organizationId, requiredVersion, operation }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error('Organization not found');

    const currentVersion = org.settings?.schemaVersion || CURRENT_SCHEMA_VERSION;
    const targetVersion = requiredVersion || CURRENT_SCHEMA_VERSION;

    // Simple version comparison (assumes semantic versioning)
    const parseVersion = (v: string) => {
      const [major, minor, patch] = v.split('.').map(Number);
      return { major, minor, patch };
    };

    const current = parseVersion(currentVersion);
    const target = parseVersion(targetVersion);

    const isCompatible =
      current.major === target.major && // Same major version
      current.minor >= target.minor; // Same or newer minor version

    const recommendations: string[] = [];

    if (!isCompatible) {
      if (current.major < target.major) {
        recommendations.push(
          `Major version upgrade required: ${currentVersion} → ${targetVersion}`
        );
        recommendations.push('This may require data migration');
      } else if (current.minor < target.minor) {
        recommendations.push(
          `Minor version upgrade recommended: ${currentVersion} → ${targetVersion}`
        );
        recommendations.push('New features may not be available');
      }
    }

    return {
      isCompatible,
      currentVersion,
      requiredVersion: targetVersion,
      operation,
      recommendations,
    };
  },
});

// Schema migration planning
export const planSchemaMigration = query({
  args: {
    organizationId: v.id('organizations'),
    targetVersion: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, targetVersion }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error('Organization not found');

    const currentVersion = org.settings?.schemaVersion || '1.0.0';
    const target = targetVersion || CURRENT_SCHEMA_VERSION;

    if (currentVersion === target) {
      return {
        needed: false,
        message: 'Already at target version',
      };
    }

    // Find versions between current and target
    const currentIndex = SCHEMA_VERSION_HISTORY.findIndex((v) => v.version === currentVersion);
    const targetIndex = SCHEMA_VERSION_HISTORY.findIndex((v) => v.version === target);

    if (currentIndex === -1 || targetIndex === -1) {
      throw new Error('Invalid version specified');
    }

    const migrationPath = SCHEMA_VERSION_HISTORY.slice(currentIndex + 1, targetIndex + 1);

    // Check for required migrations
    const requiredMigrations: string[] = [];

    // Add logic here to determine required migrations based on version changes
    // For now, we'll just list the version changes
    migrationPath.forEach((version) => {
      version.changes.forEach((change) => {
        if (change.includes('Added')) {
          requiredMigrations.push(`Migration needed: ${change}`);
        }
      });
    });

    return {
      needed: true,
      currentVersion,
      targetVersion: target,
      migrationPath: migrationPath.map((v) => v.version),
      requiredMigrations,
      estimatedDuration: requiredMigrations.length * 5, // 5 minutes per migration estimate
    };
  },
});
