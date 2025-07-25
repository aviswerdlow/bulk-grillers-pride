/**
 * Multi-Layer Caching Module
 * 
 * Implements a comprehensive caching strategy to reduce database load
 * and improve response times across the application.
 * 
 * Features:
 * - Cache-aside pattern implementation
 * - Automatic TTL management
 * - Event-driven cache invalidation
 * - Performance monitoring integration
 * - Cache warming capabilities
 * 
 * Based on ADR-003-caching-strategy.md
 */

// Configuration
export {
  CACHE_CONFIG,
  CACHE_KEY_PREFIXES,
  CACHE_WARMING_CONFIG,
  BROWSER_CACHE_CONFIG,
  generateCacheKey,
  type CacheConfig,
} from './config';

// Core cache service
export {
  get,
  set,
  del,
  invalidate,
  getStats,
  warm,
  deleteExpired,
  type CacheEntry,
} from './service';

// Cache patterns
export {
  withCache,
  withBatchCache,
  invalidateCache,
  getCachedCategories,
  getCachedOrganizationSettings,
  getCachedProductCounts,
  getCachedSearchResults,
  type CacheOptions,
} from './patterns';

// Cache invalidation
export {
  handleInvalidation,
  handleBatchInvalidation,
  invalidateOrganizationCache,
  invalidateUserCache,
  smartInvalidate,
  createInvalidationHook,
  INVALIDATION_RULES,
  type InvalidationRule,
} from './invalidation';

/**
 * Usage Examples:
 * 
 * 1. Basic caching with withCache:
 * ```typescript
 * const categories = await withCache(
 *   ctx,
 *   'categories',
 *   ['all'],
 *   async () => {
 *     return ctx.db.query('categories')
 *       .withIndex('by_organization', q => q.eq('organizationId', orgId))
 *       .collect();
 *   },
 *   { organizationId: orgId }
 * );
 * ```
 * 
 * 2. Manual cache operations:
 * ```typescript
 * // Get from cache
 * const cached = await get(ctx, { key: 'org:123:categories:all' });
 * 
 * // Set in cache
 * await set(ctx, {
 *   key: 'org:123:categories:all',
 *   value: categories,
 *   ttlSeconds: 3600,
 *   organizationId: '123',
 *   dataType: 'categories'
 * });
 * 
 * // Invalidate by pattern
 * await invalidate(ctx, { pattern: 'org:123:categories:*' });
 * ```
 * 
 * 3. Trigger invalidation on mutations:
 * ```typescript
 * // In your mutation handler
 * await createInvalidationHook('category.created')(ctx, {
 *   organizationId: category.organizationId,
 *   categoryId: category._id
 * });
 * ```
 * 
 * 4. Cache warming:
 * ```typescript
 * await warm(ctx, {
 *   keys: [{
 *     key: 'org:123:categories:all',
 *     fetchFn: 'categories.list',
 *     ttl: 3600,
 *     organizationId: '123',
 *     dataType: 'categories'
 *   }]
 * });
 * ```
 */

/**
 * Integration with existing functions:
 * 
 * 1. Wrap existing queries:
 * ```typescript
 * export const listCategories = query({
 *   handler: async (ctx, args) => {
 *     const organizationId = await getOrganizationId(ctx);
 *     
 *     return getCachedCategories(ctx, organizationId, args.projectId);
 *   }
 * });
 * ```
 * 
 * 2. Add invalidation to mutations:
 * ```typescript
 * export const createCategory = mutation({
 *   handler: async (ctx, args) => {
 *     const categoryId = await ctx.db.insert('categories', data);
 *     
 *     // Trigger cache invalidation
 *     await createInvalidationHook('category.created')(ctx, {
 *       organizationId: data.organizationId,
 *       categoryId
 *     });
 *     
 *     return categoryId;
 *   }
 * });
 * ```
 */

/**
 * Performance expectations:
 * - 50-70% reduction in database load
 * - 3-5x faster response times for cached data
 * - <5ms cache operation overhead
 * - >80% cache hit rate after warming
 */