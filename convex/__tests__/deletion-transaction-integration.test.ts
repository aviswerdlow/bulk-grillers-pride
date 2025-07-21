import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CASCADE_DELETION_FLAGS } from '../migrations/001_cascade_deletion_schema';

// Mock the _generated modules
vi.mock('../_generated/server', () => ({
  mutation: (config: any) => config,
  internalMutation: (config: any) => config,
  query: (config: any) => config,
}));

vi.mock('../_generated/api', () => ({
  internal: {},
}));

// Import after mocking
import { deleteProduct, bulkDeleteProducts } from '../functions/products/deletion';

describe('Deletion Transaction Integration', () => {
  let mockCtx: any;
  let mockProduct: any;
  let mockUser: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock data
    mockProduct = {
      _id: 'product-123',
      organizationId: 'org-123',
      projectId: 'project-123',
      title: 'Test Product',
      sku: 'TEST-123',
      status: 'active',
      images: [
        { storageId: 'img-123', url: 'http://example.com/img.jpg', id: 'img-123' },
      ],
    };

    mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    // Setup mock context
    mockCtx = {
      db: {
        get: vi.fn().mockImplementation((id: string) => {
          if (id === 'product-123') return Promise.resolve(mockProduct);
          if (id === 'user-123') return Promise.resolve(mockUser);
          return Promise.resolve(null);
        }),
        insert: vi.fn().mockResolvedValue('inserted-id'),
        patch: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(() => ({
          withIndex: vi.fn(() => ({
            collect: vi.fn().mockResolvedValue([
              {
                _id: 'variant-123',
                productId: 'product-123',
                status: 'active',
              },
            ]),
            filter: vi.fn(() => ({
              collect: vi.fn().mockResolvedValue([]),
            })),
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
    };

    // Enable all cascade deletion features
    Object.assign(CASCADE_DELETION_FLAGS, {
      USE_TRANSACTIONAL_DELETION: true,
      LOG_CASCADE_TRANSACTIONS: true,
      PRESERVE_CATEGORY_ASSIGNMENTS: true,
      USE_IMAGE_CLEANUP_QUEUE: true,
      ENABLE_TRANSACTION_ROLLBACK: true,
    });
  });

  describe('Single Product Deletion', () => {
    it('should use transactional deletion when flag is enabled', async () => {
      // Mock auth
      const mockRequireRole = vi.fn().mockResolvedValue({ user: mockUser });
      vi.doMock('../lib/auth', () => ({
        requireRole: mockRequireRole,
        authenticateAndAuthorize: vi.fn(),
      }));

      const handler = deleteProduct.handler;
      await handler(mockCtx, { productId: 'product-123' });

      // Verify transaction was created
      expect(mockCtx.db.insert).toHaveBeenCalledWith('cascadeTransactions', expect.objectContaining({
        operationType: 'single_delete',
        status: 'in_progress',
        primaryEntityId: 'product-123',
      }));

      // Verify product was archived
      expect(mockCtx.db.patch).toHaveBeenCalledWith('product-123', expect.objectContaining({
        status: 'archived',
        archivedAt: expect.any(Number),
        archivedBy: 'user-123',
      }));

      // Verify trash entry was created
      expect(mockCtx.db.insert).toHaveBeenCalledWith('productTrash', expect.any(Object));
    });

    it('should preserve category assignments when flag is enabled', async () => {
      // Mock category assignments
      const mockAssignments = [
        {
          _id: 'assignment-123',
          organizationId: 'org-123',
          projectId: 'project-123',
          categoryId: 'category-123',
          productId: 'product-123',
          assignedBy: 'manual',
          status: 'active',
          createdAt: Date.now(),
        },
      ];

      mockCtx.db.query = vi.fn(() => ({
        withIndex: vi.fn(() => ({
          collect: vi.fn().mockImplementation(() => {
            // Return variants or assignments based on the query
            return Promise.resolve(mockAssignments);
          }),
        })),
      }));

      const handler = deleteProduct.handler;
      await handler(mockCtx, { productId: 'product-123' });

      // Verify assignment was preserved in trash
      expect(mockCtx.db.insert).toHaveBeenCalledWith('categoryAssignmentsTrash', expect.objectContaining({
        originalAssignmentId: 'assignment-123',
        recoverable: true,
        cascadeTransactionId: expect.any(String),
      }));

      // Verify original assignment was deleted
      expect(mockCtx.db.delete).toHaveBeenCalledWith('assignment-123');
    });

    it('should queue images for cleanup when flag is enabled', async () => {
      const handler = deleteProduct.handler;
      await handler(mockCtx, { productId: 'product-123' });

      // Verify image was queued for cleanup
      expect(mockCtx.db.insert).toHaveBeenCalledWith('imageCleanupQueue', expect.objectContaining({
        storageId: 'img-123',
        originalProductId: 'product-123',
        status: 'pending',
        queuedBy: 'deletion',
        cascadeTransactionId: expect.any(String),
      }));
    });
  });

  describe('Bulk Product Deletion', () => {
    it('should process bulk deletions with transactions', async () => {
      // Mock multiple products
      mockCtx.db.get = vi.fn().mockImplementation((id: string) => {
        if (id === 'product-123' || id === 'product-456') {
          return Promise.resolve({
            ...mockProduct,
            _id: id,
          });
        }
        if (id === 'user-123') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      const handler = bulkDeleteProducts.handler;
      const result = await handler(mockCtx, {
        productIds: ['product-123', 'product-456'],
        confirmationText: 'DELETE 2',
      });

      expect(result.deletedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Verify each product had its own transaction
      const transactionCalls = mockCtx.db.insert.mock.calls.filter(
        (call: any) => call[0] === 'cascadeTransactions'
      );
      expect(transactionCalls.length).toBe(2);
    });

    it('should create audit log for bulk deletions', async () => {
      const handler = bulkDeleteProducts.handler;
      await handler(mockCtx, {
        productIds: ['product-123'],
        confirmationText: 'DELETE 1',
      });

      // Verify audit log was created
      expect(mockCtx.db.insert).toHaveBeenCalledWith('deletionAuditLogs', expect.objectContaining({
        operationType: 'bulk_delete',
        totalCount: 1,
        confirmationMethod: 'DELETE 1',
      }));
    });
  });

  describe('Legacy Mode', () => {
    beforeEach(() => {
      // Disable transactional deletion
      CASCADE_DELETION_FLAGS.USE_TRANSACTIONAL_DELETION = false;
    });

    it('should fall back to non-transactional deletion when flag is disabled', async () => {
      const handler = deleteProduct.handler;
      await handler(mockCtx, { productId: 'product-123' });

      // Verify no transaction was created
      const transactionCalls = mockCtx.db.insert.mock.calls.filter(
        (call: any) => call[0] === 'cascadeTransactions'
      );
      expect(transactionCalls.length).toBe(0);

      // But product should still be archived
      expect(mockCtx.db.patch).toHaveBeenCalledWith('product-123', expect.objectContaining({
        status: 'archived',
      }));
    });
  });
});