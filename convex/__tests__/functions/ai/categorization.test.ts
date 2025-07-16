import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the auth module
jest.mock('../../../lib/auth');

import { runQuery, runMutation } from '../../setup/test-runner';
import {
  mockIdentities,
  MockDatabase,
  seedTestData,
  convexAssertions,
  createMockQueryContext,
  createMockMutationContext,
  setupMockAuth,
} from '../../setup/convex-test-helpers';
import {
  getCategorizationJobs,
  getCategorizationJob,
  createCategorizationJob,
  processCategorizationJob,
  // approveCategorizationResult,
  // rejectCategorizationResult,
  // bulkApproveResults
} from '../../../functions/ai/categorization';

// Mock the OpenAI client
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    categorizations: [
                      {
                        productId: 'products_1',
                        suggestedCategories: ['categories_1'],
                        confidence: 0.9,
                        reasoning: 'Test reasoning',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe('ai/categorization', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('getCategorizationJobs', () => {
    it('should return categorization jobs for a project', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create test jobs
      const jobId = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'pending',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getCategorizationJobs, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(jobId);
      expect(result[0].status).toBe('pending');
    });

    it('should filter by status when provided', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create jobs with different statuses
      await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'processing',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'completed',
        productIds: ['products_2'],
        totalProducts: 1,
        processedProducts: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getCategorizationJobs, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'processing',
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('processing');
    });

    it('should order by creation time descending', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const job1Id = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'pending',
        productIds: ['products_1'],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now() - 1000,
        updatedAt: Date.now(),
      });

      const job2Id = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'pending',
        productIds: ['products_2'],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getCategorizationJobs, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result[0]._id).toBe(job2Id);
      expect(result[1]._id).toBe(job1Id);
    });
  });

  describe('getCategorizationJob', () => {
    it('should return job details with results', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const jobId = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'completed',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create results
      await db.insert('categorizationResults', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        jobId: jobId,
        productId: testData.productId,
        suggestedCategories: [testData.rootCategoryId],
        confidence: 0.95,
        reasoning: 'Product matches category criteria',
        status: 'pending',
        createdAt: Date.now(),
      });

      const result = await runQuery(getCategorizationJob, context, { jobId });

      expect(result.job._id).toBe(jobId);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].productId).toBe(testData.productId);
      expect(result.results[0].confidence).toBe(0.95);
    });

    it('should include product details in results', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const jobId = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'completed',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('categorizationResults', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        jobId: jobId,
        productId: testData.productId,
        suggestedCategories: [testData.rootCategoryId],
        confidence: 0.85,
        reasoning: 'Test reasoning',
        status: 'approved',
        approvedBy: testData.userId,
        approvedAt: Date.now(),
        createdAt: Date.now(),
      });

      const result = await runQuery(getCategorizationJob, context, { jobId });

      expect(result.results[0].product).toBeDefined();
      expect(result.results[0].product?.title).toBe('Test Product');
      expect(result.results[0].categories).toHaveLength(1);
      expect(result.results[0].categories[0].name).toBe('Test Category');
    });
  });

  describe('createCategorizationJob', () => {
    it('should create a new categorization job', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create additional products
      const productIds = [testData.productId];
      for (let i = 1; i <= 3; i++) {
        const pid = await db.insert('products', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          title: `Product ${i}`,
          handle: `product-${i}`,
          status: 'active',
          tags: [],
          categories: [],
          images: [],
          metadata: {},
          version: 1,
          createdBy: testData.userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: testData.userId,
        });
        productIds.push(pid);
      }

      const jobId = await runMutation(createCategorizationJob, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        productIds,
      });

      convexAssertions.expectToBeValidId(jobId, 'categorizationJobs');

      const job = await db.get(jobId);
      expect(job.productIds).toEqual(productIds);
      expect(job.totalProducts).toBe(4);
      expect(job.processedProducts).toBe(0);
      expect(job.status).toBe('pending');
      expect(job.createdBy).toBe(testData.userId);
    });

    it('should validate products belong to project', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create product in different project
      const otherProjectId = await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Other Project',
        slug: 'other-project',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title'],
          },
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      const otherProductId = await db.insert('products', {
        organizationId: testData.orgId,
        projectId: otherProjectId,
        title: 'Other Product',
        handle: 'other-product',
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      await expect(
        runMutation(createCategorizationJob, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          productIds: [testData.productId, otherProductId],
        })
      ).rejects.toThrow('All products must belong to the specified project');
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(createCategorizationJob, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          productIds: [testData.productId],
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should schedule processing job', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      const jobId = await runMutation(createCategorizationJob, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        productIds: [testData.productId],
      });

      // Verify scheduler was called
      expect(context.scheduler.runAfter).toHaveBeenCalledWith(0, expect.any(Object), { jobId });
    });
  });

  describe('processCategorizationJob', () => {
    it('should process products and create results', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create a job
      const jobId = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'pending',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Process the job
      await runMutation(processCategorizationJob, context, { jobId });

      // Check job was updated
      const job = await db.get(jobId);
      expect(job.status).toBe('completed');
      expect(job.processedProducts).toBe(1);
      expect(job.completedAt).toBeDefined();

      // Check results were created
      const results = await db
        .query('categorizationResults')
        .withIndex('by_job', (q: any) => q.eq('jobId', jobId))
        .collect();

      expect(results).toHaveLength(1);
      expect(results[0].productId).toBe(testData.productId);
      expect(results[0].suggestedCategories).toEqual([testData.rootCategoryId]);
      expect(results[0].confidence).toBe(0.9);
      expect(results[0].status).toBe('pending');
    });

    it('should handle errors gracefully', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Mock OpenAI to throw error
      const OpenAI = require('openai').default;
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const jobId = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'pending',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await runMutation(processCategorizationJob, context, { jobId });

      const job = await db.get(jobId);
      expect(job.status).toBe('failed');
      expect(job.error).toBe('API Error');
    });

    it('should auto-approve high confidence results', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update org settings to auto-approve
      await db.patch(testData.orgId, {
        settings: {
          ...(await db.get(testData.orgId)).settings,
          categorization: {
            batchSize: 50,
            prompt: 'Categorize the following products',
            autoApprove: true,
            confidenceThreshold: 0.8,
          },
        },
      });

      const jobId = await db.insert('categorizationJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'pending',
        productIds: [testData.productId],
        totalProducts: 1,
        processedProducts: 0,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await runMutation(processCategorizationJob, context, { jobId });

      const results = await db
        .query('categorizationResults')
        .withIndex('by_job', (q: any) => q.eq('jobId', jobId))
        .collect();

      expect(results[0].status).toBe('approved');
      expect(results[0].autoApproved).toBe(true);

      // Check product was updated
      const product = await db.get(testData.productId);
      expect(product.categories).toContain(testData.rootCategoryId);
    });
  });

  // TODO: Re-enable when approveCategorizationResult is implemented
  describe.skip('approveCategorizationResult', () => {
    let resultId: string;

    beforeEach(async () => {
      resultId = await db.insert('categorizationResults', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        jobId: 'categorizationJobs_1',
        productId: testData.productId,
        suggestedCategories: [testData.rootCategoryId, testData.subCategoryId],
        confidence: 0.85,
        reasoning: 'Test reasoning',
        status: 'pending',
        createdAt: Date.now(),
      });
    });

    it('should approve result and update product', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(approveCategorizationResult, context, { resultId });

      // Check result was approved
      const result = await db.get(resultId);
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe(testData.userId);
      expect(result.approvedAt).toBeDefined();

      // Check product was updated
      const product = await db.get(testData.productId);
      expect(product.categories).toContain(testData.rootCategoryId);
      expect(product.categories).toContain(testData.subCategoryId);
    });

    it('should create audit log', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(approveCategorizationResult, context, { resultId });

      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('UPDATE');
      expect(auditLogs[0].entityType).toBe('products');
      expect(auditLogs[0].entityId).toBe(testData.productId);
      expect(auditLogs[0].metadata?.aiCategorization).toBe(true);
    });

    it('should not double-approve', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Approve once
      await runMutation(approveCategorizationResult, context, { resultId });

      // Try to approve again
      await expect(runMutation(approveCategorizationResult, context, { resultId })).rejects.toThrow(
        'Result is not pending'
      );
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(runMutation(approveCategorizationResult, context, { resultId })).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  });

  // TODO: Re-enable when rejectCategorizationResult is implemented
  describe.skip('rejectCategorizationResult', () => {
    let resultId: string;

    beforeEach(async () => {
      resultId = await db.insert('categorizationResults', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        jobId: 'categorizationJobs_1',
        productId: testData.productId,
        suggestedCategories: [testData.rootCategoryId],
        confidence: 0.7,
        reasoning: 'Test reasoning',
        status: 'pending',
        createdAt: Date.now(),
      });
    });

    it('should reject result with reason', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(rejectCategorizationResult, context, {
        resultId,
        reason: 'Categories are not accurate',
      });

      const result = await db.get(resultId);
      expect(result.status).toBe('rejected');
      expect(result.rejectedBy).toBe(testData.userId);
      expect(result.rejectedAt).toBeDefined();
      expect(result.rejectionReason).toBe('Categories are not accurate');
    });

    it('should not update product categories', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      const originalCategories = (await db.get(testData.productId)).categories;

      await runMutation(rejectCategorizationResult, context, {
        resultId,
        reason: 'Incorrect',
      });

      const product = await db.get(testData.productId);
      expect(product.categories).toEqual(originalCategories);
    });
  });

  // TODO: Re-enable when bulkApproveResults is implemented
  describe.skip('bulkApproveResults', () => {
    let resultIds: string[];

    beforeEach(async () => {
      resultIds = [];

      // Create multiple results
      for (let i = 0; i < 3; i++) {
        const productId = await db.insert('products', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          title: `Bulk Product ${i}`,
          handle: `bulk-product-${i}`,
          status: 'active',
          tags: [],
          categories: [],
          images: [],
          metadata: {},
          version: 1,
          createdBy: testData.userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: testData.userId,
        });

        const resultId = await db.insert('categorizationResults', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          jobId: 'categorizationJobs_1',
          productId,
          suggestedCategories: [testData.rootCategoryId],
          confidence: 0.8 + i * 0.05,
          reasoning: `Test reasoning ${i}`,
          status: 'pending',
          createdAt: Date.now(),
        });

        resultIds.push(resultId);
      }
    });

    it('should approve multiple results', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      const approved = await runMutation(bulkApproveResults, context, { resultIds });

      expect(approved).toBe(3);

      // Check all results were approved
      for (const resultId of resultIds) {
        const result = await db.get(resultId);
        expect(result.status).toBe('approved');
        expect(result.approvedBy).toBe(testData.userId);
      }
    });

    it('should skip non-pending results', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Approve one result manually
      await db.patch(resultIds[0], {
        status: 'approved',
        approvedBy: testData.userId,
        approvedAt: Date.now(),
      });

      const approved = await runMutation(bulkApproveResults, context, { resultIds });

      expect(approved).toBe(2); // Only 2 were pending
    });

    it('should update all products', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(bulkApproveResults, context, { resultIds });

      // Get all products that had results
      for (const resultId of resultIds) {
        const result = await db.get(resultId);
        const product = await db.get(result.productId);
        expect(product.categories).toContain(testData.rootCategoryId);
      }
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(runMutation(bulkApproveResults, context, { resultIds })).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  });
});
