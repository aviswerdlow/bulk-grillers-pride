/**
 * Cache Integration for CrewAI Shared Memory
 * 
 * Integrates the shared memory system with the existing cache table
 * for improved performance and reduced API calls.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../../_generated/server";
import { Doc, Id } from "../../../_generated/dataModel";

// Cache key prefixes
const CACHE_PREFIX = {
  MEMORY: 'crewai.memory',
  ANALYSIS: 'crewai.analysis',
  CATEGORY: 'crewai.category',
  VALIDATION: 'crewai.validation',
  STATS: 'crewai.stats',
} as const;

// Default TTLs for different cache types (in milliseconds)
const CACHE_TTL = {
  MEMORY: 300000,      // 5 minutes for memory lookups
  ANALYSIS: 600000,    // 10 minutes for analysis results
  CATEGORY: 900000,    // 15 minutes for category matches
  VALIDATION: 300000,  // 5 minutes for validation results
  STATS: 60000,        // 1 minute for statistics
} as const;

export interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number;
  hits: number;
  lastAccessedAt: number;
}

/**
 * Helper function to write to cache
 */
async function writeToCacheHelper(
  ctx: any,
  args: {
    key: string;
    value: any;
    dataType: string;
    ttlMs?: number;
    organizationId?: Id<'organizations'>;
  }
) {
  const { key, value, dataType, ttlMs, organizationId } = args;
  
  const now = Date.now();
  const ttl = ttlMs || CACHE_TTL.MEMORY;
  const expiresAt = now + ttl;
  
  // Check if entry exists
  const existing = await ctx.db
    .query('cache')
    .withIndex('by_key', q => q.eq('key', key))
    .first();
  
  // Calculate size (approximate)
  const valueStr = JSON.stringify(value);
  const size = new TextEncoder().encode(valueStr).length;
  
  if (existing) {
    // Update existing entry
    await ctx.db.patch(existing._id, {
      value,
      expiresAt,
      hits: existing.hits + 1,
      lastAccessedAt: now,
      size,
    });
    return existing._id;
  } else {
    // Create new entry
    return await ctx.db.insert('cache', {
      key,
      value,
      expiresAt,
      createdAt: now,
      hits: 0,
      lastAccessedAt: now,
      organizationId,
      dataType,
      size,
    });
  }
}

/**
 * Write to cache with automatic TTL and metadata
 */
export const writeToCache = internalMutation({
  args: {
    key: v.string(),
    value: v.any(),
    dataType: v.string(),
    ttlMs: v.optional(v.number()),
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    return await writeToCacheHelper(ctx, args);
  },
});

/**
 * Helper function to read from cache
 */
async function readFromCacheHelper(
  ctx: any,
  args: {
    key: string;
  }
) {
  const { key } = args;
  
  const entry = await ctx.db
    .query('cache')
    .withIndex('by_key', q => q.eq('key', key))
    .first();
  
  if (!entry) {
    return null;
  }
  
  // Check if expired
  const now = Date.now();
  if (entry.expiresAt < now) {
    // Entry is expired
    return null;
  }
  
  return {
    value: entry.value,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    hits: entry.hits,
  };
}

/**
 * Read from cache with automatic expiry check
 */
export const readFromCache = internalQuery({
  args: {
    key: v.string(),
    updateHits: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await readFromCacheHelper(ctx, { key: args.key });
  },
});

/**
 * Cache memory lookup results
 */
export const cacheMemoryLookup = internalMutation({
  args: {
    memoryKey: v.string(),
    memoryData: v.any(),
    organizationId: v.id('organizations'),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { memoryKey, memoryData, organizationId, ttlMs } = args;
    
    const cacheKey = `${CACHE_PREFIX.MEMORY}.${organizationId}.${memoryKey}`;
    
    return await writeToCacheHelper(ctx, {
      key: cacheKey,
      value: memoryData,
      dataType: 'memory',
      ttlMs: ttlMs || CACHE_TTL.MEMORY,
      organizationId,
    });
  },
});

/**
 * Get cached memory lookup
 */
export const getCachedMemory = internalQuery({
  args: {
    memoryKey: v.string(),
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const { memoryKey, organizationId } = args;
    
    const cacheKey = `${CACHE_PREFIX.MEMORY}.${organizationId}.${memoryKey}`;
    
    return await readFromCacheHelper(ctx, {
      key: cacheKey,
    });
  },
});

/**
 * Cache analysis results
 */
export const cacheAnalysisResult = internalMutation({
  args: {
    productId: v.string(),
    analysis: v.any(),
    organizationId: v.id('organizations'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { productId, analysis, organizationId, agentId } = args;
    
    const cacheKey = `${CACHE_PREFIX.ANALYSIS}.${organizationId}.${agentId}.${productId}`;
    
    return await writeToCacheHelper(ctx, {
      key: cacheKey,
      value: analysis,
      dataType: 'analysis',
      ttlMs: CACHE_TTL.ANALYSIS,
      organizationId,
    });
  },
});

/**
 * Get cached analysis result
 */
export const getCachedAnalysis = internalQuery({
  args: {
    productId: v.string(),
    organizationId: v.id('organizations'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { productId, organizationId, agentId } = args;
    
    const cacheKey = `${CACHE_PREFIX.ANALYSIS}.${organizationId}.${agentId}.${productId}`;
    
    return await readFromCacheHelper(ctx, {
      key: cacheKey,
    });
  },
});

/**
 * Cache category match results
 */
export const cacheCategoryMatch = internalMutation({
  args: {
    productId: v.string(),
    categoryMatch: v.any(),
    organizationId: v.id('organizations'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { productId, categoryMatch, organizationId, agentId } = args;
    
    const cacheKey = `${CACHE_PREFIX.CATEGORY}.${organizationId}.${agentId}.${productId}`;
    
    return await writeToCacheHelper(ctx, {
      key: cacheKey,
      value: categoryMatch,
      dataType: 'category',
      ttlMs: CACHE_TTL.CATEGORY,
      organizationId,
    });
  },
});

/**
 * Cache validation results
 */
export const cacheValidationResult = internalMutation({
  args: {
    productId: v.string(),
    validation: v.any(),
    organizationId: v.id('organizations'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { productId, validation, organizationId, agentId } = args;
    
    const cacheKey = `${CACHE_PREFIX.VALIDATION}.${organizationId}.${agentId}.${productId}`;
    
    return await writeToCacheHelper(ctx, {
      key: cacheKey,
      value: validation,
      dataType: 'validation',
      ttlMs: CACHE_TTL.VALIDATION,
      organizationId,
    });
  },
});

/**
 * Cache memory statistics
 */
export const cacheMemoryStats = internalMutation({
  args: {
    stats: v.any(),
    organizationId: v.id('organizations'),
    crewId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { stats, organizationId, crewId } = args;
    
    const cacheKey = crewId 
      ? `${CACHE_PREFIX.STATS}.${organizationId}.${crewId}`
      : `${CACHE_PREFIX.STATS}.${organizationId}`;
    
    return await writeToCacheHelper(ctx, {
      key: cacheKey,
      value: stats,
      dataType: 'stats',
      ttlMs: CACHE_TTL.STATS,
      organizationId,
    });
  },
});

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = internalMutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    const { organizationId } = args;
    
    const now = Date.now();
    
    // Query expired entries
    const expiredEntries = await ctx.db
      .query('cache')
      .withIndex('by_expiry', q => q.lte('expiresAt', now))
      .collect();
    
    let deleted = 0;
    
    for (const entry of expiredEntries) {
      // If organizationId is specified, only delete entries for that org
      if (!organizationId || entry.organizationId === organizationId) {
        await ctx.db.delete(entry._id);
        deleted++;
      }
    }
    
    return { deleted };
  },
});

/**
 * Get cache statistics
 */
export const getCacheStats = internalQuery({
  args: {
    organizationId: v.optional(v.id('organizations')),
    dataType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, dataType } = args;
    
    // Build the appropriate query based on the filters
    let entries;
    if (organizationId && dataType) {
      // Need to choose one index - let's use organization and filter by type
      entries = await ctx.db
        .query('cache')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .filter(q => q.eq(q.field('dataType'), dataType))
        .collect();
    } else if (organizationId) {
      entries = await ctx.db
        .query('cache')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .collect();
    } else if (dataType) {
      entries = await ctx.db
        .query('cache')
        .withIndex('by_type', q => q.eq('dataType', dataType))
        .collect();
    } else {
      entries = await ctx.db
        .query('cache')
        .collect();
    }
    
    const now = Date.now();
    let totalSize = 0;
    let totalHits = 0;
    let activeCount = 0;
    let expiredCount = 0;
    const byType: Record<string, { count: number; size: number; hits: number }> = {};
    
    for (const entry of entries) {
      totalSize += entry.size;
      totalHits += entry.hits;
      
      if (entry.expiresAt > now) {
        activeCount++;
      } else {
        expiredCount++;
      }
      
      if (!byType[entry.dataType]) {
        byType[entry.dataType] = { count: 0, size: 0, hits: 0 };
      }
      
      byType[entry.dataType].count++;
      byType[entry.dataType].size += entry.size;
      byType[entry.dataType].hits += entry.hits;
    }
    
    return {
      totalEntries: entries.length,
      activeEntries: activeCount,
      expiredEntries: expiredCount,
      totalSize,
      totalHits,
      averageHitRate: entries.length > 0 ? totalHits / entries.length : 0,
      byType,
    };
  },
});

/**
 * Batch cache operations for efficiency
 */
export const batchCacheWrite = internalMutation({
  args: {
    entries: v.array(v.object({
      key: v.string(),
      value: v.any(),
      dataType: v.string(),
      ttlMs: v.optional(v.number()),
      organizationId: v.optional(v.id('organizations')),
    })),
  },
  handler: async (ctx, args) => {
    const { entries } = args;
    
    const results = [];
    
    for (const entry of entries) {
      const result = await writeToCache(ctx, entry);
      results.push(result);
    }
    
    return results;
  },
});

/**
 * Batch cache read for efficiency
 */
export const batchCacheRead = internalQuery({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { keys } = args;
    
    const results: Record<string, any> = {};
    
    for (const key of keys) {
      const cached = await readFromCache(ctx, { key, updateHits: true });
      if (cached) {
        results[key] = cached;
      }
    }
    
    return results;
  },
});