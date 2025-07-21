/**
 * Cache invalidation rules and event handlers
 * Automatically invalidates cache entries based on mutation events
 */

import { v } from 'convex/values';
import { internalMutation } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { CACHE_CONFIG } from './config';
import { invalidate } from './service';

/**
 * Invalidation rule structure
 */
export interface InvalidationRule {
  event: string;
  patterns: string[];
  interpolate?: (context: any) => string[];
}

/**
 * Cache invalidation rules mapping events to cache patterns
 */
export const INVALIDATION_RULES: InvalidationRule[] = [
  // Category-related invalidations
  {
    event: 'category.created',
    patterns: ['org:${organizationId}:categories:*', 'org:${organizationId}:stats:categoryTree:*'],
  },
  {
    event: 'category.updated',
    patterns: [
      'org:${organizationId}:categories:*',
      'org:${organizationId}:stats:categoryTree:*',
      'org:${organizationId}:search:categoryFilter:*',
    ],
  },
  {
    event: 'category.deleted',
    patterns: [
      'org:${organizationId}:categories:*',
      'org:${organizationId}:stats:categoryTree:*',
      'org:${organizationId}:products:count:*',
    ],
  },
  
  // Product-related invalidations
  {
    event: 'product.created',
    patterns: [
      'org:${organizationId}:products:count:*',
      'org:${organizationId}:stats:dashboard:*',
      'org:${organizationId}:search:products:*',
    ],
  },
  {
    event: 'product.updated',
    patterns: [
      'org:${organizationId}:search:products:*',
      'org:${organizationId}:project:${projectId}:search:*',
    ],
  },
  {
    event: 'product.deleted',
    patterns: [
      'org:${organizationId}:products:count:*',
      'org:${organizationId}:stats:*',
      'org:${organizationId}:search:*',
      'org:${organizationId}:trash:stats:*',
    ],
  },
  {
    event: 'product.restored',
    patterns: [
      'org:${organizationId}:products:count:*',
      'org:${organizationId}:stats:*',
      'org:${organizationId}:trash:*',
    ],
  },
  
  // Organization settings invalidations
  {
    event: 'settings.updated',
    patterns: ['org:${organizationId}:settings:*', 'org:${organizationId}:ai:config:*'],
  },
  
  // User/permission invalidations
  {
    event: 'membership.created',
    patterns: ['user:${userId}:org:${organizationId}:permissions:*'],
  },
  {
    event: 'membership.updated',
    patterns: [
      'user:${userId}:org:${organizationId}:permissions:*',
      'user:${userId}:preferences:*',
    ],
  },
  {
    event: 'membership.deleted',
    patterns: ['user:${userId}:org:${organizationId}:*'],
  },
  
  // AI-related invalidations
  {
    event: 'ai.job.completed',
    patterns: ['org:${organizationId}:ai:suggestions:*'],
  },
  {
    event: 'ai.provider.changed',
    patterns: ['org:${organizationId}:ai:*'],
  },
  
  // Trash/deletion invalidations
  {
    event: 'trash.cleaned',
    patterns: ['org:${organizationId}:trash:*', 'org:${organizationId}:stats:deletion:*'],
  },
];

/**
 * Handle cache invalidation for a specific event
 */
export const handleInvalidation = internalMutation({
  args: {
    event: v.string(),
    context: v.object({
      organizationId: v.optional(v.id('organizations')),
      projectId: v.optional(v.id('projects')),
      userId: v.optional(v.id('users')),
      categoryId: v.optional(v.id('categories')),
      productId: v.optional(v.id('products')),
    }),
  },
  handler: async (ctx, args) => {
    const { event, context } = args;
    
    // Find all rules for this event
    const rules = INVALIDATION_RULES.filter((rule) => rule.event === event);
    
    if (rules.length === 0) {
      console.log(`No invalidation rules found for event: ${event}`);
      return { invalidated: 0 };
    }
    
    let totalInvalidated = 0;
    
    for (const rule of rules) {
      // Interpolate patterns with context
      const patterns = rule.patterns.map((pattern) =>
        interpolatePattern(pattern, context)
      );
      
      // Invalidate each pattern
      for (const pattern of patterns) {
        try {
          const invalidated = await invalidate(ctx, { pattern });
          totalInvalidated += invalidated;
          
          console.log(`Invalidated ${invalidated} entries for pattern: ${pattern}`);
        } catch (error) {
          console.error(`Failed to invalidate pattern ${pattern}:`, error);
        }
      }
    }
    
    // Log invalidation metrics
    if (context.organizationId) {
      await ctx.scheduler.runAfter(0, internal.monitoring.performance.logMetric, {
        organizationId: context.organizationId,
        operation: 'cache.invalidation',
        startTime: Date.now(),
        duration: 0,
        success: true,
        itemCount: totalInvalidated,
        metadata: { event, patterns: rules.flatMap((r) => r.patterns) },
      });
    }
    
    return { invalidated: totalInvalidated };
  },
});

/**
 * Batch invalidation for multiple events
 */
export const handleBatchInvalidation = internalMutation({
  args: {
    events: v.array(
      v.object({
        event: v.string(),
        context: v.object({
          organizationId: v.optional(v.id('organizations')),
          projectId: v.optional(v.id('projects')),
          userId: v.optional(v.id('users')),
          categoryId: v.optional(v.id('categories')),
          productId: v.optional(v.id('products')),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    let totalInvalidated = 0;
    
    for (const eventData of args.events) {
      const result = await handleInvalidation(ctx, eventData);
      totalInvalidated += result.invalidated;
    }
    
    return { totalInvalidated };
  },
});

/**
 * Invalidate all caches for an organization
 */
export const invalidateOrganizationCache = internalMutation({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const pattern = `org:${args.organizationId}:*`;
    const invalidated = await invalidate(ctx, { pattern });
    
    console.log(`Invalidated ${invalidated} cache entries for organization ${args.organizationId}`);
    
    return { invalidated };
  },
});

/**
 * Invalidate all caches for a user
 */
export const invalidateUserCache = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const pattern = `user:${args.userId}:*`;
    const invalidated = await invalidate(ctx, { pattern });
    
    console.log(`Invalidated ${invalidated} cache entries for user ${args.userId}`);
    
    return { invalidated };
  },
});

/**
 * Smart invalidation based on data dependencies
 */
export const smartInvalidate = internalMutation({
  args: {
    dataType: v.string(),
    id: v.string(),
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const { dataType, id, organizationId } = args;
    
    // Define dependency graphs
    const dependencies: Record<string, string[]> = {
      category: [
        'categories:*',
        'categoryTree:*',
        'products:count:*',
        'search:categoryFilter:*',
      ],
      product: [
        'products:count:*',
        'search:products:*',
        'stats:dashboard:*',
      ],
      organization: ['*'], // Invalidate everything for org changes
      user: ['permissions:*', 'preferences:*'],
    };
    
    const patterns = dependencies[dataType] || [`${dataType}:*`];
    const fullPatterns = patterns.map((p) => `org:${organizationId}:${p}`);
    
    let totalInvalidated = 0;
    for (const pattern of fullPatterns) {
      const invalidated = await invalidate(ctx, { pattern });
      totalInvalidated += invalidated;
    }
    
    return { invalidated: totalInvalidated };
  },
});

/**
 * Helper function to interpolate pattern with context values
 */
function interpolatePattern(pattern: string, context: any): string {
  return pattern.replace(/\$\{(\w+)\}/g, (match, key) => {
    return context[key] || match;
  });
}

/**
 * Register cache invalidation hooks
 * This would be called from mutation functions to trigger invalidations
 */
export function createInvalidationHook(event: string) {
  return async (ctx: any, context: any) => {
    try {
      await ctx.scheduler.runAfter(0, internal.cache.invalidation.handleInvalidation, {
        event,
        context,
      });
    } catch (error) {
      console.error(`Failed to schedule cache invalidation for ${event}:`, error);
    }
  };
}