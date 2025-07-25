import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { RATE_LIMIT_RESOURCES, DEFAULT_RATE_LIMITS } from '../../lib/rateLimit';
import { requireRole } from '../../lib/auth';

// Initialize default rate limit configurations
export const initializeRateLimitConfigs = mutation({
  args: {},
  handler: async (ctx) => {
    // Only allow system admins to run this
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    // This should be restricted to system admins only
    // For now, we'll check if configurations already exist
    const existingConfigs = await ctx.db.query('rateLimitConfigurations').collect();
    if (existingConfigs.length > 0) {
      throw new Error('Rate limit configurations already initialized');
    }
    
    const now = Date.now();
    const configs = [];
    
    // Create configurations for each plan and resource
    for (const [plan, resources] of Object.entries(DEFAULT_RATE_LIMITS)) {
      for (const [resource, limits] of Object.entries(resources)) {
        const config = await ctx.db.insert('rateLimitConfigurations', {
          resource,
          plan,
          requestsPerMinute: limits.requestsPerMinute,
          requestsPerHour: limits.requestsPerHour,
          requestsPerDay: limits.requestsPerDay,
          tokensPerMinute: limits.tokensPerMinute,
          tokensPerHour: limits.tokensPerHour,
          tokensPerDay: limits.tokensPerDay,
          burstMultiplier: 2, // Allow 2x burst
          burstDuration: 60, // 60 seconds burst window
          costPerRequest: resource.includes('ai') ? 5 : 0, // 5 cents per AI request
          maxCostPerDay: plan === 'free' ? 500 : plan === 'starter' ? 2000 : plan === 'professional' ? 10000 : 50000, // In cents
          retryAfter: 60, // 60 seconds
          errorMessage: `Rate limit exceeded for ${resource}. Please upgrade your plan or wait before trying again.`,
          isEnabled: true,
          allowOverride: plan !== 'free', // Only free plan cannot override
          createdAt: now,
          updatedAt: now,
          updatedBy: identity.subject as any, // This would be a system user ID
        });
        configs.push(config);
      }
    }
    
    return { 
      message: `Initialized ${configs.length} rate limit configurations`,
      configurations: configs.length 
    };
  },
});

// Get rate limit configuration for an organization
export const getOrganizationRateLimits = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, { organizationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    // Get organization to determine plan
    const organization = await ctx.db.get(organizationId);
    if (!organization) throw new Error('Organization not found');
    
    // Verify user has access to this organization
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    
    if (!user) throw new Error('User not found');
    
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();
    
    if (!membership) throw new Error('Access denied');
    
    const plan = organization.subscription.plan || 'free';
    
    // Get all rate limit configurations for this plan
    const configs = await ctx.db
      .query('rateLimitConfigurations')
      .filter((q) => q.eq(q.field('plan'), plan))
      .collect();
    
    // Get current usage for each resource
    const now = Date.now();
    const usage: Record<string, any> = {};
    
    for (const config of configs) {
      // Get minute window usage
      const minuteWindowStart = Math.floor(now / 60000) * 60000;
      const minuteUsage = await ctx.db
        .query('rateLimits')
        .withIndex('by_organization_resource', (q) =>
          q.eq('organizationId', organizationId).eq('resource', config.resource)
        )
        .filter((q) => q.eq(q.field('windowStart'), minuteWindowStart))
        .first();
      
      // Get hour window usage
      const hourWindowStart = Math.floor(now / 3600000) * 3600000;
      const hourUsage = await ctx.db
        .query('rateLimits')
        .withIndex('by_organization_resource', (q) =>
          q.eq('organizationId', organizationId).eq('resource', config.resource)
        )
        .filter((q) => q.gte(q.field('windowStart'), hourWindowStart))
        .collect();
      
      // Get day window usage
      const dayWindowStart = Math.floor(now / 86400000) * 86400000;
      const dayUsage = await ctx.db
        .query('rateLimits')
        .withIndex('by_organization_resource', (q) =>
          q.eq('organizationId', organizationId).eq('resource', config.resource)
        )
        .filter((q) => q.gte(q.field('windowStart'), dayWindowStart))
        .collect();
      
      usage[config.resource] = {
        limits: {
          requestsPerMinute: config.requestsPerMinute || 0,
          requestsPerHour: config.requestsPerHour || 0,
          requestsPerDay: config.requestsPerDay || 0,
          tokensPerDay: config.tokensPerDay || 0,
        },
        current: {
          requestsThisMinute: minuteUsage?.requestCount || 0,
          requestsThisHour: hourUsage.reduce((sum, u) => sum + u.requestCount, 0),
          requestsToday: dayUsage.reduce((sum, u) => sum + u.requestCount, 0),
          tokensToday: dayUsage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0),
        },
        resetTimes: {
          minute: minuteWindowStart + 60000,
          hour: hourWindowStart + 3600000,
          day: dayWindowStart + 86400000,
        },
        isBlocked: minuteUsage?.isBlocked || false,
        blockedUntil: minuteUsage?.blockedUntil,
      };
    }
    
    return {
      plan,
      resources: usage,
      violations24h: await getRecentViolations(ctx.db, organizationId),
    };
  },
});

// Update rate limit configuration (admin only)
export const updateRateLimitConfig = mutation({
  args: {
    organizationId: v.id('organizations'),
    resource: v.string(),
    plan: v.string(),
    updates: v.object({
      requestsPerMinute: v.optional(v.number()),
      requestsPerHour: v.optional(v.number()),
      requestsPerDay: v.optional(v.number()),
      tokensPerMinute: v.optional(v.number()),
      tokensPerHour: v.optional(v.number()),
      tokensPerDay: v.optional(v.number()),
      burstMultiplier: v.optional(v.number()),
      burstDuration: v.optional(v.number()),
      costPerRequest: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      retryAfter: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      isEnabled: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireRole(ctx, args.organizationId, ['owner', 'admin']);
    
    // Find the configuration
    const config = await ctx.db
      .query('rateLimitConfigurations')
      .withIndex('by_resource_plan', (q) =>
        q.eq('resource', args.resource).eq('plan', args.plan)
      )
      .first();
    
    if (!config) {
      throw new Error('Rate limit configuration not found');
    }
    
    if (!config.allowOverride && args.plan === 'free') {
      throw new Error('Free plan rate limits cannot be modified');
    }
    
    const identity = await ctx.auth.getUserIdentity();
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity!.subject))
      .unique();
    
    // Update the configuration
    await ctx.db.patch(config._id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: user!._id,
    });
    
    return { success: true };
  },
});

// Get rate limit violations for an organization
export const getRateLimitViolations = query({
  args: {
    organizationId: v.id('organizations'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, limit = 100 }) => {
    await requireRole(ctx, organizationId, ['owner', 'admin']);
    
    const violations = await ctx.db
      .query('rateLimitViolations')
      .withIndex('by_organization_time', (q) =>
        q.eq('organizationId', organizationId)
      )
      .order('desc')
      .take(limit);
    
    // Enhance violations with user information
    const enhancedViolations = await Promise.all(
      violations.map(async (violation) => {
        const user = violation.userId ? await ctx.db.get(violation.userId) : null;
        return {
          ...violation,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
        };
      })
    );
    
    return enhancedViolations;
  },
});

// Helper function to get recent violations
async function getRecentViolations(db: any, organizationId: string) {
  const dayAgo = Date.now() - 86400000;
  const violations = await db
    .query('rateLimitViolations')
    .withIndex('by_organization_time', (q) =>
      q.eq('organizationId', organizationId).gte('timestamp', dayAgo)
    )
    .collect();
  
  return {
    total: violations.length,
    bySeverity: {
      low: violations.filter((v: any) => v.severity === 'low').length,
      medium: violations.filter((v: any) => v.severity === 'medium').length,
      high: violations.filter((v: any) => v.severity === 'high').length,
      critical: violations.filter((v: any) => v.severity === 'critical').length,
    },
    byResource: violations.reduce((acc: any, v: any) => {
      acc[v.resource] = (acc[v.resource] || 0) + 1;
      return acc;
    }, {}),
  };
}