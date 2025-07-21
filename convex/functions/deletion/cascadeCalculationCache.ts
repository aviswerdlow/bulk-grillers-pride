import { internalQuery, internalMutation } from '../../_generated/server';
import { v } from 'convex/values';
import { Id } from '../../_generated/dataModel';

// Cache schema for cascade calculations
export const CACHE_TABLE = 'cache' as const;
export const CACHE_TTL_DEFAULT = 300000; // 5 minutes
export const CACHE_TTL_MAX = 3600000; // 1 hour

export const getCachedCalculation = internalQuery({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    maxAge: v.optional(v.number()), // milliseconds
  },
  handler: async (ctx, args) => {
    const cacheKey = `cascade_calc:${args.entityType}:${args.entityId}`;
    const maxAge = args.maxAge || CACHE_TTL_DEFAULT;
    
    // First, clean up expired cache entries
    const expiredEntries = await ctx.db
      .query(CACHE_TABLE)
      .filter(q => q.lt(q.field('expiresAt'), Date.now()))
      .take(10);
    
    // Note: In a real implementation, we'd want a scheduled job for cleanup
    // For now, we'll just track that these exist
    
    // Find the cache entry
    const cached = await ctx.db
      .query(CACHE_TABLE)
      .withIndex('by_key', q => q.eq('key', cacheKey))
      .first();
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is still valid
    const age = Date.now() - cached._creationTime;
    if (age > maxAge || Date.now() > cached.expiresAt) {
      return null;
    }
    
    // Update access statistics
    await ctx.db.patch(cached._id, {
      hits: (cached.hits || 0) + 1,
      lastAccessedAt: Date.now(),
    });
    
    return cached.value;
  },
});

export const setCachedCalculation = internalMutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    calculation: v.any(),
    ttl: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cacheKey = `cascade_calc:${args.entityType}:${args.entityId}`;
    const ttl = Math.min(args.ttl || CACHE_TTL_DEFAULT, CACHE_TTL_MAX);
    
    // Remove old cache entry if exists
    const existing = await ctx.db
      .query(CACHE_TABLE)
      .withIndex('by_key', q => q.eq('key', cacheKey))
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    
    // Create new cache entry
    const cacheData = {
      key: cacheKey,
      value: args.calculation,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hits: 0,
      lastAccessedAt: Date.now(),
      dataType: 'cascade_calculation',
      size: JSON.stringify(args.calculation).length,
      organizationId: undefined, // Optional field, not using for now
    };
    
    await ctx.db.insert(CACHE_TABLE, cacheData);
  },
});

export const invalidateCascadeCache = internalMutation({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.entityType && args.entityId) {
      // Invalidate specific entity
      const cacheKey = `cascade_calc:${args.entityType}:${args.entityId}`;
      const entry = await ctx.db
        .query(CACHE_TABLE)
        .withIndex('by_key', q => q.eq('key', cacheKey))
        .first();
      
      if (entry) {
        await ctx.db.delete(entry._id);
      }
    } else if (args.entityType) {
      // Invalidate all entries for entity type
      // Note: We'll need to extract entity type from the cache key
      const entries = await ctx.db
        .query(CACHE_TABLE)
        .filter(q => q.eq(q.field('dataType'), 'cascade_calculation'))
        .collect();
      
      // Filter by entity type from key pattern
      const filteredEntries = entries.filter(entry => 
        entry.key.startsWith(`cascade_calc:${args.entityType}:`)
      );
      
      for (const entry of filteredEntries) {
        await ctx.db.delete(entry._id);
      }
    } else {
      // Invalidate all cascade calculations
      const entries = await ctx.db
        .query(CACHE_TABLE)
        .filter(q => q.eq(q.field('dataType'), 'cascade_calculation'))
        .collect();
      
      for (const entry of entries) {
        await ctx.db.delete(entry._id);
      }
    }
  },
});

export const getCacheStatistics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cascadeEntries = await ctx.db
      .query(CACHE_TABLE)
      .filter(q => q.eq(q.field('dataType'), 'cascade_calculation'))
      .collect();
    
    const now = Date.now();
    const stats = {
      totalEntries: cascadeEntries.length,
      totalSize: cascadeEntries.reduce((sum, entry) => sum + (entry.size || 0), 0),
      activeEntries: cascadeEntries.filter(e => e.expiresAt > now).length,
      expiredEntries: cascadeEntries.filter(e => e.expiresAt <= now).length,
      totalHits: cascadeEntries.reduce((sum, entry) => sum + (entry.hits || 0), 0),
      averageHits: cascadeEntries.length > 0 
        ? cascadeEntries.reduce((sum, entry) => sum + (entry.hits || 0), 0) / cascadeEntries.length 
        : 0,
      oldestEntry: cascadeEntries.length > 0 
        ? Math.min(...cascadeEntries.map(e => e._creationTime))
        : null,
      newestEntry: cascadeEntries.length > 0
        ? Math.max(...cascadeEntries.map(e => e._creationTime))
        : null,
    };
    
    return stats;
  },
});

export const cleanupExpiredCache = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;
    const now = Date.now();
    
    const expiredEntries = await ctx.db
      .query(CACHE_TABLE)
      .filter(q => q.lt(q.field('expiresAt'), now))
      .take(batchSize);
    
    let deletedCount = 0;
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }
    
    return {
      deletedCount,
      hasMore: expiredEntries.length === batchSize,
    };
  },
});