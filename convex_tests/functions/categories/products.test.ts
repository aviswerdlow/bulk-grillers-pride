import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../lib/auth');

// Mock the category helpers
jest.mock('../../../functions/categories/helpers', () => ({
  getUserAndVerifyEditPermissions: jest.fn().mockResolvedValue({
    userId: 'users_123',
    orgRole: 'admin',
  }),
}));

import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import { runMutation, runQuery } from '../../setup/test_runner';
import {
  assignProductToCategory,
  removeProductFromCategory,
} from '../../../functions/categories/products';
import * as helpers from '../../../functions/categories/helpers';

describe('Category Product Operations', () => {
  let db: MockDatabase;
  let testData: any;
  let testProductId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);

    // Create a test product
    testProductId = await db.insert('products', {
      organizationId: testData.orgId,
      projectId: testData.projectId,
      title: 'Test Product',
      handle: 'test-product',
      description: 'A test product',
      productType: 'physical',
      vendor: 'Test Vendor',
      status: 'active',
      publishedAt: Date.now(),
      tags: [],
      images: [],
      version: 1,
      createdBy: testData.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: testData.userId,
    });
  });

  describe('assignProductToCategory', () => {
    it('should assign product to category', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      // Check that assignment was created
      const assignments = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .collect();

      expect(assignments).toHaveLength(1);
      expect(assignments[0].categoryId).toBe(testData.rootCategoryId);
      expect(assignments[0].isPrimary).toBe(true);
    });

    it('should set first assignment as primary', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      const assignment = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .first();

      expect(assignment?.isPrimary).toBe(true);
    });

    it('should set subsequent assignments as non-primary', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // First assignment
      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      // Second assignment
      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.subCategoryId,
      });

      const assignments = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .collect();

      expect(assignments).toHaveLength(2);
      expect(assignments.find((a) => a.categoryId === testData.rootCategoryId)?.isPrimary).toBe(
        true
      );
      expect(assignments.find((a) => a.categoryId === testData.subCategoryId)?.isPrimary).toBe(
        false
      );
    });

    it('should allow setting new assignment as primary', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // First assignment
      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      // Second assignment as primary
      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.subCategoryId,
        isPrimary: true,
      });

      const assignments = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .collect();

      // Old primary should be updated
      expect(assignments.find((a) => a.categoryId === testData.rootCategoryId)?.isPrimary).toBe(
        false
      );
      // New primary should be set
      expect(assignments.find((a) => a.categoryId === testData.subCategoryId)?.isPrimary).toBe(
        true
      );
    });

    it('should prevent duplicate assignments', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // First assignment
      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      // Try to assign again
      await expect(
        runMutation(assignProductToCategory, ctx, {
          productId: testProductId,
          categoryId: testData.rootCategoryId,
        })
      ).rejects.toThrow('Product is already assigned to this category');
    });

    it('should validate product exists', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(assignProductToCategory, ctx, {
          productId: 'products_nonexistent',
          categoryId: testData.rootCategoryId,
        })
      ).rejects.toThrow();
    });

    it('should validate category exists', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(assignProductToCategory, ctx, {
          productId: testProductId,
          categoryId: 'categories_nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should ensure product and category are in same project', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create category in different project
      const otherProjectId = await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Other Project',
        description: 'Different project',
        slug: 'other-project',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'sku'],
          },
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      const otherCategoryId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: otherProjectId,
        name: 'Other Category',
        handle: 'other-category',
        level: 0,
        path: '/other-category',
        sortOrder: 0,
        status: 'active',
        isVisible: true,
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      await expect(
        runMutation(assignProductToCategory, ctx, {
          productId: testProductId,
          categoryId: otherCategoryId,
        })
      ).rejects.toThrow('Product and category must belong to the same project');
    });

    it('should check edit permissions', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.getUserAndVerifyEditPermissions.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );

      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(assignProductToCategory, ctx, {
          productId: testProductId,
          categoryId: testData.rootCategoryId,
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should update assignment metadata', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(assignProductToCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
        metadata: {
          displayOrder: 1,
          featured: true,
        },
      });

      const assignment = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .first();

      expect(assignment?.metadata).toEqual({
        displayOrder: 1,
        featured: true,
      });
    });
  });

  describe('removeProductFromCategory', () => {
    beforeEach(async () => {
      // Create a product-category assignment
      await db.insert('productCategories', {
        organizationId: testData.orgId,
        productId: testProductId,
        categoryId: testData.rootCategoryId,
        isPrimary: true,
        sortOrder: 0,
        metadata: {},
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should remove product from category', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(removeProductFromCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      const assignments = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .collect();

      expect(assignments).toHaveLength(0);
    });

    it('should handle removing non-existent assignment gracefully', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Remove the assignment first
      await runMutation(removeProductFromCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      // Try to remove again - should not throw
      await expect(
        runMutation(removeProductFromCategory, ctx, {
          productId: testProductId,
          categoryId: testData.rootCategoryId,
        })
      ).resolves.not.toThrow();
    });

    it('should reassign primary status when removing primary category', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Add second assignment
      await db.insert('productCategories', {
        organizationId: testData.orgId,
        productId: testProductId,
        categoryId: testData.subCategoryId,
        isPrimary: false,
        sortOrder: 1,
        metadata: {},
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Remove primary category
      await runMutation(removeProductFromCategory, ctx, {
        productId: testProductId,
        categoryId: testData.rootCategoryId,
      });

      // Check that other category became primary
      const remainingAssignment = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .first();

      expect(remainingAssignment?.isPrimary).toBe(true);
      expect(remainingAssignment?.categoryId).toBe(testData.subCategoryId);
    });

    it('should validate product exists', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(removeProductFromCategory, ctx, {
          productId: 'products_nonexistent',
          categoryId: testData.rootCategoryId,
        })
      ).rejects.toThrow();
    });

    it('should check edit permissions', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.getUserAndVerifyEditPermissions.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );

      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(removeProductFromCategory, ctx, {
          productId: testProductId,
          categoryId: testData.rootCategoryId,
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should handle multiple assignments correctly', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Add more assignments
      const cat2Id = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Category 2',
        handle: 'category-2',
        level: 0,
        path: '/category-2',
        sortOrder: 1,
        status: 'active',
        isVisible: true,
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      const cat3Id = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Category 3',
        handle: 'category-3',
        level: 0,
        path: '/category-3',
        sortOrder: 2,
        status: 'active',
        isVisible: true,
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      await db.insert('productCategories', {
        organizationId: testData.orgId,
        productId: testProductId,
        categoryId: cat2Id,
        isPrimary: false,
        sortOrder: 1,
        metadata: {},
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('productCategories', {
        organizationId: testData.orgId,
        productId: testProductId,
        categoryId: cat3Id,
        isPrimary: false,
        sortOrder: 2,
        metadata: {},
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Remove middle category
      await runMutation(removeProductFromCategory, ctx, {
        productId: testProductId,
        categoryId: cat2Id,
      });

      const assignments = await db
        .query('productCategories')
        .filter((q) => q.eq('productId', testProductId))
        .collect();

      expect(assignments).toHaveLength(2);
      expect(assignments.map((a) => a.categoryId)).toContain(testData.rootCategoryId);
      expect(assignments.map((a) => a.categoryId)).toContain(cat3Id);
      expect(assignments.map((a) => a.categoryId)).not.toContain(cat2Id);
    });
  });
});
