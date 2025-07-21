/**
 * Cache service implementation for Convex
 * 
 * Since Convex runs in a serverless environment, we implement caching
 * using Convex's own storage with TTL management.
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { CACHE_CONFIG, generateCacheKey } from './config';

/**
 * Cache entry structure stored in Convex
 */
export interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number;
  createdAt: number;
  hits: number;
  lastAccessedAt: number;
  organizationId?: Id<'organizations'>;
  dataType: string;
  size: number; // Approximate size in bytes
}

/**
 * Get cached value by key
 */
export const get = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Query cache table (we'll need to add this to schema)
    const entry = await ctx.db
      .query('cache')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expiresAt < now) {
      // Schedule deletion of expired entry
      await ctx.scheduler.runAfter(0, internal.cache.service.deleteExpired, {
        key: args.key,
      });
      return null;
    }
    
    // Update access stats asynchronously
    await ctx.scheduler.runAfter(0, internal.cache.service.updateStats, {
      key: args.key,
      lastAccessedAt: now,
    });
    
    return entry.value;
  },
});

/**
 * Set cache value with TTL
 */
export const set = internalMutation({
  args: {
    key: v.string(),
    value: v.any(),
    ttlSeconds: v.number(),
    organizationId: v.optional(v.id('organizations')),
    dataType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + (args.ttlSeconds * 1000);
    
    // Calculate approximate size
    const size = JSON.stringify(args.value).length;
    
    // Check if key exists
    const existing = await ctx.db
      .query('cache')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    
    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        value: args.value,
        expiresAt,
        size,
        lastAccessedAt: now,
      });
    } else {
      // Create new entry
      await ctx.db.insert('cache', {
        key: args.key,
        value: args.value,
        expiresAt,
        createdAt: now,
        hits: 0,
        lastAccessedAt: now,
        organizationId: args.organizationId,
        dataType: args.dataType,
        size,
      });
    }
  },
});

/**
 * Delete cache entries by pattern
 */
export const invalidate = internalMutation({
  args: {
    pattern: v.string(),
  },
  handler: async (ctx, args) => {
    // Convert pattern to regex (simple wildcard support)
    const regexPattern = args.pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    
    // Get all cache entries (we might want to limit this for large caches)
    const entries = await ctx.db.query('cache').collect();
    
    // Filter by pattern and delete
    const toDelete = entries.filter((entry) => regex.test(entry.key));
    
    for (const entry of toDelete) {
      await ctx.db.delete(entry._id);
    }
    
    return toDelete.length;
  },
});

/**
 * Delete specific cache key
 */
export const del = internalMutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cache')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    
    if (entry) {
      await ctx.db.delete(entry._id);
      return true;
    }
    
    return false;
  },
});

/**
 * Update cache entry statistics
 */
export const updateStats = internalMutation({
  args: {
    key: v.string(),
    lastAccessedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('cache')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    
    if (entry) {
      await ctx.db.patch(entry._id, {
        hits: entry.hits + 1,
        lastAccessedAt: args.lastAccessedAt,
      });
    }
  },
});

/**
 * Delete expired cache entries
 */
export const deleteExpired = internalMutation({
  args: {
    key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    if (args.key) {
      // Delete specific expired key
      const entry = await ctx.db
        .query('cache')
        .withIndex('by_key', (q) => q.eq('key', args.key))
        .unique();
      
      if (entry && entry.expiresAt < now) {
        await ctx.db.delete(entry._id);
      }
    } else {
      // Cleanup all expired entries (batch operation)
      const expired = await ctx.db
        .query('cache')
        .filter((q) => q.lt(q.field('expiresAt'), now))
        .take(100); // Process in batches
      
      for (const entry of expired) {
        await ctx.db.delete(entry._id);
      }
      
      // If there are more expired entries, schedule another cleanup
      if (expired.length === 100) {
        await ctx.scheduler.runAfter(0, internal.cache.service.deleteExpired, {});
      }
    }
  },
});

/**
 * Get cache statistics
 */
export const getStats = internalQuery({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('cache');
    
    const entries = await query.collect();
    
    // Filter by organization if provided
    const filtered = args.organizationId
      ? entries.filter((e) => e.organizationId === args.organizationId)
      : entries;
    
    // Calculate statistics
    const stats = filtered.reduce(
      (acc, entry) => {
        acc.totalEntries++;
        acc.totalSize += entry.size;
        acc.totalHits += entry.hits;
        
        // Group by data type
        acc.byDataType[entry.dataType] = (acc.byDataType[entry.dataType] || 0) + 1;
        
        // Track expired entries
        if (entry.expiresAt < Date.now()) {
          acc.expiredEntries++;
        }
        
        return acc;
      },
      {
        totalEntries: 0,
        totalSize: 0,
        totalHits: 0,
        expiredEntries: 0,
        byDataType: {} as Record<string, number>,
      }
    );
    
    // Calculate hit rate (would need miss tracking for accurate rate)
    const avgHitsPerEntry = stats.totalEntries > 0 
      ? stats.totalHits / stats.totalEntries 
      : 0;
    
    return {
      ...stats,
      avgHitsPerEntry,
      sizeInMB: (stats.totalSize / 1024 / 1024).toFixed(2),
    };
  },
});

/**
 * Cache warming function
 */
export const warm = internalMutation({
  args: {
    keys: v.array(v.object({
      key: v.string(),
      fetchFn: v.string(), // Function name to call
      ttl: v.number(),
      organizationId: v.optional(v.id('organizations')),
      dataType: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const item of args.keys) {
      try {
        // Check if already cached and not expired
        const existing = await get(ctx, { key: item.key });
        if (existing !== null) {
          results.push({ key: item.key, status: 'already_cached' });
          continue;
        }
        
        // Note: In a real implementation, we'd need to dynamically
        // call the fetch function. For now, this is a placeholder.
        // The actual warming would be done by specific warming functions.
        results.push({ key: item.key, status: 'needs_implementation' });
      } catch (error) {
        results.push({ key: item.key, status: 'error', error: error.message });
      }
    }
    
    return results;
  },
});