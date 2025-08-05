import { internal } from "../../_generated/api";
import { t } from '../../../../t.setup';
/**
 * Tests for CrewAI Shared Memory System
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createConvexTest } from '../../../../__tests__/convex-test-standard';
import { MemoryManager, MemoryCache } from '../memoryManager';
import { Id } from '../../../../_generated/dataModel';
import { api, internal } from '../../../../_generated/api';

// Mock test context
let test: any;

describe('SharedMemory', () => {
  let organizationId: Id<'organizations'>;

  beforeEach(async () => {
    
    // test is already imported from test.setup
    // Create test organization
    organizationId = await t.mutation(async (ctx) => {
      return await ctx.db.insert('organizations', {
        name: 'Test Organization',
        slug: 'test-org',
        status: 'active',
        subscription: {
          plan: 'pro',
          status: 'active',
          seats: 10,
          features: ['ai-categorization'],
        },
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4',
          apiKeys: {
            openai: 'test-key',
          },
          categorization: {
            batchSize: 10,
            prompt: 'Test prompt',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['csv', 'xlsx'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });
  });

  describe('Memory Storage and Retrieval', () => {
    it('should store and retrieve memory successfully', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await t.mutation(async (ctx) => {
        const memoryId = await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.memory.1',
          memoryType: 'working',
          content: { data: 'test content', value: 123 },
          agentId: 'test-agent',
        });

        expect(memoryId).toBeTruthy();
      });

      const result = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.readMemory, {
          organizationId,
          memoryKey: 't.memory.1',
          agentId: 'test-agent',
        });
      });

      expect(result).toBeTruthy();
      expect(result?.content).toEqual({ data: 'test content', value: 123 });
      expect(result?.memoryType).toBe('working');
    });

    it('should update existing memory', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // First write
      await t.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.memory.update',
          memoryType: 'working',
          content: { version: 1 },
          agentId: 'test-agent',
        });
      });

      // Update
      await t.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.memory.update',
          memoryType: 'working',
          content: { version: 2 },
          agentId: 'test-agent',
        });
      });

      const result = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.readMemory, {
          organizationId,
          memoryKey: 't.memory.update',
        });
      });

      expect(result?.content).toEqual({ version: 2 });
      expect(result?.version).toBe(2);
      expect(result?.updateCount).toBe(1);
    });

    it('should handle memory expiration', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await t.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.memory.expiring',
          memoryType: 'shortTerm',
          content: { data: 'expires soon' },
          options: { ttl: 1000 }, // 1 second
        });
      });

      // Memory should be available immediately
      const result1 = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.readMemory, {
          organizationId,
          memoryKey: 't.memory.expiring',
        });
      });
      expect(result1).toBeTruthy();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Memory should be expired
      const result2 = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.readMemory, {
          organizationId,
          memoryKey: 't.memory.expiring',
          options: { includeExpired: false },
        });
      });
      expect(result2).toBeNull();

      // But still accessible with includeExpired
      const result3 = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.readMemory, {
          organizationId,
          memoryKey: 't.memory.expiring',
          options: { includeExpired: true },
        });
      });
      expect(result3).toBeTruthy();
    });
  });

  describe('Memory Search', () => {
    beforeEach(async () => {
      // Create test memories
      await t.mutation(async (ctx) => {
        const memories = [
          { key: 'crew.1.analysis.product1', type: 'semantic' as const, importance: 0.8 },
          { key: 'crew.1.analysis.product2', type: 'semantic' as const, importance: 0.6 },
          { key: 'crew.1.match.product1', type: 'semantic' as const, importance: 0.7 },
          { key: 'crew.1.error.timeout', type: 'episodic' as const, importance: 1.0 },
          { key: 'crew.2.analysis.product3', type: 'semantic' as const, importance: 0.5 },
        ];

        for (const memory of memories) {
          await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
            organizationId,
            memoryKey: memory.key,
            memoryType: memory.type,
            content: { key: memory.key },
            crewId: memory.key.split('.')[1],
            options: { importance: memory.importance },
          });
        }
      });
    });

    it('should search memories by pattern', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const results = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.searchMemories, {
          organizationId,
          pattern: 'analysis',
        });
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.memoryKey.includes('analysis'))).toBe(true);
    });

    it('should filter by memory type', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const results = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.searchMemories, {
          organizationId,
          memoryType: 'episodic',
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].memoryKey).toContain('error');
    });

    it('should filter by importance', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const results = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.searchMemories, {
          organizationId,
          options: { minImportance: 0.7 },
        });
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.importance >= 0.7)).toBe(true);
    });

    it('should limit results', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const results = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.searchMemories, {
          organizationId,
          options: { maxResults: 2 },
        });
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('Concurrency Control', () => {
    it('should lock memory for exclusive access', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const memoryId = await t.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.lock',
          memoryType: 'working',
          content: { data: 'locked content' },
        });
      });

      // Lock the memory
      await t.mutation(async (ctx) => {
        const locked = await ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
          memoryId,
          agentId: 'agent1',
          lockDurationMs: 5000,
        });
        expect(locked).toBe(true);
      });

      // Another agent should fail to lock
      await expect(
        t.mutation(async (ctx) => {
          await ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
            memoryId,
            agentId: 'agent2',
          });
        })
      ).rejects.toThrow('Memory is locked by agent agent1');

      // Same agent can refresh lock
      await t.mutation(async (ctx) => {
        const locked = await ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
          memoryId,
          agentId: 'agent1',
        });
        expect(locked).toBe(true);
      });
    });

    it('should unlock memory', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const memoryId = await t.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.unlock',
          memoryType: 'working',
          content: { data: 'unlock test' },
        });
      });

      // Lock and unlock
      await t.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
          memoryId,
          agentId: 'agent1',
        });

        await ctx.runMutation(internal.ai.memory.sharedMemory.unlockMemory, {
          memoryId,
          agentId: 'agent1',
        });
      });

      // Another agent should be able to lock now
      await t.mutation(async (ctx) => {
        const locked = await ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
          memoryId,
          agentId: 'agent2',
        });
        expect(locked).toBe(true);
      });
    });

    it('should handle lock expiration', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const memoryId = await t.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.lock.expire',
          memoryType: 'working',
          content: { data: 'expire test' },
        });
      });

      // Lock with short duration
      await t.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.sharedMemory.lockMemory, {
          memoryId,
          agentId: 'agent1',
          lockDurationMs: 100, // 100ms
        });
      });

      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 200));

      // Another agent should be able to write (lock expired)
      await t.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
          organizationId,
          memoryKey: 't.lock.expire',
          memoryType: 'working',
          content: { data: 'updated after lock expired' },
          agentId: 'agent2',
        });
      });
    });
  });

  describe('Memory Summarization', () => {
    it('should summarize memories when limit exceeded', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create many memories
      await t.mutation(async (ctx) => {
        for (let i = 0; i < 10; i++) {
          await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
            organizationId,
            memoryKey: `crew.t.memory.${i}`,
            memoryType: 'semantic',
            content: { index: i, data: `Memory ${i}` },
            crewId: 'test',
            options: { importance: Math.random() },
          });
        }
      });

      // Summarize with low limit
      const result = await t.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.sharedMemory.summarizeMemories, {
          organizationId,
          crewId: 'test',
          maxMemories: 5,
          minImportance: 0.1,
        });
      });

      expect(result.deleted).toBeGreaterThan(0);
      expect(result.summarized).toBeGreaterThan(0);

      // Check that important memories are kept
      const remaining = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.searchMemories, {
          organizationId,
          crewId: 'test',
        });
      });

      expect(remaining.length).toBeLessThanOrEqual(6); // 5 kept + 1 summary
    });
  });

  describe('Memory Statistics', () => {
    it('should calculate memory statistics', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create test memories
      await t.mutation(async (ctx) => {
        const types: Array<'shortTerm' | 'longTerm' | 'episodic'> = ['shortTerm', 'longTerm', 'episodic'];
        
        for (let i = 0; i < 5; i++) {
          await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
            organizationId,
            memoryKey: `t.stats.${i}`,
            memoryType: types[i % types.length],
            content: { index: i },
            crewId: 'stats-test',
            options: {
              importance: 0.5 + (i * 0.1),
              ttl: i < 2 ? 1000 : undefined, // First 2 expire quickly
            },
          });
        }
      });

      const stats = await t.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.sharedMemory.getMemoryStats, {
          organizationId,
          crewId: 'stats-test',
        });
      });

      expect(stats.totalMemories).toBe(5);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.byType).toBeTruthy();
      expect(stats.averageImportance).toBeCloseTo(0.7, 1);
      expect(stats.oldestMemory).toBeTruthy();
      expect(stats.newestMemory).toBeTruthy();
    });
  });

  describe('Memory Cleanup', () => {
    it('should clean up expired memories', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create memories with short TTL
      await t.mutation(async (ctx) => {
        for (let i = 0; i < 3; i++) {
          await ctx.runMutation(internal.ai.memory.sharedMemory.writeMemory, {
            organizationId,
            memoryKey: `t.cleanup.${i}`,
            memoryType: 'shortTerm',
            content: { index: i },
            options: { ttl: 100 }, // 100ms
          });
        }
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Clean up
      const result = await t.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.sharedMemory.cleanupExpiredMemories, {
          organizationId,
        });
      });

      expect(result.deleted).toBe(3);
    });
  });

  describe('MemoryManager', () => {
    it('should provide high-level memory operations', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await t.mutation(async (ctx) => {
        const manager = new MemoryManager(ctx, organizationId, {
          agentId: 'test-agent',
          crewId: 'test-crew',
          sessionId: 'test-session',
        });

        // Store analysis
        const analysisId = await manager.storeAnalysis('product123', {
          features: ['feature1', 'feature2'],
          quality: 0.85,
        });
        expect(analysisId).toBeTruthy();

        // Retrieve analysis
        const analysis = await manager.retrieve(['analysis', 'product123']);
        expect(analysis?.content.quality).toBe(0.85);

        // Store category match
        await manager.storeCategoryMatch('product123', {
          category: 'electronics',
          confidence: 0.9,
        });

        // Search all product memories
        const memories = await manager.search('product123');
        expect(memories.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle working memory', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await t.mutation(async (ctx) => {
        const manager = new MemoryManager(ctx, organizationId, {
          agentId: 'test-agent',
        });

        await manager.storeWorkingMemory('current-batch', {
          products: ['p1', 'p2', 'p3'],
          processed: 0,
        });

        const working = await manager.retrieve(['working', 'current-batch']);
        expect(working?.content.products).toHaveLength(3);
      });
    });

    it('should store errors', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await t.mutation(async (ctx) => {
        const manager = new MemoryManager(ctx, organizationId, {
          agentId: 'test-agent',
        });

        await manager.storeError('api-call', new Error('API timeout'));

        const errors = await manager.search('error', 'episodic');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].content.error).toContain('API timeout');
      });
    });
  });

  describe('MemoryCache', () => {
    it('should cache and retrieve data', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const cache = new MemoryCache(1000); // 1 second TTL

      cache.set('key1', { value: 'test' });
      const result = cache.get('key1');
      expect(result).toEqual({ value: 'test' });
    });

    it('should expire cached data', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const cache = new MemoryCache(100); // 100ms TTL

      cache.set('key1', { value: 'expires' });
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = cache.get('key1');
      expect(result).toBeNull();
    });

    it('should cleanup expired entries', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const cache = new MemoryCache(100);

      cache.set('key1', { value: 1 });
      cache.set('key2', { value: 2 });

      // Wait and add another
      setTimeout(() => cache.set('key3', { value: 3 }), 50);

      // Cleanup after first two expire
      setTimeout(() => {
        cache.cleanup();
        expect(cache.get('key1')).toBeNull();
        expect(cache.get('key2')).toBeNull();
        expect(cache.get('key3')).toBeTruthy();
      }, 150);
    });
  });
});