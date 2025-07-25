import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
/**
 * Comprehensive tests for transactional cascade deletion
 * 
 * Author: backend-agent
 * Issue: #67 - Implement Transactional Cascade Deletion
 */

import { expect, test, describe, beforeEach, vi } from 'vitest';
import { TestConvex } from '../../convex-test-standard';
import { api } from '../../_generated/api';
import { Id } from '../../_generated/dataModel';
import { CASCADE_DELETION_FLAGS } from '../../migrations/001_cascade_deletion_schema';

describe('Transactional Cascade Deletion', () => {
  let t: TestConvex<typeof api>;
  let organizationId: Id<'organizations'>;
  let projectId: Id<'projects'>;
  let userId: Id<'users'>;
  let productId: Id<'products'>;
  let categoryId: Id<'categories'>;

  beforeEach(async () => {
    t = new TestConvex();
    
    // Create test organization
    organizationId = await t.mutation(api.organizations.create, {
      name: 'Test Org',
      slug: 'test-org',
    });
    
    // Create test project
    projectId = await t.mutation(api.projects.create, {
      organizationId,
      name: 'Test Project',
      slug: 'test-project',
    });
    
    // Create test user
    userId = await t.mutation(api.auth.users.create, {
      clerkId: 'test-clerk-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
    
    // Create test category
    categoryId = await t.mutation(api.categories.create, {
      organizationId,
      projectId,
      name: 'Test Category',
      handle: 'test-category',
    });
    
    // Create test product
    productId = await t.mutation(api.products.create, {
      organizationId,
      projectId,
      title: 'Test Product',
      sku: 'TEST-001',
      handle: 'test-product',
      status: 'active',
    });
  });

  describe('Feature Flags', () => {
    test('should have all cascade deletion features enabled', () => {
      expect(CASCADE_DELETION_FLAGS.USE_TRANSACTIONAL_DELETION).toBe(true);
      expect(CASCADE_DELETION_FLAGS.PRESERVE_CATEGORY_ASSIGNMENTS).toBe(true);
      expect(CASCADE_DELETION_FLAGS.USE_IMAGE_CLEANUP_QUEUE).toBe(true);
      expect(CASCADE_DELETION_FLAGS.LOG_CASCADE_TRANSACTIONS).toBe(true);
      expect(CASCADE_DELETION_FLAGS.ENABLE_TRANSACTION_ROLLBACK).toBe(true);
      expect(CASCADE_DELETION_FLAGS.BATCH_OPERATIONS).toBe(true);
    });
  });

  describe('Single Product Deletion', () => {
    test('should create transaction record for deletion', async () => {
      // Delete product
      const result = await t.mutation(api.products.deletion.deleteProduct, {
        productId,
        reason: 'Test deletion',
      });
      
      expect(result.success).toBe(true);
      expect(result.trashId).toBeDefined();
      
      // Verify transaction was created
      const transactions = await t.query(internal.migrations.cascadeTransactions.list, {
        organizationId,
      });
      
      expect(transactions.length).toBe(1);
      expect(transactions[0].operationType).toBe('single_delete');
      expect(transactions[0].status).toBe('completed');
      expect(transactions[0].primaryEntityId).toBe(productId);
    });

    test('should preserve category assignments in trash', async () => {
      // Create category assignment
      const assignmentId = await t.mutation(api.categoryProductAssignments.create, {
        organizationId,
        projectId,
        categoryId,
        productId,
        assignedBy: 'manual',
        status: 'active',
      });
      
      // Delete product
      await t.mutation(api.products.deletion.deleteProduct, {
        productId,
        reason: 'Test deletion',
      });
      
      // Verify assignment is preserved
      const preservedAssignments = await t.query(api.categoryAssignmentsTrash.list, {
        productId,
      });
      
      expect(preservedAssignments.length).toBe(1);
      expect(preservedAssignments[0].originalAssignmentId).toBe(assignmentId);
      expect(preservedAssignments[0].recoverable).toBe(true);
      expect(preservedAssignments[0].categoryId).toBe(categoryId);
    });

    test('should handle rollback on failure', async () => {
      // Mock a failure during deletion
      const mockError = new Error('Simulated deletion failure');
      vi.spyOn(t.db, 'patch').mockRejectedValueOnce(mockError);
      
      // Attempt deletion
      await expect(
        t.mutation(api.products.deletion.deleteProduct, {
          productId,
          reason: 'Test rollback',
        })
      ).rejects.toThrow('Simulated deletion failure');
      
      // Verify product is still active
      const product = await t.query(api.products.get, { productId });
      expect(product.status).toBe('active');
      
      // Verify no trash entry was created
      const trashItems = await t.query(api.productTrash.list, {
        organizationId,
        projectId,
      });
      expect(trashItems.items.length).toBe(0);
    });
  });

  describe('Bulk Product Deletion', () => {
    let productId2: Id<'products'>;
    let productId3: Id<'products'>;

    beforeEach(async () => {
      // Create additional products
      productId2 = await t.mutation(api.products.create, {
        organizationId,
        projectId,
        title: 'Test Product 2',
        sku: 'TEST-002',
        handle: 'test-product-2',
        status: 'active',
      });
      
      productId3 = await t.mutation(api.products.create, {
        organizationId,
        projectId,
        title: 'Test Product 3',
        sku: 'TEST-003',
        handle: 'test-product-3',
        status: 'active',
      });
    });

    test('should delete multiple products atomically', async () => {
      const result = await t.mutation(api.products.deletion.bulkDeleteProducts, {
        productIds: [productId, productId2, productId3],
        reason: 'Bulk deletion test',
        confirmationText: 'DELETE 3',
      });
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.failedCount).toBe(0);
      
      // Verify all products are in trash
      const trashItems = await t.query(api.productTrash.list, {
        organizationId,
        projectId,
      });
      
      expect(trashItems.items.length).toBe(3);
      expect(trashItems.items.map(i => i.productId).sort()).toEqual(
        [productId, productId2, productId3].sort()
      );
    });

    test('should use distributed locking for bulk operations', async () => {
      // Start bulk deletion
      const deletionPromise = t.mutation(api.products.deletion.bulkDeleteProducts, {
        productIds: [productId, productId2],
        reason: 'Lock test',
        confirmationText: 'DELETE 2',
      });
      
      // Attempt concurrent deletion (should fail due to lock)
      await expect(
        t.mutation(api.products.deletion.deleteProduct, {
          productId,
          reason: 'Concurrent deletion',
        })
      ).rejects.toThrow(/locked/);
      
      // Wait for bulk deletion to complete
      await deletionPromise;
    });
  });

  describe('Product Restoration', () => {
    let trashId: Id<'productTrash'>;

    beforeEach(async () => {
      // Delete product first
      const result = await t.mutation(api.products.deletion.deleteProduct, {
        productId,
        reason: 'Test restoration',
      });
      trashId = result.trashId;
    });

    test('should restore product with all relationships', async () => {
      // Create category assignment before deletion
      await t.mutation(api.categoryProductAssignments.create, {
        organizationId,
        projectId,
        categoryId,
        productId,
        assignedBy: 'manual',
        status: 'active',
      });
      
      // Restore product
      const result = await t.mutation(api.products.deletion.restoreProducts, {
        trashIds: [trashId],
      });
      
      expect(result.success).toBe(true);
      expect(result.restoredCount).toBe(1);
      
      // Verify product is active
      const product = await t.query(api.products.get, { productId });
      expect(product.status).toBe('active');
      
      // Verify category assignment is restored
      const assignments = await t.query(api.categoryProductAssignments.list, {
        productId,
      });
      expect(assignments.length).toBe(1);
      expect(assignments[0].categoryId).toBe(categoryId);
    });

    test('should handle SKU conflicts during restoration', async () => {
      // Create a new product with the same SKU
      const conflictingProductId = await t.mutation(api.products.create, {
        organizationId,
        projectId,
        title: 'Conflicting Product',
        sku: 'TEST-001', // Same SKU as deleted product
        handle: 'conflicting-product',
        status: 'active',
      });
      
      // Restore original product
      const result = await t.mutation(api.products.deletion.restoreProducts, {
        trashIds: [trashId],
      });
      
      expect(result.success).toBe(true);
      expect(result.skuConflicts).toBeDefined();
      expect(result.skuConflicts![0].originalSku).toBe('TEST-001');
      expect(result.skuConflicts![0].newSku).toMatch(/TEST-001-RESTORED/);
      
      // Verify restored product has new SKU
      const restoredProduct = await t.query(api.products.get, { productId });
      expect(restoredProduct.sku).toMatch(/TEST-001-RESTORED/);
    });

    test('should validate category exists before restoring assignment', async () => {
      // Create assignment then delete category
      await t.mutation(api.categoryProductAssignments.create, {
        organizationId,
        projectId,
        categoryId,
        productId,
        assignedBy: 'manual',
        status: 'active',
      });
      
      // Delete the category
      await t.mutation(api.categories.delete, { categoryId });
      
      // Restore product
      const result = await t.mutation(api.products.deletion.restoreProducts, {
        trashIds: [trashId],
      });
      
      expect(result.success).toBe(true);
      
      // Verify assignment was not restored
      const assignments = await t.query(api.categoryProductAssignments.list, {
        productId,
      });
      expect(assignments.length).toBe(0);
    });
  });

  describe('Distributed Locking', () => {
    test('should acquire exclusive lock for deletion', async () => {
      const lockId = await t.mutation(api.lib.distributedLock.acquireLock, {
        resourceType: 'product',
        resourceId: productId,
        operation: 'delete',
        lockType: 'exclusive',
      });
      
      expect(lockId.success).toBe(true);
      expect(lockId.lockId).toBeDefined();
      
      // Verify lock exists
      const lockStatus = await t.query(api.lib.distributedLock.isResourceLocked, {
        resourceType: 'product',
        resourceId: productId,
      });
      
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.lockCount).toBe(1);
    });

    test('should prevent concurrent exclusive locks', async () => {
      // Acquire first lock
      await t.mutation(api.lib.distributedLock.acquireLock, {
        resourceType: 'product',
        resourceId: productId,
        operation: 'delete',
        lockType: 'exclusive',
      });
      
      // Attempt second lock
      await expect(
        t.mutation(api.lib.distributedLock.acquireLock, {
          resourceType: 'product',
          resourceId: productId,
          operation: 'update',
          lockType: 'exclusive',
        })
      ).rejects.toThrow(/already locked/);
    });

    test('should auto-expire locks', async () => {
      // Acquire lock with short timeout
      const lockResult = await t.mutation(api.lib.distributedLock.acquireLock, {
        resourceType: 'product',
        resourceId: productId,
        operation: 'test',
        lockType: 'exclusive',
        timeoutMs: 100, // 100ms timeout
      });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify lock is expired
      const lockStatus = await t.query(api.lib.distributedLock.isResourceLocked, {
        resourceType: 'product',
        resourceId: productId,
      });
      
      expect(lockStatus.isLocked).toBe(false);
    });
  });

  describe('Image Cleanup Queue', () => {
    test('should queue images for cleanup on deletion', async () => {
      // Add image to product
      await t.mutation(api.products.update, {
        productId,
        images: [{
          id: 'test-image-1',
          url: 'https://example.com/image1.jpg',
          position: 0,
          storageId: 'storage-123',
        }],
      });
      
      // Delete product
      await t.mutation(api.products.deletion.deleteProduct, {
        productId,
        reason: 'Image cleanup test',
      });
      
      // Verify image is queued
      const queuedImages = await t.query(api.imageCleanupQueue.list, {
        organizationId,
        productId,
      });
      
      expect(queuedImages.length).toBe(1);
      expect(queuedImages[0].storageId).toBe('storage-123');
      expect(queuedImages[0].status).toBe('pending');
      expect(queuedImages[0].retainUntil).toBeGreaterThan(Date.now());
    });
  });

  describe('Consistency Validation', () => {
    test('should detect orphaned assignments', async () => {
      // Create assignment in trash with non-existent product
      await t.mutation(api.categoryAssignmentsTrash.create, {
        originalAssignmentId: 'fake-assignment' as any,
        organizationId,
        projectId,
        categoryId,
        productId: 'non-existent-product' as any,
        assignedBy: 'manual',
        status: 'active',
        deletedAt: Date.now(),
        deletedBy: userId,
        cascadeTransactionId: 'test-transaction',
        recoverable: true,
      });
      
      // Run consistency validation
      const issues = await t.query(
        internal.migrations.consistencyValidator.validateCategoryAssignmentsTrash,
        {}
      );
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.type === 'orphaned_assignment_trash')).toBe(true);
    });

    test('should fix expired locks automatically', async () => {
      // Create expired lock
      const now = Date.now();
      await t.mutation(api.distributedLocks.create, {
        resourceType: 'product',
        resourceId: productId,
        organizationId,
        lockId: 'expired-lock-123',
        lockType: 'exclusive',
        operation: 'test',
        ownerId: userId,
        ownerType: 'user',
        acquiredAt: now - 60000,
        expiresAt: now - 30000, // Expired 30 seconds ago
        renewCount: 0,
        maxRenewals: 10,
        status: 'active',
      });
      
      // Run consistency validation with fix
      const result = await t.mutation(
        internal.migrations.consistencyValidator.runConsistencyValidation,
        { fix: true }
      );
      
      expect(result.fixed).toBeGreaterThan(0);
      
      // Verify lock is marked as expired
      const lock = await t.query(api.distributedLocks.get, { lockId: 'expired-lock-123' });
      expect(lock.status).toBe('expired');
    });
  });

  describe('Audit Logging', () => {
    test('should create comprehensive audit logs', async () => {
      // Delete product
      await t.mutation(api.products.deletion.deleteProduct, {
        productId,
        reason: 'Audit test',
      });
      
      // Check audit logs
      const logs = await t.query(api.deletionAuditLogs.list, {
        organizationId,
      });
      
      expect(logs.page.length).toBe(1);
      expect(logs.page[0].operationType).toBe('soft_delete');
      expect(logs.page[0].affectedProducts.length).toBe(1);
      expect(logs.page[0].affectedProducts[0].productId).toBe(productId);
    });

    test('should track SKU changes in restoration audit', async () => {
      // Delete product
      const deleteResult = await t.mutation(api.products.deletion.deleteProduct, {
        productId,
        reason: 'SKU audit test',
      });
      
      // Create conflicting product
      await t.mutation(api.products.create, {
        organizationId,
        projectId,
        title: 'Conflicting',
        sku: 'TEST-001',
        handle: 'conflicting',
        status: 'active',
      });
      
      // Restore with SKU conflict
      await t.mutation(api.products.deletion.restoreProducts, {
        trashIds: [deleteResult.trashId],
      });
      
      // Check audit logs
      const logs = await t.query(api.deletionAuditLogs.list, {
        organizationId,
      });
      
      const restoreLog = logs.page.find(l => l.operationType === 'restore');
      expect(restoreLog).toBeDefined();
      expect(restoreLog!.confirmationMethod).toContain('SKU changes');
    });
  });
});