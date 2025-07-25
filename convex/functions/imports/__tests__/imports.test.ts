import { describe, it, expect, beforeEach } from '@jest/globals';
import { t, resetMockState } from '../../../test.setup';
import { createTestContext } from '../../../tests/helpers/convexTestCtx';
import type { TestContext } from '../../../tests/helpers/convexTestCtx';
import type { Id } from '../../../_generated/dataModel';

describe('Imports Functions', () => {
  let ctx: any;
  let testCtx: TestContext;
  let userId: Id<'users'>;
  let orgId: Id<'organizations'>;
  let projectId: Id<'projects'>;
  let membershipId: Id<'organizationMemberships'>;

  beforeEach(async () => {
    resetMockState();
    ctx = await t.run(async (ctx) => ctx);
    testCtx = createTestContext();

    // Create test user
    userId = await ctx.db.insert('users', {
      clerkId: 'test_user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test organization
    orgId = await ctx.db.insert('organizations', {
      name: 'Test Organization',
      slug: 'test-org',
      status: 'active',
      subscription: {
        plan: 'pro',
        status: 'active',
        trialEnds: null,
        seats: 10,
        features: ['basic_products', 'basic_categories', 'ai_categorization'],
      },
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4o-mini',
        apiKeys: {},
        categorization: {
          batchSize: 10,
          prompt: 'Default prompt',
          autoApprove: false,
          confidenceThreshold: 0.8,
        },
        storage: {
          maxFileSize: 10485760,
          totalStorageLimit: 1073741824,
          allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    // Create membership with admin role by default
    membershipId = await ctx.db.insert('organizationMemberships', {
      organizationId: orgId,
      userId,
      role: 'admin',
      permissions: ['*'],
      status: 'active',
      joinedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test project
    projectId = await ctx.db.insert('projects', {
      organizationId: orgId,
      name: 'Test Project',
      slug: 'test-project',
      status: 'active',
      settings: {
        defaultCurrency: 'USD',
        defaultTaxRate: 0,
        importSettings: {
          autoValidate: true,
          duplicateHandling: 'skip',
          requiredFields: ['title', 'handle'],
        },
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    // Setup auth
    t.auth.getUserIdentity.mockResolvedValue({
      tokenIdentifier: 'test_user_123',
      subject: 'test_user_123',
      email: 'test@example.com',
    });
  });

  describe('getImportJobs', () => {
    beforeEach(async () => {
      // Create test import jobs
      const statuses = ['completed', 'failed', 'importing', 'uploaded'] as const;
      const importTypes = ['products', 'categories', 'products', 'variants'] as const;
      
      for (let i = 0; i < 4; i++) {
        await ctx.db.insert('importJobs', {
          organizationId: orgId,
          projectId,
          importType: importTypes[i],
          fileName: `import-${i}.csv`,
          fileSize: 1024 * (i + 1),
          fileStorageId: `storage_${i}`,
          status: statuses[i],
          progress: {
            totalRows: 100,
            processedRows: statuses[i] === 'completed' ? 100 : 
                         statuses[i] === 'failed' ? 80 :
                         statuses[i] === 'importing' ? 50 : 0,
            validRows: statuses[i] === 'completed' ? 95 : 
                      statuses[i] === 'failed' ? 60 : 
                      statuses[i] === 'importing' ? 45 : 0,
            invalidRows: statuses[i] === 'completed' ? 5 : 
                        statuses[i] === 'failed' ? 20 : 
                        statuses[i] === 'importing' ? 5 : 0,
            importedRows: statuses[i] === 'completed' ? 95 : 
                         statuses[i] === 'failed' ? 0 : 
                         statuses[i] === 'importing' ? 45 : 0,
            skippedRows: 0,
          },
          fieldMapping: {
            mappings: {
              name: 'product_name',
              description: 'product_description',
              price: 'price',
            },
            options: {
              hasHeaders: true,
              delimiter: ',',
              skipEmptyRows: true,
              duplicateHandling: 'skip',
            },
          },
          validationRules: [],
          validationErrors: statuses[i] === 'failed' ? [
            { row: 10, column: 'price', value: 'abc', error: 'Invalid price format', severity: 'error' as const },
            { row: 25, column: 'name', value: '', error: 'Name is required', severity: 'error' as const },
          ] : [],
          importResults: {
            createdRecords: statuses[i] === 'completed' ? Array(95).fill('').map((_, idx) => `prod_${idx}`) : [],
            updatedRecords: [],
            skippedRecords: [],
          },
          createdBy: userId,
          createdAt: Date.now() - (i * 3600000), // Different hours
          updatedAt: Date.now() - (i * 1800000),
        });
      }
    });

    it('should return all import jobs for organization', async () => {
      // Act
      const result = await testCtx.handlers.getImportJobs({
        organizationId: orgId,
      });

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].fileName).toBe('import-0.csv'); // Newest first (desc order)
      expect(result[3].fileName).toBe('import-3.csv');
    });

    it('should filter by project', async () => {
      // Create another project with import
      const projectId2 = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Second Project',
        slug: 'second-project',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          defaultTaxRate: 0,
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'handle'],
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId: projectId2,
        importType: 'products',
        fileName: 'second-project-import.csv',
        fileSize: 2048,
        fileStorageId: 'storage_second',
        status: 'completed',
        progress: { 
          totalRows: 50, 
          processedRows: 50, 
          validRows: 50, 
          invalidRows: 0, 
          importedRows: 50,
          skippedRows: 0 
        },
        fieldMapping: { 
          mappings: { name: 'name' }, 
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'skip',
          } 
        },
        validationRules: [],
        validationErrors: [],
        importResults: {
          createdRecords: [],
          updatedRecords: [],
          skippedRecords: [],
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Act
      const result = await testCtx.handlers.getImportJobs({
        organizationId: orgId,
        projectId,
      });

      // Assert
      expect(result).toHaveLength(4);
      expect(result.every((job: any) => job.projectId === projectId)).toBe(true);
    });

    it('should filter by status', async () => {
      // Act
      const result = await testCtx.handlers.getImportJobs({
        organizationId: orgId,
        status: 'completed',
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].progress.processedRows).toBe(100);
    });

    it('should filter by import type', async () => {
      // Act
      const result = await testCtx.handlers.getImportJobs({
        organizationId: orgId,
        importType: 'products',
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((job: any) => job.importType === 'products')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      // Act
      const result = await testCtx.handlers.getImportJobs({
        organizationId: orgId,
        limit: 2,
      });

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should fail for unauthenticated user', async () => {
      // Setup no auth
      t.auth.getUserIdentity.mockResolvedValue(null);

      // Act & Assert
      await expect(
        testCtx.handlers.getImportJobs({
          organizationId: orgId,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('getImportJob', () => {
    let jobId: Id<'importJobs'>;

    beforeEach(async () => {
      jobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        importType: 'products',
        fileName: 'detailed-import.csv',
        fileSize: 4096,
        fileStorageId: 'storage_detailed',
        status: 'completed',
        progress: {
          totalRows: 200,
          processedRows: 200,
          validRows: 180,
          invalidRows: 15,
          importedRows: 180,
          skippedRows: 5,
        },
        fieldMapping: {
          mappings: {
            name: 'product_name',
            description: 'description',
            price: 'unit_price',
            sku: 'sku_code',
          },
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'update',
          },
        },
        validationRules: [
          {
            field: 'name',
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 255,
          },
          {
            field: 'price',
            type: 'number',
            required: true,
          },
        ],
        validationErrors: [
          { row: 45, column: 'price', value: '-10', error: 'Price must be a positive number', severity: 'error' as const },
          { row: 67, column: 'sku', value: 'DUP123', error: 'SKU already exists', severity: 'error' as const },
          { row: 123, column: 'name', value: '', error: 'Name cannot be empty', severity: 'error' as const },
        ],
        importResults: {
          createdRecords: Array(150).fill('').map((_, idx) => `prod_created_${idx}`),
          updatedRecords: Array(30).fill('').map((_, idx) => `prod_updated_${idx}`),
          skippedRecords: Array(5).fill('').map((_, idx) => `prod_skipped_${idx}`),
        },
        createdBy: userId,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000,
        completedAt: Date.now() - 1800000,
      });
    });

    it('should return detailed import job information', async () => {
      // Act
      const result = await testCtx.handlers.getImportJob({ jobId });

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toBe(jobId);
      expect(result.fileName).toBe('detailed-import.csv');
      expect(result.progress.totalRows).toBe(200);
      expect(result.progress.validRows).toBe(180);
      expect(result.validationErrors).toHaveLength(3);
      expect(result.importResults.createdRecords).toHaveLength(150);
      expect(result.importResults.updatedRecords).toHaveLength(30);
    });

    it('should throw error for non-existent job', async () => {
      // Act & Assert
      await expect(
        testCtx.handlers.getImportJob({ jobId: 'job_nonexistent' as Id<'importJobs'> })
      ).rejects.toThrow('Job not found');
    });

    it('should throw error when user not in organization', async () => {
      // Create job in different org
      const otherOrgId = await ctx.db.insert('organizations', {
        name: 'Other Org',
        slug: 'other-org',
        status: 'active',
        subscription: {
          plan: 'trial',
          status: 'active',
          trialEnds: Date.now() + 14 * 24 * 60 * 60 * 1000,
          seats: 5,
          features: ['basic_products', 'basic_categories', 'ai_categorization'],
        },
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4o-mini',
          apiKeys: {},
          categorization: {
            batchSize: 10,
            prompt: 'Default prompt',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      const otherJobId = await ctx.db.insert('importJobs', {
        organizationId: otherOrgId,
        projectId: 'proj_other' as Id<'projects'>,
        importType: 'products',
        fileName: 'other.csv',
        fileSize: 1024,
        fileStorageId: 'storage_other',
        status: 'completed',
        progress: { 
          totalRows: 10, 
          processedRows: 10, 
          validRows: 10, 
          invalidRows: 0, 
          importedRows: 10,
          skippedRows: 0 
        },
        fieldMapping: { 
          mappings: { name: 'name' }, 
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'skip',
          } 
        },
        validationRules: [],
        validationErrors: [],
        importResults: {
          createdRecords: [],
          updatedRecords: [],
          skippedRecords: [],
        },
        createdBy: 'user_other' as Id<'users'>,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Act & Assert
      await expect(
        testCtx.handlers.getImportJob({ jobId: otherJobId })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('createImportJob', () => {
    it('should create new import job', async () => {
      // Arrange
      const importData = {
        organizationId: orgId,
        projectId,
        importType: 'products' as const,
        fileName: 'new-products.csv',
        fileSize: 2048,
        fileStorageId: 'storage_new',
        fieldMapping: {
          mappings: {
            name: 'product_title',
            description: 'product_desc',
            price: 'price_usd',
          },
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'skip' as const,
          },
        },
        validationRules: [
          {
            field: 'name',
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 255,
          },
        ],
      };

      // Act
      const jobId = await testCtx.handlers.createImportJob(importData);

      // Assert
      expect(jobId).toBeDefined();
      const job = await ctx.db.get(jobId);
      expect(job).toMatchObject({
        organizationId: orgId,
        projectId,
        importType: 'products',
        fileName: 'new-products.csv',
        fileSize: 2048,
        status: 'uploaded',
        progress: {
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          importedRows: 0,
          skippedRows: 0,
        },
        fieldMapping: importData.fieldMapping,
        createdBy: userId,
      });
    });

    it('should create audit log entry', async () => {
      // Arrange
      const importData = {
        organizationId: orgId,
        projectId,
        importType: 'categories' as const,
        fileName: 'categories.json',
        fileSize: 1024,
        fileStorageId: 'storage_cat',
        fieldMapping: {
          mappings: {
            name: 'category_name',
            slug: 'category_slug',
          },
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'create' as const,
          },
        },
        validationRules: [],
      };

      // Act
      const jobId = await testCtx.handlers.createImportJob(importData);

      // Assert
      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q) => q.eq(q.field('entityId'), jobId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        eventType: 'CREATE',
        entityType: 'importJobs',
        entityId: jobId,
        context: {
          action: 'create_import_job',
          source: 'web',
        },
        metadata: {
          projectId,
          fileName: 'categories.json',
        },
      });
    });

    it('should fail for viewer role', async () => {
      // Update membership to viewer
      await ctx.db.patch(membershipId, { role: 'viewer' });

      // Act & Assert
      await expect(
        testCtx.handlers.createImportJob({
          organizationId: orgId,
          projectId,
          importType: 'products',
          fileName: 'test.csv',
          fileSize: 1024,
          fileStorageId: 'storage_test',
          fieldMapping: {
            mappings: {},
            options: {
              hasHeaders: true,
              delimiter: ',',
              skipEmptyRows: true,
              duplicateHandling: 'skip',
            },
          },
          validationRules: [],
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should succeed for editor role', async () => {
      // Update membership to editor
      await ctx.db.patch(membershipId, { role: 'editor' });

      // Act
      const jobId = await testCtx.handlers.createImportJob({
        organizationId: orgId,
        projectId,
        importType: 'variants',
        fileName: 'variants.csv',
        fileSize: 512,
        fileStorageId: 'storage_var',
        fieldMapping: {
          mappings: {},
          options: {
            hasHeaders: false,
            delimiter: ';',
            skipEmptyRows: false,
            duplicateHandling: 'update',
          },
        },
        validationRules: [],
      });

      // Assert
      expect(jobId).toBeDefined();
    });
  });

  describe('updateJobStatus', () => {
    let jobId: Id<'importJobs'>;

    beforeEach(async () => {
      jobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        importType: 'products',
        fileName: 'status-test.csv',
        fileSize: 3072,
        fileStorageId: 'storage_status',
        status: 'uploaded',
        progress: {
          totalRows: 100,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          importedRows: 0,
          skippedRows: 0,
        },
        fieldMapping: { 
          mappings: { name: 'name' }, 
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'skip',
          } 
        },
        validationRules: [],
        validationErrors: [],
        importResults: {
          createdRecords: [],
          updatedRecords: [],
          skippedRecords: [],
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update job status', async () => {
      // Act
      await testCtx.handlers.updateJobStatus({
        jobId,
        status: 'validating',
      });

      // Assert
      const job = await ctx.db.get(jobId);
      expect(job.status).toBe('validating');
    });

    it('should update timestamp', async () => {
      const beforeUpdate = Date.now();

      // Act
      await testCtx.handlers.updateJobStatus({
        jobId,
        status: 'importing',
      });

      // Assert
      const job = await ctx.db.get(jobId);
      expect(job.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });

  describe('completeImport', () => {
    let jobId: Id<'importJobs'>;

    beforeEach(async () => {
      jobId = await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        importType: 'products',
        fileName: 'complete-test.csv',
        fileSize: 2048,
        fileStorageId: 'storage_complete',
        status: 'importing',
        progress: {
          totalRows: 100,
          processedRows: 50,
          validRows: 45,
          invalidRows: 5,
          importedRows: 45,
          skippedRows: 0,
        },
        fieldMapping: { 
          mappings: { name: 'name' }, 
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'skip',
          } 
        },
        validationRules: [],
        validationErrors: [],
        importResults: {
          createdRecords: [],
          updatedRecords: [],
          skippedRecords: [],
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should complete import with results', async () => {
      // Arrange
      const results = {
        progress: {
          totalRows: 100,
          processedRows: 100,
          validRows: 90,
          invalidRows: 7,
          importedRows: 90,
          skippedRows: 3,
        },
        validationErrors: [
          { row: 15, column: 'price', value: 'invalid', error: 'Not a number', severity: 'error' as const },
        ],
        importResults: {
          createdRecords: Array(85).fill('').map((_, idx) => `prod_${idx}`),
          updatedRecords: Array(5).fill('').map((_, idx) => `prod_upd_${idx}`),
          skippedRecords: Array(3).fill('').map((_, idx) => `prod_skip_${idx}`),
        },
      };

      // Act
      await testCtx.handlers.completeImport({ jobId, results });

      // Assert
      const job = await ctx.db.get(jobId);
      expect(job.status).toBe('completed');
      expect(job.progress).toEqual(results.progress);
      expect(job.validationErrors).toEqual(results.validationErrors);
      expect(job.importResults).toEqual(results.importResults);
      expect(job.completedAt).toBeDefined();
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate upload URL for authenticated user', async () => {
      // Act
      const url = await testCtx.handlers.generateUploadUrl();

      // Assert
      expect(url).toBe('https://mock-upload-url');
    });

    it('should fail for unauthenticated user', async () => {
      // Setup no auth
      t.auth.getUserIdentity.mockResolvedValue(null);

      // Act & Assert
      await expect(
        testCtx.handlers.generateUploadUrl()
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('completeFileUpload', () => {
    it('should create file entry after upload', async () => {
      // Arrange
      const uploadData = {
        organizationId: orgId,
        fileName: 'uploaded-products.csv',
        fileSize: 1536,
        mimeType: 'text/csv',
        storageId: 'storage_uploaded' as Id<'_storage'>,
      };

      // Act
      const result = await testCtx.handlers.completeFileUpload(uploadData);

      // Assert
      expect(result).toMatchObject({
        storageId: 'storage_uploaded',
        fileEntryId: expect.any(String),
      });

      const fileEntry = await ctx.db.get(result.fileEntryId);
      expect(fileEntry).toMatchObject({
        organizationId: orgId,
        fileName: 'uploaded-products.csv',
        originalName: 'uploaded-products.csv',
        mimeType: 'text/csv',
        fileSize: 1536,
        storageId: 'storage_uploaded',
        url: 'https://mock-file-url',
        fileType: 'csv_import',
        purpose: 'CSV import for product/category data',
        isPublic: false,
        allowedUsers: [userId],
        isTemporary: true,
        uploadedBy: userId,
      });
      expect(fileEntry.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should fail for viewer role', async () => {
      // Update membership to viewer
      await ctx.db.patch(membershipId, { role: 'viewer' });

      // Act & Assert
      await expect(
        testCtx.handlers.completeFileUpload({
          organizationId: orgId,
          fileName: 'test.csv',
          fileSize: 1024,
          mimeType: 'text/csv',
          storageId: 'storage_test' as Id<'_storage'>,
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should succeed for editor role', async () => {
      // Update membership to editor
      await ctx.db.patch(membershipId, { role: 'editor' });

      // Act
      const result = await testCtx.handlers.completeFileUpload({
        organizationId: orgId,
        fileName: 'editor-upload.csv',
        fileSize: 2048,
        mimeType: 'text/csv',
        storageId: 'storage_editor' as Id<'_storage'>,
      });

      // Assert
      expect(result.fileEntryId).toBeDefined();
    });
  });

  describe('getFileEntry', () => {
    let storageId: Id<'_storage'>;

    beforeEach(async () => {
      storageId = 'storage_test' as Id<'_storage'>;
      await ctx.db.insert('fileStorageEntries', {
        organizationId: orgId,
        fileName: 'test-file.csv',
        originalName: 'test-file.csv',
        mimeType: 'text/csv',
        fileSize: 1024,
        storageId,
        url: `https://storage.example.com/files/${storageId}`,
        fileType: 'csv_import',
        purpose: 'Test file',
        linkedRecords: [],
        isPublic: false,
        allowedUsers: [userId],
        isTemporary: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        uploadedBy: userId,
        createdAt: Date.now(),
      });
    });

    it('should return file entry by storage ID', async () => {
      // Act
      const result = await testCtx.handlers.getFileEntry({ storageId });

      // Assert
      expect(result).toMatchObject({
        fileName: 'test-file.csv',
        storageId,
        fileSize: 1024,
        mimeType: 'text/csv',
      });
    });

    it('should return null for non-existent storage ID', async () => {
      // Act
      const result = await testCtx.handlers.getFileEntry({ 
        storageId: 'storage_nonexistent' as Id<'_storage'> 
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should fail for unauthenticated user', async () => {
      // Setup no auth
      t.auth.getUserIdentity.mockResolvedValue(null);

      // Act & Assert
      await expect(
        testCtx.handlers.getFileEntry({ storageId })
      ).rejects.toThrow('Not authenticated');
    });
  });
});