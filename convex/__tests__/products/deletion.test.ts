import { convexTest } from '../test-helpers';

describe('Product Deletion', () => {
  beforeEach(() => {
    // Test setup is handled by convexTest
  });

  describe('deleteProduct', () => {
    it('should soft delete a product and create trash entry', async () => {
      const ctx = convexTest();
      
      // Setup test data
      const userId = await ctx.db.insert('users', {
          clerkId: 'test-clerk-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

      const orgId = await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          status: 'active',
          subscription: {
            plan: 'pro',
            status: 'active',
            seats: 5,
            features: ['advanced'],
          },
          settings: {
            aiProvider: 'openai',
            aiModel: 'gpt-4',
            apiKeys: {},
            categorization: {
              batchSize: 10,
              prompt: 'Categorize this',
              autoApprove: false,
              confidenceThreshold: 0.8,
            },
            storage: {
              maxFileSize: 10000000,
              totalStorageLimit: 100000000,
              allowedFileTypes: ['image/jpeg', 'image/png'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        });

      const projectId = await ctx.db.insert('projects', {
          organizationId: orgId,
          name: 'Test Project',
          slug: 'test-project',
          status: 'active',
          settings: {
            defaultCurrency: 'USD',
            importSettings: {
              autoValidate: true,
              duplicateHandling: 'skip',
              requiredFields: ['title'],
            },
          },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        });

      // Create membership
      await ctx.db.insert('organizationMemberships', {
          organizationId: orgId,
          userId,
          role: 'admin',
          permissions: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

      // Create product
      const productId = await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          title: 'Test Product',
          handle: 'test-product',
          sku: 'TEST-123',
          status: 'active',
          tags: [],
          categories: [],
          images: [],
          metadata: {},
          version: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        });

      // Test deletion with proper auth context
      const result = await ctx.runMutation('deleteProduct', {
          productId,
          reason: 'Test deletion',
        });

      expect(result.success).toBe(true);
      expect(result.trashId).toBeDefined();

      // Verify product was soft deleted
      const product = await ctx.db.get(productId);
      expect(product?.status).toBe('archived');
      expect(product?.archivedAt).toBeDefined();

      // Verify trash entry was created
      const trashEntry = await ctx.db.get(result.trashId);
      expect(trashEntry).toBeDefined();
      expect(trashEntry?.productId).toBe(productId);
      expect(trashEntry?.deletionReason).toBe('Test deletion');
      expect(trashEntry?.recoveryStatus).toBe('recoverable');
    });
  });

  describe('bulkDeleteProducts', () => {
    it('should require correct confirmation text', async () => {
      const ctx = convexTest();
      
      await expect(
        ctx.runMutation('bulkDeleteProducts', {
            productIds: ['123' as any, '456' as any],
            confirmationText: 'WRONG TEXT',
          })
      ).rejects.toThrow('Invalid confirmation text');
    });
  });

  describe('getTrashItems', () => {
    it('should return paginated trash items', async () => {
      const ctx = convexTest();
      
      const result = await ctx.runQuery('getTrashItems', {
          organizationId: '123' as any,
          limit: 10,
        });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('continueCursor');
      expect(result).toHaveProperty('isDone');
      expect(result).toHaveProperty('totalCount');
    });
  });
});