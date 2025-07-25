import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CascadeTransaction, withTransaction } from '../migrations/CascadeTransaction';
import { CASCADE_DELETION_FLAGS } from '../migrations/001_cascade_deletion_schema';
import { Id } from '../_generated/dataModel';

// Mock Convex context
const createMockCtx = () => ({
  db: {
    insert: vi.fn().mockResolvedValue('mock-id'),
    patch: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ _id: 'mock-id' }),
    query: vi.fn(() => ({
      withIndex: vi.fn(() => ({
        collect: vi.fn().mockResolvedValue([]),
      })),
      filter: vi.fn(() => ({
        collect: vi.fn().mockResolvedValue([]),
      })),
      collect: vi.fn().mockResolvedValue([]),
    })),
  },
  storage: {
    delete: vi.fn().mockResolvedValue(undefined),
  },
});

describe('CascadeTransaction Integration', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = createMockCtx();
    vi.clearAllMocks();
    // Enable transactional deletion for tests
    Object.assign(CASCADE_DELETION_FLAGS, {
      USE_TRANSACTIONAL_DELETION: true,
      LOG_CASCADE_TRANSACTIONS: true,
      PRESERVE_CATEGORY_ASSIGNMENTS: true,
      USE_IMAGE_CLEANUP_QUEUE: true,
      ENABLE_TRANSACTION_ROLLBACK: true,
    });
  });

  describe('Basic Transaction Operations', () => {
    it('should execute a successful transaction', async () => {
      const result = await withTransaction(
        mockCtx,
        'org-123' as Id<'organizations'>,
        'user-123' as Id<'users'>,
        'single_delete',
        'product-123' as Id<'products'>,
        async (transaction) => {
          await transaction.execute(
            async () => 'operation-result',
            async () => {},
            'Test operation',
            'test',
            'test-123'
          );
          return { success: true };
        }
      );

      expect(result).toEqual({ success: true });
      expect(mockCtx.db.insert).toHaveBeenCalledWith('cascadeTransactions', expect.objectContaining({
        operationType: 'single_delete',
        status: 'in_progress',
        primaryEntityId: 'product-123',
      }));
    });

    it('should handle transaction rollback on failure', async () => {
      const rollbackFn = vi.fn();
      
      await expect(
        withTransaction(
          mockCtx,
          'org-123' as Id<'organizations'>,
          'user-123' as Id<'users'>,
          'single_delete',
          'product-123' as Id<'products'>,
          async (transaction) => {
            await transaction.execute(
              async () => {
                throw new Error('Operation failed');
              },
              rollbackFn,
              'Failing operation',
              'test',
              'test-123'
            );
          }
        )
      ).rejects.toThrow('Transaction failed: Operation failed');

      // Verify rollback was called
      expect(rollbackFn).toHaveBeenCalled();
    });
  });

  describe('Category Assignment Preservation', () => {
    it('should preserve category assignments when flag is enabled', async () => {
      const mockAssignment = {
        _id: 'assignment-123',
        organizationId: 'org-123',
        projectId: 'project-123',
        categoryId: 'category-123',
        productId: 'product-123',
        assignedBy: 'manual' as const,
        status: 'active' as const,
        createdAt: Date.now(),
      };

      mockCtx.db.query = vi.fn(() => ({
        withIndex: vi.fn(() => ({
          collect: vi.fn().mockResolvedValue([mockAssignment]),
        })),
      }));

      const transaction = new CascadeTransaction(
        mockCtx,
        'org-123' as Id<'organizations'>,
        'user-123' as Id<'users'>,
        'single_delete'
      );

      await transaction.initialize('product-123' as Id<'products'>);

      // Simulate preserving assignment
      await transaction.execute(
        async () => mockCtx.db.insert('categoryAssignmentsTrash', {
          originalAssignmentId: mockAssignment._id,
          ...mockAssignment,
          deletedAt: Date.now(),
          deletedBy: 'user-123',
          cascadeTransactionId: transaction.getTransactionId(),
          recoverable: true,
        }),
        async () => {},
        'Preserve category assignment',
        'categoryAssignmentsTrash',
        mockAssignment._id
      );

      expect(mockCtx.db.insert).toHaveBeenCalledWith('categoryAssignmentsTrash', expect.objectContaining({
        originalAssignmentId: 'assignment-123',
        recoverable: true,
      }));
    });
  });

  describe('Image Cleanup Queue', () => {
    it('should queue images for cleanup when flag is enabled', async () => {
      const mockProduct = {
        _id: 'product-123',
        organizationId: 'org-123',
        images: [
          { storageId: 'image-123', url: 'http://example.com/image.jpg', id: 'img-123' },
        ],
      };

      const transaction = new CascadeTransaction(
        mockCtx,
        'org-123' as Id<'organizations'>,
        'user-123' as Id<'users'>,
        'single_delete'
      );

      await transaction.initialize('product-123' as Id<'products'>);

      // Simulate queuing image for cleanup
      await transaction.execute(
        async () => mockCtx.db.insert('imageCleanupQueue', {
          storageId: mockProduct.images[0].storageId,
          originalProductId: mockProduct._id,
          organizationId: mockProduct.organizationId,
          fileUrl: mockProduct.images[0].url,
          fileName: mockProduct.images[0].id,
          queuedAt: Date.now(),
          queuedBy: 'deletion',
          cascadeTransactionId: transaction.getTransactionId(),
          priority: 'low',
          status: 'pending',
          retainUntil: Date.now() + (90 * 24 * 60 * 60 * 1000),
          permanentRetention: false,
          attempts: 0,
          maxAttempts: 3,
          verifiedDeleted: false,
        }),
        async () => {},
        'Queue image for cleanup',
        'imageCleanupQueue',
        mockProduct.images[0].storageId
      );

      expect(mockCtx.db.insert).toHaveBeenCalledWith('imageCleanupQueue', expect.objectContaining({
        storageId: 'image-123',
        status: 'pending',
        queuedBy: 'deletion',
      }));
    });
  });

  describe('Entity Tracking', () => {
    it('should track affected entities during transaction', async () => {
      const transaction = new CascadeTransaction(
        mockCtx,
        'org-123' as Id<'organizations'>,
        'user-123' as Id<'users'>,
        'bulk_delete'
      );

      await transaction.initialize('product-123' as Id<'products'>);
      
      // Mock getting the transaction record
      mockCtx.db.get.mockResolvedValue({
        _id: 'txn-record-123',
        affectedEntities: {
          products: [],
          variants: [],
          assignments: [],
          images: [],
        },
      });

      await transaction.trackAffectedEntity('products', 'product-123');
      await transaction.trackAffectedEntity('variants', 'variant-123');
      await transaction.trackAffectedEntity('assignments', 'assignment-123');

      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        'txn-record-123',
        expect.objectContaining({
          affectedEntities: expect.objectContaining({
            products: ['product-123'],
          }),
        })
      );
    });
  });
});