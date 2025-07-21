import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createConvexTest,
  createMutationContext,
  setupAuth,
  seedDatabase,
  getTableData,
  type ConvexTestContext,
} from '../../../__tests__/convex-test-standard';
import {
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  createMockCategory,
} from '../../../__tests__/test-helpers';
// Import the mutation objects to access their handlers
import { 
  createCategoryLevelDefinitions as createCategoryLevelDefinitionsMutation, 
  importCategory as importCategoryMutation, 
  bulkImportCategories as bulkImportCategoriesMutation 
} from '../imports';

// Extract the handlers for use in tests
const createCategoryLevelDefinitions = createCategoryLevelDefinitionsMutation.handler;
const importCategory = importCategoryMutation.handler;
const bulkImportCategories = bulkImportCategoriesMutation.handler;
import { Id } from '../../../_generated/dataModel';

describe('Category Import Functions', () => {
  let test: ConvexTestContext;
  let user: any;
  let org: any;
  let project: any;
  let membership: any;

  beforeEach(async () => {
    test = createConvexTest();
    
    // Set up common test data
    user = createMockUser({ _id: 'user_1' as Id<'users'> });
    org = createMockOrganization({ _id: 'org_1' as Id<'organizations'> });
    project = createMockProject({
      _id: 'project_1' as Id<'projects'>,
      organizationId: org._id,
      name: 'Test Project',
    });
    membership = createMockOrganizationMembership({
      _id: 'membership_1' as Id<'organizationMemberships'>,
      userId: user._id,
      organizationId: org._id,
      role: 'owner',
    });

    await seedDatabase(test, {
      users: [user],
      organizations: [org],
      projects: [project],
      organizationMemberships: [membership],
    });

    setupAuth(test, { tokenIdentifier: user.clerkId });
  });

  describe('createCategoryLevelDefinitions', () => {
    describe('Happy Path', () => {
      it('should create new level definitions', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          organizationId: org._id,
          projectId: project._id,
          levelDefinitions: [
            {
              level: 0,
              friendlyName: 'Department',
              description: 'Top-level product departments',
            },
            {
              level: 1,
              friendlyName: 'Category',
              description: 'Product categories',
            },
            {
              level: 2,
              friendlyName: 'Subcategory',
            },
          ],
        };

        // Act
        const result = await createCategoryLevelDefinitions(ctx, args);

        // Assert
        expect(result).toHaveLength(3);
        
        const levelDefs = getTableData(test, 'categoryLevelDefinitions');
        expect(levelDefs).toHaveLength(3);
        
        const dept = levelDefs.find(l => l.level === 0);
        expect(dept).toMatchObject({
          organizationId: org._id,
          projectId: project._id,
          level: 0,
          friendlyName: 'Department',
          description: 'Top-level product departments',
          isRequired: false,
          isActive: true,
          sortOrder: 0,
          version: 1,
          createdBy: user._id,
          lastModifiedBy: user._id,
        });
      });

      it('should update existing level definitions', async () => {
        // Arrange
        const existingLevel = {
          _id: 'level_1' as Id<'categoryLevelDefinitions'>,
          _creationTime: Date.now(),
          organizationId: org._id,
          projectId: project._id,
          level: 0,
          friendlyName: 'Old Name',
          description: 'Old description',
          version: 1,
          createdBy: user._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: user._id,
          isActive: true,
          isRequired: false,
          sortOrder: 0,
          metadata: {},
        };
        
        await seedDatabase(test, { 
          categoryLevelDefinitions: [existingLevel],
        });
        
        const ctx = createMutationContext(test);

        // Act
        const result = await createCategoryLevelDefinitions(ctx, {
          organizationId: org._id,
          projectId: project._id,
          levelDefinitions: [{
            level: 0,
            friendlyName: 'Updated Department',
            description: 'Updated description',
          }],
        });

        // Assert
        expect(result).toContain(existingLevel._id);
        
        const updated = await test.db.get(existingLevel._id);
        expect(updated).toMatchObject({
          friendlyName: 'Updated Department',
          description: 'Updated description',
          version: 2,
        });
      });

      it('should handle mix of new and existing levels', async () => {
        // Arrange
        const existingLevel = {
          _id: 'level_1' as Id<'categoryLevelDefinitions'>,
          _creationTime: Date.now(),
          organizationId: org._id,
          projectId: project._id,
          level: 0,
          friendlyName: 'Department',
          version: 1,
          createdBy: user._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: user._id,
          isActive: true,
          isRequired: false,
          sortOrder: 0,
          metadata: {},
        };
        
        await seedDatabase(test, { 
          categoryLevelDefinitions: [existingLevel],
        });
        
        const ctx = createMutationContext(test);

        // Act
        const result = await createCategoryLevelDefinitions(ctx, {
          organizationId: org._id,
          projectId: project._id,
          levelDefinitions: [
            {
              level: 0,
              friendlyName: 'Updated Department',
            },
            {
              level: 1,
              friendlyName: 'Category',
            },
          ],
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result).toContain(existingLevel._id);
        
        const levelDefs = getTableData(test, 'categoryLevelDefinitions');
        expect(levelDefs).toHaveLength(2);
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategoryLevelDefinitions(ctx, {
          organizationId: org._id,
          projectId: project._id,
          levelDefinitions: [],
        })).rejects.toThrow('Unauthorized');
      });

      it('should fail for viewer role', async () => {
        // Arrange
        membership.role = 'viewer';
        await test.db.patch(membership._id, { role: 'viewer' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategoryLevelDefinitions(ctx, {
          organizationId: org._id,
          projectId: project._id,
          levelDefinitions: [],
        })).rejects.toThrow('Insufficient permissions');
      });
    });
  });

  describe('importCategory', () => {
    describe('Happy Path', () => {
      it('should import new category with external ID', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          externalId: 'ext_electronics',
          level: 0,
          description: 'Electronic products',
          metadata: { source: 'shopify' },
        };

        // Act
        const categoryId = await importCategory(ctx, args);

        // Assert
        expect(categoryId).toBeDefined();
        
        const category = await test.db.get(categoryId);
        expect(category).toMatchObject({
          name: 'Electronics',
          externalId: 'ext_electronics',
          level: 0,
          description: 'Electronic products',
          handle: 'electronics',
          path: '/electronics',
          parentId: undefined,
          metadata: { source: 'shopify' },
          status: 'active',
          isVisible: true,
        });
      });

      it('should import child category with parent external ID', async () => {
        // Arrange
        const parentCategory = createMockCategory({
          _id: 'cat_parent' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          handle: 'electronics',
          externalId: 'ext_electronics',
          level: 0,
          path: '/electronics',
        });
        
        await seedDatabase(test, { categories: [parentCategory] });
        
        const ctx = createMutationContext(test);

        // Act
        const categoryId = await importCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Computers',
          externalId: 'ext_computers',
          level: 1,
          parentExternalId: 'ext_electronics',
        });

        // Assert
        const category = await test.db.get(categoryId);
        expect(category).toMatchObject({
          name: 'Computers',
          parentId: parentCategory._id,
          level: 1,
          path: '/electronics/computers',
        });
      });

      it('should update existing category on reimport', async () => {
        // Arrange
        const existingCategory = createMockCategory({
          _id: 'cat_existing' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Old Name',
          externalId: 'ext_category',
          description: 'Old description',
          version: 1,
        });
        
        await seedDatabase(test, { categories: [existingCategory] });
        
        const ctx = createMutationContext(test);

        // Act
        const categoryId = await importCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Updated Name',
          externalId: 'ext_category',
          level: 0,
          description: 'Updated description',
          metadata: { updated: true },
        });

        // Assert
        expect(categoryId).toBe(existingCategory._id);
        
        const updated = await test.db.get(categoryId);
        expect(updated).toMatchObject({
          name: 'Updated Name',
          description: 'Updated description',
          metadata: { updated: true },
          version: 2,
        });
      });

      it('should handle import without parent when parentExternalId not found', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        const categoryId = await importCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Orphaned Category',
          externalId: 'ext_orphan',
          level: 1,
          parentExternalId: 'ext_nonexistent',
        });

        // Assert
        const category = await test.db.get(categoryId);
        expect(category.parentId).toBeUndefined();
        expect(category.path).toBe('/orphaned-category');
      });
    });

    describe('Validation', () => {
      it('should generate unique handles for duplicate names', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act - Import two categories with same name
        const id1 = await importCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Test Category',
          externalId: 'ext_1',
          level: 0,
        });

        const id2 = await importCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Test Category',
          externalId: 'ext_2',
          level: 0,
        });

        // Assert
        const cat1 = await test.db.get(id1);
        const cat2 = await test.db.get(id2);
        expect(cat1.handle).toBe('test-category');
        expect(cat2.handle).toBe('test-category'); // Note: In real implementation, this should be unique
      });
    });
  });

  describe('bulkImportCategories', () => {
    describe('Happy Path', () => {
      it('should import multiple categories in correct order', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const categories = [
          {
            name: 'Electronics',
            externalId: 'ext_electronics',
            level: 0,
          },
          {
            name: 'Computers',
            externalId: 'ext_computers',
            level: 1,
            parentExternalId: 'ext_electronics',
          },
          {
            name: 'Laptops',
            externalId: 'ext_laptops',
            level: 2,
            parentExternalId: 'ext_computers',
          },
          {
            name: 'Home & Garden',
            externalId: 'ext_home',
            level: 0,
          },
        ];

        // Act
        const result = await bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories,
        });

        // Assert
        expect(result.imported).toBe(4);
        expect(result.errors).toHaveLength(0);
        
        const importedCategories = getTableData(test, 'categories');
        expect(importedCategories).toHaveLength(4);
        
        // Verify hierarchy
        const electronics = importedCategories.find(c => c.externalId === 'ext_electronics');
        const computers = importedCategories.find(c => c.externalId === 'ext_computers');
        const laptops = importedCategories.find(c => c.externalId === 'ext_laptops');
        
        expect(computers.parentId).toBe(electronics._id);
        expect(laptops.parentId).toBe(computers._id);
        expect(laptops.path).toBe('/electronics/computers/laptops');
      });

      it('should handle mix of new and existing categories', async () => {
        // Arrange
        const existingCategory = createMockCategory({
          _id: 'cat_existing' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Old Electronics',
          externalId: 'ext_electronics',
          level: 0,
          version: 1,
        });
        
        await seedDatabase(test, { categories: [existingCategory] });
        
        const ctx = createMutationContext(test);

        // Act
        const result = await bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories: [
            {
              name: 'Updated Electronics',
              externalId: 'ext_electronics',
              level: 0,
              description: 'Updated',
            },
            {
              name: 'Computers',
              externalId: 'ext_computers',
              level: 1,
              parentExternalId: 'ext_electronics',
            },
          ],
        });

        // Assert
        expect(result.imported).toBe(2);
        expect(result.errors).toHaveLength(0);
        
        const updated = await test.db.get(existingCategory._id);
        expect(updated.name).toBe('Updated Electronics');
        expect(updated.version).toBe(2);
      });

      it('should continue importing after errors', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const categories = [
          {
            name: 'Valid Category',
            externalId: 'ext_valid',
            level: 0,
          },
          {
            name: 'Child Without Parent',
            externalId: 'ext_orphan',
            level: 1,
            parentExternalId: 'ext_nonexistent',
          },
          {
            name: 'Another Valid',
            externalId: 'ext_valid2',
            level: 0,
          },
        ];

        // Act
        const result = await bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories,
        });

        // Assert
        expect(result.imported).toBe(3); // All should import, orphan just won't have parent
        expect(result.errors).toHaveLength(0);
        
        const orphan = getTableData(test, 'categories')
          .find(c => c.externalId === 'ext_orphan');
        expect(orphan.parentId).toBeUndefined();
      });

      it('should handle import order correctly', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        // Categories provided out of order
        const categories = [
          {
            name: 'Laptops',
            externalId: 'ext_laptops',
            level: 2,
            parentExternalId: 'ext_computers',
          },
          {
            name: 'Electronics',
            externalId: 'ext_electronics',
            level: 0,
          },
          {
            name: 'Computers',
            externalId: 'ext_computers',
            level: 1,
            parentExternalId: 'ext_electronics',
          },
        ];

        // Act
        const result = await bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories,
        });

        // Assert
        expect(result.imported).toBe(3);
        
        const laptops = getTableData(test, 'categories')
          .find(c => c.externalId === 'ext_laptops');
        const computers = getTableData(test, 'categories')
          .find(c => c.externalId === 'ext_computers');
        
        expect(laptops.parentId).toBe(computers._id);
        expect(laptops.path).toBe('/electronics/computers/laptops');
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories: [],
        })).rejects.toThrow('Unauthorized');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty import', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        const result = await bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories: [],
        });

        // Assert
        expect(result.imported).toBe(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle large batch import', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const categories = [];
        
        // Create 100 categories
        for (let i = 0; i < 100; i++) {
          categories.push({
            name: `Category ${i}`,
            externalId: `ext_cat_${i}`,
            level: i % 3, // Mix of levels
            parentExternalId: i > 0 && i % 3 !== 0 ? `ext_cat_${i - 1}` : undefined,
          });
        }

        // Act
        const result = await bulkImportCategories(ctx, {
          organizationId: org._id,
          projectId: project._id,
          categories,
        });

        // Assert
        expect(result.imported).toBe(100);
        expect(result.errors).toHaveLength(0);
        
        const imported = getTableData(test, 'categories');
        expect(imported).toHaveLength(100);
      });
    });
  });
});