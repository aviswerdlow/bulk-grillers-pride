/**
 * Example test file demonstrating the standardized Convex test pattern
 * This serves as a reference for writing new tests and migrating existing ones
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  createConvexTest, 
  createQueryContext, 
  createMutationContext,
  createActionContext,
  setupAuth, 
  seedDatabase,
  clearDatabase,
  getTableData,
  assertDocumentExists,
  assertDocumentNotExists,
} from './convex-test-standard';
import type { ConvexTestContext } from './convex-test-standard';
import {
  createMockUser,
  createMockOrganization,
  createMockProject,
  createMockProduct,
  createMockCategory,
} from './test-helpers';
import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

describe('Standardized Convex Test Examples', () => {
  let test: ConvexTestContext;
  
  beforeEach(() => {
    test = createConvexTest();
  });
  
  afterEach(() => {
    clearDatabase(test);
  });
  
  describe('Query Testing', () => {
    it('should test a simple query with authentication', async () => {
      // Setup
      const ctx = createQueryContext(test);
      const user = createMockUser({ _id: 'user_123' });
      const org = createMockOrganization({ _id: 'org_123' });
      
      await seedDatabase(test, {
        users: [user],
        organizations: [org],
      });
      
      setupAuth(test, { tokenIdentifier: user.clerkId });
      
      // Execute query
      const result = await test.db.query('organizations').first();
      
      // Assert
      expect(result).toBeDefined();
      expect(result._id).toBe('org_123');
    });
    
    it('should test complex queries with indexes and filters', async () => {
      const ctx = createQueryContext(test);
      
      // Seed multiple products
      await seedDatabase(test, {
        products: [
          createMockProduct({ _id: 'p1', price: 10, status: 'active' }),
          createMockProduct({ _id: 'p2', price: 20, status: 'active' }),
          createMockProduct({ _id: 'p3', price: 30, status: 'inactive' }),
          createMockProduct({ _id: 'p4', price: 40, status: 'active' }),
        ],
      });
      
      // Test various query patterns
      const activeProducts = await test.db.query('products')
        .filter(p => p.status === 'active')
        .collect();
      expect(activeProducts).toHaveLength(3);
      
      const expensiveProducts = await test.db.query('products')
        .filter(p => p.price > 25)
        .order('desc')
        .collect();
      expect(expensiveProducts).toHaveLength(2);
      expect(expensiveProducts[0].price).toBe(40);
      
      // Test pagination
      const paginated = await test.db.query('products')
        .paginate({ numItems: 2 });
      expect(paginated.page).toHaveLength(2);
      expect(paginated.isDone).toBe(false);
      expect(paginated.continueCursor).toBeTruthy();
    });
    
    it('should test queries with indexes', async () => {
      const ctx = createQueryContext(test);
      const orgId = 'org_123';
      
      await seedDatabase(test, {
        products: [
          createMockProduct({ organizationId: orgId, sku: 'ABC-123' }),
          createMockProduct({ organizationId: orgId, sku: 'XYZ-789' }),
          createMockProduct({ organizationId: 'other_org', sku: 'DEF-456' }),
        ],
      });
      
      // Query with index
      const orgProducts = await test.db.query('products')
        .withIndex('by_organizationId', q => q.eq('organizationId', orgId))
        .collect();
      
      expect(orgProducts).toHaveLength(2);
      expect(orgProducts.every(p => p.organizationId === orgId)).toBe(true);
      
      // Unique query
      const product = await test.db.query('products')
        .withIndex('by_sku', q => q.eq('sku', 'ABC-123'))
        .unique();
      
      expect(product).toBeDefined();
      expect(product.sku).toBe('ABC-123');
    });
  });
  
  describe('Mutation Testing', () => {
    it('should test mutations with proper context', async () => {
      const ctx = createMutationContext(test);
      const user = createMockUser();
      
      setupAuth(test, { tokenIdentifier: user.clerkId });
      await seedDatabase(test, { users: [user] });
      
      // Create a new product
      const productId = await test.db.insert('products', {
        title: 'New Product',
        organizationId: 'org_123',
        projectId: 'project_123',
        sku: 'NEW-001',
        status: 'active',
      });
      
      expect(productId).toBeDefined();
      await assertDocumentExists(test, 'products', doc => doc._id === productId);
      
      // Update the product
      await test.db.patch(productId, { status: 'inactive' });
      
      const updated = await test.db.get(productId);
      expect(updated.status).toBe('inactive');
      
      // Delete the product
      await test.db.delete(productId);
      await assertDocumentNotExists(test, 'products', doc => doc._id === productId);
    });
    
    it('should test scheduled mutations', async () => {
      const ctx = createMutationContext(test);
      
      // Schedule a job
      await ctx.scheduler.runAfter(5000, 'processImport', { importId: '123' });
      
      expect(test.scheduler.runAfter).toHaveBeenCalledWith(
        5000,
        'processImport',
        { importId: '123' }
      );
      
      // Schedule at specific time
      const futureTime = Date.now() + 60000;
      await ctx.scheduler.runAt(futureTime, 'sendReminder', { userId: 'user_123' });
      
      expect(test.scheduler.runAt).toHaveBeenCalledWith(
        futureTime,
        'sendReminder',
        { userId: 'user_123' }
      );
    });
  });
  
  describe('Action Testing', () => {
    it('should test actions with query and mutation mocking', async () => {
      const ctx = createActionContext(test);
      
      // Mock query responses
      test.runQuery.mockImplementation(async (name, args) => {
        if (name === 'getUser' && args.userId === 'user_123') {
          return createMockUser({ _id: 'user_123' });
        }
        if (name === 'getOrganization' && args.orgId === 'org_123') {
          return createMockOrganization({ _id: 'org_123' });
        }
        return null;
      });
      
      // Mock mutation responses
      test.runMutation.mockImplementation(async (name, args) => {
        if (name === 'createProject') {
          return 'project_new';
        }
        return null;
      });
      
      // Test action logic that uses queries and mutations
      const user = await ctx.runQuery('getUser', { userId: 'user_123' });
      expect(user).toBeDefined();
      expect(user._id).toBe('user_123');
      
      const projectId = await ctx.runMutation('createProject', {
        name: 'New Project',
        organizationId: 'org_123',
      });
      expect(projectId).toBe('project_new');
      
      // Verify calls
      expect(test.runQuery).toHaveBeenCalledWith('getUser', { userId: 'user_123' });
      expect(test.runMutation).toHaveBeenCalledWith('createProject', {
        name: 'New Project',
        organizationId: 'org_123',
      });
    });
  });
  
  describe('Error Testing', () => {
    it('should test authentication errors', async () => {
      const ctx = createQueryContext(test);
      
      // No auth set up - user is not authenticated
      setupAuth(test, null);
      
      const identity = await ctx.auth.getUserIdentity();
      expect(identity).toBeNull();
    });
    
    it('should test document not found errors', async () => {
      const ctx = createMutationContext(test);
      
      // Try to update non-existent document
      await expect(
        test.db.patch('non_existent_id', { status: 'updated' })
      ).rejects.toThrow('Document non_existent_id not found');
      
      // Try to delete non-existent document
      await expect(
        test.db.delete('non_existent_id')
      ).rejects.toThrow('Document non_existent_id not found');
    });
    
    it('should test unique constraint violations', async () => {
      const ctx = createQueryContext(test);
      
      await seedDatabase(test, {
        products: [
          createMockProduct({ sku: 'UNIQUE-123' }),
          createMockProduct({ sku: 'UNIQUE-456' }),
        ],
      });
      
      // Query expecting unique result but getting multiple
      await expect(
        test.db.query('products').unique()
      ).rejects.toThrow('Expected unique result but found 2');
    });
  });
  
  describe('Advanced Testing Patterns', () => {
    it('should test transaction-like operations', async () => {
      const ctx = createMutationContext(test);
      
      // Simulate a transaction by checking state consistency
      const orderId = await test.db.insert('orders', {
        status: 'pending',
        total: 100,
      });
      
      const itemId = await test.db.insert('orderItems', {
        orderId,
        productId: 'product_123',
        quantity: 2,
      });
      
      // Verify both were created
      await assertDocumentExists(test, 'orders', doc => doc._id === orderId);
      await assertDocumentExists(test, 'orderItems', doc => doc._id === itemId);
      
      // Simulate rollback by deleting both
      await test.db.delete(itemId);
      await test.db.delete(orderId);
      
      // Verify both were deleted
      await assertDocumentNotExists(test, 'orders', doc => doc._id === orderId);
      await assertDocumentNotExists(test, 'orderItems', doc => doc._id === itemId);
    });
    
    it('should test complex business logic', async () => {
      const ctx = createMutationContext(test);
      const orgId = 'org_123';
      
      // Seed initial data
      await seedDatabase(test, {
        categories: [
          createMockCategory({ _id: 'cat_1', organizationId: orgId, name: 'Electronics' }),
          createMockCategory({ _id: 'cat_2', organizationId: orgId, name: 'Clothing' }),
        ],
        products: [
          createMockProduct({ _id: 'p1', organizationId: orgId, categoryId: 'cat_1' }),
          createMockProduct({ _id: 'p2', organizationId: orgId, categoryId: 'cat_1' }),
          createMockProduct({ _id: 'p3', organizationId: orgId, categoryId: 'cat_2' }),
        ],
      });
      
      // Test business logic: count products per category
      const categories = getTableData(test, 'categories');
      const categoryCounts = new Map<string, number>();
      
      for (const category of categories) {
        const products = await test.db.query('products')
          .filter(p => p.categoryId === category._id)
          .collect();
        categoryCounts.set(category._id, products.length);
      }
      
      expect(categoryCounts.get('cat_1')).toBe(2);
      expect(categoryCounts.get('cat_2')).toBe(1);
    });
  });
});