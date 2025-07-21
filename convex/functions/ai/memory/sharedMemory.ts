/**
 * Shared Memory System for CrewAI Agents
 * 
 * Provides a persistent, compressed, and concurrent-safe memory system
 * for agent collaboration with caching and summarization capabilities.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../../../_generated/server";
import { Doc, Id } from "../../../_generated/dataModel";

// Memory size limits
const MAX_MEMORY_SIZE_BYTES = 512 * 1024 * 1024; // 512MB per crew
const MAX_SINGLE_MEMORY_SIZE = 5 * 1024 * 1024; // 5MB per memory entry
const COMPRESSION_THRESHOLD = 1024; // Compress content larger than 1KB
const LOCK_TIMEOUT_MS = 30000; // 30 seconds lock timeout
const MEMORY_TTL_SHORT_TERM = 3600000; // 1 hour for short-term memory
const MEMORY_TTL_WORKING = 7200000; // 2 hours for working memory
const MEMORY_TTL_EPISODIC = 86400000; // 24 hours for episodic memory

// Memory importance decay rates
const IMPORTANCE_DECAY_RATE = 0.95; // Decay importance by 5% per access
const RELEVANCE_THRESHOLD = 0.3; // Minimum relevance to keep memory

export type MemoryType = 'shortTerm' | 'longTerm' | 'episodic' | 'semantic' | 'working';

export interface MemoryContent {
  data: any;
  context?: Record<string, any>;
  timestamp: number;
}

export interface MemoryWriteOptions {
  compress?: boolean;
  ttl?: number;
  importance?: number;
  parentMemoryId?: Id<'agentMemory'>;
  relatedMemories?: Id<'agentMemory'>[];
}

export interface MemoryReadOptions {
  includeExpired?: boolean;
  minImportance?: number;
  maxResults?: number;
}

// Utility functions
function calculateContentHash(content: any): string {
  const contentStr = JSON.stringify(content);
  // Simple hash function for browser environment
  let hash = 0;
  for (let i = 0; i < contentStr.length; i++) {
    const char = contentStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Simple compression using LZ-string algorithm (simplified for Convex)
function compressString(str: string): string {
  // For now, we'll use a simple compression approach
  // In production, you might want to use a proper compression library
  // This is a placeholder that just returns the original string
  return str;
}

function decompressString(compressed: string): string {
  // Corresponding decompression
  return compressed;
}

async function compressContent(content: any): Promise<{ compressed: string; original: number }> {
  const contentStr = JSON.stringify(content);
  const originalSize = new TextEncoder().encode(contentStr).length;
  
  if (originalSize < COMPRESSION_THRESHOLD) {
    return { compressed: contentStr, original: originalSize };
  }
  
  const compressed = compressString(contentStr);
  return { compressed, original: originalSize };
}

async function decompressContent(compressed: string, isCompressed: boolean): Promise<any> {
  if (!isCompressed) {
    return JSON.parse(compressed);
  }
  
  const decompressed = decompressString(compressed);
  return JSON.parse(decompressed);
}

function calculateImportance(
  content: any,
  explicitImportance?: number
): number {
  if (explicitImportance !== undefined) {
    return Math.max(0, Math.min(1, explicitImportance));
  }
  
  // Calculate importance based on content characteristics
  const contentStr = JSON.stringify(content);
  const contentLength = contentStr.length;
  const hasDecision = contentStr.includes('decision') || contentStr.includes('result');
  const hasError = contentStr.includes('error') || contentStr.includes('fail');
  const hasSuccess = contentStr.includes('success') || contentStr.includes('complete');
  
  let importance = 0.5; // Base importance
  
  // Adjust based on content
  if (hasDecision) importance += 0.2;
  if (hasError) importance += 0.3;
  if (hasSuccess) importance += 0.1;
  
  // Adjust based on size (larger content may be more important)
  if (contentLength > 1000) importance += 0.1;
  if (contentLength > 5000) importance += 0.1;
  
  return Math.max(0, Math.min(1, importance));
}

function getMemoryTTL(memoryType: MemoryType, customTTL?: number): number | undefined {
  if (customTTL !== undefined) return customTTL;
  
  switch (memoryType) {
    case 'shortTerm':
      return MEMORY_TTL_SHORT_TERM;
    case 'working':
      return MEMORY_TTL_WORKING;
    case 'episodic':
      return MEMORY_TTL_EPISODIC;
    case 'longTerm':
    case 'semantic':
      return undefined; // No expiration for long-term and semantic memories
  }
}

// Write memory with compression and concurrency control
export const writeMemory = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    memoryKey: v.string(),
    memoryType: v.union(
      v.literal('shortTerm'),
      v.literal('longTerm'),
      v.literal('episodic'),
      v.literal('semantic'),
      v.literal('working')
    ),
    content: v.any(),
    agentId: v.optional(v.string()),
    crewId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    options: v.optional(v.object({
      compress: v.optional(v.boolean()),
      ttl: v.optional(v.number()),
      importance: v.optional(v.number()),
      parentMemoryId: v.optional(v.id('agentMemory')),
      relatedMemories: v.optional(v.array(v.id('agentMemory'))),
    })),
  },
  handler: async (ctx, args) => {
    const { organizationId, memoryKey, memoryType, content, agentId, crewId, sessionId, options = {} } = args;
    
    // Check for existing memory with same key
    const existing = await ctx.db
      .query('agentMemory')
      .withIndex('by_key', q => q.eq('organizationId', organizationId).eq('memoryKey', memoryKey))
      .first();
    
    // If memory exists and is locked, check lock expiration
    if (existing && existing.locked && existing.lockExpiresAt) {
      if (existing.lockExpiresAt > Date.now()) {
        throw new Error(`Memory is locked by agent ${existing.lockedBy}`);
      }
    }
    
    // Calculate content hash for deduplication
    const contentHash = calculateContentHash(content);
    
    // Compress content if needed
    const shouldCompress = options.compress ?? true;
    const { compressed, original } = await compressContent(content);
    const sizeBytes = compressed.length;
    
    // Check size limits
    if (sizeBytes > MAX_SINGLE_MEMORY_SIZE) {
      throw new Error(`Memory size ${sizeBytes} exceeds limit of ${MAX_SINGLE_MEMORY_SIZE} bytes`);
    }
    
    // Calculate importance
    const importance = calculateImportance(content, options.importance);
    
    // Calculate TTL
    const ttl = getMemoryTTL(memoryType, options.ttl);
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    
    const now = Date.now();
    
    if (existing) {
      // Update existing memory
      await ctx.db.patch(existing._id, {
        content: compressed,
        contentHash,
        compressed: shouldCompress && original >= COMPRESSION_THRESHOLD,
        sizeBytes,
        importance,
        updateCount: existing.updateCount + 1,
        version: existing.version + 1,
        updatedAt: now,
        lastAccessedAt: now,
        lastAccessedBy: agentId,
        expiresAt,
        locked: false,
        lockedBy: undefined,
        lockExpiresAt: undefined,
      });
      
      return existing._id;
    } else {
      // Create new memory
      const memoryId = await ctx.db.insert('agentMemory', {
        organizationId,
        memoryKey,
        memoryType,
        content: compressed,
        contentHash,
        compressed: shouldCompress && original >= COMPRESSION_THRESHOLD,
        sizeBytes,
        agentId,
        crewId,
        sessionId,
        importance,
        relevanceScore: 1.0, // Start with full relevance
        accessCount: 0,
        updateCount: 0,
        lastAccessedAt: now,
        lastAccessedBy: agentId,
        version: 1,
        locked: false,
        expiresAt,
        createdAt: now,
        updatedAt: now,
        parentMemoryId: options.parentMemoryId,
        relatedMemories: options.relatedMemories,
      });
      
      return memoryId;
    }
  },
});

// Read memory with decompression
export const readMemory = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    memoryKey: v.string(),
    agentId: v.optional(v.string()),
    options: v.optional(v.object({
      includeExpired: v.optional(v.boolean()),
      updateAccess: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const { organizationId, memoryKey, agentId, options = {} } = args;
    
    const memory = await ctx.db
      .query('agentMemory')
      .withIndex('by_key', q => q.eq('organizationId', organizationId).eq('memoryKey', memoryKey))
      .first();
    
    if (!memory) {
      return null;
    }
    
    // Check if memory is expired
    if (!options.includeExpired && memory.expiresAt && memory.expiresAt < Date.now()) {
      return null;
    }
    
    // Decompress content
    const content = await decompressContent(memory.content, memory.compressed);
    
    // Update access statistics if requested
    if (options.updateAccess !== false) {
      await ctx.db.patch(memory._id, {
        accessCount: memory.accessCount + 1,
        lastAccessedAt: Date.now(),
        lastAccessedBy: agentId,
        // Decay importance slightly on each access
        importance: memory.importance * IMPORTANCE_DECAY_RATE,
      });
    }
    
    return {
      _id: memory._id,
      memoryKey: memory.memoryKey,
      memoryType: memory.memoryType,
      content,
      importance: memory.importance,
      relevanceScore: memory.relevanceScore,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      expiresAt: memory.expiresAt,
      version: memory.version,
      accessCount: memory.accessCount,
    };
  },
});

// Search memories by pattern
export const searchMemories = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    pattern: v.optional(v.string()),
    memoryType: v.optional(v.union(
      v.literal('shortTerm'),
      v.literal('longTerm'),
      v.literal('episodic'),
      v.literal('semantic'),
      v.literal('working')
    )),
    agentId: v.optional(v.string()),
    crewId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    options: v.optional(v.object({
      minImportance: v.optional(v.number()),
      maxResults: v.optional(v.number()),
      includeExpired: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const { organizationId, pattern, memoryType, agentId, crewId, sessionId, options = {} } = args;
    
    let query = ctx.db.query('agentMemory').withIndex('by_organization', q => q.eq('organizationId', organizationId));
    
    // Apply filters
    if (memoryType) {
      query = ctx.db.query('agentMemory').withIndex('by_type', q => q.eq('organizationId', organizationId).eq('memoryType', memoryType));
    } else if (agentId) {
      query = ctx.db.query('agentMemory').withIndex('by_agent', q => q.eq('organizationId', organizationId).eq('agentId', agentId));
    } else if (crewId) {
      query = ctx.db.query('agentMemory').withIndex('by_crew', q => q.eq('organizationId', organizationId).eq('crewId', crewId));
    } else if (sessionId) {
      query = ctx.db.query('agentMemory').withIndex('by_session', q => q.eq('organizationId', organizationId).eq('sessionId', sessionId));
    }
    
    const memories = await query.collect();
    
    // Filter results
    let filtered = memories.filter(memory => {
      // Check expiration
      if (!options.includeExpired && memory.expiresAt && memory.expiresAt < Date.now()) {
        return false;
      }
      
      // Check importance
      if (options.minImportance && memory.importance < options.minImportance) {
        return false;
      }
      
      // Check pattern match in key
      if (pattern && !memory.memoryKey.includes(pattern)) {
        return false;
      }
      
      return true;
    });
    
    // Sort by importance and recency
    filtered.sort((a, b) => {
      const scoreA = a.importance * 0.7 + (1 - (Date.now() - a.lastAccessedAt) / (86400000 * 7)) * 0.3;
      const scoreB = b.importance * 0.7 + (1 - (Date.now() - b.lastAccessedAt) / (86400000 * 7)) * 0.3;
      return scoreB - scoreA;
    });
    
    // Limit results
    if (options.maxResults) {
      filtered = filtered.slice(0, options.maxResults);
    }
    
    // Decompress and return
    return Promise.all(filtered.map(async memory => ({
      _id: memory._id,
      memoryKey: memory.memoryKey,
      memoryType: memory.memoryType,
      content: await decompressContent(memory.content, memory.compressed),
      importance: memory.importance,
      relevanceScore: memory.relevanceScore,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      expiresAt: memory.expiresAt,
      version: memory.version,
      accessCount: memory.accessCount,
    })));
  },
});

// Lock memory for exclusive access
export const lockMemory = internalMutation({
  args: {
    memoryId: v.id('agentMemory'),
    agentId: v.string(),
    lockDurationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { memoryId, agentId, lockDurationMs = LOCK_TIMEOUT_MS } = args;
    
    const memory = await ctx.db.get(memoryId);
    if (!memory) {
      throw new Error('Memory not found');
    }
    
    // Check if already locked
    if (memory.locked && memory.lockExpiresAt && memory.lockExpiresAt > Date.now()) {
      if (memory.lockedBy !== agentId) {
        throw new Error(`Memory is locked by agent ${memory.lockedBy}`);
      }
      // Same agent can refresh lock
    }
    
    await ctx.db.patch(memoryId, {
      locked: true,
      lockedBy: agentId,
      lockExpiresAt: Date.now() + lockDurationMs,
    });
    
    return true;
  },
});

// Unlock memory
export const unlockMemory = internalMutation({
  args: {
    memoryId: v.id('agentMemory'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { memoryId, agentId } = args;
    
    const memory = await ctx.db.get(memoryId);
    if (!memory) {
      throw new Error('Memory not found');
    }
    
    // Only the locking agent can unlock
    if (memory.lockedBy && memory.lockedBy !== agentId) {
      throw new Error(`Memory is locked by agent ${memory.lockedBy}`);
    }
    
    await ctx.db.patch(memoryId, {
      locked: false,
      lockedBy: undefined,
      lockExpiresAt: undefined,
    });
    
    return true;
  },
});

// Summarize memories to prevent unbounded growth
export const summarizeMemories = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    crewId: v.string(),
    maxMemories: v.optional(v.number()),
    minImportance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, crewId, maxMemories = 100, minImportance = 0.3 } = args;
    
    // Get all memories for the crew
    const memories = await ctx.db
      .query('agentMemory')
      .withIndex('by_crew', q => q.eq('organizationId', organizationId).eq('crewId', crewId))
      .collect();
    
    // Filter out unimportant and expired memories
    const now = Date.now();
    const relevantMemories = memories.filter(m => 
      m.importance >= minImportance && 
      (!m.expiresAt || m.expiresAt > now)
    );
    
    // If within limits, no summarization needed
    if (relevantMemories.length <= maxMemories) {
      return { summarized: 0, deleted: 0 };
    }
    
    // Sort by importance and access patterns
    relevantMemories.sort((a, b) => {
      const scoreA = a.importance * 0.6 + a.accessCount * 0.2 + (1 - (now - a.lastAccessedAt) / (86400000 * 7)) * 0.2;
      const scoreB = b.importance * 0.6 + b.accessCount * 0.2 + (1 - (now - b.lastAccessedAt) / (86400000 * 7)) * 0.2;
      return scoreB - scoreA;
    });
    
    // Keep top memories
    const toKeep = relevantMemories.slice(0, maxMemories);
    const toSummarize = relevantMemories.slice(maxMemories);
    
    // Group memories by type for summarization
    const summaryGroups = new Map<MemoryType, any[]>();
    for (const memory of toSummarize) {
      if (!summaryGroups.has(memory.memoryType)) {
        summaryGroups.set(memory.memoryType, []);
      }
      const content = await decompressContent(memory.content, memory.compressed);
      summaryGroups.get(memory.memoryType)!.push({
        key: memory.memoryKey,
        content,
        importance: memory.importance,
      });
    }
    
    // Create summary memories
    let summarized = 0;
    for (const [memoryType, memories] of summaryGroups) {
      const summaryContent = {
        type: 'summary',
        originalCount: memories.length,
        summarizedAt: now,
        memories: memories.map(m => ({
          key: m.key,
          importance: m.importance,
          summary: JSON.stringify(m.content).substring(0, 200), // Keep brief summary
        })),
      };
      
      await writeMemory(ctx, {
        organizationId,
        memoryKey: `${crewId}.summary.${memoryType}.${now}`,
        memoryType,
        content: summaryContent,
        crewId,
        options: {
          importance: 0.8, // Summaries are important
          ttl: 86400000 * 7, // Keep summaries for 7 days
        },
      });
      
      summarized++;
    }
    
    // Delete summarized memories
    let deleted = 0;
    for (const memory of toSummarize) {
      await ctx.db.delete(memory._id);
      deleted++;
    }
    
    return { summarized, deleted };
  },
});

// Get memory usage statistics
export const getMemoryStats = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    crewId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, crewId } = args;
    
    let query = ctx.db.query('agentMemory').withIndex('by_organization', q => q.eq('organizationId', organizationId));
    
    if (crewId) {
      query = ctx.db.query('agentMemory').withIndex('by_crew', q => q.eq('organizationId', organizationId).eq('crewId', crewId));
    }
    
    const memories = await query.collect();
    
    const stats = {
      totalMemories: memories.length,
      totalSizeBytes: 0,
      byType: {} as Record<MemoryType, { count: number; sizeBytes: number }>,
      expiredCount: 0,
      lockedCount: 0,
      averageImportance: 0,
      oldestMemory: null as Date | null,
      newestMemory: null as Date | null,
    };
    
    const now = Date.now();
    let totalImportance = 0;
    
    for (const memory of memories) {
      stats.totalSizeBytes += memory.sizeBytes;
      
      if (!stats.byType[memory.memoryType]) {
        stats.byType[memory.memoryType] = { count: 0, sizeBytes: 0 };
      }
      stats.byType[memory.memoryType].count++;
      stats.byType[memory.memoryType].sizeBytes += memory.sizeBytes;
      
      if (memory.expiresAt && memory.expiresAt < now) {
        stats.expiredCount++;
      }
      
      if (memory.locked && memory.lockExpiresAt && memory.lockExpiresAt > now) {
        stats.lockedCount++;
      }
      
      totalImportance += memory.importance;
      
      if (!stats.oldestMemory || memory.createdAt < stats.oldestMemory.getTime()) {
        stats.oldestMemory = new Date(memory.createdAt);
      }
      
      if (!stats.newestMemory || memory.createdAt > stats.newestMemory.getTime()) {
        stats.newestMemory = new Date(memory.createdAt);
      }
    }
    
    if (memories.length > 0) {
      stats.averageImportance = totalImportance / memories.length;
    }
    
    return stats;
  },
});

// Clean up expired memories
export const cleanupExpiredMemories = internalMutation({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const { organizationId } = args;
    
    const now = Date.now();
    const expiredMemories = await ctx.db
      .query('agentMemory')
      .withIndex('by_expiry', q => q.lte('expiresAt', now))
      .collect();
    
    let deleted = 0;
    for (const memory of expiredMemories) {
      if (memory.organizationId === organizationId) {
        await ctx.db.delete(memory._id);
        deleted++;
      }
    }
    
    return { deleted };
  },
});