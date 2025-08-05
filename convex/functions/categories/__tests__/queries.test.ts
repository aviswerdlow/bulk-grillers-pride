import { describe, it, expect, beforeEach } from '@jest/globals';
import { t, resetMockState } from '../../../test.setup';
import {
  createConvexTest,
  createQueryContext,
  setupAuth,
  seedDatabase,
  type ConvexTestContext,
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  createMockCategory,
} from '../../../__tests__/convex-test-standard';
import { Id } from '../../../_generated/dataModel';
import { getProjectCategories, getCategoryTree, getCategory } from '../queries';

describe('Category Queries', () => {
  let user: any;
  let org: any;
  let project: any;
  let membership: any;

  beforeEach(async () => {
    // Reset mock state before each test
    resetMockState();
    
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
      role: 'viewer', // Read access is sufficient for queries
    });

    await seedDatabase(t, {
      users: [user],
      organizations: [org],
      projects: [project],
      organizationMemberships: [membership],
    });

    await setupAuth(t, user);
  });

  describe('getProjectCategories', () => {
    beforeEach(async () => {
      // Create a category structure for testing
      const categories = [
        // Root categories
        createMockCategory({
          _id: 'cat_electronics' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          handle: 'electronics',
          level: 0,
          parentId: null,
          sortOrder: 0,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_home' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Home & Garden',
          handle: 'home-garden',
          level: 0,
          parentId: null,
          sortOrder: 1,
          status: 'active',
        }),
        // Child categories
        createMockCategory({
          _id: 'cat_computers' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Computers',
          handle: 'computers',
          level: 1,
          parentId: 'cat_electronics' as Id<'categories'>,
          sortOrder: 0,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_audio' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Audio',
          handle: 'audio',
          level: 1,
          parentId: 'cat_electronics' as Id<'categories'>,
          sortOrder: 1,
          status: 'active',
        }),
        // Archived category (should be excluded)
        createMockCategory({
          _id: 'cat_archived' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Archived Category',
          handle: 'archived',
          level: 0,
          parentId: null,
          sortOrder: 2,
          status: 'archived',
        }),
      ];

      await seedDatabase(t, { categories });
    });

    describe('Happy Path', () => {
      it('should return all active categories sorted by sortOrder when no filters specified', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
        });

        // Assert
        expect(result).toHaveLength(4); // All active categories (excluding archived)
        expect(result[0].name).toBe('Electronics'); // sortOrder: 0
        expect(result[1].name).toBe('Computers'); // sortOrder: 0 but comes after Electronics
        expect(result[2].name).toBe('Home & Garden'); // sortOrder: 1
        expect(result[3].name).toBe('Audio'); // sortOrder: 1
        expect(result.find(c => c.name === 'Archived Category')).toBeUndefined();
      });

      it('should return categories for specific parent', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
          parentId: 'cat_electronics' as Id<'categories'>,
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Computers');
        expect(result[1].name).toBe('Audio');
      });

      it('should return categories for specific level', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
          level: 1,
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every(c => c.level === 1)).toBe(true);
      });

      it('should return categories for specific parent and level', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
          parentId: 'cat_electronics' as Id<'categories'>,
          level: 1,
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every(c => c.parentId === 'cat_electronics' && c.level === 1)).toBe(true);
      });

      it('should return empty array for non-existent parent', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
          parentId: 'cat_nonexistent' as Id<'categories'>,
        });

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        await setupAuth(t, null);
        // Context is handled by convex test framework

        // Act & Assert
        await expect(t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
        })).rejects.toThrow('Not authenticated');
      });

      it('should fail for user without organization access', async () => {
        // Arrange
        const otherUser = createMockUser({ _id: 'user_other' as Id<'users'> });
        await seedDatabase(t, { users: [otherUser] });
        await setupAuth(t, otherUser);
        
        // Context is handled by convex test framework

        // Act & Assert
        await expect(t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
        })).rejects.toThrow();
      });
    });

    describe('Edge Cases', () => {
      it('should handle projects with no categories', async () => {
        // Arrange
        const emptyProject = createMockProject({
          _id: 'project_empty' as Id<'projects'>,
          organizationId: org._id,
        });
        await seedDatabase(t, { projects: [emptyProject] });
        
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: emptyProject._id,
        });

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle complex sort orders correctly', async () => {
        // Arrange
        // Reset and set up fresh data for this test
        resetMockState();
        await seedDatabase(t, {
          users: [user],
          organizations: [org],
          projects: [project],
          organizationMemberships: [membership],
        });
        await setupAuth(t, user);
        
        const categories = [
          createMockCategory({
            _id: 'cat_1' as Id<'categories'>,
            organizationId: org._id,
            projectId: project._id,
            name: 'Category 1',
            sortOrder: 10,
            status: 'active',
          }),
          createMockCategory({
            _id: 'cat_2' as Id<'categories'>,
            organizationId: org._id,
            projectId: project._id,
            name: 'Category 2',
            sortOrder: 5,
            status: 'active',
          }),
          createMockCategory({
            _id: 'cat_3' as Id<'categories'>,
            organizationId: org._id,
            projectId: project._id,
            name: 'Category 3',
            sortOrder: 7,
            status: 'active',
          }),
        ];
        
        await seedDatabase(t, { categories });
        
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getProjectCategories, {
          organizationId: org._id,
          projectId: project._id,
        });

        // Assert
        expect(result.map(c => c.name)).toEqual(['Category 2', 'Category 3', 'Category 1']);
      });
    });
  });

  describe('getCategoryTree', () => {
    beforeEach(async () => {
      // Reset state for nested tests
      resetMockState();
      await seedDatabase(t, {
        users: [user],
        organizations: [org],
        projects: [project],
        organizationMemberships: [membership],
      });
      await setupAuth(t, user);
      
      // Create a more complex category structure
      const categories = [
        // Electronics branch
        createMockCategory({
          _id: 'cat_electronics' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Electronics',
          handle: 'electronics',
          level: 0,
          parentId: null,
          sortOrder: 0,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_computers' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Computers',
          handle: 'computers',
          level: 1,
          parentId: 'cat_electronics' as Id<'categories'>,
          sortOrder: 0,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_laptops' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Laptops',
          handle: 'laptops',
          level: 2,
          parentId: 'cat_computers' as Id<'categories'>,
          sortOrder: 0,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_desktops' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Desktops',
          handle: 'desktops',
          level: 2,
          parentId: 'cat_computers' as Id<'categories'>,
          sortOrder: 1,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_audio' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Audio',
          handle: 'audio',
          level: 1,
          parentId: 'cat_electronics' as Id<'categories'>,
          sortOrder: 1,
          status: 'active',
        }),
        // Home & Garden branch
        createMockCategory({
          _id: 'cat_home' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Home & Garden',
          handle: 'home-garden',
          level: 0,
          parentId: null,
          sortOrder: 1,
          status: 'active',
        }),
        createMockCategory({
          _id: 'cat_furniture' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Furniture',
          handle: 'furniture',
          level: 1,
          parentId: 'cat_home' as Id<'categories'>,
          sortOrder: 0,
          status: 'active',
        }),
        // Archived category (should be excluded)
        createMockCategory({
          _id: 'cat_archived' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Archived',
          handle: 'archived',
          level: 1,
          parentId: 'cat_home' as Id<'categories'>,
          sortOrder: 1,
          status: 'archived',
        }),
      ];

      await seedDatabase(t, { categories });
    });

    describe('Happy Path', () => {
      it('should return hierarchical tree structure', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getCategoryTree, {
          organizationId: org._id,
          projectId: project._id,
        });

        // Assert
        expect(result).toHaveLength(2); // Two root categories
        
        // Check Electronics branch
        const electronics = result.find(c => c.name === 'Electronics');
        expect(electronics).toBeDefined();
        expect(electronics.children).toHaveLength(2); // Computers and Audio
        
        const computers = electronics.children.find(c => c.name === 'Computers');
        expect(computers).toBeDefined();
        expect(computers.children).toHaveLength(2); // Laptops and Desktops
        
        const audio = electronics.children.find(c => c.name === 'Audio');
        expect(audio).toBeDefined();
        expect(audio.children).toHaveLength(0);
        
        // Check Home & Garden branch
        const home = result.find(c => c.name === 'Home & Garden');
        expect(home).toBeDefined();
        expect(home.children).toHaveLength(1); // Only Furniture (archived excluded)
      });

      it('should sort categories at each level by sortOrder', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getCategoryTree, {
          organizationId: org._id,
          projectId: project._id,
        });

        // Assert
        // Root level
        expect(result[0].name).toBe('Electronics');
        expect(result[1].name).toBe('Home & Garden');
        
        // Electronics children
        const electronics = result[0];
        expect(electronics.children[0].name).toBe('Computers');
        expect(electronics.children[1].name).toBe('Audio');
        
        // Computers children
        const computers = electronics.children[0];
        expect(computers.children[0].name).toBe('Laptops');
        expect(computers.children[1].name).toBe('Desktops');
      });

      it('should exclude archived categories', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getCategoryTree, {
          organizationId: org._id,
          projectId: project._id,
        });

        // Assert
        const home = result.find(c => c.name === 'Home & Garden');
        const archivedCategory = home.children.find(c => c.name === 'Archived');
        expect(archivedCategory).toBeUndefined();
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        await setupAuth(t, null);
        // Context is handled by convex test framework

        // Act & Assert
        await expect(t.query(getCategoryTree, {
          organizationId: org._id,
          projectId: project._id,
        })).rejects.toThrow('Not authenticated');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty category tree', async () => {
        // Arrange
        const emptyProject = createMockProject({
          _id: 'project_empty' as Id<'projects'>,
          organizationId: org._id,
        });
        await seedDatabase(t, { projects: [emptyProject] });
        
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getCategoryTree, {
          organizationId: org._id,
          projectId: emptyProject._id,
        });

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle orphaned categories gracefully', async () => {
        // Arrange
        // Create a category with non-existent parent
        const orphan = createMockCategory({
          _id: 'cat_orphan' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Orphan',
          parentId: 'cat_nonexistent' as Id<'categories'>,
          level: 1,
          status: 'active',
        });
        
        await seedDatabase(t, { categories: [orphan] });
        
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getCategoryTree, {
          organizationId: org._id,
          projectId: project._id,
        });

        // Assert
        // Orphaned categories should not appear in the tree
        const flatCategories = flattenTree(result);
        expect(flatCategories.find(c => c.name === 'Orphan')).toBeUndefined();
      });
    });
  });

  describe('getCategory', () => {
    let category: any;

    beforeEach(async () => {
      category = createMockCategory({
        _id: 'cat_test' as Id<'categories'>,
        organizationId: org._id,
        projectId: project._id,
        name: 'Test Category',
        description: 'A test category',
        handle: 'test-category',
        metadata: { custom: 'data' },
      });
      
      await seedDatabase(t, { categories: [category] });
    });

    describe('Happy Path', () => {
      it('should return a single category by ID', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act
        const result = await t.query(getCategory, {
          categoryId: category._id,
        });

        // Assert
        expect(result).toMatchObject({
          _id: category._id,
          name: 'Test Category',
          description: 'A test category',
          handle: 'test-category',
          metadata: { custom: 'data' },
        });
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        await setupAuth(t, null);
        // Context is handled by convex test framework

        // Act & Assert
        await expect(t.query(getCategory, {
          categoryId: category._id,
        })).rejects.toThrow('Not authenticated');
      });

      it('should fail for user without organization access', async () => {
        // Arrange
        const otherOrg = createMockOrganization({
          _id: 'org_other' as Id<'organizations'>,
        });
        const otherCategory = createMockCategory({
          _id: 'cat_other' as Id<'categories'>,
          organizationId: otherOrg._id,
        });
        
        await seedDatabase(t, { 
          organizations: [otherOrg],
          categories: [otherCategory],
        });
        
        // Context is handled by convex test framework

        // Act & Assert
        await expect(t.query(getCategory, {
          categoryId: otherCategory._id,
        })).rejects.toThrow();
      });
    });

    describe('Validation', () => {
      it('should fail for non-existent category', async () => {
        // Arrange
        // Context is handled by convex test framework

        // Act & Assert
        await expect(t.query(getCategory, {
          categoryId: 'cat_nonexistent' as Id<'categories'>,
        })).rejects.toThrow('Category not found');
      });
    });
  });
});

// Helper function to flatten tree structure for testing
function flattenTree(tree: any[]): any[] {
  const result: any[] = [];
  
  function traverse(nodes: any[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(tree);
  return result;
}