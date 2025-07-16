import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../lib/auth');

// Mock the category helpers
jest.mock('../../../functions/categories/helpers', () => ({
  getUserAndVerifyAccess: jest.fn().mockResolvedValue({
    userId: 'users_123',
    orgRole: 'admin',
  }),
  getUserAndVerifyEditPermissions: jest.fn().mockResolvedValue({
    userId: 'users_123',
    orgRole: 'admin',
  }),
  getUserAndVerifyDeletePermissions: jest.fn().mockResolvedValue({
    userId: 'users_123',
    orgRole: 'admin',
  }),
  generateHandle: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  buildCategoryPath: jest.fn((parentPath, handle) =>
    parentPath ? `${parentPath}/${handle}` : `/${handle}`
  ),
  updateDescendantPaths: jest.fn(),
  hasChildCategories: jest.fn().mockResolvedValue(false),
  getCategoryChildren: jest.fn().mockResolvedValue([]),
  updateProductCategoryReferences: jest.fn(),
}));

import {
  createMockMutationContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  setupMockAuth,
  convexAssertions,
} from '../../setup/convex-test-helpers';
import { runMutation } from '../../setup/test-runner';
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../functions/categories/mutations';
import * as helpers from '../../../functions/categories/helpers';

describe('Categories Mutations', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('createCategory', () => {
    it('should create a new root category', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const categoryId = await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'New Category',
        description: 'A new test category',
        color: '#FF0000',
        icon: 'folder',
        metadata: { custom: 'value' },
      });

      convexAssertions.expectToBeValidId(categoryId, 'categories');

      const created = await db.get(categoryId);
      expect(created.name).toBe('New Category');
      expect(created.handle).toBe('new-category');
      expect(created.level).toBe(0);
      expect(created.path).toBe('/new-category');
      expect(created.color).toBe('#FF0000');
      expect(created.icon).toBe('folder');
      expect(created.status).toBe('active');
      expect(created.isVisible).toBe(true);
      expect(created.metadata).toEqual({ custom: 'value' });
      expect(created.sortOrder).toBeDefined();
      convexAssertions.expectToHaveTimestamps(created);
    });

    it('should create a subcategory with correct hierarchy', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Get parent category details
      const parentCategory = await db.get(testData.rootCategoryId);

      const subCategoryId = await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'New Sub Category',
        parentId: testData.rootCategoryId,
        metadata: {},
      });

      const created = await db.get(subCategoryId);
      expect(created.parentId).toBe(testData.rootCategoryId);
      expect(created.level).toBe(parentCategory.level + 1);
      expect(created.path).toBe('/test-category/new-sub-category');
    });

    it('should prevent duplicate handles in same project', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // First creation should succeed
      await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Unique Name',
        metadata: {},
      });

      // Second creation with same name should fail
      await expect(
        runMutation(createCategory, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          name: 'Unique Name', // Will generate same handle
          metadata: {},
        })
      ).rejects.toThrow();
    });

    it('should set default values when not provided', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const categoryId = await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Minimal Category',
        metadata: {},
      });

      const created = await db.get(categoryId);
      expect(created.description).toBeUndefined();
      expect(created.color).toBeUndefined();
      expect(created.icon).toBeUndefined();
      expect(created.image).toBeUndefined();
      expect(created.status).toBe('active');
      expect(created.isVisible).toBe(true);
      expect(created.metadata).toEqual({});
    });

    it('should validate required fields', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Missing name
      await expect(
        runMutation(createCategory, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          name: '', // Empty name
          metadata: {},
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
        runMutation(createCategory, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          name: 'New Category',
          metadata: {},
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should validate parent category exists and belongs to same project', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Non-existent parent
      await expect(
        runMutation(createCategory, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          name: 'Orphan Category',
          parentId: 'categories_nonexistent',
          metadata: {},
        })
      ).rejects.toThrow();
    });

    it('should calculate correct sort order', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create multiple categories
      const cat1 = await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'First',
        metadata: {},
      });

      const cat2 = await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Second',
        metadata: {},
      });

      const cat3 = await runMutation(createCategory, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Third',
        metadata: {},
      });

      const [first, second, third] = await Promise.all([db.get(cat1), db.get(cat2), db.get(cat3)]);

      expect(first.sortOrder).toBeLessThan(second.sortOrder);
      expect(second.sortOrder).toBeLessThan(third.sortOrder);
    });
  });

  describe('updateCategory', () => {
    it('should update category properties', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateCategory, ctx, {
        categoryId: testData.rootCategoryId,
        name: 'Updated Category Name',
        description: 'Updated description',
        color: '#00FF00',
        icon: 'star',
        status: 'hidden',
        isVisible: false,
      });

      const updated = await db.get(testData.rootCategoryId);
      expect(updated.name).toBe('Updated Category Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.color).toBe('#00FF00');
      expect(updated.icon).toBe('star');
      expect(updated.status).toBe('hidden');
      expect(updated.isVisible).toBe(false);
      expect(updated.version).toBe(2);
      expect(updated.lastModifiedBy).toBe(testData.userId);
    });

    it('should update handle and path when name changes', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateCategory, ctx, {
        categoryId: testData.rootCategoryId,
        name: 'Renamed Category',
      });

      const updated = await db.get(testData.rootCategoryId);
      expect(updated.handle).toBe('renamed-category');
      expect(updated.path).toBe('/renamed-category');
    });

    it('should call updateDescendantPaths when path changes', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateCategory, ctx, {
        categoryId: testData.rootCategoryId,
        name: 'Renamed Parent',
      });

      expect(mockHelpers.updateDescendantPaths).toHaveBeenCalled();
    });

    it('should not allow duplicate handles in same project', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another category
      const otherCategoryId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Other Category',
        handle: 'other-category',
        level: 0,
        path: '/other-category',
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

      // Try to update to existing handle
      await expect(
        runMutation(updateCategory, ctx, {
          categoryId: testData.rootCategoryId,
          name: 'Other Category', // Will generate same handle
        })
      ).rejects.toThrow();
    });

    it('should only update provided fields', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const originalCategory = await db.get(testData.rootCategoryId);

      await runMutation(updateCategory, ctx, {
        categoryId: testData.rootCategoryId,
        description: 'Only updating description',
      });

      const updated = await db.get(testData.rootCategoryId);
      expect(updated.name).toBe(originalCategory.name);
      expect(updated.handle).toBe(originalCategory.handle);
      expect(updated.description).toBe('Only updating description');
      expect(updated.color).toBe(originalCategory.color);
      expect(updated.status).toBe(originalCategory.status);
    });

    it('should check edit permissions', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.getUserAndVerifyEditPermissions.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );

      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(updateCategory, ctx, {
          categoryId: testData.rootCategoryId,
          name: 'Updated Name',
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should validate parent when updating parentId', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Try to set non-existent parent
      await expect(
        runMutation(updateCategory, ctx, {
          categoryId: testData.subCategoryId,
          parentId: 'categories_nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should prevent circular references', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Try to make parent a child of its own child
      await expect(
        runMutation(updateCategory, ctx, {
          categoryId: testData.rootCategoryId,
          parentId: testData.subCategoryId,
        })
      ).rejects.toThrow();
    });

    it('should update metadata correctly', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateCategory, ctx, {
        categoryId: testData.rootCategoryId,
        metadata: {
          newField: 'newValue',
          anotherField: 123,
        },
      });

      const updated = await db.get(testData.rootCategoryId);
      expect(updated.metadata).toEqual({
        newField: 'newValue',
        anotherField: 123,
      });
    });
  });

  describe('deleteCategory', () => {
    beforeEach(() => {
      // Reset mock to allow deletion by default
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.hasChildCategories.mockResolvedValue(false);
    });

    it('should soft delete a category', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(deleteCategory, ctx, {
        categoryId: testData.subCategoryId,
      });

      const deleted = await db.get(testData.subCategoryId);
      expect(deleted.status).toBe('archived');
      expect(deleted.isVisible).toBe(false);
      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.deletedBy).toBe(testData.userId);
    });

    it('should prevent deletion of category with children', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.hasChildCategories.mockResolvedValueOnce(true);

      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(deleteCategory, ctx, {
          categoryId: testData.rootCategoryId,
        })
      ).rejects.toThrow();
    });

    it('should update product references when deleting', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(deleteCategory, ctx, {
        categoryId: testData.subCategoryId,
      });

      expect(mockHelpers.updateProductCategoryReferences).toHaveBeenCalledWith(
        expect.anything(),
        testData.subCategoryId
      );
    });

    it('should check delete permissions', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.getUserAndVerifyDeletePermissions.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );

      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(deleteCategory, ctx, {
          categoryId: testData.subCategoryId,
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should not delete already archived category', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // First deletion
      await runMutation(deleteCategory, ctx, {
        categoryId: testData.subCategoryId,
      });

      // Second deletion should fail
      await expect(
        runMutation(deleteCategory, ctx, {
          categoryId: testData.subCategoryId,
        })
      ).rejects.toThrow();
    });

    it('should update version on deletion', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const originalCategory = await db.get(testData.subCategoryId);

      await runMutation(deleteCategory, ctx, {
        categoryId: testData.subCategoryId,
      });

      const deleted = await db.get(testData.subCategoryId);
      expect(deleted.version).toBe(originalCategory.version + 1);
    });
  });
});
