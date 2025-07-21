import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConvexTestingHelper } from '../convex-test-standard';
import { deleteProduct, bulkDeleteProducts, restoreProducts } from '../../functions/products/deletion';
import { CASCADE_DELETION_FLAGS } from '../../migrations/001_cascade_deletion_schema';

// Mock the feature flags for testing
vi.mock('../../migrations/001_cascade_deletion_schema', () => ({
  CASCADE_DELETION_FLAGS: {
    USE_TRANSACTIONAL_DELETION: true,
    PRESERVE_CATEGORY_ASSIGNMENTS: true,
    USE_IMAGE_CLEANUP_QUEUE: true,
    LOG_CASCADE_TRANSACTIONS: true,
    ENABLE_TRANSACTION_ROLLBACK: true,
    BATCH_OPERATIONS: true,
    PARALLEL_CLEANUP: false,
  },
  MIGRATION_CONFIG: {
    TRANSACTION_TIMEOUT_MS: 30000,
    MAX_RETRY_ATTEMPTS: 3,
    ROLLBACK_WINDOW_MS: 3600000,
    IMAGE_RETENTION_DAYS: 90,
    CLEANUP_BATCH_SIZE: 100,
    CLEANUP_INTERVAL_MS: 300000,
    MAX_PARALLEL_OPERATIONS: 10,
    OPERATION_BATCH_SIZE: 50,
  },
}));

describe('Cascade Deletion with Transactions', () => {
  let testHelper: ConvexTestingHelper;
  let organizationId: any;
  let userId: any;
  let projectId: any;
  let categoryId: any;
  let productId: any;

  beforeEach(async () => {
    testHelper = new ConvexTestingHelper();
    await testHelper.setup();

    // Create test data
    const setupResult = await testHelper.setupTestOrganization({
      includeUser: true,
      includeProject: true,
    });
    
    organizationId = setupResult.organizationId;
    userId = setupResult.userId;
    projectId = setupResult.projectId;

    // Create a category
    categoryId = await testHelper.createCategory({
      organizationId,
      projectId,
      name: 'Test Category',
      level: 0,
    });

    // Create a product with category assignment
    productId = await testHelper.createProduct({
      organizationId,
      projectId,
      title: 'Test Product',
      sku: 'TEST-001',
      categories: [categoryId],
    });
  });

  describe('Single Product Deletion', () => {
    it('should create cascade transaction record when deleting a product', async () => {
      const result = await testHelper.mutation(deleteProduct, {
        productId,
        reason: 'Test deletion',
      });

      expect(result.success).toBe(true);
      expect(result.trashId).toBeDefined();

      // Check that cascade transaction was created
      const transactions = await testHelper.query('cascadeTransactions', {
        organizationId,
      });
      
      expect(transactions.length).toBeGreaterThan(0);
      const transaction = transactions[0];
      expect(transaction.operationType).toBe('single_delete');
      expect(transaction.status).toBe('completed');
      expect(transaction.primaryEntityId).toBe(productId);
    });

    it('should preserve category assignments in trash', async () => {
      // Get original assignment
      const originalAssignments = await testHelper.query('categoryProductAssignments', {
        productId,
      });
      expect(originalAssignments.length).toBe(1);

      // Delete product
      await testHelper.mutation(deleteProduct, {
        productId,
        reason: 'Test deletion',
      });

      // Check assignment was deleted
      const currentAssignments = await testHelper.query('categoryProductAssignments', {
        productId,
      });
      expect(currentAssignments.length).toBe(0);

      // Check assignment was preserved in trash
      const preservedAssignments = await testHelper.query('categoryAssignmentsTrash', {
        productId,
      });
      expect(preservedAssignments.length).toBe(1);
      expect(preservedAssignments[0].categoryId).toBe(categoryId);
      expect(preservedAssignments[0].recoverable).toBe(true);
    });

    it('should queue images for cleanup', async () => {
      // Add image to product
      await testHelper.updateProduct(productId, {
        images: [{
          id: 'img-001',
          url: 'https://example.com/image.jpg',
          position: 0,
          storageId: 'storage-001',
        }],
      });

      // Delete product
      await testHelper.mutation(deleteProduct, {
        productId,
        reason: 'Test deletion',
      });

      // Check image cleanup queue
      const cleanupQueue = await testHelper.query('imageCleanupQueue', {
        originalProductId: productId,
      });
      expect(cleanupQueue.length).toBe(1);
      expect(cleanupQueue[0].storageId).toBe('storage-001');
      expect(cleanupQueue[0].status).toBe('pending');
      expect(cleanupQueue[0].priority).toBe('low');
    });
  });

  describe('Bulk Deletion', () => {
    let productIds: any[];

    beforeEach(async () => {
      // Create multiple products
      productIds = [];
      for (let i = 0; i < 3; i++) {
        const pid = await testHelper.createProduct({
          organizationId,
          projectId,
          title: `Bulk Test Product ${i}`,
          sku: `BULK-00${i}`,
          categories: [categoryId],
        });
        productIds.push(pid);
      }
    });

    it('should process bulk deletions in transactions', async () => {
      const result = await testHelper.mutation(bulkDeleteProducts, {
        productIds,
        confirmationText: 'DELETE 3',
        reason: 'Bulk test deletion',
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.failedCount).toBe(0);

      // Check transactions were created
      const transactions = await testHelper.query('cascadeTransactions', {
        organizationId,
      });
      
      const bulkTransactions = transactions.filter(t => t.operationType === 'bulk_delete');
      expect(bulkTransactions.length).toBe(3);
      bulkTransactions.forEach(t => {
        expect(t.status).toBe('completed');
        expect(productIds).toContain(t.primaryEntityId);
      });
    });

    it('should handle partial failures gracefully', async () => {
      // Make one product ID invalid
      productIds[1] = 'invalid-id';

      const result = await testHelper.mutation(bulkDeleteProducts, {
        productIds,
        confirmationText: 'DELETE 3',
        reason: 'Bulk test with failure',
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('Product Restoration', () => {
    let trashId: any;

    beforeEach(async () => {
      // Delete a product first
      const deleteResult = await testHelper.mutation(deleteProduct, {
        productId,
        reason: 'Test for restoration',
      });
      trashId = deleteResult.trashId;
    });

    it('should restore product with preserved category assignments', async () => {
      // Verify product is deleted
      const deletedProduct = await testHelper.getDocument('products', productId);
      expect(deletedProduct.status).toBe('archived');

      // Restore product
      const result = await testHelper.mutation(restoreProducts, {
        trashIds: [trashId],
      });

      expect(result.success).toBe(true);
      expect(result.restoredCount).toBe(1);

      // Check product is active again
      const restoredProduct = await testHelper.getDocument('products', productId);
      expect(restoredProduct.status).toBe('active');

      // Check category assignments were restored
      const assignments = await testHelper.query('categoryProductAssignments', {
        productId,
      });
      expect(assignments.length).toBe(1);
      expect(assignments[0].categoryId).toBe(categoryId);

      // Check preserved assignment is marked as recovered
      const preservedAssignments = await testHelper.query('categoryAssignmentsTrash', {
        productId,
      });
      expect(preservedAssignments[0].recoverable).toBe(false);
      expect(preservedAssignments[0].recoveredAt).toBeDefined();
    });

    it('should create restore transaction record', async () => {
      await testHelper.mutation(restoreProducts, {
        trashIds: [trashId],
      });

      const transactions = await testHelper.query('cascadeTransactions', {
        organizationId,
      });
      
      const restoreTransaction = transactions.find(t => t.operationType === 'restore');
      expect(restoreTransaction).toBeDefined();
      expect(restoreTransaction.status).toBe('completed');
      expect(restoreTransaction.primaryEntityId).toBe(productId);
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback on operation failure', async () => {
      // Mock a failure during deletion
      vi.spyOn(testHelper.ctx.db, 'patch').mockRejectedValueOnce(new Error('Database error'));

      await expect(
        testHelper.mutation(deleteProduct, {
          productId,
          reason: 'Test rollback',
        })
      ).rejects.toThrow('Transaction failed');

      // Check transaction was marked as rolled back
      const transactions = await testHelper.query('cascadeTransactions', {
        organizationId,
      });
      
      const failedTransaction = transactions.find(t => t.status === 'rolled_back');
      expect(failedTransaction).toBeDefined();
      expect(failedTransaction.rollbackReason).toContain('Database error');
    });
  });

  describe('Performance Metrics', () => {
    it('should track transaction performance metrics', async () => {
      const startTime = Date.now();
      
      await testHelper.mutation(deleteProduct, {
        productId,
        reason: 'Performance test',
      });

      const transactions = await testHelper.query('cascadeTransactions', {
        organizationId,
      });
      
      const transaction = transactions[0];
      expect(transaction.metrics).toBeDefined();
      expect(transaction.metrics.totalDuration).toBeGreaterThan(0);
      expect(transaction.metrics.totalDuration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(transaction.metrics.operationCount).toBeGreaterThan(0);
    });
  });
});