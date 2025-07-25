import { v } from 'convex/values';
import { query } from '../../_generated/server';
import { getRateLimitStatus } from '../../lib/rateLimit';

// Get rate limit status for the current user
export const getUserRateLimitStatus = query({
  args: {
    organizationId: v.id('organizations'),
    resource: v.string(),
  },
  handler: async (ctx, { organizationId, resource }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    
    if (!user) throw new Error('User not found');
    
    // Verify user has access to organization
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();
    
    if (!membership) throw new Error('Access denied');
    
    // Get rate limit status
    const status = await getRateLimitStatus(
      ctx,
      organizationId,
      user._id,
      resource as any
    );
    
    // Get recent violations for this user and resource
    const dayAgo = Date.now() - 86400000;
    const recentViolations = await ctx.db
      .query('rateLimitViolations')
      .withIndex('by_identifier_time', (q) =>
        q.eq('identifier', user._id).gte('timestamp', dayAgo)
      )
      .filter((q) => q.eq(q.field('resource'), resource))
      .order('desc')
      .take(10);
    
    return {
      ...status,
      violations: {
        count24h: recentViolations.length,
        recent: recentViolations.map(v => ({
          timestamp: v.timestamp,
          severity: v.severity,
          requestCount: v.requestCount,
          limit: v.limit,
        })),
      },
    };
  },
});

// Get organization-wide rate limit summary
export const getOrganizationRateLimitSummary = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, { organizationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    // Verify user has admin access
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
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Admin access required');
    }
    
    // Get organization
    const organization = await ctx.db.get(organizationId);
    if (!organization) throw new Error('Organization not found');
    
    const plan = organization.subscription.plan || 'free';
    
    // Get all rate limit configurations for this plan
    const configs = await ctx.db
      .query('rateLimitConfigurations')
      .filter((q) => q.eq(q.field('plan'), plan))
      .collect();
    
    // Get current usage across all resources
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    
    const summary: Record<string, any> = {};
    
    for (const config of configs) {
      // Get all rate limit records for this resource in the last hour
      const hourlyUsage = await ctx.db
        .query('rateLimits')
        .withIndex('by_organization_resource', (q) =>
          q.eq('organizationId', organizationId).eq('resource', config.resource)
        )
        .filter((q) => q.gte(q.field('windowStart'), hourAgo))
        .collect();
      
      // Get violations in the last 24 hours
      const violations = await ctx.db
        .query('rateLimitViolations')
        .withIndex('by_organization_time', (q) =>
          q.eq('organizationId', organizationId).gte('timestamp', dayAgo)
        )
        .filter((q) => q.eq(q.field('resource'), config.resource))
        .collect();
      
      // Calculate usage percentages
      const totalRequests = hourlyUsage.reduce((sum, u) => sum + u.requestCount, 0);
      const totalTokens = hourlyUsage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0);
      
      summary[config.resource] = {
        limits: {
          requestsPerHour: config.requestsPerHour || 0,
          requestsPerDay: config.requestsPerDay || 0,
          tokensPerDay: config.tokensPerDay || 0,
        },
        usage: {
          requestsLastHour: totalRequests,
          tokensToday: totalTokens,
          percentageUsed: config.requestsPerHour 
            ? Math.round((totalRequests / config.requestsPerHour) * 100)
            : 0,
        },
        violations: {
          count24h: violations.length,
          severityBreakdown: {
            low: violations.filter(v => v.severity === 'low').length,
            medium: violations.filter(v => v.severity === 'medium').length,
            high: violations.filter(v => v.severity === 'high').length,
            critical: violations.filter(v => v.severity === 'critical').length,
          },
        },
        status: violations.some(v => v.severity === 'critical') 
          ? 'critical'
          : violations.length > 5
          ? 'warning'
          : 'healthy',
      };
    }
    
    return {
      plan,
      resources: summary,
      overallStatus: Object.values(summary).some((s: any) => s.status === 'critical')
        ? 'critical'
        : Object.values(summary).some((s: any) => s.status === 'warning')
        ? 'warning'
        : 'healthy',
    };
  },
});