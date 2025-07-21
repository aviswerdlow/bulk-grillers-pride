import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createConvexTest,
  createMutationContext,
  setupAuth,
  seedDatabase,
  assertDocumentExists,
  assertDocumentNotExists,
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
import { createCategory, updateCategory, deleteCategory } from '../mutations';
import { Id } from '../../../_generated/dataModel';

describe('Category Mutations', () => {
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

  describe('createCategory', () => {
    describe('Happy Path', () => {
      it('should create a root category', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          handle: 'electronics',
          color: '#3498db',
          icon: 'laptop',
          sortOrder: 0,
          metadata: { featured: true },
        };

        // Act
        const categoryId = await createCategory(ctx, args);

        // Assert
        expect(categoryId).toBeDefined();
        expect(categoryId).toMatch(/^categories_\d+$/);

        // Verify the category was created correctly
        const categories = getTableData(test, 'categories');
        expect(categories).toHaveLength(1);
        
        const category = categories[0];
        expect(category).toMatchObject({
          _id: categoryId,
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          handle: 'electronics',
          parentId: undefined,
          level: 0,
          path: '/electronics',
          sortOrder: 0,
          color: '#3498db',
          icon: 'laptop',
          status: 'active',
          isVisible: true,
          metadata: { featured: true },
          version: 1,
          createdBy: user._id,
          lastModifiedBy: user._id,
        });

        // Verify audit log was created
        const auditLogs = getTableData(test, 'auditLogs');
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          organizationId: org._id,
          eventType: 'CREATE',
          entityType: 'categories',
          entityId: categoryId,
          performedBy: {
            type: 'user',
            userId: user._id,
            userEmail: user.email,
          },
        });
      });

      it('should create a child category with correct path and level', async () => {
        // Arrange
        const parentCategory = createMockCategory({
          _id: 'category_parent' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          handle: 'electronics',
          level: 0,
          path: '/electronics',
          parentId: null,
        });
        
        await seedDatabase(test, { categories: [parentCategory] });
        
        const ctx = createMutationContext(test);
        const args = {
          organizationId: org._id,
          projectId: project._id,
          name: 'Laptops',
          parentId: parentCategory._id,
        };

        // Act
        const categoryId = await createCategory(ctx, args);

        // Assert
        const categories = getTableData(test, 'categories');
        const childCategory = categories.find(c => c._id === categoryId);
        
        expect(childCategory).toMatchObject({
          name: 'Laptops',
          handle: 'laptops',
          parentId: parentCategory._id,
          level: 1,
          path: '/electronics/laptops',
        });
      });

      it('should auto-generate handle if not provided', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          organizationId: org._id,
          projectId: project._id,
          name: 'Home & Garden',
        };

        // Act
        const categoryId = await createCategory(ctx, args);

        // Assert
        const category = await test.db.get(categoryId);
        expect(category.handle).toBe('home-garden');
      });

      it('should calculate sort order automatically', async () => {
        // Arrange
        // Create existing categories
        const cat1 = createMockCategory({
          _id: 'cat_1' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          sortOrder: 0,
        });
        const cat2 = createMockCategory({
          _id: 'cat_2' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          sortOrder: 1,
        });
        
        await seedDatabase(test, { categories: [cat1, cat2] });
        
        const ctx = createMutationContext(test);
        const args = {
          organizationId: org._id,
          projectId: project._id,
          name: 'New Category',
        };

        // Act
        const categoryId = await createCategory(ctx, args);

        // Assert
        const category = await test.db.get(categoryId);
        expect(category.sortOrder).toBe(2);
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Test',
        })).rejects.toThrow('Unauthorized');
      });

      it('should fail for user without organization membership', async () => {
        // Arrange
        const otherUser = createMockUser({ _id: 'user_other' as Id<'users'> });
        await seedDatabase(test, { users: [otherUser] });
        setupAuth(test, { tokenIdentifier: otherUser.clerkId });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Test',
        })).rejects.toThrow();
      });

      it('should fail for viewer role', async () => {
        // Arrange
        membership.role = 'viewer';
        await test.db.patch(membership._id, { role: 'viewer' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Test',
        })).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Validation', () => {
      it('should reject duplicate handle in same project', async () => {
        // Arrange
        const existingCategory = createMockCategory({
          _id: 'cat_existing' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          handle: 'electronics',
        });
        
        await seedDatabase(test, { categories: [existingCategory] });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          handle: 'electronics',
        })).rejects.toThrow('Category handle already exists');
      });

      it('should allow same handle in different projects', async () => {
        // Arrange
        const otherProject = createMockProject({
          _id: 'project_other' as Id<'projects'>,
          organizationId: org._id,
        });
        
        const existingCategory = createMockCategory({
          _id: 'cat_existing' as Id<'categories'>,
          organizationId: org._id,
          projectId: otherProject._id,
          handle: 'electronics',
        });
        
        await seedDatabase(test, { 
          projects: [otherProject],
          categories: [existingCategory],
        });
        
        const ctx = createMutationContext(test);

        // Act
        const categoryId = await createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          handle: 'electronics',
        });

        // Assert
        expect(categoryId).toBeDefined();
      });

      it('should reject non-existent parent category', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Test',
          parentId: 'category_nonexistent' as Id<'categories'>,
        })).rejects.toThrow('Parent category not found');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long names by truncating handle', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const longName = 'This is a very long category name that should be truncated when generating a handle';

        // Act
        const categoryId = await createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: longName,
        });

        // Assert
        const category = await test.db.get(categoryId);
        expect(category.handle.length).toBeLessThanOrEqual(100); // Assuming max handle length
      });

      it('should create deeply nested categories', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        
        // Create a hierarchy
        const root = await createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Root',
        });
        
        const level1 = await createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Level 1',
          parentId: root,
        });
        
        const level2 = await createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Level 2',
          parentId: level1,
        });

        // Act
        const level3Id = await createCategory(ctx, {
          organizationId: org._id,
          projectId: project._id,
          name: 'Level 3',
          parentId: level2,
        });

        // Assert
        const level3 = await test.db.get(level3Id);
        expect(level3.level).toBe(3);
        expect(level3.path).toBe('/root/level-1/level-2/level-3');
      });
    });
  });

  describe('updateCategory', () => {
    let category: any;

    beforeEach(async () => {
      category = createMockCategory({
        _id: 'category_1' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'Original Name',
        handle: 'original-name',
        description: 'Original description',
        level: 0,
        path: '/original-name',
        version: 1,
      });
      
      await seedDatabase(test, { categories: [category] });
    });

    describe('Happy Path', () => {
      it('should update category name and description', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          categoryId: category._id,
          name: 'Updated Name',
          description: 'Updated description',
        };

        // Act
        const result = await updateCategory(ctx, args);

        // Assert
        expect(result).toBe(category._id);
        
        const updated = await test.db.get(category._id);
        expect(updated).toMatchObject({
          name: 'Updated Name',
          description: 'Updated description',
          version: 2,
          lastModifiedBy: user._id,
        });
        
        // Verify audit log
        const auditLogs = getTableData(test, 'auditLogs');
        const updateLog = auditLogs.find(log => log.eventType === 'UPDATE');
        expect(updateLog).toBeDefined();
        expect(updateLog.changes).toContainEqual({
          field: 'name',
          oldValue: 'Original Name',
          newValue: 'Updated Name',
          changeType: 'modified',
        });
      });

      it('should update handle and cascade path changes to children', async () => {
        // Arrange
        const childCategory = createMockCategory({
          _id: 'category_child' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: category._id,
          level: 1,
          path: '/original-name/child',
          handle: 'child',
        });
        
        const grandchildCategory = createMockCategory({
          _id: 'category_grandchild' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: childCategory._id,
          level: 2,
          path: '/original-name/child/grandchild',
          handle: 'grandchild',
        });
        
        await seedDatabase(test, { 
          categories: [childCategory, grandchildCategory],
        });
        
        const ctx = createMutationContext(test);

        // Act
        await updateCategory(ctx, {
          categoryId: category._id,
          handle: 'new-handle',
        });

        // Assert
        const updatedParent = await test.db.get(category._id);
        const updatedChild = await test.db.get(childCategory._id);
        const updatedGrandchild = await test.db.get(grandchildCategory._id);
        
        expect(updatedParent.path).toBe('/new-handle');
        expect(updatedChild.path).toBe('/new-handle/child');
        expect(updatedGrandchild.path).toBe('/new-handle/child/grandchild');
      });

      it('should update visibility status', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        await updateCategory(ctx, {
          categoryId: category._id,
          isVisible: false,
        });

        // Assert
        const updated = await test.db.get(category._id);
        expect(updated.isVisible).toBe(false);
      });

      it('should handle no changes gracefully', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const auditLogsBefore = getTableData(test, 'auditLogs').length;

        // Act
        const result = await updateCategory(ctx, {
          categoryId: category._id,
          name: category.name, // Same as current
        });

        // Assert
        expect(result).toBe(category._id);
        const auditLogsAfter = getTableData(test, 'auditLogs').length;
        expect(auditLogsAfter).toBe(auditLogsBefore); // No new audit log
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(updateCategory(ctx, {
          categoryId: category._id,
          name: 'New Name',
        })).rejects.toThrow('Unauthorized');
      });

      it('should fail for user without edit permissions', async () => {
        // Arrange
        membership.role = 'viewer';
        await test.db.patch(membership._id, { role: 'viewer' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(updateCategory(ctx, {
          categoryId: category._id,
          name: 'New Name',
        })).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Validation', () => {
      it('should reject duplicate handle in same project', async () => {
        // Arrange
        const otherCategory = createMockCategory({
          _id: 'category_other' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          handle: 'taken-handle',
        });
        
        await seedDatabase(test, { categories: [otherCategory] });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(updateCategory(ctx, {
          categoryId: category._id,
          handle: 'taken-handle',
        })).rejects.toThrow('Category handle already exists');
      });

      it('should reject non-existent category', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(updateCategory(ctx, {
          categoryId: 'category_nonexistent' as Id<'categories'>,
          name: 'New Name',
        })).rejects.toThrow('Category not found');
      });
    });
  });

  describe('deleteCategory', () => {
    let category: any;

    beforeEach(async () => {
      category = createMockCategory({
        _id: 'category_1' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'To Delete',
        status: 'active',
        version: 1,
      });
      
      await seedDatabase(test, { categories: [category] });
    });

    describe('Happy Path', () => {
      it('should soft delete a category without children or products', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        const result = await deleteCategory(ctx, { 
          categoryId: category._id,
        });

        // Assert
        expect(result).toBe(category._id);
        
        const deleted = await test.db.get(category._id);
        expect(deleted).toMatchObject({
          status: 'archived',
          version: 2,
          lastModifiedBy: user._id,
        });
        
        // Verify audit log
        const auditLogs = getTableData(test, 'auditLogs');
        const deleteLog = auditLogs.find(log => log.eventType === 'DELETE');
        expect(deleteLog).toBeDefined();
        expect(deleteLog.isRollbackable).toBe(true);
      });
    });

    describe('Authorization', () => {
      it('should fail for user without delete permissions', async () => {
        // Arrange
        membership.role = 'editor';
        await test.db.patch(membership._id, { role: 'editor' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(deleteCategory(ctx, {
          categoryId: category._id,
        })).rejects.toThrow();
      });
    });

    describe('Validation', () => {
      it('should prevent deletion of category with active children', async () => {
        // Arrange
        const childCategory = createMockCategory({
          _id: 'category_child' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: category._id,
          status: 'active',
        });
        
        await seedDatabase(test, { categories: [childCategory] });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(deleteCategory(ctx, {
          categoryId: category._id,
        })).rejects.toThrow('Cannot delete category with child categories');
      });

      it('should allow deletion if children are archived', async () => {
        // Arrange
        const childCategory = createMockCategory({
          _id: 'category_child' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: category._id,
          status: 'archived',
        });
        
        await seedDatabase(test, { categories: [childCategory] });
        
        const ctx = createMutationContext(test);

        // Act
        const result = await deleteCategory(ctx, {
          categoryId: category._id,
        });

        // Assert
        expect(result).toBe(category._id);
      });

      it('should prevent deletion of category with assigned products', async () => {
        // Arrange
        await seedDatabase(test, {
          categoryProductAssignments: [{
            _id: 'assignment_1',
            _creationTime: Date.now(),
            categoryId: category._id,
            productId: 'product_1' as Id<'products'>,
            status: 'active',
            assignedBy: 'manual',
            assignedAt: Date.now(),
          }],
        });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(deleteCategory(ctx, {
          categoryId: category._id,
        })).rejects.toThrow('Cannot delete category with assigned products');
      });

      it('should allow deletion if product assignments are inactive', async () => {
        // Arrange
        await seedDatabase(test, {
          categoryProductAssignments: [{
            _id: 'assignment_1',
            _creationTime: Date.now(),
            categoryId: category._id,
            productId: 'product_1' as Id<'products'>,
            status: 'removed',
            assignedBy: 'manual',
            assignedAt: Date.now(),
          }],
        });
        
        const ctx = createMutationContext(test);

        // Act
        const result = await deleteCategory(ctx, {
          categoryId: category._id,
        });

        // Assert
        expect(result).toBe(category._id);
      });
    });
  });
});