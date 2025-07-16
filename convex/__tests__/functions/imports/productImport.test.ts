import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../lib/auth');

import {
  createMockMutationContext,
  createMockActionContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  setupMockAuth,
  convexAssertions,
} from '../../setup/convex-test-helpers';
import { runMutation, runAction } from '../../setup/test-runner';
import { startProductImport } from '../../../functions/imports/productImport';
import * as authModule from '../../../lib/auth';

const mockAuth = authModule as jest.Mocked<typeof authModule>;

// Mock the scheduler
const mockScheduler = {
  runAfter: jest.fn().mockResolvedValue('scheduled_123'),
};

describe('Product Import', () => {
  let db: MockDatabase;
  let testData: any;
  let importJobId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);

    // Create a test import job
    importJobId = await db.insert('importJobs', {
      organizationId: testData.orgId,
      projectId: testData.projectId,
      type: 'products',
      status: 'pending',
      fileName: 'test-products.csv',
      fileSize: 1024,
      fileUrl: 'https://storage.example.com/test-products.csv',
      config: {
        importType: 'create',
        mappings: {
          title: 'Product Name',
          sku: 'SKU',
          price: 'Price',
          description: 'Description',
        },
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: false,
        },
      },
      progress: {
        current: 0,
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      },
      metadata: {},
      createdBy: testData.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  describe('startProductImport', () => {
    it('should create a new product import job', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      // Add scheduler to context
      (ctx as any).scheduler = mockScheduler;

      const jobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/products.csv',
        fileName: 'products.csv',
        fileSize: 2048,
        importType: 'create',
        mappings: {
          title: 'Name',
          sku: 'Product Code',
          price: 'Cost',
        },
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: false,
        },
      });

      convexAssertions.expectToBeValidId(jobId, 'importJobs');

      const job = await db.get(jobId);
      expect(job.type).toBe('products');
      expect(job.status).toBe('pending');
      expect(job.fileName).toBe('products.csv');
      expect(job.fileSize).toBe(2048);
      expect(job.config.importType).toBe('create');
      expect(job.config.mappings).toEqual({
        title: 'Name',
        sku: 'Product Code',
        price: 'Cost',
      });
    });

    it('should schedule processing job', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      const jobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/products.csv',
        fileName: 'products.csv',
        fileSize: 2048,
        importType: 'create',
        mappings: {
          title: 'Name',
          sku: 'SKU',
        },
        options: {},
      });

      expect(mockScheduler.runAfter).toHaveBeenCalledWith(0, expect.anything(), { jobId });
    });

    it('should require edit permissions', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      mockAuth.requireRole.mockRejectedValueOnce(new Error('Insufficient permissions'));

      await expect(
        runMutation(startProductImport, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          fileUrl: 'https://storage.example.com/products.csv',
          fileName: 'products.csv',
          fileSize: 2048,
          importType: 'create',
          mappings: {
            title: 'Name',
          },
          options: {},
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should validate required mappings', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      await expect(
        runMutation(startProductImport, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          fileUrl: 'https://storage.example.com/products.csv',
          fileName: 'products.csv',
          fileSize: 2048,
          importType: 'create',
          mappings: {
            // Missing required 'title' mapping
            sku: 'SKU',
          },
          options: {},
        })
      ).rejects.toThrow('Missing required mapping: title');
    });

    it('should support different import types', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      // Test update import type
      const updateJobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/update-products.csv',
        fileName: 'update-products.csv',
        fileSize: 1024,
        importType: 'update',
        mappings: {
          title: 'Name',
          sku: 'SKU', // SKU required for updates
          price: 'New Price',
        },
        options: {
          updateExisting: true,
        },
      });

      const updateJob = await db.get(updateJobId);
      expect(updateJob.config.importType).toBe('update');
      expect(updateJob.config.options.updateExisting).toBe(true);

      // Test upsert import type
      const upsertJobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/upsert-products.csv',
        fileName: 'upsert-products.csv',
        fileSize: 1024,
        importType: 'upsert',
        mappings: {
          title: 'Name',
          sku: 'SKU',
        },
        options: {},
      });

      const upsertJob = await db.get(upsertJobId);
      expect(upsertJob.config.importType).toBe('upsert');
    });

    it('should validate file URL', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      await expect(
        runMutation(startProductImport, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          fileUrl: 'not-a-valid-url',
          fileName: 'products.csv',
          fileSize: 1024,
          importType: 'create',
          mappings: {
            title: 'Name',
          },
          options: {},
        })
      ).rejects.toThrow('Invalid file URL');
    });

    it('should handle custom field mappings', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      const jobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/products.csv',
        fileName: 'products.csv',
        fileSize: 2048,
        importType: 'create',
        mappings: {
          title: 'Product Name',
          sku: 'Item Code',
          price: 'Unit Price',
          description: 'Product Description',
          vendor: 'Supplier',
          productType: 'Category',
          tags: 'Tags',
        },
        options: {
          skipDuplicates: true,
        },
      });

      const job = await db.get(jobId);
      expect(Object.keys(job.config.mappings)).toHaveLength(7);
      expect(job.config.mappings.vendor).toBe('Supplier');
      expect(job.config.mappings.productType).toBe('Category');
    });

    it('should set default options when not provided', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      const jobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/products.csv',
        fileName: 'products.csv',
        fileSize: 2048,
        importType: 'create',
        mappings: {
          title: 'Name',
        },
        options: {}, // Empty options
      });

      const job = await db.get(jobId);
      expect(job.config.options).toEqual({
        skipDuplicates: false,
        updateExisting: false,
        validateOnly: false,
      });
    });

    it('should create audit log for import job creation', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);
      (ctx as any).scheduler = mockScheduler;

      const jobId = await runMutation(startProductImport, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileUrl: 'https://storage.example.com/products.csv',
        fileName: 'products.csv',
        fileSize: 2048,
        importType: 'create',
        mappings: {
          title: 'Name',
        },
        options: {},
      });

      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('CREATE');
      expect(auditLogs[0].entityType).toBe('importJobs');
      expect(auditLogs[0].entityId).toBe(jobId);
      expect(auditLogs[0].metadata).toEqual({
        importType: 'products',
        fileName: 'products.csv',
        fileSize: 2048,
      });
    });
  });

  // Note: The internal actions and mutations (processProductImport, importProducts, etc.)
  // are tested indirectly through the public API tests above and through integration tests.
  // Direct testing of internal functions would require different test setup.
});
