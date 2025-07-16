import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the auth module before importing anything that uses it
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
  getProjectProducts,
  getProduct,
  getProductVariants,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductVariant,
} from '../../../functions/products/products';
import * as authModule from '../../../lib/auth';

// The auth module should be automatically mocked by Jest
const mockAuth = authModule as jest.Mocked<typeof authModule>;

describe('products', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('getProjectProducts', () => {
    it('should return products for an organization and project', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getProjectProducts, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0]._id).toBe(testData.productId);
      expect(result.page[0].title).toBe('Test Product');
      expect(mockAuth.authenticateAndAuthorize).toHaveBeenCalledWith(
        expect.anything(),
        testData.orgId
      );
    });

    it('should filter by status when provided', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create draft product
      await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Draft Product',
        handle: 'draft-product',
        status: 'draft',
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

      const result = await runQuery(getProjectProducts, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'active',
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].status).toBe('active');
    });

    it('should handle pagination', async () => {
      // Create additional products
      for (let i = 0; i < 5; i++) {
        await db.insert('products', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          title: `Product ${i}`,
          description: `Description ${i}`,
          handle: `product-${i}`,
          status: 'active',
          tags: [],
          categories: [],
          images: [],
          metadata: {},
          version: 1,
          createdBy: testData.userId,
          createdAt: Date.now() + i, // Ensure different creation times for ordering
          updatedAt: Date.now() + i,
          lastModifiedBy: testData.userId,
        });
      }

      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getProjectProducts, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        limit: 3,
      });

      expect(result.page).toHaveLength(3);
      expect(result.continueCursor).toBeDefined();
      expect(result.page[0].title).toBe('Product 4'); // Latest first (desc order)
    });

    it('should throw error when not authenticated', async () => {
      const context = createMockQueryContext(null, db);

      mockAuth.authenticateAndAuthorize.mockRejectedValueOnce(new Error('Not authenticated'));

      await expect(
        runQuery(getProjectProducts, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('getProduct', () => {
    it('should return a single product by ID', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getProduct, context, { productId: testData.productId });

      expect(result._id).toBe(testData.productId);
      expect(result.title).toBe('Test Product');
      expect(mockAuth.authenticateAndAuthorize).toHaveBeenCalledWith(
        expect.anything(),
        testData.orgId
      );
    });

    it('should throw error if product not found', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      await expect(runQuery(getProduct, context, { productId: 'products_999999' })).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw error if user lacks access', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      mockAuth.authenticateAndAuthorize.mockRejectedValueOnce(new Error('Access denied'));

      await expect(
        runQuery(getProduct, context, { productId: testData.productId })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getProductVariants', () => {
    let variantId: string;

    beforeEach(async () => {
      // Create a test variant
      variantId = await db.insert('productVariants', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        productId: testData.productId,
        sku: 'TEST-SKU-001',
        price: 99.99,
        inventoryQuantity: 100,
        inventoryPolicy: 'deny',
        trackQuantity: true,
        options: [{ name: 'Size', value: 'Large' }],
        images: [],
        metadata: {},
        status: 'active',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });
    });

    it('should return variants for a product', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getProductVariants, context, { productId: testData.productId });

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('TEST-SKU-001');
    });

    it('should throw error if product not found', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      await expect(
        runQuery(getProductVariants, context, { productId: 'products_999999' })
      ).rejects.toThrow('Product not found');
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const productId = await runMutation(createProduct, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'New Product',
        description: 'New product description',
        tags: ['new', 'product'],
        metadata: { custom: 'data' },
      });

      convexAssertions.expectToBeValidId(productId, 'products');

      const product = await db.get(productId);
      expect(product.title).toBe('New Product');
      expect(product.handle).toBe('new-product');
      expect(product.status).toBe('draft');
      expect(product.version).toBe(1);
      expect(product.createdBy).toBe(testData.userId);

      // Verify auth was called with correct permissions
      expect(mockAuth.requireRole).toHaveBeenCalledWith(expect.anything(), testData.orgId, [
        'owner',
        'admin',
        'editor',
      ]);

      // Verify audit log was created
      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('CREATE');
      expect(auditLogs[0].entityType).toBe('products');
      expect(auditLogs[0].entityId).toBe(productId);
    });

    it('should auto-generate handle from title', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const productId = await runMutation(createProduct, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Product With Spaces & Special!',
        tags: [],
        metadata: {},
      });

      const product = await db.get(productId);
      expect(product.handle).toBe('product-with-spaces-special-');
    });

    it('should use provided handle when given', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const productId = await runMutation(createProduct, context, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Product',
        handle: 'custom-handle',
        tags: [],
        metadata: {},
      });

      const product = await db.get(productId);
      expect(product.handle).toBe('custom-handle');
    });

    it('should prevent duplicate handles in same project', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(createProduct, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          title: 'Another Product',
          handle: 'test-product', // Already exists
          tags: [],
          metadata: {},
        })
      ).rejects.toThrow('Product handle already exists in this project');
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Mock requireRole to throw insufficient permissions
      mockAuth.requireRole.mockRejectedValueOnce(new Error('Insufficient permissions'));

      await expect(
        runMutation(createProduct, context, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          title: 'New Product',
          tags: [],
          metadata: {},
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(updateProduct, context, {
        productId: testData.productId,
        title: 'Updated Product',
        status: 'active',
      });

      expect(result).toBe(testData.productId);

      const product = await db.get(testData.productId);
      expect(product.title).toBe('Updated Product');
      expect(product.status).toBe('active');
      expect(product.version).toBe(2);
      expect(product.lastModifiedBy).toBe(testData.userId);
    });

    it('should create an audit log for updates', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateProduct, context, {
        productId: testData.productId,
        title: 'Updated Product',
      });

      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('UPDATE');
      expect(auditLogs[0].changes).toHaveLength(1);
      expect(auditLogs[0].changes[0].field).toBe('title');
      expect(auditLogs[0].changes[0].oldValue).toBe('Test Product');
      expect(auditLogs[0].changes[0].newValue).toBe('Updated Product');
    });

    it('should skip update if no changes', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(updateProduct, context, {
        productId: testData.productId,
        title: 'Test Product', // Same as current
      });

      const product = await db.get(testData.productId);
      expect(product.version).toBe(1); // Version should not increment

      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(0); // No audit log created
    });

    it('should prevent duplicate handles', async () => {
      // Create another product
      const otherProductId = await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
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

      const context = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(updateProduct, context, {
          productId: otherProductId,
          handle: 'test-product', // Already exists
        })
      ).rejects.toThrow('Product handle already exists in this project');
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(updateProduct, context, {
          productId: testData.productId,
          title: 'Updated Product',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete a product', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(deleteProduct, context, { productId: testData.productId });

      expect(result).toBe(testData.productId);

      const product = await db.get(testData.productId);
      expect(product.status).toBe('archived');
      expect(product.lastModifiedBy).toBe(testData.userId);

      // Verify audit log
      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('DELETE');
    });

    it('should require admin permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to editor role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'editor' });

      await expect(
        runMutation(deleteProduct, context, { productId: testData.productId })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('createProductVariant', () => {
    it('should create a new product variant', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const variantId = await runMutation(createProductVariant, context, {
        productId: testData.productId,
        title: 'Large Size',
        sku: 'TEST-LARGE-001',
        price: 149.99,
        inventoryQuantity: 50,
        inventoryPolicy: 'deny',
        trackQuantity: true,
        options: [
          { name: 'Size', value: 'Large' },
          { name: 'Color', value: 'Blue' },
        ],
        metadata: { warehouse: 'A' },
      });

      convexAssertions.expectToBeValidId(variantId, 'productVariants');

      const variant = await db.get(variantId);
      expect(variant.sku).toBe('TEST-LARGE-001');
      expect(variant.price).toBe(149.99);
      expect(variant.options).toHaveLength(2);
      expect(variant.status).toBe('active');
      expect(variant.version).toBe(1);

      // Verify audit log was created
      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('CREATE');
      expect(auditLogs[0].entityType).toBe('productVariants');
      expect(auditLogs[0].entityId).toBe(variantId);
    });

    it('should prevent duplicate SKUs within organization', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create first variant
      await runMutation(createProductVariant, context, {
        productId: testData.productId,
        sku: 'DUPLICATE-SKU',
        price: 99.99,
        inventoryPolicy: 'deny',
        trackQuantity: true,
        options: [],
        metadata: {},
      });

      // Try to create duplicate
      await expect(
        runMutation(createProductVariant, context, {
          productId: testData.productId,
          sku: 'DUPLICATE-SKU',
          price: 99.99,
          inventoryPolicy: 'deny',
          trackQuantity: true,
          options: [],
          metadata: {},
        })
      ).rejects.toThrow('SKU already exists in this organization');
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(createProductVariant, context, {
          productId: testData.productId,
          sku: 'TEST-SKU',
          price: 99.99,
          inventoryPolicy: 'deny',
          trackQuantity: true,
          options: [],
          metadata: {},
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
