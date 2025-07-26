import { internal } from "../../_generated/api";
/**
 * Example implementations showing how to integrate caching
 * into existing Convex functions
 */

import { v } from 'convex/values';
import { query, mutation } from '../../_generated/server';
import { 
  withCache, 
  getCachedCategories, 
  getCachedOrganizationSettings,
  getCachedProductCounts,
  createInvalidationHook 
} from './index';
import { getOrganizationId } from '../../lib/organizationUtils';
import { withPerformanceTracking } from '../monitoring';

/**
 * Example: Cached category list query
 */
export const listCategoriesWithCache = query({
  args: {
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Use the pre-built helper
    return getCachedCategories(ctx, organizationId, args.projectId);
  },
});

/**
 * Example: Cached dashboard stats
 */
export const getDashboardStatsWithCache = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Combine multiple cached operations
    const [settings, productCounts, recentActivity] = await Promise.all([
      // Cached organization settings
      getCachedOrganizationSettings(ctx, organizationId),
      
      // Cached product counts
      getCachedProductCounts(ctx, organizationId),
      
      // Cached recent activity with custom TTL
      withCache(
        ctx,
        'dashboardStats',
        ['recentActivity'],
        async () => {
          // Fetch recent activity
          const activities = await ctx.db
            .query('activityLogs')
            .withIndex('by_organization', (q: any) => 
              q.eq('organizationId', organizationId)
            )
            .order('desc')
            .take(10);
          
          return activities;
        },
        { 
          organizationId, 
          ttl: 60 // 1 minute for frequently changing data
        }
      ),
    ]);

    return {
      settings,
      productCounts,
      recentActivity,
      timestamp: Date.now(),
    };
  },
});

/**
 * Example: Cached search with filters
 */
export const searchProductsWithCache = query({
  args: {
    query: v.string(),
    projectId: v.optional(v.id('projects')),
    status: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    return withCache(
      ctx,
      'productSearch',
      [
        'search',
        args.query,
        args.projectId || 'all',
        args.status || 'all',
        args.categoryId || 'all',
        String(args.limit || 50),
      ],
      async () => {
        // Complex search logic with performance tracking
        return withPerformanceTracking(
          ctx,
          'products.search',
          organizationId,
          async () => {
            let query = ctx.db
              .query('products')
              .withIndex('by_organization', (q: any) => 
                q.eq('organizationId', organizationId)
              );

            // Apply filters
            if (args.projectId) {
              query = query.filter((q: any) => 
                q.eq(q.field('projectId'), args.projectId)
              );
            }

            if (args.status) {
              query = query.filter((q: any) => 
                q.eq(q.field('status'), args.status)
              );
            }

            const products = await query.take(args.limit || 50).collect();

            // Filter by search query
            if (args.query) {
              const searchLower = args.query.toLowerCase();
              return products.filter((product) =>
                product.name.toLowerCase().includes(searchLower) ||
                product.sku.toLowerCase().includes(searchLower) ||
                product.description?.toLowerCase().includes(searchLower)
              );
            }

            return products;
          },
          {
            metadata: {
              searchQuery: args.query,
              filters: { projectId: args.projectId, status: args.status },
            },
          }
        );
      },
      { organizationId }
    );
  },
});

/**
 * Example: Mutation with cache invalidation
 */
export const createCategoryWithInvalidation = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Create the category
    const categoryId = await ctx.db.insert('categories', {
      ...args,
      organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Trigger cache invalidation
    await createInvalidationHook('category.created')(ctx, {
      organizationId,
      categoryId,
      projectId: args.projectId,
    });

    // Also invalidate parent category if exists
    if (args.parentId) {
      await createInvalidationHook('category.updated')(ctx, {
        organizationId,
        categoryId: args.parentId,
      });
    }

    return categoryId;
  },
});

/**
 * Example: Bulk operation with batch invalidation
 */
export const bulkUpdateProductsWithInvalidation = mutation({
  args: {
    productIds: v.array(v.id('products')),
    updates: v.object({
      status: v.optional(v.string()),
      categoryId: v.optional(v.id('categories')),
    }),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Perform bulk update
    const updatedProducts = [];
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (product && product.organizationId === organizationId) {
        await ctx.db.patch(productId, {
          ...args.updates,
          updatedAt: Date.now(),
        });
        updatedProducts.push(product);
      }
    }

    // Batch invalidation for all affected cache keys
    const invalidationEvents = [
      {
        event: 'product.updated',
        context: { organizationId },
      },
      {
        event: 'category.updated',
        context: { 
          organizationId, 
          categoryId: args.updates.categoryId,
        },
      },
    ];

    await ctx.scheduler.runAfter(
      0,
      internal.cache.invalidation.handleBatchInvalidation,
      { events: invalidationEvents }
    );

    return {
      updated: updatedProducts.length,
      productIds: updatedProducts.map((p) => p._id),
    };
  },
});

/**
 * Example: Cache warming on startup
 */
export const warmCriticalCaches = mutation({
  args: {},
  handler: async (ctx) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Warm critical caches
    const warmingTasks = [
      // Categories are accessed frequently
      getCachedCategories(ctx, organizationId),
      
      // Organization settings
      getCachedOrganizationSettings(ctx, organizationId),
      
      // Product counts for dashboard
      getCachedProductCounts(ctx, organizationId),
    ];

    await Promise.all(warmingTasks);

    return {
      warmed: warmingTasks.length,
      timestamp: Date.now(),
    };
  },
});