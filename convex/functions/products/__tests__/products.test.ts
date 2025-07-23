import { describe, it, expect, beforeEach } from '@jest/globals';
import { t } from '../../../test.setup';
import { api } from '../../../_generated/api';
import { Id } from '../../../_generated/dataModel';

import { createProduct, updateProduct, deleteProduct } from '../products';

describe('Products Functions', () => {
  let userId: Id<'users'>;
  let orgId: Id<'organizations'>;
  let projectId: Id<'projects'>;

  beforeEach(() => {
    // t is already imported from test.setup
    userId = 'user123' as Id<'users'>;
    orgId = 'org123' as Id<'organizations'>;
    projectId = 'project123' as Id<'projects'>;

    // Set up test data
    t.db.insert('users', {
      _id: userId,
      _creationTime: Date.now(),
      email: 'test@example.com',
      emailVerified: true,
      displayName: 'Test User',
      role: 'admin' as const,
    });

    t.db.insert('organizations', {
      _id: orgId,
      _creationTime: Date.now(),
      name: 'Test Organization',
      slug: 'test-org',
      owner: userId,
      ownerId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPersonal: false,
      subscriptionStatus: 'active',
      subscriptionPlan: 'free',
      enforceUniqueSku: false,
    });

    t.db.insert('organizationMembers', {
      _id: 'member123' as Id<'organizationMembers'>,
      _creationTime: Date.now(),
      userId,
      organizationId: orgId,
      role: 'owner',
      joinedAt: Date.now(),
    });

    t.db.insert('projects', {
      _id: projectId,
      _creationTime: Date.now(),
      name: 'Test Project',
      organizationId: orgId,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  describe('create', () => {
    it('should create product with valid data', async () => {
      const productData = {
        title: 'Test Product',
        sku: 'TEST-SKU-001',
        description: 'A test product',
        handle: 'test-product',
        status: 'active' as const,
        type: 'physical' as const,
        organizationId: orgId,
        projectId,
      };

      const result = await test.mutation(api.products.create, {
        ...productData,
        userId,
      });

      expect(result).toMatchObject({
        _id: expect.any(String),
        title: 'Test Product',
        sku: 'TEST-SKU-001',
        description: 'A test product',
        handle: 'test-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should auto-generate SKU when not provided', async () => {
      const productData = {
        title: 'Product Without SKU',
        description: 'A test product without SKU',
        handle: 'product-without-sku',
        status: 'active' as const,
        type: 'physical' as const,
        organizationId: orgId,
        projectId,
      };

      const result = await test.mutation(api.products.create, {
        ...productData,
        userId,
      });

      expect(result.sku).toMatch(/^SKU-[A-Z0-9]{8}$/);
    });

    it('should reject duplicate SKU when enforceUniqueSku is true', async () => {
      // Update organization to enforce unique SKU
      t.db.patch(orgId, { enforceUniqueSku: true });

      // Create first product
      const productId = 'product1' as Id<'products'>;
      t.db.insert('products', {
        _id: productId,
        _creationTime: Date.now(),
        title: 'Existing Product',
        sku: 'DUPLICATE-SKU',
        handle: 'existing-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Try to create product with duplicate SKU
      await expect(
        test.mutation(api.products.create, {
          title: 'New Product',
          sku: 'DUPLICATE-SKU',
          handle: 'new-product',
          status: 'active' as const,
          type: 'physical' as const,
          organizationId: orgId,
          projectId,
          userId,
        })
      ).rejects.toThrow('SKU already exists');
    });

    it('should allow duplicate SKU when enforceUniqueSku is false', async () => {
      // Create first product
      const productId = 'product1' as Id<'products'>;
      t.db.insert('products', {
        _id: productId,
        _creationTime: Date.now(),
        title: 'Existing Product',
        sku: 'DUPLICATE-SKU',
        handle: 'existing-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create product with same SKU (should succeed)
      const result = await test.mutation(api.products.create, {
        title: 'New Product',
        sku: 'DUPLICATE-SKU',
        handle: 'new-product',
        status: 'active' as const,
        type: 'physical' as const,
        organizationId: orgId,
        projectId,
        userId,
      });

      expect(result.sku).toBe('DUPLICATE-SKU');
    });

    it('should reject creation without proper permissions', async () => {
      const otherUserId = 'other123' as Id<'users'>;
      t.db.insert('users', {
        _id: otherUserId,
        _creationTime: Date.now(),
        email: 'other@example.com',
        emailVerified: true,
        displayName: 'Other User',
        role: 'user' as const,
      });

      await expect(
        test.mutation(api.products.create, {
          title: 'Unauthorized Product',
          handle: 'unauthorized',
          status: 'active' as const,
          type: 'physical' as const,
          organizationId: orgId,
          projectId,
          userId: otherUserId,
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    let productId: Id<'products'>;

    beforeEach(() => {
      productId = 'product123' as Id<'products'>;
      t.db.insert('products', {
        _id: productId,
        _creationTime: Date.now(),
        title: 'Original Product',
        sku: 'ORIGINAL-SKU',
        description: 'Original description',
        handle: 'original-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update product fields', async () => {
      const updates = {
        title: 'Updated Product',
        description: 'Updated description',
        status: 'draft' as const,
      };

      const result = await test.mutation(api.products.update, {
        id: productId,
        ...updates,
        userId,
      });

      expect(result).toMatchObject({
        _id: productId,
        title: 'Updated Product',
        description: 'Updated description',
        status: 'draft',
        sku: 'ORIGINAL-SKU', // SKU should not change
        updatedAt: expect.any(Number),
      });
    });

    it('should update SKU when allowed', async () => {
      const result = await test.mutation(api.products.update, {
        id: productId,
        sku: 'NEW-SKU',
        userId,
      });

      expect(result.sku).toBe('NEW-SKU');
    });

    it('should reject SKU update to existing SKU when enforceUniqueSku', async () => {
      // Update organization to enforce unique SKU
      t.db.patch(orgId, { enforceUniqueSku: true });

      // Create another product
      const otherProductId = 'product456' as Id<'products'>;
      t.db.insert('products', {
        _id: otherProductId,
        _creationTime: Date.now(),
        title: 'Other Product',
        sku: 'EXISTING-SKU',
        handle: 'other-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        test.mutation(api.products.update, {
          id: productId,
          sku: 'EXISTING-SKU',
          userId,
        })
      ).rejects.toThrow('SKU already exists');
    });

    it('should reject update without permissions', async () => {
      const otherUserId = 'other123' as Id<'users'>;
      t.db.insert('users', {
        _id: otherUserId,
        _creationTime: Date.now(),
        email: 'other@example.com',
        emailVerified: true,
        displayName: 'Other User',
        role: 'user' as const,
      });

      await expect(
        test.mutation(api.products.update, {
          id: productId,
          title: 'Unauthorized Update',
          userId: otherUserId,
        })
      ).rejects.toThrow();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      // Create multiple products
      const products = [
        {
          _id: 'product1' as Id<'products'>,
          title: 'Product 1',
          sku: 'SKU-001',
          handle: 'product-1',
          status: 'active' as const,
          type: 'physical' as const,
        },
        {
          _id: 'product2' as Id<'products'>,
          title: 'Product 2',
          sku: 'SKU-002',
          handle: 'product-2',
          status: 'draft' as const,
          type: 'digital' as const,
        },
        {
          _id: 'product3' as Id<'products'>,
          title: 'Product 3',
          sku: 'SKU-003',
          handle: 'product-3',
          status: 'active' as const,
          type: 'physical' as const,
        },
      ];

      products.forEach(product => {
        t.db.insert('products', {
          ...product,
          _creationTime: Date.now(),
          organizationId: orgId,
          projectId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
    });

    it('should list all products for organization', async () => {
      const result = await test.query(api.products.list, {
        organizationId: orgId,
        userId,
      });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      const result = await test.query(api.products.list, {
        organizationId: orgId,
        filters: { status: 'active' },
        userId,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(p => p.status === 'active')).toBe(true);
    });

    it('should filter by type', async () => {
      const result = await test.query(api.products.list, {
        organizationId: orgId,
        filters: { type: 'digital' },
        userId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('digital');
    });

    it('should search by title', async () => {
      const result = await test.query(api.products.list, {
        organizationId: orgId,
        search: 'Product 2',
        userId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Product 2');
    });

    it('should paginate results', async () => {
      const page1 = await test.query(api.products.list, {
        organizationId: orgId,
        limit: 2,
        userId,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await test.query(api.products.list, {
        organizationId: orgId,
        limit: 2,
        cursor: page1.nextCursor,
        userId,
      });

      expect(page2.items).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });
  });

  describe('get', () => {
    let productId: Id<'products'>;

    beforeEach(() => {
      productId = 'product123' as Id<'products'>;
      t.db.insert('products', {
        _id: productId,
        _creationTime: Date.now(),
        title: 'Test Product',
        sku: 'TEST-SKU',
        description: 'Test description',
        handle: 'test-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['tag1', 'tag2'],
        vendor: 'Test Vendor',
      });
    });

    it('should get product by id', async () => {
      const result = await test.query(api.products.get, {
        id: productId,
        userId,
      });

      expect(result).toMatchObject({
        _id: productId,
        title: 'Test Product',
        sku: 'TEST-SKU',
        description: 'Test description',
        tags: ['tag1', 'tag2'],
        vendor: 'Test Vendor',
      });
    });

    it('should return null for non-existent product', async () => {
      const result = await test.query(api.products.get, {
        id: 'nonexistent' as Id<'products'>,
        userId,
      });

      expect(result).toBeNull();
    });

    it('should reject access without permissions', async () => {
      const otherUserId = 'other123' as Id<'users'>;
      t.db.insert('users', {
        _id: otherUserId,
        _creationTime: Date.now(),
        email: 'other@example.com',
        emailVerified: true,
        displayName: 'Other User',
        role: 'user' as const,
      });

      await expect(
        test.query(api.products.get, {
          id: productId,
          userId: otherUserId,
        })
      ).rejects.toThrow();
    });
  });

  describe('generateSku', () => {
    it('should generate unique SKU', async () => {
      const result1 = await test.mutation(api.products.generateSku, {
        organizationId: orgId,
        userId,
      });

      const result2 = await test.mutation(api.products.generateSku, {
        organizationId: orgId,
        userId,
      });

      expect(result1).toMatch(/^SKU-[A-Z0-9]{8}$/);
      expect(result2).toMatch(/^SKU-[A-Z0-9]{8}$/);
      expect(result1).not.toBe(result2);
    });

    it('should generate SKU with prefix', async () => {
      const result = await test.mutation(api.products.generateSku, {
        organizationId: orgId,
        prefix: 'TEST',
        userId,
      });

      expect(result).toMatch(/^TEST-[A-Z0-9]{8}$/);
    });

    it('should ensure generated SKU is unique in organization', async () => {
      // Update org to enforce unique SKU
      t.db.patch(orgId, { enforceUniqueSku: true });

      // Create a product with a specific SKU
      const existingSku = 'SKU-EXISTING1';
      t.db.insert('products', {
        _id: 'product1' as Id<'products'>,
        _creationTime: Date.now(),
        title: 'Existing Product',
        sku: existingSku,
        handle: 'existing',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Generate multiple SKUs and ensure none match existing
      const skus = await Promise.all(
        Array(5).fill(null).map(() =>
          test.mutation(api.products.generateSku, {
            organizationId: orgId,
            userId,
          })
        )
      );

      // All should be unique
      const uniqueSkus = new Set(skus);
      expect(uniqueSkus.size).toBe(5);
      expect(skus).not.toContain(existingSku);
    });
  });
});