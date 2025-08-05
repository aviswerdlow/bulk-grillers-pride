import { describe, it, expect, beforeEach } from '@jest/globals';
import { t } from '../../../t.setup';
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
} from 'convex-test';
// Import the mutation object to access its handler
import { moveCategory as moveCategoryMutation } from '../hierarchy';

// Extract the handler for use in tests
const moveCategory = (ctx: any, args: any) => moveCategoryMutation.handler(ctx, args);
import { Id } from '../../../_generated/dataModel';

describe('Category Hierarchy Operations', () => {
  let test: ConvexTestContext;
  let user: any;
  let org: any;
  let project: any;
  let membership: any;

  beforeEach(async () => {
    
    // test is already imported from test.setup
    
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

  describe('moveCategory', () => {
    let rootCategory: any;
    let childCategory: any;
    let grandchildCategory: any;
    let otherRootCategory: any;

    beforeEach(async () => {
      // Create a category hierarchy:
      // Electronics (root)
      //   └── Computers (child)
      //       └── Laptops (grandchild)
      // Home & Garden (otherRoot)
      
      rootCategory = createMockCategory({
        _id: 'cat_root' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'Electronics',
        handle: 'electronics',
        level: 0,
        path: '/electronics',
        parentId: null,
        sortOrder: 0,
        version: 1,
      });

      childCategory = createMockCategory({
        _id: 'cat_child' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'Computers',
        handle: 'computers',
        level: 1,
        path: '/electronics/computers',
        parentId: rootCategory._id,
        sortOrder: 0,
        version: 1,
      });

      grandchildCategory = createMockCategory({
        _id: 'cat_grandchild' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'Laptops',
        handle: 'laptops',
        level: 2,
        path: '/electronics/computers/laptops',
        parentId: childCategory._id,
        sortOrder: 0,
        version: 1,
      });

      otherRootCategory = createMockCategory({
        _id: 'cat_other_root' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'Home & Garden',
        handle: 'home-garden',
        level: 0,
        path: '/home-garden',
        parentId: null,
        sortOrder: 1,
        version: 1,
      });
      
      await seedDatabase(test, { 
        categories: [rootCategory, childCategory, grandchildCategory, otherRootCategory],
      });
    });

    describe('Happy Path', () => {
      it('should move category to new parent', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act - Move Computers from Electronics to Home & Garden
        const result = await moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: otherRootCategory._id,
        });

        // Assert
        expect(result).toBe(childCategory._id);
        
        const movedCategory = await t.db.get(childCategory._id);
        expect(movedCategory).toMatchObject({
          parentId: otherRootCategory._id,
          level: 1,
          path: '/home-garden/computers',
          version: 2,
        });

        // Check that grandchild was also updated
        const updatedGrandchild = await t.db.get(grandchildCategory._id);
        expect(updatedGrandchild).toMatchObject({
          level: 2,
          path: '/home-garden/computers/laptops',
          version: 2,
        });

        // Verify audit log
        const auditLogs = getTableData(test, 'auditLogs');
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          eventType: 'UPDATE',
          entityType: 'categories',
          entityId: childCategory._id,
          metadata: {
            oldParentId: rootCategory._id,
            newParentId: otherRootCategory._id,
          },
        });
      });

      it('should move category to root level', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act - Move grandchild to root
        const result = await moveCategory(ctx, {
          categoryId: grandchildCategory._id,
          newParentId: undefined,
        });

        // Assert
        const movedCategory = await t.db.get(grandchildCategory._id);
        expect(movedCategory).toMatchObject({
          parentId: undefined,
          level: 0,
          path: '/laptops',
        });
      });

      it('should update sort order when specified', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        const result = await moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: childCategory.parentId, // Same parent
          newSortOrder: 5,
        });

        // Assert
        const updated = await t.db.get(childCategory._id);
        expect(updated.sortOrder).toBe(5);
      });

      it('should calculate sort order automatically', async () => {
        // Arrange
        // Create more siblings
        const sibling1 = createMockCategory({
          _id: 'cat_sibling1' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: otherRootCategory._id,
          sortOrder: 10,
        });
        const sibling2 = createMockCategory({
          _id: 'cat_sibling2' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: otherRootCategory._id,
          sortOrder: 20,
        });
        
        await seedDatabase(test, { categories: [sibling1, sibling2] });
        
        const ctx = createMutationContext(test);

        // Act
        const result = await moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: otherRootCategory._id,
        });

        // Assert
        const moved = await t.db.get(childCategory._id);
        expect(moved.sortOrder).toBe(21); // Max + 1
      });

      it('should handle moving category with multiple descendants', async () => {
        // Arrange
        // Create more descendants
        const greatGrandchild = createMockCategory({
          _id: 'cat_ggc' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: grandchildCategory._id,
          level: 3,
          path: '/electronics/computers/laptops/gaming',
          handle: 'gaming',
        });
        
        const sibling = createMockCategory({
          _id: 'cat_sibling' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          parentId: childCategory._id,
          level: 2,
          path: '/electronics/computers/desktops',
          handle: 'desktops',
        });
        
        await seedDatabase(test, { categories: [greatGrandchild, sibling] });
        
        const ctx = createMutationContext(test);

        // Act - Move computers to home & garden
        await moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: otherRootCategory._id,
        });

        // Assert - All descendants should be updated
        const updatedGGC = await t.db.get(greatGrandchild._id);
        expect(updatedGGC).toMatchObject({
          level: 3,
          path: '/home-garden/computers/laptops/gaming',
        });
        
        const updatedSibling = await t.db.get(sibling._id);
        expect(updatedSibling).toMatchObject({
          level: 2,
          path: '/home-garden/computers/desktops',
        });
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: otherRootCategory._id,
        })).rejects.toThrow('Unauthorized');
      });

      it('should fail for viewer role', async () => {
        // Arrange
        membership.role = 'viewer';
        await t.db.patch(membership._id, { role: 'viewer' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: otherRootCategory._id,
        })).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Validation', () => {
      it('should prevent moving category to be its own child', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(moveCategory(ctx, {
          categoryId: rootCategory._id,
          newParentId: childCategory._id,
        })).rejects.toThrow('Cannot move category to be its own descendant');
      });

      it('should prevent moving category to be its own grandchild', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(moveCategory(ctx, {
          categoryId: rootCategory._id,
          newParentId: grandchildCategory._id,
        })).rejects.toThrow('Cannot move category to be its own descendant');
      });

      it('should fail for non-existent category', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(moveCategory(ctx, {
          categoryId: 'cat_nonexistent' as Id<'categories'>,
          newParentId: rootCategory._id,
        })).rejects.toThrow('Category not found');
      });

      it('should fail for non-existent new parent', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: 'cat_nonexistent' as Id<'categories'>,
        })).rejects.toThrow('New parent category not found');
      });
    });

    describe('Edge Cases', () => {
      it('should handle moving category to same parent with new sort order', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        await moveCategory(ctx, {
          categoryId: childCategory._id,
          newParentId: rootCategory._id, // Same parent
          newSortOrder: 10,
        });

        // Assert
        const updated = await t.db.get(childCategory._id);
        expect(updated.parentId).toBe(rootCategory._id); // Same parent
        expect(updated.sortOrder).toBe(10); // New sort order
        expect(updated.path).toBe('/electronics/computers'); // Same path
      });

      it('should handle categories with special characters in handles', async () => {
        // Arrange
        const specialCategory = createMockCategory({
          _id: 'cat_special' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Special & Category',
          handle: 'special-category',
          level: 0,
          path: '/special-category',
          parentId: null,
        });
        
        await seedDatabase(test, { categories: [specialCategory] });
        
        const ctx = createMutationContext(test);

        // Act
        await moveCategory(ctx, {
          categoryId: specialCategory._id,
          newParentId: rootCategory._id,
        });

        // Assert
        const moved = await t.db.get(specialCategory._id);
        expect(moved.path).toBe('/electronics/special-category');
      });

      it('should maintain data integrity when moving large hierarchies', async () => {
        // Arrange - Create a deep hierarchy
        const categories = [];
        let parentId = rootCategory._id;
        let parentPath = rootCategory.path;
        
        for (let i = 0; i < 5; i++) {
          const cat = createMockCategory({
            _id: `cat_deep_${i}` as Id<'categories'>,
            organizationId: org._id,
            projectId: project._id,
            name: `Level ${i}`,
            handle: `level-${i}`,
            level: i + 1,
            path: `${parentPath}/level-${i}`,
            parentId,
          });
          categories.push(cat);
          parentId = cat._id;
          parentPath = cat.path;
        }
        
        await seedDatabase(test, { categories });
        
        const ctx = createMutationContext(test);

        // Act - Move the entire hierarchy
        await moveCategory(ctx, {
          categoryId: rootCategory._id,
          newParentId: otherRootCategory._id,
        });

        // Assert - All categories should be properly updated
        const updatedRoot = await t.db.get(rootCategory._id);
        expect(updatedRoot.level).toBe(1);
        expect(updatedRoot.path).toBe('/home-garden/electronics');
        
        // Check deepest category
        const deepest = await t.db.get('cat_deep_4');
        expect(deepest.level).toBe(6);
        expect(deepest.path).toBe('/home-garden/electronics/level-0/level-1/level-2/level-3/level-4');
      });
    });
  });
});