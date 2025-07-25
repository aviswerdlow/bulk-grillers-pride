import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
import { convexTest } from '../../test-helpers';

describe('Imports API', () => {
  let ctx: any;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    ctx = await t.run(async (ctx) => ctx);

    // Create test user
    userId = await ctx.db.insert('users', {
      clerkId: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test organization
    orgId = await ctx.db.insert('organizations', {
      name: 'Test Organization',
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

    // Create organization membership
    await ctx.db.insert('organizationMemberships', {
      organizationId: orgId,
      userId,
      role: 'admin',
      status: 'active',
      permissions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test project
    projectId = await ctx.db.insert('projects', {
      organizationId: orgId,
      name: 'Test Project',
      slug: 'test-project',
      status: 'active',
      settings: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock auth
    ctx.auth = {
      getUserIdentity: jest.fn().mockResolvedValue({ 
        subject: 'user_123',
        tokenIdentifier: 'user_123'
      }),
    };
  });

  describe('getImportJobs', () => {
    beforeEach(async () => {
      // Create test import jobs
      const statuses = ['completed', 'failed', 'processing', 'pending'];
      const jobTypes = ['products', 'categories', 'products', 'variants'];
      
      for (let i = 0; i < 4; i++) {
        await ctx.db.insert('importJobs', {
          organizationId: orgId,
          projectId,
          jobType: jobTypes[i] as any,
          fileName: `import-${i}.csv`,
          fileSize: 1024 * (i + 1),
          fileUrl: `https://storage.example.com/import-${i}.csv`,
          status: statuses[i] as any,
          progress: {
            total: 100,
            processed: statuses[i] === 'completed' ? 100 : 
                      statuses[i] === 'failed' ? 80 :
                      statuses[i] === 'processing' ? 50 : 0,
            successful: statuses[i] === 'completed' ? 95 : 
                       statuses[i] === 'failed' ? 60 : 
                       statuses[i] === 'processing' ? 45 : 0,
            failed: statuses[i] === 'completed' ? 5 : 
                   statuses[i] === 'failed' ? 20 : 
                   statuses[i] === 'processing' ? 5 : 0,
            skipped: 0,
          },
          fieldMapping: {
            name: 'product_name',
            description: 'product_description',
            price: 'price',
            options: {
              createMissingCategories: i % 2 === 0,
              defaultStatus: 'active',
            },
          },
          errors: statuses[i] === 'failed' ? [
            { row: 10, field: 'price', message: 'Invalid price format' },
            { row: 25, field: 'name', message: 'Name is required' },
          ] : [],
          createdBy: userId,
          createdAt: Date.now() - (i * 3600000), // Different hours
          updatedAt: Date.now() - (i * 1800000),
        });
      }
    });

    it('should return all import jobs for organization', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getImportJobs', {
        organizationId: orgId,
      });

      expect(result).toHaveLength(4);
      expect(result[0].fileName).toBe('import-0.csv'); // Newest first
      expect(result[3].fileName).toBe('import-3.csv');
    });

    it('should filter by project', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create another project with import
      const projectId2 = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Second Project',
        slug: 'second-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId: projectId2,
        jobType: 'products',
        fileName: 'second-project-import.csv',
        fileSize: 2048,
        status: 'completed',
        progress: { total: 50, processed: 50, successful: 50, failed: 0, skipped: 0 },
        fieldMapping: { name: 'name', options: {} },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery('getImportJobs', {
        organizationId: orgId,
        projectId,
      });

      expect(result).toHaveLength(4);
      expect(result.every((job: any) => job.projectId === projectId)).toBe(true);
    });

    it('should filter by status', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getImportJobs', {
        organizationId: orgId,
        status: 'completed',
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].progress.processed).toBe(100);
    });

    it('should filter by job type', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getImportJobs', {
        organizationId: orgId,
        jobType: 'products',
      });

      expect(result).toHaveLength(2);
      expect(result.every((job: any) => job.jobType === 'products')).toBe(true);
    });

    it('should include user information', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getImportJobs', {
        organizationId: orgId,
      });

      expect(result[0].user).toBeDefined();
      expect(result[0].user.name).toBe('Test User');
      expect(result[0].user.email).toBe('test@example.com');
    });
  });

  describe('getImportJob', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'products',
        fileName: 'detailed-import.csv',
        fileSize: 4096,
        fileUrl: 'https://storage.example.com/detailed-import.csv',
        status: 'completed',
        progress: {
          total: 200,
          processed: 200,
          successful: 180,
          failed: 15,
          skipped: 5,
        },
        fieldMapping: {
          name: 'product_name',
          description: 'description',
          price: 'unit_price',
          sku: 'sku_code',
          options: {
            createMissingCategories: true,
            defaultStatus: 'draft',
            updateExisting: true,
          },
        },
        errors: [
          { row: 45, field: 'price', message: 'Price must be a positive number' },
          { row: 67, field: 'sku', message: 'SKU already exists' },
          { row: 123, field: 'name', message: 'Name cannot be empty' },
        ],
        results: {
          created: 150,
          updated: 30,
          skipped: 5,
          failed: 15,
        },
        createdBy: userId,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000,
        completedAt: Date.now() - 1800000,
      });
    });

    it('should return detailed import job information', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getImportJob', { jobId });

      expect(result).toBeDefined();
      expect(result._id).toBe(jobId);
      expect(result.fileName).toBe('detailed-import.csv');
      expect(result.progress.total).toBe(200);
      expect(result.progress.successful).toBe(180);
      expect(result.errors).toHaveLength(3);
      expect(result.results.created).toBe(150);
      expect(result.results.updated).toBe(30);
    });

    it('should throw error for non-existent job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await expect(
        ctx.runQuery('getImportJob', { jobId: 'nonexistent' as any })
      ).rejects.toThrow();
    });

    it('should throw error when user not in organization', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create job in different org
      const otherOrgId = await ctx.db.insert('organizations', {
        name: 'Other Org',
        clerkOrganizationId: 'org_456',
        slug: 'other-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const otherJobId = await ctx.db.insert('importJobs', {
        organizationId: otherOrgId,
        projectId: 'other_project' as any,
        jobType: 'products',
        fileName: 'other.csv',
        fileSize: 1024,
        status: 'completed',
        progress: { total: 10, processed: 10, successful: 10, failed: 0, skipped: 0 },
        fieldMapping: { name: 'name', options: {} },
        createdBy: 'other_user' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runQuery('getImportJob', { jobId: otherJobId })
      ).rejects.toThrow();
    });
  });

  describe('createImportJob', () => {
    it('should create new import job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const importData = {
        organizationId: orgId,
        projectId,
        jobType: 'products' as const,
        fileName: 'new-products.csv',
        fileSize: 2048,
        fileUrl: 'https://storage.example.com/new-products.csv',
        fieldMapping: {
          name: 'product_title',
          description: 'product_desc',
          price: 'price_usd',
          options: {
            createMissingCategories: true,
            defaultStatus: 'active' as const,
          },
        },
      };

      const result = await ctx.runMutation('createImportJob', importData);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.progress).toEqual({
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      });
      expect(result.fieldMapping.options.createMissingCategories).toBe(true);
      expect(result.createdBy).toBe(userId);
    });

    it('should validate required fields', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await expect(
        ctx.runMutation('createImportJob', {
          organizationId: orgId,
          projectId,
          jobType: 'products',
          fileName: 'invalid.csv',
          fileSize: 2048,
          fieldMapping: {
            // Missing required 'name' field mapping
            description: 'desc',
            options: {},
          },
        })
      ).rejects.toThrow();
    });

    it('should create audit log entry', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('createImportJob', {
        organizationId: orgId,
        projectId,
        jobType: 'categories',
        fileName: 'categories.json',
        fileSize: 1024,
        fieldMapping: {
          name: 'category_name',
          slug: 'category_slug',
          options: {},
        },
      });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), result._id))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('import.created');
      expect(auditLogs[0].entityType).toBe('import');
      expect(auditLogs[0].context.jobType).toBe('categories');
      expect(auditLogs[0].context.fileName).toBe('categories.json');
    });
  });

  describe('updateImportJobProgress', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'products',
        fileName: 'progress-test.csv',
        fileSize: 3072,
        status: 'processing',
        progress: {
          total: 100,
          processed: 25,
          successful: 20,
          failed: 3,
          skipped: 2,
        },
        fieldMapping: { name: 'name', options: {} },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update progress incrementally', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const updates = {
        jobId,
        progress: {
          processed: 50,
          successful: 45,
          failed: 4,
          skipped: 1,
        },
      };

      const result = await ctx.runMutation('updateImportJobProgress', updates);

      expect(result.progress.total).toBe(100); // Unchanged
      expect(result.progress.processed).toBe(50);
      expect(result.progress.successful).toBe(45);
      expect(result.progress.failed).toBe(4);
      expect(result.progress.skipped).toBe(1);
      expect(result.status).toBe('processing'); // Still processing
    });

    it('should auto-complete when all processed', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('updateImportJobProgress', {
        jobId,
        progress: {
          processed: 100,
          successful: 90,
          failed: 7,
          skipped: 3,
        },
      });

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should handle errors during processing', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('updateImportJobProgress', {
        jobId,
        progress: {
          processed: 50,
          successful: 40,
          failed: 10,
        },
        errors: [
          { row: 30, field: 'price', message: 'Invalid format' },
          { row: 45, field: 'sku', message: 'Duplicate SKU' },
        ],
      });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].row).toBe(30);
    });
  });

  describe('cancelImportJob', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'products',
        fileName: 'cancel-test.csv',
        fileSize: 2048,
        status: 'processing',
        progress: {
          total: 200,
          processed: 50,
          successful: 45,
          failed: 5,
          skipped: 0,
        },
        fieldMapping: { name: 'name', options: {} },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should cancel processing job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('cancelImportJob', { jobId });

      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toBeDefined();
      expect(result.cancelledBy).toBe(userId);
    });

    it('should not cancel completed job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update job to completed
      await ctx.db.patch(jobId, {
        status: 'completed',
        completedAt: Date.now(),
      });

      await expect(
        ctx.runMutation('cancelImportJob', { jobId })
      ).rejects.toThrow('Cannot cancel completed job');
    });

    it('should create audit log for cancellation', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await ctx.runMutation('cancelImportJob', { jobId });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), jobId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('import.cancelled');
      expect(auditLogs[0].context.processedCount).toBe(50);
    });
  });

  describe('retryImportJob', () => {
    let failedJobId: string;

    beforeEach(async () => {
      failedJobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'products',
        fileName: 'retry-test.csv',
        fileSize: 1536,
        fileUrl: 'https://storage.example.com/retry-test.csv',
        status: 'failed',
        progress: {
          total: 100,
          processed: 80,
          successful: 60,
          failed: 20,
          skipped: 0,
        },
        fieldMapping: { name: 'name', options: {} },
        errors: [
          { row: 15, field: 'price', message: 'Network error' },
        ],
        createdBy: userId,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000,
      });
    });

    it('should create new import job from failed job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('retryImportJob', { jobId: failedJobId });

      expect(result).toBeDefined();
      expect(result._id).not.toBe(failedJobId); // New job created
      expect(result.status).toBe('pending');
      expect(result.fileName).toBe('retry-test.csv (Retry)');
      expect(result.fileUrl).toBe('https://storage.example.com/retry-test.csv');
      expect(result.fieldMapping).toEqual({ name: 'name', options: {} });
      expect(result.retryOf).toBe(failedJobId);
    });

    it('should only retry failed or cancelled jobs', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const completedJobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'products',
        fileName: 'completed.csv',
        fileSize: 1024,
        status: 'completed',
        progress: { total: 10, processed: 10, successful: 10, failed: 0, skipped: 0 },
        fieldMapping: { name: 'name', options: {} },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runMutation('retryImportJob', { jobId: completedJobId })
      ).rejects.toThrow('Can only retry failed or cancelled jobs');
    });
  });
});