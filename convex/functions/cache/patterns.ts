import { internal } from "../../_generated/api";
/**
 * Cache-aside pattern implementation for Convex
 * Provides high-level caching utilities with automatic TTL and invalidation
 */

import { CACHE_CONFIG, generateCacheKey, type CacheConfig } from './config';
import { get, set } from './service';
import { Id } from '../../_generated/dataModel';
import { withPerformanceTracking } from '../monitoring/performance';

/**
 * Options for cache operations
 */
export interface CacheOptions {
  organizationId?: Id<'organizations'>;
  projectId?: Id<'projects'>;
  userId?: Id<'users'>;
  ttl?: number; // Override default TTL
  force?: boolean; // Force refresh, bypassing cache
  metadata?: Record<string, any>; // Additional metadata for cache key
}

/**
 * Generic cache-aside pattern implementation
 * Tries cache first, falls back to fetch function, then caches result
 */
export async function withCache<T>(
  ctx: any,
  dataType: keyof typeof CACHE_CONFIG.staticData | 
            keyof typeof CACHE_CONFIG.userData | 
            keyof typeof CACHE_CONFIG.computedData | 
            keyof typeof CACHE_CONFIG.searchResults |
            keyof typeof CACHE_CONFIG.aiData,
  cacheKeyParts: string[],
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const organizationId = options.organizationId;
  
  // Find the appropriate cache config
  const config = findCacheConfig(dataType);
  const ttl = options.ttl || config.ttl;
  
  // Generate cache key
  const key = generateCacheKey(
    organizationId ? 'org' : 'user',
    dataType as any,
    {
      orgId: organizationId || '',
      userId: options.userId || '',
      projectId: options.projectId || '',
    },
    ...cacheKeyParts,
    ...(options.metadata ? [JSON.stringify(options.metadata)] : [])
  );
  
  // Skip cache if forced refresh
  if (!options.force) {
    try {
      // Try to get from cache
      const cached = await get(ctx, { key });
      if (cached !== null) {
        // Track cache hit in monitoring
        if (organizationId) {
          await ctx.scheduler.runAfter(0, internal.monitoring.performance.logMetric, {
            organizationId,
            operation: `cache.hit.${dataType}`,
            startTime: Date.now(),
            duration: 0,
            success: true,
            metadata: { cacheKey: key },
          });
        }
        return cached as T;
      }
    } catch (error) {
      // Log cache error but continue with fetch
      console.error('Cache get error:', error);
    }
  }
  
  // Fetch from source with performance tracking
  const fetchStart = Date.now();
  let data: T;
  
  try {
    if (organizationId) {
      // Use performance tracking for organization-scoped operations
      data = await withPerformanceTracking(
        ctx,
        `cache.miss.${dataType}`,
        organizationId,
        fetchFn,
        { metadata: { cacheKey: key } }
      );
    } else {
      // Direct fetch for non-organization operations
      data = await fetchFn();
    }
  } catch (error) {
    // Track cache miss error
    if (organizationId) {
      await ctx.scheduler.runAfter(0, internal.monitoring.performance.logMetric, {
        organizationId,
        operation: `cache.miss.${dataType}`,
        startTime: fetchStart,
        duration: Date.now() - fetchStart,
        success: false,
        error: error.message,
        metadata: { cacheKey: key },
      });
    }
    throw error;
  }
  
  // Cache the result asynchronously
  try {
    await set(ctx, {
      key,
      value: data,
      ttlSeconds: ttl,
      organizationId,
      dataType: dataType as string,
    });
  } catch (error) {
    // Log cache set error but don't fail the operation
    console.error('Cache set error:', error);
  }
  
  return data;
}

/**
 * Batch cache operations for multiple keys
 */
export async function withBatchCache<T>(
  ctx: any,
  dataType: string,
  items: Array<{
    key: string[];
    fetchFn: () => Promise<T>;
  }>,
  options: CacheOptions = {}
): Promise<T[]> {
  const results = await Promise.all(
    items.map((item) =>
      withCache(ctx, dataType as any, item.key, item.fetchFn, options)
    )
  );
  
  return results;
}

/**
 * Cache invalidation helper
 */
export async function invalidateCache(
  ctx: any,
  patterns: string[],
  options: { organizationId?: Id<'organizations'> } = {}
): Promise<number> {
  let totalInvalidated = 0;
  
  for (const pattern of patterns) {
    try {
      const invalidated = await ctx.runMutation(
        internal.cache.service.invalidate,
        { pattern }
      );
      totalInvalidated += invalidated;
    } catch (error) {
      console.error(`Failed to invalidate pattern ${pattern}:`, error);
    }
  }
  
  // Track invalidation in monitoring
  if (options.organizationId) {
    await ctx.scheduler.runAfter(0, internal.monitoring.performance.logMetric, {
      organizationId: options.organizationId,
      operation: 'cache.invalidate',
      startTime: Date.now(),
      duration: 0,
      success: true,
      itemCount: totalInvalidated,
      metadata: { patterns },
    });
  }
  
  return totalInvalidated;
}

/**
 * Find cache configuration for a given data type
 */
function findCacheConfig(dataType: string): CacheConfig {
  // Search through all cache config categories
  const allConfigs = {
    ...CACHE_CONFIG.staticData,
    ...CACHE_CONFIG.userData,
    ...CACHE_CONFIG.computedData,
    ...CACHE_CONFIG.searchResults,
    ...CACHE_CONFIG.aiData,
    ...CACHE_CONFIG.mediaData,
  };
  
  return allConfigs[dataType] || { ttl: 300, invalidateOn: [] }; // Default 5 minutes
}

/**
 * Specific cache helpers for common operations
 */

/**
 * Cache categories for an organization
 */
export async function getCachedCategories(
  ctx: any,
  organizationId: Id<'organizations'>,
  projectId?: Id<'projects'>,
  options: CacheOptions = {}
): Promise<any[]> {
  return withCache(
    ctx,
    'categories',
    projectId ? ['project', projectId] : ['all'],
    async () => {
      // Fetch categories from database
      let query = ctx.db
        .query('categories')
        .withIndex('by_organization', (q: any) => 
          q.eq('organizationId', organizationId)
        );
      
      if (projectId) {
        query = query.filter((q: any) => q.eq(q.field('projectId'), projectId));
      }
      
      return query.collect();
    },
    { ...options, organizationId }
  );
}

/**
 * Cache organization settings
 */
export async function getCachedOrganizationSettings(
  ctx: any,
  organizationId: Id<'organizations'>,
  options: CacheOptions = {}
): Promise<any> {
  return withCache(
    ctx,
    'organizationSettings',
    [],
    async () => {
      const org = await ctx.db.get(organizationId);
      return org?.settings || null;
    },
    { ...options, organizationId }
  );
}

/**
 * Cache product counts
 */
export async function getCachedProductCounts(
  ctx: any,
  organizationId: Id<'organizations'>,
  projectId?: Id<'projects'>,
  options: CacheOptions = {}
): Promise<Record<string, number>> {
  return withCache(
    ctx,
    'productCounts',
    projectId ? ['project', projectId] : ['all'],
    async () => {
      let query = ctx.db
        .query('products')
        .withIndex('by_organization', (q: any) => 
          q.eq('organizationId', organizationId)
        );
      
      if (projectId) {
        query = query.filter((q: any) => q.eq(q.field('projectId'), projectId));
      }
      
      const products = await query.collect();
      
      // Count by status
      const counts = products.reduce((acc, product) => {
        acc[product.status] = (acc[product.status] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return counts;
    },
    { ...options, organizationId }
  );
}

/**
 * Cache search results
 */
export async function getCachedSearchResults(
  ctx: any,
  organizationId: Id<'organizations'>,
  searchQuery: string,
  filters: Record<string, any>,
  options: CacheOptions = {}
): Promise<any[]> {
  return withCache(
    ctx,
    'productSearch',
    ['search', searchQuery, JSON.stringify(filters)],
    async () => {
      // Implement actual search logic here
      let query = ctx.db
        .query('products')
        .withIndex('by_organization', (q: any) => 
          q.eq('organizationId', organizationId)
        );
      
      // Apply filters
      if (filters.projectId) {
        query = query.filter((q: any) => 
          q.eq(q.field('projectId'), filters.projectId)
        );
      }
      
      if (filters.status) {
        query = query.filter((q: any) => 
          q.eq(q.field('status'), filters.status)
        );
      }
      
      const products = await query.collect();
      
      // Simple text search (in production, use proper search)
      if (searchQuery) {
        return products.filter((product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      return products;
    },
    { ...options, organizationId, metadata: { searchQuery, filters } }
  );
}