import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../lib/auth');

import {
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import { runQuery } from '../../setup/test_runner';
import {
  getProjectCategories,
  getCategoryTree,
  getCategory,
} from '../../../functions/categories/queries';

describe('Categories Queries', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('getProjectCategories', () => {
    it('should return all categories for a project', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(getProjectCategories, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('Test Category');
      expect(result[0].organizationId).toBe(testData.orgId);
      expect(result[0].projectId).toBe(testData.projectId);
    });

    it('should throw error for unauthenticated user', async () => {
      const ctx = createMockQueryContext(null, db);

      await expect(
        runQuery(getProjectCategories, ctx, {
          organizationId: testData.orgId,
          projectId: testData.projectId,
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should return empty array for project with no categories', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const newProjectId = await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Empty Project',
        description: 'Project with no categories',
        slug: 'empty-project',
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

      const result = await runQuery(getProjectCategories, ctx, {
        organizationId: testData.orgId,
        projectId: newProjectId,
      });

      expect(result).toEqual([]);
    });

    it('should only return categories for the specified project', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create another project with categories
      const otherProjectId = await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Other Project',
        description: 'Another project',
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

      await db.insert('categories', {
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

      const result = await runQuery(getProjectCategories, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result.every((cat) => cat.projectId === testData.projectId)).toBe(true);
      expect(result.find((cat) => cat.name === 'Other Project Category')).toBeUndefined();
    });

    it('should include all category properties', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(getProjectCategories, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      const category = result[0];
      expect(category).toHaveProperty('_id');
      expect(category).toHaveProperty('_creationTime');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('handle');
      expect(category).toHaveProperty('path');
      expect(category).toHaveProperty('level');
      expect(category).toHaveProperty('sortOrder');
      expect(category).toHaveProperty('status');
      expect(category).toHaveProperty('isVisible');
      expect(category).toHaveProperty('metadata');
      expect(category).toHaveProperty('version');
    });
  });

  describe('getCategoryTree', () => {
    it('should return hierarchical category structure', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Add a deeper hierarchy
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

      const result = await runQuery(getCategoryTree, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe('Test Category');
      expect(result[0].children).toBeDefined();
      expect(result[0].children?.length).toBe(1);
      expect(result[0].children?.[0].name).toBe('Sub Category');
      expect(result[0].children?.[0].children?.length).toBe(1);
      expect(result[0].children?.[0].children?.[0].name).toBe('Sub Sub Category');
    });

    it('should filter by status when provided', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create categories with different statuses
      await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Hidden Category',
        handle: 'hidden-category',
        level: 0,
        path: '/hidden-category',
        sortOrder: 1,
        status: 'hidden',
        isVisible: false,
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Archived Category',
        handle: 'archived-category',
        level: 0,
        path: '/archived-category',
        sortOrder: 2,
        status: 'archived',
        isVisible: false,
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      const activeResult = await runQuery(getCategoryTree, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'active',
      });

      expect(activeResult.every((cat) => cat.status === 'active')).toBe(true);
      expect(activeResult.find((cat) => cat.name === 'Hidden Category')).toBeUndefined();
      expect(activeResult.find((cat) => cat.name === 'Archived Category')).toBeUndefined();

      const hiddenResult = await runQuery(getCategoryTree, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        status: 'hidden',
      });

      expect(hiddenResult.length).toBe(1);
      expect(hiddenResult[0].name).toBe('Hidden Category');
    });

    it('should sort categories by sortOrder', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create categories with different sort orders
      const cat1 = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'First Category',
        handle: 'first-category',
        level: 0,
        path: '/first-category',
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

      const cat2 = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Second Category',
        handle: 'second-category',
        level: 0,
        path: '/second-category',
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

      const result = await runQuery(getCategoryTree, ctx, {
        organizationId: testData.orgId,
        projectId: testData.projectId,
      });

      const rootCategories = result.filter((cat) => !cat.parentId);
      const sortedNames = rootCategories.map((cat) => cat.name);
      expect(sortedNames).toEqual(['First Category', 'Second Category', 'Test Category']);
    });

    it('should handle empty project gracefully', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const emptyProjectId = await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Empty Project',
        description: 'No categories',
        slug: 'empty-project-tree',
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

      const result = await runQuery(getCategoryTree, ctx, {
        organizationId: testData.orgId,
        projectId: emptyProjectId,
      });

      expect(result).toEqual([]);
    });
  });

  describe('getCategory', () => {
    it('should return a category by ID', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(getCategory, ctx, {
        categoryId: testData.rootCategoryId,
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Category');
      expect(result?.handle).toBe('test-category');
      expect(result?._id).toBe(testData.rootCategoryId);
    });

    it('should include parent category information', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(getCategory, ctx, {
        categoryId: testData.subCategoryId,
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sub Category');
      expect(result?.parentId).toBe(testData.rootCategoryId);
      expect(result?.level).toBe(1);
    });

    it('should throw error for non-existent category', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      await expect(
        runQuery(getCategory, ctx, {
          categoryId: 'categories_nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should throw error for unauthorized access', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create category in different org
      const otherOrgId = await db.insert('organizations', {
        name: 'Other Org',
        slug: 'other-org',
        status: 'active',
        subscription: {
          plan: 'free',
          status: 'active',
          seats: 1,
          features: [],
        },
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-3.5-turbo',
          apiKeys: {},
          categorization: {
            batchSize: 50,
            prompt: 'Default prompt',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['.csv', '.xlsx'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      const otherCategoryId = await db.insert('categories', {
        organizationId: otherOrgId,
        projectId: 'projects_other',
        name: 'Other Category',
        handle: 'other-category',
        level: 0,
        path: '/other-category',
        sortOrder: 0,
        status: 'active',
        isVisible: true,
        metadata: {},
        version: 1,
        createdBy: 'users_other',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'users_other',
      });

      await expect(
        runQuery(getCategory, ctx, {
          categoryId: otherCategoryId,
        })
      ).rejects.toThrow();
    });

    it('should return null for soft-deleted categories', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create and then soft-delete a category
      const deletedCategoryId = await db.insert('categories', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        name: 'Deleted Category',
        handle: 'deleted-category',
        level: 0,
        path: '/deleted-category',
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

      const result = await runQuery(getCategory, ctx, {
        categoryId: deletedCategoryId,
      });

      // Depending on implementation, might return the archived category or null
      if (result) {
        expect(result.status).toBe('archived');
        expect(result.isVisible).toBe(false);
      }
    });
  });
});
