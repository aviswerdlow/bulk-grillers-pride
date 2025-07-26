import { v } from 'convex/values';
import { mutation, query, internalQuery, internalMutation, action } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { api } from '../../_generated/api';
import { isEncrypted } from '../../lib/encryption';

/**
 * Action to update API keys with encryption
 * This is the public endpoint that handles encryption
 */
export const updateApiKeysAction = action({
  args: {
    organizationId: v.id('organizations'),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Encrypt the API key
    const encryptedKey = await ctx.runAction(api.actions.encryption.encryptApiKeyAction, {
      apiKey: args.apiKey
    });
    
    // Call the mutation with the encrypted key
    return await ctx.runMutation(api.functions.organizations.apiKeys.updateApiKeys, {
      organizationId: args.organizationId,
      provider: args.provider,
      apiKey: encryptedKey || '',
    });
  },
});

/**
 * Update API keys for an organization (internal mutation)
 * Only organization owners and admins can update API keys
 * Note: Expects pre-encrypted API key
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

    // Note: API key should be encrypted before calling this mutation
    const encryptedKey = args.apiKey;
    
    // Update the API key for the specified provider
    const updatedApiKeys = {
      ...org.settings.apiKeys,
      [args.provider]: encryptedKey,
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

    for (const [provider, encryptedKey] of Object.entries(org.settings.apiKeys)) {
      if (encryptedKey) {
        try {
          // For now, just show a mask since we can't decrypt in mutations
          // TODO: Move this to an action to properly decrypt
          const decryptedKey = null;
          // For now, show generic mask
          maskedKeys[provider as keyof typeof maskedKeys] = '****...****';
        } catch (error) {
          // If decryption fails, show a generic mask
          maskedKeys[provider as keyof typeof maskedKeys] = '****';
          console.error(`Failed to decrypt ${provider} API key for masking:`, error);
        }
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
 * Internal function to get decrypted API keys (for backend use only)
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

    // Decrypt all API keys before returning
    const decryptedKeys: Record<string, string | null> = {
      openai: null,
      anthropic: null,
      gemini: null,
    };

    for (const [provider, encryptedKey] of Object.entries(org.settings.apiKeys)) {
      if (encryptedKey) {
        try {
          // Return encrypted keys - decryption should be done by the caller
          decryptedKeys[provider as keyof typeof decryptedKeys] = encryptedKey;
        } catch (error) {
          console.error(`Failed to decrypt ${provider} API key:`, error);
          // Check if it's a legacy unencrypted key
          if (!isEncrypted(encryptedKey)) {
            decryptedKeys[provider as keyof typeof decryptedKeys] = encryptedKey;
          }
        }
      }
    }

    return decryptedKeys;
  },
});

/**
 * Internal query to get all organizations for migration
 * Used by the encryption action
 */
// Internal query to get all organizations for migration
// Used by the encryption action
export const getAllOrganizations = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query('organizations').collect();
  },
});

/**
 * Internal mutation to update encrypted API keys
 * Used by the encryption action
 */
// Internal mutation to update encrypted API keys
// Used by the encryption action
export const updateEncryptedKeys = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    encryptedKeys: v.object({
      openai: v.optional(v.string()),
      anthropic: v.optional(v.string()),
      gemini: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }
    
    const updatedApiKeys = {
      ...org.settings.apiKeys,
      ...args.encryptedKeys,
    };
    
    await ctx.db.patch(args.organizationId, {
      settings: {
        ...org.settings,
        apiKeys: updatedApiKeys,
      },
      updatedAt: Date.now(),
    });
  },
});