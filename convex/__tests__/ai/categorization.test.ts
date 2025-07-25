import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
// Jest doesn't need explicit imports for describe, it, expect, beforeEach;
import { convexTest } from '../../test-helpers';

describe('AI Categorization', () => {
  let ctx: any;

  beforeEach(async () => {
    ctx = await t.run(async (ctx) => ctx);
  });

  describe('getCategorizationJob', () => {
    it('should fetch job from database correctly', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create mock user
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create mock organization
      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create membership
      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create project
      const projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create AI categorization job
      const jobId = await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'batch',
        status: 'pending',
        prompt: 'Test prompt',
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        productIds: [],
        categoryContext: {},
        progress: {
          total: 10,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        },
        results: [],
        errors: [],
        notifications: { onComplete: true, onError: true },
        notificationsSent: false,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock auth
      ctx.auth = {
        getUserIdentity: jest.fn().mockResolvedValue({ subject: 'user_123' }),
      };

      // Test the getCategorizationJob query
      const job = await ctx.runQuery(
        'getCategorizationJob',
        { jobId }
      );

      // Verify job was fetched correctly
      expect(job).toBeDefined();
      expect(job._id).toBe(jobId);
      expect(job.status).toBe('pending');
      expect(job.aiProvider).toBe('openai');
      expect(job.aiModel).toBe('gpt-4');
      expect(job.progress.total).toBe(10);
    });

    it('should throw error if job not found', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Mock auth
      ctx.auth = {
        getUserIdentity: jest.fn().mockResolvedValue({ subject: 'user_123' }),
      };

      // Create user
      await ctx.db.insert('users', {
        clerkId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Test with non-existent job ID
      await expect(
        ctx.runQuery('getCategorizationJob', {
          jobId: '123456789abcdef123456789' as any,
        })
      ).rejects.toThrow('Job not found');
    });
  });

  describe('applyCategorization', () => {
    it('should create categoryProductAssignment correctly', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create required entities
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const categoryId = await ctx.db.insert('categories', {
        organizationId: orgId,
        projectId,
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
        isActive: true,
        productCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const productId = await ctx.db.insert('products', {
        organizationId: orgId,
        projectId,
        name: 'Test Product',
        handle: 'test-product',
        title: 'Test Product Title',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const jobId = await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'batch',
        status: 'running',
        prompt: 'Test prompt',
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        productIds: [productId],
        categoryContext: {},
        progress: {
          total: 1,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        },
        results: [],
        errors: [],
        notifications: { onComplete: true, onError: true },
        notificationsSent: false,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock auth
      ctx.auth = {
        getUserIdentity: jest.fn().mockResolvedValue({ subject: 'user_123' }),
      };

      // Apply categorization
      const result = await ctx.runMutation(
        'applyCategorization',
        {
          jobId,
          productId,
          categoryId,
          confidence: 0.95,
          rationale: 'High confidence match based on product attributes',
        }
      );

      expect(result).toBe(productId);

      // Verify assignment was created
      const assignments = await ctx.db
        .query('categoryProductAssignments')
        .filter((q: any) => q.eq(q.field('productId'), productId))
        .collect();

      expect(assignments).toHaveLength(1);
      expect(assignments[0].categoryId).toBe(categoryId);
      expect(assignments[0].assignedBy).toBe('ai');
      expect(assignments[0].confidence).toBe(0.95);
      expect(assignments[0].rationale).toBe('High confidence match based on product attributes');
      expect(assignments[0].status).toBe('active');
    });
  });
});