import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

/**
 * Update API keys for an organization
 * Only organization owners and admins can update API keys
 */
export const updateApiKeys = mutation({
  args: {
    organizationId: v.id('organizations'),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user from Clerk ID
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has permission (owner or admin)
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .unique();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new Error('You must be an owner or admin to update API keys');
    }

    // Get the organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Update the API key for the specified provider
    const updatedApiKeys = {
      ...org.settings.apiKeys,
      [args.provider]: args.apiKey,
    };

    await ctx.db.patch(args.organizationId, {
      settings: {
        ...org.settings,
        apiKeys: updatedApiKeys,
      },
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      eventType: 'UPDATE',
      entityType: 'organization',
      entityId: args.organizationId,
      organizationId: args.organizationId,
      timestamp: Date.now(),
      metadata: {
        provider: args.provider,
        // Don't log the actual API key for security
        keyUpdated: true,
      },
      changes: [
        {
          field: `apiKeys.${args.provider}`,
          // Don't log the actual values for security
          oldValue: org.settings.apiKeys[args.provider] ? '[REDACTED]' : null,
          newValue: '[REDACTED]',
          changeType: org.settings.apiKeys[args.provider] ? 'modified' : 'added',
        },
      ],
      context: {
        action: 'update_api_key',
        source: 'web' as const,
        userAgent: undefined,
        ipAddress: undefined,
        sessionId: undefined,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: identity.email || '',
      },
      isRollbackable: false,
    });

    return {
      success: true,
      message: `${args.provider} API key updated successfully`,
    };
  },
});

/**
 * Remove an API key for a specific provider
 */
export const removeApiKey = mutation({
  args: {
    organizationId: v.id('organizations'),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user from Clerk ID
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has permission (owner or admin)
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .unique();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new Error('You must be an owner or admin to remove API keys');
    }

    // Get the organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Remove the API key for the specified provider
    const updatedApiKeys = {
      ...org.settings.apiKeys,
      [args.provider]: undefined,
    };

    await ctx.db.patch(args.organizationId, {
      settings: {
        ...org.settings,
        apiKeys: updatedApiKeys,
      },
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      eventType: 'DELETE',
      entityType: 'organization',
      entityId: args.organizationId,
      organizationId: args.organizationId,
      timestamp: Date.now(),
      metadata: {
        provider: args.provider,
      },
      changes: [
        {
          field: `apiKeys.${args.provider}`,
          oldValue: '[REDACTED]',
          newValue: null,
          changeType: 'removed',
        },
      ],
      context: {
        action: 'remove_api_key',
        source: 'web' as const,
        userAgent: undefined,
        ipAddress: undefined,
        sessionId: undefined,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: identity.email || '',
      },
      isRollbackable: false,
    });

    return {
      success: true,
      message: `${args.provider} API key removed successfully`,
    };
  },
});

/**
 * Get masked API keys for display
 * Shows only the last 4 characters of each key
 */
export const getMaskedApiKeys = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user from Clerk ID
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has permission (any member can view masked keys)
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .unique();

    if (!membership) {
      throw new Error('You must be a member of this organization');
    }

    // Get the organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Mask the API keys
    const maskedKeys: Record<string, string | null> = {
      openai: null,
      anthropic: null,
      gemini: null,
    };

    for (const [provider, key] of Object.entries(org.settings.apiKeys)) {
      if (key && key.length > 4) {
        // Show only the last 4 characters
        maskedKeys[provider as keyof typeof maskedKeys] = `${'*'.repeat(
          key.length - 4
        )}${key.slice(-4)}`;
      } else if (key) {
        // If key is too short, mask it entirely
        maskedKeys[provider as keyof typeof maskedKeys] = '****';
      }
    }

    return {
      apiKeys: maskedKeys,
      canEdit: membership.role === 'owner' || membership.role === 'admin',
    };
  },
});

/**
 * Validate if API keys are configured for a specific provider
 */
export const hasApiKey = query({
  args: {
    organizationId: v.id('organizations'),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user from Clerk ID
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has permission
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .unique();

    if (!membership) {
      throw new Error('You must be a member of this organization');
    }

    // Get the organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const apiKey = org.settings.apiKeys[args.provider];
    return {
      hasKey: !!apiKey && apiKey.length > 0,
      provider: args.provider,
    };
  },
});

/**
 * Internal function to get API keys (for backend use only)
 * Should only be called from server-side functions
 */
export const getApiKeys = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    // This should only be called from server-side functions
    // Not exposed to client
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    return org.settings.apiKeys;
  },
});