import { MutationCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';
import { isValidSlug, getSlugValidationError } from '../../../lib/slugValidation';

// Handler for create organization
export async function createOrganizationHandler(
  ctx: MutationCtx,
  { name, slug }: { name: string; slug: string }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  // Validate slug format
  if (!isValidSlug(slug)) {
    const error = getSlugValidationError(slug);
    throw new Error(error || 'Invalid organization slug');
  }

  // Get the user record
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    throw new Error('User not found');
  }
  const now = Date.now();

  // Check if slug is unique
  const existingOrg = await ctx.db
    .query('organizations')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  if (existingOrg) {
    throw new Error('Organization slug already exists');
  }

  // Create organization with default settings
  const organizationId = await ctx.db.insert('organizations', {
    name,
    slug,
    status: 'trial',
    subscription: {
      plan: 'trial',
      status: 'active',
      trialEnds: now + 14 * 24 * 60 * 60 * 1000, // 14 days trial
      seats: 5,
      features: ['basic_products', 'basic_categories', 'ai_categorization'],
    },
    settings: {
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      apiKeys: {
        openai: undefined,
        anthropic: undefined,
        gemini: undefined,
      },
      categorization: {
        batchSize: 10,
        prompt:
          'Categorize this product based on its title and description. Consider the product type, intended use, and target audience.',
        autoApprove: false,
        confidenceThreshold: 0.8,
      },
      storage: {
        maxFileSize: 10485760, // 10MB
        totalStorageLimit: 1073741824, // 1GB
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
      },
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  // Create owner membership for creator
  await ctx.db.insert('organizationMemberships', {
    organizationId,
    userId: user._id,
    role: 'owner',
    permissions: ['*'], // All permissions
    status: 'active',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return organizationId;
}

// Handler for updateOrganization
export async function updateOrganizationHandler(
  ctx: MutationCtx,
  {
    organizationId,
    name,
    slug,
  }: {
    organizationId: Id<'organizations'>;
    name?: string;
    slug?: string;
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  // Get the user record
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user has permission to update organization
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('Unauthorized: Only owners and admins can update organization settings');
  }

  const org = await ctx.db.get(organizationId);
  if (!org) throw new Error('Organization not found');

  const updates: any = {
    updatedAt: Date.now(),
  };

  // Update name if provided
  if (name !== undefined) {
    updates.name = name;
  }

  // Update slug if provided
  if (slug !== undefined) {
    const newSlug = slug;
    // Validate slug format
    if (!isValidSlug(newSlug)) {
      const error = getSlugValidationError(newSlug);
      throw new Error(error || 'Invalid organization slug');
    }

    // Check if slug is unique (excluding current org)
    const existingOrg = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', newSlug))
      .filter((q) => q.neq(q.field('_id'), organizationId))
      .unique();

    if (existingOrg) {
      throw new Error('Organization slug already exists');
    }

    updates.slug = newSlug;
  }

  await ctx.db.patch(organizationId, updates);

  // Create audit log
  const changes = [];
  if (name !== undefined && name !== org.name) {
    changes.push({
      field: 'name',
      oldValue: org.name,
      newValue: name,
      changeType: 'modified' as const,
    });
  }
  if (slug !== undefined && slug !== org.slug) {
    changes.push({
      field: 'slug',
      oldValue: org.slug,
      newValue: slug,
      changeType: 'modified' as const,
    });
  }

  if (changes.length > 0) {
    await ctx.db.insert('auditLogs', {
      organizationId,
      eventType: 'UPDATE',
      entityType: 'organizations',
      entityId: organizationId,
      changes,
      context: {
        action: 'update_organization',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: identity.email || '',
      },
      metadata: {},
      timestamp: Date.now(),
      isRollbackable: true,
    });
  }

  return { success: true };
}

// Helper function to deep merge settings
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Handler for updateOrganizationSettings
export async function updateOrganizationSettingsHandler(
  ctx: MutationCtx,
  {
    organizationId,
    settings,
    updatedBy,
  }: {
    organizationId: Id<'organizations'>;
    settings: any;
    updatedBy: Id<'users'>;
  }
) {
  const org = await ctx.db.get(organizationId);
  if (!org) throw new Error('Organization not found');

  const mergedSettings = deepMerge(org.settings, settings);
  
  await ctx.db.patch(organizationId, {
    settings: mergedSettings,
    updatedAt: Date.now(),
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId,
    eventType: 'UPDATE',
    entityType: 'organizations',
    entityId: organizationId,
    changes: [
      {
        field: 'settings',
        oldValue: org.settings,
        newValue: mergedSettings,
        changeType: 'modified',
      },
    ],
    context: {
      action: 'update_organization_settings',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: updatedBy,
      userEmail: '', // Will be filled by the client
    },
    metadata: {},
    timestamp: Date.now(),
    isRollbackable: true,
  });
}