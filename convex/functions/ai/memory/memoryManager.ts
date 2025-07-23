import { internal } from "@convex/_generated/api";
/**
 * Memory Manager for CrewAI Agents
 * 
 * High-level interface for managing shared memory with caching,
 * concurrency control, and automatic cleanup.
 */

import { api, internal } from "../../../_generated/api";
import { Id } from "../../../_generated/dataModel";
import { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { ConvexError } from "convex/values";

export type MemoryType = 'shortTerm' | 'longTerm' | 'episodic' | 'semantic' | 'working';

export interface MemoryOptions {
  compress?: boolean;
  ttl?: number;
  importance?: number;
  parentMemoryId?: Id<'agentMemory'>;
  relatedMemories?: Id<'agentMemory'>[];
}

export interface MemorySearchOptions {
  minImportance?: number;
  maxResults?: number;
  includeExpired?: boolean;
}

export interface MemoryEntry {
  _id: Id<'agentMemory'>;
  memoryKey: string;
  memoryType: MemoryType;
  content: any;
  importance: number;
  relevanceScore: number;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  version: number;
  accessCount: number;
}

export interface MemoryStats {
  totalMemories: number;
  totalSizeBytes: number;
  byType: Record<MemoryType, { count: number; sizeBytes: number }>;
  expiredCount: number;
  lockedCount: number;
  averageImportance: number;
  oldestMemory: Date | null;
  newestMemory: Date | null;
}

/**
 * MemoryManager provides a high-level interface for CrewAI agents
 * to interact with the shared memory system.
 */
export class MemoryManager {
  private organizationId: Id<'organizations'>;
  private agentId?: string;
  private crewId?: string;
  private sessionId?: string;
  private ctx: ActionCtx | MutationCtx | QueryCtx;

  constructor(
    ctx: ActionCtx | MutationCtx | QueryCtx,
    organizationId: Id<'organizations'>,
    options?: {
      agentId?: string;
      crewId?: string;
      sessionId?: string;
    }
  ) {
    this.ctx = ctx;
    this.organizationId = organizationId;
    this.agentId = options?.agentId;
    this.crewId = options?.crewId;
    this.sessionId = options?.sessionId;
  }

  /**
   * Store memory with automatic key generation
   */
  async store(
    keyParts: string[],
    content: any,
    memoryType: MemoryType = 'working',
    options?: MemoryOptions
  ): Promise<Id<'agentMemory'>> {
    const memoryKey = this.buildMemoryKey(keyParts);
    
    // @ts-ignore - Using internal API
    return await this.ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
      organizationId: this.organizationId,
      memoryKey,
      memoryType,
      content,
      agentId: this.agentId,
      crewId: this.crewId,
      sessionId: this.sessionId,
      options,
    });
  }

  /**
   * Retrieve memory by key
   */
  async retrieve(keyParts: string[]): Promise<MemoryEntry | null> {
    const memoryKey = this.buildMemoryKey(keyParts);
    
    // @ts-ignore - Using internal API
    return await this.ctx.runQuery(internal.ai.memory.sharedMemory.readMemory, {
      organizationId: this.organizationId,
      memoryKey,
      agentId: this.agentId,
      options: { updateAccess: true },
    });
  }

  /**
   * Search memories by pattern
   */
  async search(
    pattern?: string,
    memoryType?: MemoryType,
    options?: MemorySearchOptions
  ): Promise<MemoryEntry[]> {
    // @ts-ignore - Using internal API
    return await this.ctx.runQuery(internal.ai.memory.sharedMemory.searchMemories, {
      organizationId: this.organizationId,
      pattern,
      memoryType,
      agentId: this.agentId,
      crewId: this.crewId,
      sessionId: this.sessionId,
      options,
    });
  }

  /**
   * Store agent analysis results
   */
  async storeAnalysis(productId: string, analysis: any): Promise<Id<'agentMemory'>> {
    return await this.store(
      ['analysis', productId],
      analysis,
      'semantic',
      { importance: 0.8 }
    );
  }

  /**
   * Store category matching results
   */
  async storeCategoryMatch(productId: string, match: any): Promise<Id<'agentMemory'>> {
    return await this.store(
      ['match', productId],
      match,
      'semantic',
      { importance: 0.7 }
    );
  }

  /**
   * Store validation results
   */
  async storeValidation(productId: string, validation: any): Promise<Id<'agentMemory'>> {
    return await this.store(
      ['validation', productId],
      validation,
      'semantic',
      { importance: 0.9 }
    );
  }

  /**
   * Store temporary working memory
   */
  async storeWorkingMemory(key: string, data: any): Promise<Id<'agentMemory'>> {
    return await this.store(
      ['working', key],
      data,
      'working',
      { ttl: 7200000 } // 2 hours
    );
  }

  /**
   * Store error information
   */
  async storeError(context: string, error: any): Promise<Id<'agentMemory'>> {
    return await this.store(
      ['error', context, Date.now().toString()],
      {
        error: error.message || error,
        stack: error.stack,
        context,
        timestamp: Date.now(),
      },
      'episodic',
      { importance: 1.0, ttl: 86400000 } // 24 hours
    );
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    // @ts-ignore - Using internal API
    return await this.ctx.runQuery(internal.ai.memory.sharedMemory.getMemoryStats, {
      organizationId: this.organizationId,
      crewId: this.crewId,
    });
  }

  /**
   * Lock memory for exclusive access
   */
  async lock(memoryId: Id<'agentMemory'>, durationMs?: number): Promise<boolean> {
    if (!this.agentId) {
      throw new ConvexError('Agent ID required for locking memory');
    }
    
    // @ts-ignore - Using internal API
    return await this.ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
      memoryId,
      agentId: this.agentId,
      lockDurationMs: durationMs,
    });
  }

  /**
   * Unlock memory
   */
  async unlock(memoryId: Id<'agentMemory'>): Promise<boolean> {
    if (!this.agentId) {
      throw new ConvexError('Agent ID required for unlocking memory');
    }
    
    // @ts-ignore - Using internal API
    return await this.ctx.runMutation(internal.ai.memory.sharedMemory.unlockMemory, {
      memoryId,
      agentId: this.agentId,
    });
  }

  /**
   * Summarize memories when approaching limits
   */
  async summarize(maxMemories?: number, minImportance?: number): Promise<{ summarized: number; deleted: number }> {
    if (!this.crewId) {
      throw new ConvexError('Crew ID required for summarization');
    }
    
    // @ts-ignore - Using internal API
    return await this.ctx.runMutation(internal.ai.memory.sharedMemory.summarizeMemories, {
      organizationId: this.organizationId,
      crewId: this.crewId,
      maxMemories,
      minImportance,
    });
  }

  /**
   * Clean up expired memories
   */
  async cleanup(): Promise<{ deleted: number }> {
    // @ts-ignore - Using internal API
    return await this.ctx.runMutation(internal.ai.memory.sharedMemory.cleanupExpiredMemories, {
      organizationId: this.organizationId,
    });
  }

  /**
   * Build hierarchical memory key
   */
  private buildMemoryKey(parts: string[]): string {
    const baseParts = [];
    
    if (this.crewId) baseParts.push('crew', this.crewId);
    if (this.sessionId) baseParts.push('session', this.sessionId);
    if (this.agentId) baseParts.push('agent', this.agentId);
    
    return [...baseParts, ...parts].join('.');
  }

  /**
   * Create a child memory manager with additional context
   */
  withContext(context: { agentId?: string; crewId?: string; sessionId?: string }): MemoryManager {
    return new MemoryManager(this.ctx, this.organizationId, {
      agentId: context.agentId || this.agentId,
      crewId: context.crewId || this.crewId,
      sessionId: context.sessionId || this.sessionId,
    });
  }
}

/**
 * Memory cache for frequently accessed memories
 */
export class MemoryCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 300000) { // 5 minutes default
    this.ttl = ttlMs;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}