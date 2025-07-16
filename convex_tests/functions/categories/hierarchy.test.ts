import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../lib/auth');

// Mock the category helpers
jest.mock('../../../functions/categories/helpers', () => ({
  getUserAndVerifyEditPermissions: jest.fn().mockResolvedValue({
    userId: 'users_123',
    orgRole: 'admin',
  }),
  buildCategoryPath: jest.fn((parentPath, handle) =>
    parentPath ? `${parentPath}/${handle}` : `/${handle}`
  ),
  updateDescendantPaths: jest.fn(),
  hasChildCategories: jest.fn().mockResolvedValue(false),
  getCategoryChildren: jest.fn().mockResolvedValue([]),
}));

import {
  createMockMutationContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import { runMutation } from '../../setup/test_runner';
import { moveCategory } from '../../../functions/categories/hierarchy';
import * as helpers from '../../../functions/categories/helpers';

describe('Category Hierarchy Operations', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('moveCategory', () => {
    it('should move category to new parent', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another root category to move to
      const newParentId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'New Parent',
        handle: 'new-parent',
        level: 0,
        path: '/new-parent',
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

      await runMutation(moveCategory, ctx, {
        categoryId: testData.subCategoryId,
        newParentId: newParentId,
      });

      const moved = await db.get(testData.subCategoryId);
      expect(moved.parentId).toBe(newParentId);
      expect(moved.path).toBe('/new-parent/sub-category');
      expect(moved.level).toBe(1);
    });

    it('should move category to root level', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(moveCategory, ctx, {
        categoryId: testData.subCategoryId,
        newParentId: null,
      });

      const moved = await db.get(testData.subCategoryId);
      expect(moved.parentId).toBeUndefined();
      expect(moved.path).toBe('/sub-category');
      expect(moved.level).toBe(0);
    });

    it('should update all descendant paths when moving', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create a deeper hierarchy
      const subSubCategoryId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Sub Sub Category',
        handle: 'sub-sub-category',
        parentId: testData.subCategoryId,
        level: 2,
        path: '/test-category/sub-category/sub-sub-category',
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

      // Mock getCategoryChildren to return the sub-sub category
      mockHelpers.getCategoryChildren.mockResolvedValueOnce([await db.get(subSubCategoryId)]);

      await runMutation(moveCategory, ctx, {
        categoryId: testData.subCategoryId,
        newParentId: null,
      });

      expect(mockHelpers.updateDescendantPaths).toHaveBeenCalledWith(
        expect.anything(),
        testData.subCategoryId,
        '/test-category/sub-category',
        '/sub-category'
      );
    });

    it('should prevent moving category to itself', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(moveCategory, ctx, {
          categoryId: testData.rootCategoryId,
          newParentId: testData.rootCategoryId,
        })
      ).rejects.toThrow('Cannot move category to itself');
    });

    it('should prevent circular references', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create a sub-sub category
      const subSubCategoryId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Sub Sub Category',
        handle: 'sub-sub-category',
        parentId: testData.subCategoryId,
        level: 2,
        path: '/test-category/sub-category/sub-sub-category',
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

      // Try to move parent to be child of its descendant
      await expect(
        runMutation(moveCategory, ctx, {
          categoryId: testData.rootCategoryId,
          newParentId: subSubCategoryId,
        })
      ).rejects.toThrow('Cannot move category to its own descendant');
    });

    it('should verify new parent belongs to same project', async () => {
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

      const otherProjectCategoryId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: otherProjectId,
        name: 'Other Project Category',
        handle: 'other-project-category',
        level: 0,
        path: '/other-project-category',
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
        runMutation(moveCategory, ctx, {
          categoryId: testData.subCategoryId,
          newParentId: otherProjectCategoryId,
        })
      ).rejects.toThrow('Parent category must be in the same project');
    });

    it('should check edit permissions', async () => {
      const mockHelpers = helpers as jest.Mocked<typeof helpers>;
      mockHelpers.getUserAndVerifyEditPermissions.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );

      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(moveCategory, ctx, {
          categoryId: testData.subCategoryId,
          newParentId: null,
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should update version and timestamps', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const originalCategory = await db.get(testData.subCategoryId);

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await runMutation(moveCategory, ctx, {
        categoryId: testData.subCategoryId,
        newParentId: null,
      });

      const moved = await db.get(testData.subCategoryId);
      expect(moved.version).toBe(originalCategory.version + 1);
      expect(moved.updatedAt).toBeGreaterThan(originalCategory.updatedAt);
      expect(moved.lastModifiedBy).toBe(testData.userId);
    });

    it('should handle moving between different levels correctly', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create a complex hierarchy
      const level1Id = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Level 1',
        handle: 'level-1',
        level: 0,
        path: '/level-1',
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

      const level2Id = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Level 2',
        handle: 'level-2',
        parentId: level1Id,
        level: 1,
        path: '/level-1/level-2',
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

      const level3Id = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Level 3',
        handle: 'level-3',
        parentId: level2Id,
        level: 2,
        path: '/level-1/level-2/level-3',
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

      // Move level 3 to be under root category
      await runMutation(moveCategory, ctx, {
        categoryId: level3Id,
        newParentId: testData.rootCategoryId,
      });

      const moved = await db.get(level3Id);
      expect(moved.parentId).toBe(testData.rootCategoryId);
      expect(moved.level).toBe(1);
      expect(moved.path).toBe('/test-category/level-3');
    });

    it('should not move archived categories', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Archive a category
      await db.patch(testData.subCategoryId, {
        status: 'archived',
        isVisible: false,
      });

      await expect(
        runMutation(moveCategory, ctx, {
          categoryId: testData.subCategoryId,
          newParentId: null,
        })
      ).rejects.toThrow('Cannot move archived category');
    });

    it('should not move to archived parent', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create and archive a category
      const archivedParentId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Archived Parent',
        handle: 'archived-parent',
        level: 0,
        path: '/archived-parent',
        sortOrder: 3,
        status: 'archived',
        isVisible: false,
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      await expect(
        runMutation(moveCategory, ctx, {
          categoryId: testData.subCategoryId,
          newParentId: archivedParentId,
        })
      ).rejects.toThrow('Cannot move to archived parent');
    });
  });
});
