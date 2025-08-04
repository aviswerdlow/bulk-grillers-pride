import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { auditFields, entityStatusSchema, timestampFields } from './common';

/**
 * Organization and user management tables
 */

export const organizationTables = {
  // Organizations table
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    domain: v.optional(v.string()),
    status: entityStatusSchema, // 'active' | 'suspended' | 'trial'
    subscription: v.object({
      plan: v.string(),
      status: v.string(),
      trialEnds: v.optional(v.number()),
      seats: v.number(),
      features: v.array(v.string()),
    }),
    settings: v.object({
      // AI Configuration
      aiProvider: v.string(), // 'openai' | 'anthropic' | 'gemini'
      aiModel: v.string(),
      apiKeys: v.object({
        openai: v.optional(v.string()),
        anthropic: v.optional(v.string()),
        gemini: v.optional(v.string()),
      }),
      // Categorization Settings
      categorization: v.object({
        batchSize: v.number(),
        prompt: v.string(),
        autoApprove: v.boolean(),
        confidenceThreshold: v.number(),
      }),
      // File Upload Limits
      storage: v.object({
        maxFileSize: v.number(),
        totalStorageLimit: v.number(),
        allowedFileTypes: v.array(v.string()),
      }),
      schemaVersion: v.optional(v.string()),
    }),
    ...auditFields,
  })
    .index('by_slug', ['slug'])
    .index('by_domain', ['domain']),

  // Users table
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    avatar: v.optional(v.string()),
    status: v.string(), // 'active' | 'invited' | 'suspended'
    lastLogin: v.optional(v.number()),
    ...timestampFields,
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  // Organization memberships
  organizationMemberships: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    userId: v.string(), // Will be validated as user ID
    role: v.string(), // 'owner' | 'admin' | 'editor' | 'viewer'
    permissions: v.array(v.string()),
    invitedBy: v.optional(v.string()),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    status: v.string(), // 'active' | 'pending' | 'revoked'
    ...timestampFields,
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_organization_user', ['organizationId', 'userId']),

  // Projects
  projects: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    name: v.string(),
    description: v.optional(v.string()),
    slug: v.string(),
    status: v.string(), // 'active' | 'archived' | 'draft'
    settings: v.object({
      defaultCurrency: v.string(),
      defaultTaxRate: v.optional(v.number()),
      importSettings: v.object({
        autoValidate: v.boolean(),
        duplicateHandling: v.string(), // 'skip' | 'update' | 'create'
        requiredFields: v.array(v.string()),
      }),
    }),
    createdBy: v.string(), // Will be validated as user ID
    ...auditFields,
  })
    .index('by_organization', ['organizationId'])
    .index('by_organization_slug', ['organizationId', 'slug']),

  // Accessibility preferences
  accessibilityPreferences: defineTable({
    userId: v.string(), // Will be validated as user ID
    preferences: v.object({
      reducedMotion: v.boolean(),
      highContrast: v.boolean(),
      screenReaderActive: v.boolean(),
      keyboardNavigation: v.boolean(),
      preferredConfirmationMethod: v.string(),
      focusIndicatorStyle: v.string(),
      announcementVerbosity: v.string(),
    }),
    ...timestampFields,
  })
    .index('by_user', ['userId']),

  // API Keys
  apiKeys: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    scopes: v.array(v.string()),
    allowedResources: v.array(v.string()),
    rateLimitOverrides: v.optional(v.object({
      requestsPerMinute: v.optional(v.number()),
      requestsPerHour: v.optional(v.number()),
      requestsPerDay: v.optional(v.number()),
      tokensPerDay: v.optional(v.number()),
    })),
    lastUsedAt: v.optional(v.number()),
    usageCount: v.number(),
    status: v.string(), // 'active' | 'revoked' | 'expired'
    expiresAt: v.optional(v.number()),
    createdBy: v.string(), // Will be validated as user ID
    createdAt: v.number(),
    revokedBy: v.optional(v.string()),
    revokedAt: v.optional(v.number()),
    revokeReason: v.optional(v.string()),
  })
    .index('by_organization', ['organizationId', 'status'])
    .index('by_key_prefix', ['keyPrefix'])
    .index('by_status', ['status'])
    .index('by_expires', ['expiresAt', 'status']),
};