import { convexTest } from '../test-helpers';

describe('Products API', () => {
  let ctx: any;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    ctx = convexTest();

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

  describe('getProducts', () => {
    beforeEach(async () => {
      // Create test products
      for (let i = 0; i < 15; i++) {
        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: `Product ${i}`,
          handle: `product-${i}`,
          title: `Product ${i} Title`,
          description: i % 2 === 0 ? `Description for product ${i}` : null,
          status: i % 3 === 0 ? 'draft' : 'active',
          imageUrl: i % 4 === 0 ? `https://example.com/image-${i}.jpg` : null,
          externalId: `ext-${i}`,
          metadata: { index: i },
          createdAt: Date.now() - (i * 1000),
          updatedAt: Date.now() - (i * 1000),
        });
      }
    });

    it('should return paginated products for organization', async () => {
      const result = await ctx.runQuery('getProducts', {
        organizationId: orgId,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.totalCount).toBe(15);
      
      // Should be ordered by creation date desc (newest first)
      expect(result.products[0].name).toBe('Product 0');
      expect(result.products[9].name).toBe('Product 9');
    });

    it('should filter products by project', async () => {
      // Create another project with products
      const projectId2 = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Second Project',
        slug: 'second-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('products', {
        organizationId: orgId,
        projectId: projectId2,
        name: 'Second Project Product',
        handle: 'second-project-product',
        title: 'Second Project Product',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery('getProducts', {
        organizationId: orgId,
        projectId,
      });

      expect(result.products).toHaveLength(10);
      expect(result.totalCount).toBe(15); // Only from first project
      expect(result.products.every((p: any) => p.projectId === projectId)).toBe(true);
    });

    it('should filter products by status', async () => {
      const result = await ctx.runQuery('getProducts', {
        organizationId: orgId,
        status: 'draft',
      });

      expect(result.totalCount).toBe(5); // Products 0, 3, 6, 9, 12
      expect(result.products.every((p: any) => p.status === 'draft')).toBe(true);
    });

    it('should search products by name/title', async () => {
      const result = await ctx.runQuery('getProducts', {
        organizationId: orgId,
        search: 'Product 1',
      });

      // Should match Product 1, 10, 11, 12, 13, 14
      expect(result.totalCount).toBe(6);
      expect(result.products.every((p: any) => 
        p.name.includes('Product 1') || p.title.includes('Product 1')
      )).toBe(true);
    });

    it('should handle pagination with cursor', async () => {
      const firstPage = await ctx.runQuery('getProducts', {
        organizationId: orgId,
        limit: 5,
      });

      expect(firstPage.products).toHaveLength(5);
      expect(firstPage.hasMore).toBe(true);

      // Get next page using cursor
      const secondPage = await ctx.runQuery('getProducts', {
        organizationId: orgId,
        limit: 5,
        cursor: firstPage.nextCursor,
      });

      expect(secondPage.products).toHaveLength(5);
      expect(secondPage.products[0].name).toBe('Product 5');
    });
  });

  describe('getProduct', () => {
    let productId: string;

    beforeEach(async () => {
      productId = await ctx.db.insert('products', {
        organizationId: orgId,
        projectId,
        name: 'Test Product',
        handle: 'test-product',
        title: 'Test Product Title',
        description: 'Test description',
        status: 'active',
        imageUrl: 'https://example.com/test.jpg',
        externalId: 'ext-123',
        metadata: { custom: 'data' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should return product by ID', async () => {
      const result = await ctx.runQuery('getProduct', { productId });

      expect(result).toBeDefined();
      expect(result._id).toBe(productId);
      expect(result.name).toBe('Test Product');
      expect(result.handle).toBe('test-product');
      expect(result.metadata.custom).toBe('data');
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        ctx.runQuery('getProduct', { productId: 'nonexistent' as any })
      ).rejects.toThrow();
    });

    it('should throw error when user not in organization', async () => {
      // Create product in different org
      const otherOrgId = await ctx.db.insert('organizations', {
        name: 'Other Org',
        clerkOrganizationId: 'org_456',
        slug: 'other-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const otherProjectId = await ctx.db.insert('projects', {
        organizationId: otherOrgId,
        name: 'Other Project',
        slug: 'other-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const otherProductId = await ctx.db.insert('products', {
        organizationId: otherOrgId,
        projectId: otherProjectId,
        name: 'Other Product',
        handle: 'other-product',
        title: 'Other Product',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runQuery('getProduct', { productId: otherProductId })
      ).rejects.toThrow();
    });
  });

  describe('createProduct', () => {
    it('should create new product with generated handle', async () => {
      const productData = {
        organizationId: orgId,
        projectId,
        name: 'New Product',
        title: 'New Product Title',
        description: 'Product description',
        status: 'active' as const,
        imageUrl: 'https://example.com/new.jpg',
        externalId: 'ext-new',
        metadata: { source: 'api' },
      };

      const result = await ctx.runMutation('createProduct', productData);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Product');
      expect(result.handle).toBe('new-product');
      expect(result.organizationId).toBe(orgId);
      expect(result.projectId).toBe(projectId);
      expect(result.metadata.source).toBe('api');
    });

    it('should use custom handle when provided', async () => {
      const result = await ctx.runMutation('createProduct', {
        organizationId: orgId,
        projectId,
        name: 'Custom Handle Product',
        handle: 'my-custom-handle',
        title: 'Custom Handle Product',
        status: 'active',
      });

      expect(result.handle).toBe('my-custom-handle');
    });

    it('should ensure unique handles within project', async () => {
      // Create first product
      await ctx.runMutation('createProduct', {
        organizationId: orgId,
        projectId,
        name: 'First Product',
        handle: 'unique-handle',
        title: 'First Product',
        status: 'active',
      });

      // Try to create with same handle
      await expect(
        ctx.runMutation('createProduct', {
          organizationId: orgId,
          projectId,
          name: 'Second Product',
          handle: 'unique-handle',
          title: 'Second Product',
          status: 'active',
        })
      ).rejects.toThrow();
    });

    it('should create audit log entry', async () => {
      const result = await ctx.runMutation('createProduct', {
        organizationId: orgId,
        projectId,
        name: 'Audited Product',
        title: 'Audited Product',
        status: 'active',
      });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), result._id))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('product.created');
      expect(auditLogs[0].entityType).toBe('product');
      expect(auditLogs[0].context.projectId).toBe(projectId);
    });
  });

  describe('updateProduct', () => {
    let productId: string;

    beforeEach(async () => {
      productId = await ctx.db.insert('products', {
        organizationId: orgId,
        projectId,
        name: 'Original Product',
        handle: 'original-product',
        title: 'Original Title',
        description: 'Original description',
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update product fields', async () => {
      const updates = {
        productId,
        name: 'Updated Product',
        title: 'Updated Title',
        description: 'Updated description',
        status: 'active' as const,
        imageUrl: 'https://example.com/updated.jpg',
        metadata: { updated: true },
      };

      const result = await ctx.runMutation('updateProduct', updates);

      expect(result.name).toBe('Updated Product');
      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
      expect(result.status).toBe('active');
      expect(result.imageUrl).toBe('https://example.com/updated.jpg');
      expect(result.metadata.updated).toBe(true);
      expect(result.handle).toBe('original-product'); // Handle not changed
    });

    it('should update handle when explicitly provided', async () => {
      const result = await ctx.runMutation('updateProduct', {
        productId,
        handle: 'new-handle',
      });

      expect(result.handle).toBe('new-handle');
    });

    it('should create audit log for updates', async () => {
      await ctx.runMutation('updateProduct', {
        productId,
        status: 'active',
      });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), productId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('product.updated');
      expect(auditLogs[0].context.changes).toEqual({
        status: { from: 'draft', to: 'active' },
      });
    });
  });

  describe('deleteProduct', () => {
    let productId: string;

    beforeEach(async () => {
      productId = await ctx.db.insert('products', {
        organizationId: orgId,
        projectId,
        name: 'Product to Delete',
        handle: 'delete-me',
        title: 'Delete Me',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should soft delete product', async () => {
      await ctx.runMutation('deleteProduct', { productId });

      const product = await ctx.db.get(productId);
      expect(product.deletedAt).toBeDefined();
      expect(product.deletedAt).toBeGreaterThan(0);
    });

    it('should create audit log for deletion', async () => {
      await ctx.runMutation('deleteProduct', { productId });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), productId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('product.deleted');
    });

    it('should not return deleted products in queries', async () => {
      await ctx.runMutation('deleteProduct', { productId });

      const result = await ctx.runQuery('getProducts', {
        organizationId: orgId,
      });

      expect(result.products.find((p: any) => p._id === productId)).toBeUndefined();
    });
  });

  describe('bulkUpdateProducts', () => {
    let productIds: string[];

    beforeEach(async () => {
      productIds = [];
      for (let i = 0; i < 3; i++) {
        const id = await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: `Bulk Product ${i}`,
          handle: `bulk-product-${i}`,
          title: `Bulk Product ${i}`,
          status: 'draft',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        productIds.push(id);
      }
    });

    it('should update multiple products at once', async () => {
      const result = await ctx.runMutation('bulkUpdateProducts', {
        productIds,
        updates: {
          status: 'active',
          metadata: { bulk: true },
        },
      });

      expect(result.updated).toBe(3);

      // Verify all products were updated
      for (const id of productIds) {
        const product = await ctx.db.get(id);
        expect(product.status).toBe('active');
        expect(product.metadata.bulk).toBe(true);
      }
    });

    it('should create audit logs for bulk updates', async () => {
      await ctx.runMutation('bulkUpdateProducts', {
        productIds,
        updates: { status: 'archived' },
      });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('eventType'), 'product.bulk_updated'))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].context.count).toBe(3);
      expect(auditLogs[0].context.updates).toEqual({ status: 'archived' });
    });
  });
});