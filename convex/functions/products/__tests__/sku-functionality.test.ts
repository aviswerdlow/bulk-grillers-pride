import { describe, it, expect, beforeEach } from '@jest/globals';
import { convexTest } from 'convex-test';
import { api } from '../../../_generated/api';
import { Id } from '../../../_generated/dataModel';
import schema from '../../../schema';
import { createTestOrganization, createTestProduct, createTestUser } from '@bulk-grillers-pride/test-factories';

describe('SKU Backend Functionality', () => {
  let t: any;
  let organizationId: Id<'organizations'>;
  let userId: Id<'users'>;

  beforeEach(async () => {
    t = convexTest(schema);
    
    // Create test organization and user
    const org = createTestOrganization();
    organizationId = await t.run(async (ctx: any) => {
      return await ctx.db.insert('organizations', {
        ...org,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    const user = createTestUser();
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert('users', {
        ...user,
        organizationId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  });

  describe('Product Creation with SKU', () => {
    it('creates product with SKU when provided', async () => {
      const productData = {
        organizationId,
        title: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-001',
        price: 29.99,
        status: 'active' as const,
      };

      const productId = await t.mutation(api.functions.products.products.create, productData);
      
      const product = await t.query(api.functions.products.products.get, { id: productId });
      
      expect(product).toBeDefined();
      expect(product?.sku).toBe('TEST-001');
      expect(product?.title).toBe('Test Product');
    });

    it('creates product without SKU when not provided', async () => {
      const productData = {
        organizationId,
        title: 'Test Product No SKU',
        description: 'Test Description',
        price: 19.99,
        status: 'active' as const,
      };

      const productId = await t.mutation(api.functions.products.products.create, productData);
      
      const product = await t.query(api.functions.products.products.get, { id: productId });
      
      expect(product).toBeDefined();
      expect(product?.sku).toBeUndefined();
    });

    it('validates SKU uniqueness within organization', async () => {
      // Create first product with SKU
      await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Product 1',
        sku: 'DUPLICATE-001',
        price: 29.99,
        status: 'active' as const,
      });

      // Attempt to create second product with same SKU
      await expect(
        t.mutation(api.functions.products.products.create, {
          organizationId,
          title: 'Product 2',
          sku: 'DUPLICATE-001',
          price: 39.99,
          status: 'active' as const,
        })
      ).rejects.toThrow('SKU already exists');
    });

    it('allows same SKU in different organizations', async () => {
      // Create another organization
      const org2 = createTestOrganization({ name: 'Second Org' });
      const org2Id = await t.run(async (ctx: any) => {
        return await ctx.db.insert('organizations', {
          ...org2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        });
      });

      // Create product with SKU in first org
      await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Product Org 1',
        sku: 'SHARED-001',
        price: 29.99,
        status: 'active' as const,
      });

      // Create product with same SKU in second org - should succeed
      const product2Id = await t.mutation(api.functions.products.products.create, {
        organizationId: org2Id,
        title: 'Product Org 2',
        sku: 'SHARED-001',
        price: 39.99,
        status: 'active' as const,
      });

      expect(product2Id).toBeDefined();
    });
  });

  describe('Product Update with SKU', () => {
    it('updates product SKU successfully', async () => {
      const productId = await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Update Test Product',
        sku: 'ORIGINAL-001',
        price: 29.99,
        status: 'active' as const,
      });

      await t.mutation(api.functions.products.products.update, {
        id: productId,
        sku: 'UPDATED-001',
      });

      const updatedProduct = await t.query(api.functions.products.products.get, { id: productId });
      expect(updatedProduct?.sku).toBe('UPDATED-001');
    });

    it('prevents updating to duplicate SKU', async () => {
      // Create two products
      await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Product 1',
        sku: 'EXISTING-001',
        price: 29.99,
        status: 'active' as const,
      });

      const product2Id = await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Product 2',
        sku: 'UNIQUE-001',
        price: 39.99,
        status: 'active' as const,
      });

      // Try to update product 2 with product 1's SKU
      await expect(
        t.mutation(api.functions.products.products.update, {
          id: product2Id,
          sku: 'EXISTING-001',
        })
      ).rejects.toThrow('SKU already exists');
    });

    it('allows clearing SKU', async () => {
      const productId = await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Clear SKU Test',
        sku: 'TO-CLEAR-001',
        price: 29.99,
        status: 'active' as const,
      });

      await t.mutation(api.functions.products.products.update, {
        id: productId,
        sku: undefined,
      });

      const updatedProduct = await t.query(api.functions.products.products.get, { id: productId });
      expect(updatedProduct?.sku).toBeUndefined();
    });
  });

  describe('SKU Search Functionality', () => {
    beforeEach(async () => {
      // Create test products with various SKUs
      const products = [
        { title: 'Beef Steak', sku: 'BEEF-001', price: 29.99 },
        { title: 'Chicken Breast', sku: 'CHKN-002', price: 19.99 },
        { title: 'Pork Chops', sku: 'PORK-003', price: 24.99 },
        { title: 'Ground Beef', sku: 'BEEF-GRD-001', price: 15.99 },
        { title: 'No SKU Product', sku: undefined, price: 9.99 },
      ];

      for (const product of products) {
        await t.mutation(api.functions.products.products.create, {
          organizationId,
          ...product,
          status: 'active' as const,
        });
      }
    });

    it('searches products by SKU', async () => {
      const results = await t.query(api.functions.products.products.search, {
        organizationId,
        query: 'BEEF-001',
      });

      expect(results).toHaveLength(1);
      expect(results[0].sku).toBe('BEEF-001');
      expect(results[0].title).toBe('Beef Steak');
    });

    it('searches products by partial SKU', async () => {
      const results = await t.query(api.functions.products.products.search, {
        organizationId,
        query: 'BEEF',
      });

      expect(results).toHaveLength(2);
      expect(results.map(p => p.sku)).toContain('BEEF-001');
      expect(results.map(p => p.sku)).toContain('BEEF-GRD-001');
    });

    it('returns empty array when no SKU matches', async () => {
      const results = await t.query(api.functions.products.products.search, {
        organizationId,
        query: 'NONEXISTENT-999',
      });

      expect(results).toHaveLength(0);
    });

    it('searches by title when SKU not found', async () => {
      const results = await t.query(api.functions.products.products.search, {
        organizationId,
        query: 'Chicken',
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Chicken Breast');
    });
  });

  describe('SKU in Bulk Operations', () => {
    it('validates SKUs in bulk import', async () => {
      const importData = [
        { title: 'Import Product 1', sku: 'IMP-001', price: 29.99 },
        { title: 'Import Product 2', sku: 'IMP-002', price: 39.99 },
        { title: 'Import Product 3', sku: 'IMP-001', price: 49.99 }, // Duplicate
      ];

      const validationResult = await t.action(api.functions.imports.productImport.validateImport, {
        organizationId,
        data: importData,
      });

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Duplicate SKU: IMP-001');
    });

    it('imports products with SKUs successfully', async () => {
      const importData = [
        { title: 'Import Product 1', sku: 'IMP-001', price: 29.99, status: 'active' },
        { title: 'Import Product 2', sku: 'IMP-002', price: 39.99, status: 'active' },
        { title: 'Import Product 3', sku: undefined, price: 49.99, status: 'active' },
      ];

      const importId = await t.action(api.functions.imports.productImport.createImport, {
        organizationId,
        data: importData,
      });

      // Process the import
      await t.action(api.functions.imports.productImport.processImport, {
        importId,
      });

      // Verify products were created with correct SKUs
      const products = await t.query(api.functions.products.products.list, {
        organizationId,
      });

      const skus = products.map(p => p.sku).filter(Boolean);
      expect(skus).toContain('IMP-001');
      expect(skus).toContain('IMP-002');
      expect(products).toHaveLength(3);
    });
  });

  describe('SKU Format Validation', () => {
    it('validates SKU format on creation', async () => {
      const invalidSkus = [
        'ab', // Too short
        'this-is-way-too-long-for-a-sku-field', // Too long
        'invalid@sku', // Invalid characters
        'spaces not allowed',
        'lowercase-not-allowed',
      ];

      for (const sku of invalidSkus) {
        await expect(
          t.mutation(api.functions.products.products.create, {
            organizationId,
            title: 'Invalid SKU Test',
            sku,
            price: 29.99,
            status: 'active' as const,
          })
        ).rejects.toThrow(/Invalid SKU format/);
      }
    });

    it('accepts valid SKU formats', async () => {
      const validSkus = [
        'ABC-123',
        'PRODUCT-2024',
        'SKU123',
        'A1B2C3',
        '123-456-789',
      ];

      for (const sku of validSkus) {
        const productId = await t.mutation(api.functions.products.products.create, {
          organizationId,
          title: `Valid SKU Test ${sku}`,
          sku,
          price: 29.99,
          status: 'active' as const,
        });
        
        expect(productId).toBeDefined();
      }
    });
  });

  describe('SKU in Product Variants', () => {
    it('ensures unique SKUs across product variants', async () => {
      const productId = await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Product with Variants',
        sku: 'MAIN-001',
        price: 29.99,
        status: 'active' as const,
      });

      // Create variants
      await t.mutation(api.functions.products.productVariants.create, {
        productId,
        title: 'Variant 1',
        sku: 'VAR-001',
        price: 29.99,
      });

      // Try to create variant with duplicate SKU
      await expect(
        t.mutation(api.functions.products.productVariants.create, {
          productId,
          title: 'Variant 2',
          sku: 'VAR-001',
          price: 39.99,
        })
      ).rejects.toThrow('SKU already exists');
    });

    it('searches variants by SKU', async () => {
      const productId = await t.mutation(api.functions.products.products.create, {
        organizationId,
        title: 'Product with Searchable Variants',
        price: 29.99,
        status: 'active' as const,
      });

      await t.mutation(api.functions.products.productVariants.create, {
        productId,
        title: 'Red Variant',
        sku: 'SEARCH-VAR-RED',
        price: 29.99,
      });

      await t.mutation(api.functions.products.productVariants.create, {
        productId,
        title: 'Blue Variant',
        sku: 'SEARCH-VAR-BLUE',
        price: 29.99,
      });

      const results = await t.query(api.functions.products.products.searchVariants, {
        organizationId,
        query: 'SEARCH-VAR-RED',
      });

      expect(results).toHaveLength(1);
      expect(results[0].sku).toBe('SEARCH-VAR-RED');
    });
  });
});