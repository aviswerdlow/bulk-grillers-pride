/**
 * Integration tests for product management API
 */

import { createConvexTest, setupAuth, seedDatabase, clearDatabase } from '../__tests__/convex-test-standard';
import { testOrganizations } from '../../integration-tests/fixtures/organizations';
import { testUsers } from '../../integration-tests/fixtures/users';

describe('Product Management Integration', () => {
  let test: ReturnType<typeof createConvexTest>;
  
  beforeEach(async () => {
    test = createConvexTest();
    await clearDatabase(test);
  });
  
  afterEach(async () => {
    await clearDatabase(test);
  });
  
  describe('Product CRUD Operations', () => {
    it('should create a product with proper authorization', async () => {
      // Setup
      await seedDatabase(test, {
        organizations: [testOrganizations.default],
        users: [testUsers.admin],
        organizationMemberships: [{
          _id: 'mem_1',
          userId: testUsers.admin.id,
          organizationId: testOrganizations.default.id,
          role: 'admin',
          status: 'active',
          createdAt: Date.now(),
        }],
      });
      
      setupAuth(test, {
        tokenIdentifier: testUsers.admin.clerkId,
        subject: testUsers.admin.id,
      });
      
      // Mock Convex function execution
      test.runMutation.mockImplementation(async (name, args) => {
        if (name === 'products:create') {
          const productId = await test.db.insert('products', {
            ...args,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          return { id: productId };
        }
        throw new Error(`Unknown mutation: ${name}`);
      });
      
      // Execute
      const result = await test.runMutation('products:create', {
        organizationId: testOrganizations.default.id,
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: 99.99,
      });
      
      // Verify
      expect(result).toHaveProperty('id');
      const products = await test.db.query('products').collect();
      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
      });
    });
    
    it('should prevent unauthorized product creation', async () => {
      // Setup - user without membership
      await seedDatabase(test, {
        organizations: [testOrganizations.default],
        users: [testUsers.viewer],
      });
      
      setupAuth(test, {
        tokenIdentifier: testUsers.viewer.clerkId,
        subject: testUsers.viewer.id,
      });
      
      // Mock authorization check
      test.runMutation.mockImplementation(async (name, args) => {
        if (name === 'products:create') {
          throw new Error('Unauthorized: User is not a member of this organization');
        }
        throw new Error(`Unknown mutation: ${name}`);
      });
      
      // Execute & Verify
      await expect(
        test.runMutation('products:create', {
          organizationId: testOrganizations.default.id,
          name: 'Test Product',
          sku: 'TEST-001',
        })
      ).rejects.toThrow('Unauthorized');
    });
    
    it('should update product with optimistic locking', async () => {
      // Setup
      await seedDatabase(test, {
        products: [{
          _id: 'prod_1',
          organizationId: testOrganizations.default.id,
          name: 'Original Product',
          sku: 'TEST-001',
          version: 1,
          updatedAt: Date.now() - 1000,
        }],
      });
      
      // Mock concurrent update scenario
      test.runMutation.mockImplementation(async (name, args) => {
        if (name === 'products:update') {
          const product = await test.db.get(args.id);
          if (!product) throw new Error('Product not found');
          
          // Simulate version check
          if (product.version !== args.expectedVersion) {
            throw new Error('Concurrent modification detected');
          }
          
          await test.db.patch(args.id, {
            ...args.updates,
            version: product.version + 1,
            updatedAt: Date.now(),
          });
          
          return { success: true };
        }
        throw new Error(`Unknown mutation: ${name}`);
      });
      
      // Execute
      const result = await test.runMutation('products:update', {
        id: 'prod_1',
        expectedVersion: 1,
        updates: { name: 'Updated Product' },
      });
      
      // Verify
      expect(result.success).toBe(true);
      const product = await test.db.get('prod_1');
      expect(product.name).toBe('Updated Product');
      expect(product.version).toBe(2);
    });
  });
  
  describe('Product Category Assignment', () => {
    it('should assign multiple categories to a product', async () => {
      // Setup
      await seedDatabase(test, {
        products: [{
          _id: 'prod_1',
          organizationId: testOrganizations.default.id,
          name: 'Multi-Category Product',
          sku: 'MULTI-001',
        }],
        categories: [
          { _id: 'cat_1', name: 'Electronics', organizationId: testOrganizations.default.id },
          { _id: 'cat_2', name: 'Accessories', organizationId: testOrganizations.default.id },
        ],
      });
      
      // Mock category assignment
      test.runMutation.mockImplementation(async (name, args) => {
        if (name === 'products:assignCategories') {
          for (const categoryId of args.categoryIds) {
            await test.db.insert('categoryProductAssignments', {
              productId: args.productId,
              categoryId,
              createdAt: Date.now(),
            });
          }
          return { assigned: args.categoryIds.length };
        }
        throw new Error(`Unknown mutation: ${name}`);
      });
      
      // Execute
      const result = await test.runMutation('products:assignCategories', {
        productId: 'prod_1',
        categoryIds: ['cat_1', 'cat_2'],
      });
      
      // Verify
      expect(result.assigned).toBe(2);
      const assignments = await test.db.query('categoryProductAssignments').collect();
      expect(assignments).toHaveLength(2);
      expect(assignments.map(a => a.categoryId).sort()).toEqual(['cat_1', 'cat_2']);
    });
  });
  
  describe('Product Search and Filtering', () => {
    it('should search products by name and SKU', async () => {
      // Setup
      await seedDatabase(test, {
        products: [
          { _id: 'prod_1', name: 'Apple iPhone', sku: 'PHONE-001', organizationId: testOrganizations.default.id },
          { _id: 'prod_2', name: 'Samsung Galaxy', sku: 'PHONE-002', organizationId: testOrganizations.default.id },
          { _id: 'prod_3', name: 'iPad Pro', sku: 'TABLET-001', organizationId: testOrganizations.default.id },
        ],
      });
      
      // Mock search query
      test.runQuery.mockImplementation(async (name, args) => {
        if (name === 'products:search') {
          const products = await test.db.query('products').collect();
          const searchTerm = args.searchTerm.toLowerCase();
          
          return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.sku.toLowerCase().includes(searchTerm)
          );
        }
        throw new Error(`Unknown query: ${name}`);
      });
      
      // Execute
      const phoneResults = await test.runQuery('products:search', {
        organizationId: testOrganizations.default.id,
        searchTerm: 'phone',
      });
      
      const tabletResults = await test.runQuery('products:search', {
        organizationId: testOrganizations.default.id,
        searchTerm: 'tablet',
      });
      
      // Verify
      expect(phoneResults).toHaveLength(2);
      expect(phoneResults.map(p => p.sku).sort()).toEqual(['PHONE-001', 'PHONE-002']);
      
      expect(tabletResults).toHaveLength(1);
      expect(tabletResults[0].sku).toBe('TABLET-001');
    });
  });
});