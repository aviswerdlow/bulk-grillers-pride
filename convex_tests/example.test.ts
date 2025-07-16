import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the auth module
jest.mock('../lib/auth');

import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  convexAssertions,
  setupMockAuth,
} from './setup/convex_test_helpers';
import { runMutation, runQuery } from './setup/test_runner';

// Example of a simple query function for testing
const exampleQuery = {
  handler: async (ctx: any, args: { organizationId: string }) => {
    // This would normally check auth
    const auth = require('../lib/auth');
    await auth.authenticateAndAuthorize(ctx, args.organizationId);

    // Return some data
    return {
      message: 'Hello from test',
      organizationId: args.organizationId,
    };
  },
};

// Example of a simple mutation function for testing
const exampleMutation = {
  handler: async (ctx: any, args: { name: string }) => {
    const auth = require('../lib/auth');
    const user = await auth.authenticateUser(ctx);

    // Would normally insert into database
    const id = await ctx.db.insert('products', {
      name: args.name,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return id;
  },
};

describe('Convex Testing Example', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('Query Testing', () => {
    it('should successfully run a query with authentication', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(exampleQuery, ctx, {
        organizationId: testData.orgId,
      });

      expect(result.message).toBe('Hello from test');
      expect(result.organizationId).toBe(testData.orgId);

      // Verify auth was called
      const auth = require('../lib/auth');
      expect(auth.authenticateAndAuthorize).toHaveBeenCalledWith(expect.anything(), testData.orgId);
    });

    it('should throw error for unauthenticated user', async () => {
      const ctx = createMockQueryContext(null, db);

      await expect(
        runQuery(exampleQuery, ctx, {
          organizationId: testData.orgId,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('Mutation Testing', () => {
    it('should successfully run a mutation and insert data', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const productId = await runMutation(exampleMutation, ctx, {
        name: 'Test Product',
      });

      // Verify ID was returned
      convexAssertions.expectToBeValidId(productId, 'products');

      // Verify product was inserted
      const product = await db.get(productId);
      expect(product).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.createdBy).toBe(testData.userId);
    });

    it('should throw error for unauthenticated mutation', async () => {
      const ctx = createMockMutationContext(null, db);

      await expect(
        runMutation(exampleMutation, ctx, {
          name: 'Test Product',
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('Mock Database', () => {
    it('should support basic CRUD operations', async () => {
      // Insert
      const id = await db.insert('products', {
        title: 'Test Product',
        status: 'active',
      });

      expect(id).toMatch(/^products_\d+$/);

      // Get
      const product = await db.get(id);
      expect(product.title).toBe('Test Product');
      expect(product._id).toBe(id);
      expect(product._creationTime).toBeDefined();

      // Update
      await db.patch(id, { title: 'Updated Product' });
      const updated = await db.get(id);
      expect(updated.title).toBe('Updated Product');

      // Delete
      await db.delete(id);
      const deleted = await db.get(id);
      expect(deleted).toBeNull();
    });

    it('should support querying with filters', async () => {
      // Insert test data
      await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Product 1',
        status: 'active',
      });

      await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Product 2',
        status: 'draft',
      });

      await db.insert('products', {
        organizationId: 'other_org',
        projectId: 'other_project',
        title: 'Product 3',
        status: 'active',
      });

      // Query with index
      const orgProducts = await db
        .query('products')
        .withIndex('by_organization', (q: any) => q.eq('organizationId', testData.orgId))
        .collect();

      expect(orgProducts).toHaveLength(3); // 2 new + 1 from seed data

      // Query with filter
      const activeProducts = await db
        .query('products')
        .withIndex('by_organization', (q: any) => q.eq('organizationId', testData.orgId))
        .filter((q: any) => q.eq(q.field('status'), 'active'))
        .collect();

      expect(activeProducts).toHaveLength(2);
    });
  });

  describe('Test Helpers', () => {
    it('should create proper mock contexts', () => {
      const queryCtx = createMockQueryContext(mockIdentities.user, db);
      expect(queryCtx.db).toBeDefined();
      expect(queryCtx.auth).toBeDefined();
      expect(queryCtx.auth.getUserIdentity).toBeDefined();

      const mutationCtx = createMockMutationContext(mockIdentities.user, db);
      expect(mutationCtx.db).toBeDefined();
      expect(mutationCtx.auth).toBeDefined();
      expect(mutationCtx.scheduler).toBeDefined();
      expect(mutationCtx.storage).toBeDefined();
    });

    it('should seed test data properly', () => {
      expect(testData).toBeDefined();
      expect(testData.userId).toBeDefined();
      expect(testData.orgId).toBeDefined();
      expect(testData.projectId).toBeDefined();
      expect(testData.rootCategoryId).toBeDefined();
      expect(testData.subCategoryId).toBeDefined();
      expect(testData.productId).toBeDefined();
    });
  });
});
