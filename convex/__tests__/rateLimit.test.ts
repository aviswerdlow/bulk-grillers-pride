import { describe, it, expect, beforeEach } from '@jest/globals';
import { convexTest } from './test-helpers';
import { 
  checkRateLimit, 
  consumeRateLimit, 
  recordViolation,
  RATE_LIMIT_RESOURCES,
  WINDOW_DURATIONS,
  getRateLimitStatus
} from '../lib/rateLimit';
import { Id } from '../_generated/dataModel';

describe('Rate Limiting', () => {
  const testUserId = 'user123' as Id<'users'>;
  const testOrgId = 'org123' as Id<'organizations'>;
  
  beforeEach(() => {
    // Reset any in-memory state if needed
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const t = convexTest();
      
      // Set up test organization
      await t.run(async (ctx) => {
        await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          status: 'active',
          subscription: {
            plan: 'starter',
            status: 'active',
            seats: 5,
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
              allowedFileTypes: ['image/jpeg', 'image/png'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        } as any);
      });
      
      const result = await t.run(async (ctx) => {
        const check = await checkRateLimit(ctx as any, {
          resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
          identifier: testUserId,
          organizationId: testOrgId,
          userId: testUserId,
        });
        
        return check;
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block requests exceeding rate limit', async () => {
      const t = convexTest();
      
      // Set up test organization with free plan (lower limits)
      await t.run(async (ctx) => {
        await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          status: 'active',
          subscription: {
            plan: 'free',
            status: 'active',
            seats: 1,
            features: [],
          },
          settings: {
            aiProvider: 'openai',
            aiModel: 'gpt-3.5-turbo',
            apiKeys: {
              openai: 'test-key',
            },
            categorization: {
              batchSize: 5,
              prompt: 'Test prompt',
              autoApprove: false,
              confidenceThreshold: 0.8,
            },
            storage: {
              maxFileSize: 5242880,
              totalStorageLimit: 104857600,
              allowedFileTypes: ['image/jpeg'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        } as any);
      });
      
      // Consume all available requests
      const limit = 5; // Free plan limit
      for (let i = 0; i < limit; i++) {
        await t.run(async (ctx) => {
          await consumeRateLimit(ctx as any, {
            resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
            identifier: testUserId,
            organizationId: testOrgId,
            userId: testUserId,
          });
        });
      }
      
      // Next request should be blocked
      const result = await t.run(async (ctx) => {
        const check = await checkRateLimit(ctx as any, {
          resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
          identifier: testUserId,
          organizationId: testOrgId,
          userId: testUserId,
        });
        
        return check;
      });
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should respect token limits for AI endpoints', async () => {
      const t = convexTest();
      
      await t.run(async (ctx) => {
        await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          status: 'active',
          subscription: {
            plan: 'starter',
            status: 'active',
            seats: 5,
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
              allowedFileTypes: ['image/jpeg', 'image/png'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        } as any);
      });
      
      // Check with high token usage
      const result = await t.run(async (ctx) => {
        const check = await checkRateLimit(ctx as any, {
          resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
          identifier: testUserId,
          organizationId: testOrgId,
          userId: testUserId,
          tokensUsed: 1000000, // High token count
        });
        
        return check;
      });
      
      // Should block if exceeding daily token limit
      expect(result.allowed).toBe(true); // Starter plan has 500k daily limit
    });
  });

  describe('recordViolation', () => {
    it('should record rate limit violations with correct severity', async () => {
      const t = convexTest();
      
      await t.run(async (ctx) => {
        await recordViolation(ctx as any, {
          resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
          identifier: testUserId,
          organizationId: testOrgId,
          userId: testUserId,
          endpoint: 'test-endpoint',
          method: 'MUTATION',
          requestCount: 15,
          limit: 10,
        });
      });
      
      const violation = await t.run(async (ctx) => {
        const violations = await ctx.db
          .query('rateLimitViolations')
          .withIndex('by_identifier_time', (q) => 
            q.eq('identifier', testUserId)
          )
          .order('desc')
          .first();
        
        return violations;
      });
      
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('low'); // 15/10 = 1.5x, which is low severity
      expect(violation?.resource).toBe(RATE_LIMIT_RESOURCES.AI_CATEGORIZATION);
    });

    it('should mark repeat offenders', async () => {
      const t = convexTest();
      
      // Record multiple violations
      for (let i = 0; i < 6; i++) {
        await t.run(async (ctx) => {
          await recordViolation(ctx as any, {
            resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
            identifier: testUserId,
            organizationId: testOrgId,
            userId: testUserId,
            endpoint: 'test-endpoint',
            method: 'MUTATION',
            requestCount: 15,
            limit: 10,
          });
        });
      }
      
      const lastViolation = await t.run(async (ctx) => {
        const violations = await ctx.db
          .query('rateLimitViolations')
          .withIndex('by_identifier_time', (q) => 
            q.eq('identifier', testUserId)
          )
          .order('desc')
          .first();
        
        return violations;
      });
      
      expect(lastViolation?.isRepeatOffender).toBe(true);
      expect(lastViolation?.violationCount24h).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return comprehensive rate limit status', async () => {
      const t = convexTest();
      
      await t.run(async (ctx) => {
        await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          status: 'active',
          subscription: {
            plan: 'professional',
            status: 'active',
            seats: 10,
            features: ['ai-categorization', 'bulk-operations'],
          },
          settings: {
            aiProvider: 'openai',
            aiModel: 'gpt-4',
            apiKeys: {
              openai: 'test-key',
            },
            categorization: {
              batchSize: 20,
              prompt: 'Test prompt',
              autoApprove: true,
              confidenceThreshold: 0.7,
            },
            storage: {
              maxFileSize: 52428800,
              totalStorageLimit: 10737418240,
              allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        } as any);
      });
      
      const status = await t.run(async (ctx) => {
        return await getRateLimitStatus(
          ctx as any,
          testOrgId,
          testUserId,
          RATE_LIMIT_RESOURCES.AI_CATEGORIZATION
        );
      });
      
      expect(status.limits).toBeDefined();
      expect(status.usage).toBeDefined();
      expect(status.resetTimes).toBeDefined();
      expect(status.limits.requestsPerMinute).toBe(50); // Professional plan
      expect(status.limits.tokensPerDay).toBe(2000000); // Professional plan
    });
  });

  describe('Rate limit window expiration', () => {
    it('should reset counts when window expires', async () => {
      const t = convexTest();
      
      await t.run(async (ctx) => {
        await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          status: 'active',
          subscription: {
            plan: 'starter',
            status: 'active',
            seats: 5,
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
              allowedFileTypes: ['image/jpeg', 'image/png'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        } as any);
        
        // Create an expired rate limit record
        const oldWindowStart = Math.floor((Date.now() - 120000) / 60000) * 60000; // 2 minutes ago
        await ctx.db.insert('rateLimits', {
          organizationId: testOrgId,
          userId: testUserId,
          identifier: testUserId,
          resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
          windowStart: oldWindowStart,
          windowDuration: WINDOW_DURATIONS.MINUTE,
          requestCount: 20, // Maxed out
          limit: 20,
          isBlocked: false,
          lastRequest: oldWindowStart + 30000,
          createdAt: oldWindowStart,
          updatedAt: oldWindowStart + 30000,
        } as any);
      });
      
      // Check rate limit in new window
      const result = await t.run(async (ctx) => {
        const check = await checkRateLimit(ctx as any, {
          resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
          identifier: testUserId,
          organizationId: testOrgId,
          userId: testUserId,
        });
        
        return check;
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // New window, fresh limit minus 1
    });
  });
});