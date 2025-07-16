import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the auth module
jest.mock('../../../lib/auth');

import { runQuery, runMutation, runAction } from '../../setup/test_runner';
import {
  mockIdentities,
  MockDatabase,
  seedTestData,
  convexAssertions,
  createMockQueryContext,
  createMockMutationContext,
  createMockActionContext,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import {
  getImportJobs,
  getImportJob,
  createImportJob,
  updateImportJobStatus,
  processImportJob,
  getImportErrors,
} from '../../../functions/imports/imports';

// Mock the storage module
jest.mock('../../../lib/storage', () => ({
  parseCSV: jest.fn().mockResolvedValue({
    headers: ['title', 'sku', 'price', 'description', 'category'],
    rows: [
      {
        title: 'Product 1',
        sku: 'SKU001',
        price: '99.99',
        description: 'Test product 1',
        category: 'Category A',
      },
      {
        title: 'Product 2',
        sku: 'SKU002',
        price: '149.99',
        description: 'Test product 2',
        category: 'Category B',
      },
    ],
  }),
  parseExcel: jest.fn().mockResolvedValue({
    headers: ['title', 'sku', 'price'],
    rows: [{ title: 'Excel Product', sku: 'EXCEL001', price: '199.99' }],
  }),
}));

describe('imports', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('getImportJobs', () => {
    it('should return import jobs for a project', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create test jobs
      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'products.csv',
        fileType: 'csv',
        fileSize: 1024,
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: {
            title: 'title',
            sku: 'sku',
            price: 'price',
          },
          duplicateHandling: 'skip',
          categoryHandling: 'create',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getImportJobs, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0]._id).toBe(jobId);
      expect(result.page[0].fileName).toBe('products.csv');
    });

    it('should filter by status', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create jobs with different statuses
      await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'processing.csv',
        fileType: 'csv',
        fileSize: 2048,
        status: 'processing',
        totalRows: 10,
        processedRows: 5,
        successCount: 5,
        errorCount: 0,
        settings: {
          mapping: { title: 'title' },
          duplicateHandling: 'skip',
          categoryHandling: 'create',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'completed.csv',
        fileType: 'csv',
        fileSize: 4096,
        status: 'completed',
        totalRows: 20,
        processedRows: 20,
        successCount: 18,
        errorCount: 2,
        settings: {
          mapping: { title: 'title' },
          duplicateHandling: 'update',
          categoryHandling: 'skip',
        },
        createdBy: testData.userId,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      });

      const result = await runQuery(getImportJobs, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'processing',
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].status).toBe('processing');
    });

    it('should paginate results', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create multiple jobs
      for (let i = 0; i < 5; i++) {
        await db.insert('importJobs', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          fileName: `import-${i}.csv`,
          fileType: 'csv',
          fileSize: 1024 * (i + 1),
          status: 'completed',
          totalRows: 10,
          processedRows: 10,
          successCount: 10,
          errorCount: 0,
          settings: {
            mapping: { title: 'title' },
            duplicateHandling: 'skip',
            categoryHandling: 'create',
          },
          createdBy: testData.userId,
          createdAt: Date.now() - i * 1000,
          updatedAt: Date.now() - i * 1000,
        });
      }

      const result = await runQuery(getImportJobs, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        limit: 3,
      });

      expect(result.page).toHaveLength(3);
      expect(result.continueCursor).toBeDefined();
    });
  });

  describe('getImportJob', () => {
    it('should return job details with progress', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'products.csv',
        fileType: 'csv',
        fileSize: 5120,
        storageId: 'storage_123',
        status: 'processing',
        totalRows: 100,
        processedRows: 45,
        successCount: 42,
        errorCount: 3,
        settings: {
          mapping: {
            title: 'Product Name',
            sku: 'SKU',
            price: 'Price',
            description: 'Description',
          },
          duplicateHandling: 'update',
          categoryHandling: 'create',
        },
        createdBy: testData.userId,
        createdAt: Date.now() - 600000,
        updatedAt: Date.now(),
      });

      const result = await runQuery(getImportJob, context, { jobId });

      expect(result._id).toBe(jobId);
      expect(result.fileName).toBe('products.csv');
      expect(result.progress).toBe(0.45);
      expect(result.successRate).toBe(0.9333333333333333);
    });

    it('should include user information', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'test.csv',
        fileType: 'csv',
        fileSize: 1024,
        status: 'completed',
        totalRows: 10,
        processedRows: 10,
        successCount: 10,
        errorCount: 0,
        settings: {
          mapping: { title: 'title' },
          duplicateHandling: 'skip',
          categoryHandling: 'skip',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: Date.now(),
      });

      const result = await runQuery(getImportJob, context, { jobId });

      expect(result.createdByUser).toBeDefined();
      expect(result.createdByUser?.email).toBe('test@example.com');
    });

    it('should throw error if job not found', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      await expect(runQuery(getImportJob, context, { jobId: 'importJobs_999999' })).rejects.toThrow(
        'Import job not found'
      );
    });
  });

  describe('createImportJob', () => {
    it('should create a new import job', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      const jobId = await runMutation(createImportJob, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'new-products.csv',
        fileType: 'csv',
        fileSize: 2048,
        storageId: 'storage_456',
        settings: {
          mapping: {
            title: 'Product Title',
            sku: 'SKU Code',
            price: 'Unit Price',
          },
          duplicateHandling: 'update',
          categoryHandling: 'create',
        },
      });

      convexAssertions.expectToBeValidId(jobId, 'importJobs');

      const job = await db.get(jobId);
      expect(job.fileName).toBe('new-products.csv');
      expect(job.fileType).toBe('csv');
      expect(job.status).toBe('pending');
      expect(job.settings.mapping.title).toBe('Product Title');
      expect(job.createdBy).toBe(testData.userId);
    });

    it('should validate file type', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      const validTypes = ['csv', 'xlsx'];
      for (const fileType of validTypes) {
        const jobId = await runMutation(createImportJob, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          fileName: `test.${fileType}`,
          fileType: fileType as 'csv' | 'xlsx',
          fileSize: 1024,
          storageId: 'storage_789',
          settings: {
            mapping: { title: 'title' },
            duplicateHandling: 'skip',
            categoryHandling: 'skip',
          },
        });
        expect(jobId).toBeDefined();
      }
    });

    it('should schedule processing', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      const jobId = await runMutation(createImportJob, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'process-me.csv',
        fileType: 'csv',
        fileSize: 1024,
        storageId: 'storage_process',
        settings: {
          mapping: { title: 'title' },
          duplicateHandling: 'skip',
          categoryHandling: 'skip',
        },
      });

      // Verify scheduler was called
      expect(context.scheduler.runAfter).toHaveBeenCalledWith(0, expect.any(Object), { jobId });
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(createImportJob, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          fileName: 'test.csv',
          fileType: 'csv',
          fileSize: 1024,
          storageId: 'storage_123',
          settings: {
            mapping: { title: 'title' },
            duplicateHandling: 'skip',
            categoryHandling: 'skip',
          },
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateImportJobStatus', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'update-status.csv',
        fileType: 'csv',
        fileSize: 1024,
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: { title: 'title' },
          duplicateHandling: 'skip',
          categoryHandling: 'skip',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update job status to processing', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateImportJobStatus, context, {
        jobId,
        status: 'processing',
        totalRows: 50,
      });

      const job = await db.get(jobId);
      expect(job.status).toBe('processing');
      expect(job.totalRows).toBe(50);
      expect(job.startedAt).toBeDefined();
    });

    it('should update job status to completed', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // First set to processing
      await db.patch(jobId, {
        status: 'processing',
        totalRows: 20,
        processedRows: 0,
        startedAt: Date.now() - 60000,
      });

      await runMutation(updateImportJobStatus, context, {
        jobId,
        status: 'completed',
        processedRows: 20,
        successCount: 18,
        errorCount: 2,
      });

      const job = await db.get(jobId);
      expect(job.status).toBe('completed');
      expect(job.processedRows).toBe(20);
      expect(job.successCount).toBe(18);
      expect(job.errorCount).toBe(2);
      expect(job.completedAt).toBeDefined();
    });

    it('should update job status to failed', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateImportJobStatus, context, {
        jobId,
        status: 'failed',
        error: 'File parsing error: Invalid CSV format',
      });

      const job = await db.get(jobId);
      expect(job.status).toBe('failed');
      expect(job.error).toBe('File parsing error: Invalid CSV format');
      expect(job.completedAt).toBeDefined();
    });

    it('should update progress metrics', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await db.patch(jobId, {
        status: 'processing',
        totalRows: 100,
        processedRows: 0,
      });

      await runMutation(updateImportJobStatus, context, {
        jobId,
        processedRows: 25,
        successCount: 23,
        errorCount: 2,
      });

      const job = await db.get(jobId);
      expect(job.processedRows).toBe(25);
      expect(job.successCount).toBe(23);
      expect(job.errorCount).toBe(2);
      expect(job.status).toBe('processing'); // Status unchanged
    });
  });

  describe('processImportJob', () => {
    it('should process CSV file and create products', async () => {
      const context = createMockActionContext(mockIdentities.user, db);

      // Create a job
      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'products.csv',
        fileType: 'csv',
        fileSize: 1024,
        storageId: 'storage_csv',
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: {
            title: 'title',
            sku: 'sku',
            price: 'price',
            description: 'description',
          },
          duplicateHandling: 'skip',
          categoryHandling: 'create',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock storage.get to return CSV content
      context.storage.get.mockResolvedValue(new Blob(['test csv content']));

      await runAction(processImportJob, context, { jobId });

      // Check job was updated
      const job = await db.get(jobId);
      expect(job.status).toBe('completed');
      expect(job.totalRows).toBe(2);
      expect(job.processedRows).toBe(2);
      expect(job.successCount).toBe(2);
      expect(job.errorCount).toBe(0);

      // Check products were created
      const products = await db
        .query('products')
        .withIndex('by_project', (q: any) =>
          q.eq('organizationId', testData.orgId).eq('projectId', testData.projectId)
        )
        .collect();

      // Should have original product + 2 imported
      expect(products.length).toBeGreaterThanOrEqual(3);

      const importedProducts = products.filter(
        (p) => p.title === 'Product 1' || p.title === 'Product 2'
      );
      expect(importedProducts).toHaveLength(2);
      expect(importedProducts[0].metadata?.importJobId).toBe(jobId);
    });

    it('should handle duplicate SKUs based on settings', async () => {
      const context = createMockActionContext(mockIdentities.user, db);

      // Create existing product with SKU
      await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Existing Product',
        handle: 'existing-product',
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        metadata: { sku: 'SKU001' },
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'duplicates.csv',
        fileType: 'csv',
        fileSize: 1024,
        storageId: 'storage_dup',
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: {
            title: 'title',
            sku: 'sku',
            price: 'price',
          },
          duplicateHandling: 'skip', // Skip duplicates
          categoryHandling: 'skip',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      context.storage.get.mockResolvedValue(new Blob(['test csv content']));

      await runAction(processImportJob, context, { jobId });

      const job = await db.get(jobId);
      expect(job.successCount).toBe(1); // Only Product 2 imported
      expect(job.errorCount).toBe(1); // Product 1 skipped

      // Check error was logged
      const errors = await db
        .query('importErrors')
        .withIndex('by_job', (q: any) => q.eq('importJobId', jobId))
        .collect();

      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('duplicate SKU');
    });

    it('should update products when duplicate handling is update', async () => {
      const context = createMockActionContext(mockIdentities.user, db);

      // Create existing product
      const existingId = await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Old Title',
        handle: 'old-title',
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        metadata: { sku: 'SKU001', price: '50.00' },
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'updates.csv',
        fileType: 'csv',
        fileSize: 1024,
        storageId: 'storage_update',
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: {
            title: 'title',
            sku: 'sku',
            price: 'price',
            description: 'description',
          },
          duplicateHandling: 'update', // Update duplicates
          categoryHandling: 'skip',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      context.storage.get.mockResolvedValue(new Blob(['test csv content']));

      await runAction(processImportJob, context, { jobId });

      const job = await db.get(jobId);
      expect(job.successCount).toBe(2);
      expect(job.errorCount).toBe(0);

      // Check product was updated
      const product = await db.get(existingId);
      expect(product.title).toBe('Product 1'); // Updated title
      expect(product.metadata.price).toBe('99.99'); // Updated price
      expect(product.metadata.description).toBe('Test product 1'); // New field
    });

    it('should create categories when enabled', async () => {
      const context = createMockActionContext(mockIdentities.user, db);

      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'with-categories.csv',
        fileType: 'csv',
        fileSize: 1024,
        storageId: 'storage_cat',
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: {
            title: 'title',
            sku: 'sku',
            category: 'category',
          },
          duplicateHandling: 'skip',
          categoryHandling: 'create', // Create missing categories
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      context.storage.get.mockResolvedValue(new Blob(['test csv content']));

      await runAction(processImportJob, context, { jobId });

      // Check categories were created
      const categories = await db
        .query('categories')
        .withIndex('by_project', (q: any) =>
          q.eq('organizationId', testData.orgId).eq('projectId', testData.projectId)
        )
        .collect();

      const newCategories = categories.filter(
        (c) => c.name === 'Category A' || c.name === 'Category B'
      );
      expect(newCategories).toHaveLength(2);

      // Check products were assigned to categories
      const products = await db
        .query('products')
        .withIndex('by_project', (q: any) =>
          q.eq('organizationId', testData.orgId).eq('projectId', testData.projectId)
        )
        .collect();

      const importedProducts = products.filter(
        (p) => p.title === 'Product 1' || p.title === 'Product 2'
      );

      expect(importedProducts[0].categories).toHaveLength(1);
      expect(importedProducts[1].categories).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      const context = createMockActionContext(mockIdentities.user, db);

      const jobId = await db.insert('importJobs', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        fileName: 'error.csv',
        fileType: 'csv',
        fileSize: 1024,
        storageId: 'storage_error',
        status: 'pending',
        totalRows: 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        settings: {
          mapping: { title: 'title' },
          duplicateHandling: 'skip',
          categoryHandling: 'skip',
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock storage to throw error
      context.storage.get.mockRejectedValue(new Error('Storage error'));

      await runAction(processImportJob, context, { jobId });

      const job = await db.get(jobId);
      expect(job.status).toBe('failed');
      expect(job.error).toBe('Storage error');
    });
  });

  describe('getImportErrors', () => {
    it('should return errors for an import job', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const jobId = 'importJobs_123';

      // Create test errors
      await db.insert('importErrors', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        importJobId: jobId,
        row: 5,
        data: { title: 'Bad Product', sku: '', price: 'invalid' },
        error: 'Missing required field: sku',
        createdAt: Date.now(),
      });

      await db.insert('importErrors', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        importJobId: jobId,
        row: 10,
        data: { title: 'Another Bad Product', sku: 'ABC123', price: 'not-a-number' },
        error: 'Invalid price format',
        createdAt: Date.now() + 1000,
      });

      const result = await runQuery(getImportErrors, context, { importJobId: jobId });

      expect(result).toHaveLength(2);
      expect(result[0].row).toBe(5);
      expect(result[0].error).toContain('Missing required field');
      expect(result[1].row).toBe(10);
      expect(result[1].error).toContain('Invalid price format');
    });

    it('should paginate errors', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const jobId = 'importJobs_456';

      // Create many errors
      for (let i = 1; i <= 25; i++) {
        await db.insert('importErrors', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          importJobId: jobId,
          row: i,
          data: { title: `Product ${i}`, error: true },
          error: `Error on row ${i}`,
          createdAt: Date.now() + i,
        });
      }

      const result = await runQuery(getImportErrors, context, {
        importJobId: jobId,
        limit: 10,
      });

      expect(result).toHaveLength(10);
      expect(result[0].row).toBe(1);
      expect(result[9].row).toBe(10);
    });

    it('should return empty array for job with no errors', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(getImportErrors, context, {
        importJobId: 'importJobs_no_errors',
      });

      expect(result).toEqual([]);
    });
  });
});
