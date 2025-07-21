/**
 * Tests for CrewAI Memory Cache Integration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createConvexTest } from '../../../../__tests__/convex-test-standard';
import { Id } from '../../../../_generated/dataModel';
import { internal } from '../../../../_generated/api';

// Mock test context
let test: any;

describe('CacheIntegration', () => {
  let organizationId: Id<'organizations'>;

  beforeEach(async () => {
    test = createConvexTest();
    // Create test organization
    organizationId = await test.mutation(async (ctx) => {
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

  describe('Basic Cache Operations', () => {
    it('should write and read from cache', async () => {
      const testData = { value: 'test data', timestamp: Date.now() };
      
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.writeToCache, {
          key: 'test-key',
          value: testData,
          dataType: 'test',
          organizationId,
        });
      });

      const result = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: 'test-key',
        });
      });

      expect(result).toBeTruthy();
      expect(result?.value).toEqual(testData);
      expect(result?.hits).toBe(0);
    });

    it('should update hits on read', async () => {
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.writeToCache, {
          key: 'hit-test',
          value: { data: 'hit test' },
          dataType: 'test',
        });
      });

      // First read
      await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: 'hit-test',
          updateHits: true,
        });
      });

      // Second read
      const result = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: 'hit-test',
          updateHits: true,
        });
      });

      expect(result?.hits).toBe(2);
    });

    it('should handle cache expiration', async () => {
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.writeToCache, {
          key: 'expire-test',
          value: { data: 'expires' },
          dataType: 'test',
          ttlMs: 100, // 100ms
        });
      });

      // Should be available immediately
      const result1 = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: 'expire-test',
        });
      });
      expect(result1).toBeTruthy();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      const result2 = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: 'expire-test',
        });
      });
      expect(result2).toBeNull();
    });
  });

  describe('Memory Cache Operations', () => {
    it('should cache memory lookups', async () => {
      const memoryData = {
        content: { data: 'test memory' },
        importance: 0.8,
        createdAt: Date.now(),
      };

      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.cacheMemoryLookup, {
          memoryKey: 'test.memory.1',
          memoryData,
          organizationId,
        });
      });

      const cached = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.getCachedMemory, {
          memoryKey: 'test.memory.1',
          organizationId,
        });
      });

      expect(cached?.value).toEqual(memoryData);
    });

    it('should cache analysis results', async () => {
      const analysis = {
        features: ['durable', 'waterproof'],
        quality: 0.85,
        timestamp: Date.now(),
      };

      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.cacheAnalysisResult, {
          productId: 'prod123',
          analysis,
          organizationId,
          agentId: 'analyzer-1',
        });
      });

      const cached = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.getCachedAnalysis, {
          productId: 'prod123',
          organizationId,
          agentId: 'analyzer-1',
        });
      });

      expect(cached?.value).toEqual(analysis);
    });

    it('should cache category matches', async () => {
      const categoryMatch = {
        categoryId: 'cat456',
        confidence: 0.9,
        reasons: ['keyword match', 'description similarity'],
      };

      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.cacheCategoryMatch, {
          productId: 'prod123',
          categoryMatch,
          organizationId,
          agentId: 'matcher-1',
        });
      });

      // Should use same key format
      const cacheKey = `crewai.category.${organizationId}.matcher-1.prod123`;
      const cached = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: cacheKey,
        });
      });

      expect(cached?.value).toEqual(categoryMatch);
    });

    it('should cache validation results', async () => {
      const validation = {
        isValid: true,
        issues: [],
        score: 0.95,
      };

      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.cacheValidationResult, {
          productId: 'prod123',
          validation,
          organizationId,
          agentId: 'validator-1',
        });
      });

      // Check it was cached
      const cacheKey = `crewai.validation.${organizationId}.validator-1.prod123`;
      const cached = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: cacheKey,
        });
      });

      expect(cached?.value).toEqual(validation);
    });

    it('should cache memory statistics', async () => {
      const stats = {
        totalMemories: 100,
        totalSizeBytes: 1024000,
        averageImportance: 0.75,
      };

      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.cacheMemoryStats, {
          stats,
          organizationId,
          crewId: 'crew-1',
        });
      });

      const cacheKey = `crewai.stats.${organizationId}.crew-1`;
      const cached = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: cacheKey,
        });
      });

      expect(cached?.value).toEqual(stats);
    });
  });

  describe('Batch Operations', () => {
    it('should batch write multiple cache entries', async () => {
      const entries = [
        { key: 'batch1', value: { data: 1 }, dataType: 'test' },
        { key: 'batch2', value: { data: 2 }, dataType: 'test' },
        { key: 'batch3', value: { data: 3 }, dataType: 'test' },
      ];

      const results = await test.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.cacheIntegration.batchCacheWrite, {
          entries,
        });
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r !== null)).toBe(true);

      // Verify all were written
      const batch = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.batchCacheRead, {
          keys: ['batch1', 'batch2', 'batch3'],
        });
      });

      expect(Object.keys(batch)).toHaveLength(3);
      expect(batch.batch1.value).toEqual({ data: 1 });
      expect(batch.batch2.value).toEqual({ data: 2 });
      expect(batch.batch3.value).toEqual({ data: 3 });
    });

    it('should batch read multiple cache entries', async () => {
      // Write test data
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.batchCacheWrite, {
          entries: [
            { key: 'read1', value: { value: 'a' }, dataType: 'test' },
            { key: 'read2', value: { value: 'b' }, dataType: 'test' },
            { key: 'read3', value: { value: 'c' }, dataType: 'test' },
          ],
        });
      });

      const results = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.batchCacheRead, {
          keys: ['read1', 'read2', 'read3', 'nonexistent'],
        });
      });

      expect(Object.keys(results)).toHaveLength(3);
      expect(results.read1.value).toEqual({ value: 'a' });
      expect(results.read2.value).toEqual({ value: 'b' });
      expect(results.read3.value).toEqual({ value: 'c' });
      expect(results.nonexistent).toBeUndefined();
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear expired cache entries', async () => {
      // Create entries with short TTL
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.batchCacheWrite, {
          entries: [
            { key: 'expire1', value: { data: 1 }, dataType: 'test', ttlMs: 100 },
            { key: 'expire2', value: { data: 2 }, dataType: 'test', ttlMs: 100 },
            { key: 'persist1', value: { data: 3 }, dataType: 'test', ttlMs: 10000 },
          ],
        });
      });

      // Wait for some to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Clear expired
      const result = await test.mutation(async (ctx) => {
        return await ctx.runMutation(internal.ai.memory.cacheIntegration.clearExpiredCache, {
          organizationId,
        });
      });

      expect(result.deleted).toBe(2);

      // Verify persistent entry still exists
      const persistent = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, {
          key: 'persist1',
        });
      });
      expect(persistent).toBeTruthy();
    });
  });

  describe('Cache Statistics', () => {
    it('should collect cache statistics', async () => {
      // Create diverse cache entries
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.batchCacheWrite, {
          entries: [
            { key: 'stat1', value: { data: 'a'.repeat(100) }, dataType: 'memory', organizationId },
            { key: 'stat2', value: { data: 'b'.repeat(200) }, dataType: 'memory', organizationId },
            { key: 'stat3', value: { data: 'c'.repeat(150) }, dataType: 'analysis', organizationId },
            { key: 'stat4', value: { data: 'd'.repeat(50) }, dataType: 'analysis', organizationId, ttlMs: 1 },
          ],
        });
      });

      // Read some entries to generate hits
      await test.query(async (ctx) => {
        await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, { key: 'stat1' });
        await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, { key: 'stat1' });
        await ctx.runQuery(internal.ai.memory.cacheIntegration.readFromCache, { key: 'stat3' });
      });

      // Wait for one to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const stats = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.getCacheStats, {
          organizationId,
        });
      });

      expect(stats.totalEntries).toBe(4);
      expect(stats.activeEntries).toBe(3);
      expect(stats.expiredEntries).toBe(1);
      expect(stats.totalHits).toBe(3);
      expect(stats.byType.memory.count).toBe(2);
      expect(stats.byType.analysis.count).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should filter statistics by data type', async () => {
      await test.mutation(async (ctx) => {
        await ctx.runMutation(internal.ai.memory.cacheIntegration.batchCacheWrite, {
          entries: [
            { key: 'type1', value: { data: 1 }, dataType: 'memory', organizationId },
            { key: 'type2', value: { data: 2 }, dataType: 'memory', organizationId },
            { key: 'type3', value: { data: 3 }, dataType: 'analysis', organizationId },
          ],
        });
      });

      const memoryStats = await test.query(async (ctx) => {
        return await ctx.runQuery(internal.ai.memory.cacheIntegration.getCacheStats, {
          organizationId,
          dataType: 'memory',
        });
      });

      expect(memoryStats.totalEntries).toBe(2);
      expect(memoryStats.byType.memory.count).toBe(2);
      expect(memoryStats.byType.analysis).toBeUndefined();
    });
  });
});