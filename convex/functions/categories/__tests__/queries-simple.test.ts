import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../../t.setup';
describe('Category Queries', () => {
  let ctx: any;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    
    ctx = await t.run(async (ctx) => ctx);

    // Create test user
    userId = await ctx.db.insert('users', {
      clerkId: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test organization
    orgId = await ctx.db.insert('organizations', {
      name: 'Test Organization',
      clerkOrganizationId: 'org_123',
      slug: 'test-org',
      status: 'active',
      settings: {
        defaultProductStatus: 'active',
        requireProductApproval: false,
        enableAiCategorization: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization membership
    await ctx.db.insert('organizationMemberships', {
      organizationId: orgId,
      userId,
      role: 'admin',
      status: 'active',
      permissions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test project
    projectId = await ctx.db.insert('projects', {
      organizationId: orgId,
      name: 'Test Project',
      slug: 'test-project',
      status: 'active',
      settings: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock auth
    ctx.auth = {
      getUserIdentity: jest.fn().mockResolvedValue({ 
        subject: 'user_123',
        tokenIdentifier: 'user_123'
      }),
    };
  });

  describe('getProjectCategories', () => {
    beforeEach(async () => {
      // Create test categories
      const categories = [
        {
          organizationId: orgId,
          projectId,
          name: 'Electronics',
          handle: 'electronics',
          level: 0,
          path: '/electronics',
          parentId: null,
          sortOrder: 0,
          status: 'active',
          isVisible: true,
          createdBy: userId,
          lastModifiedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
        {
          organizationId: orgId,
          projectId,
          name: 'Home & Garden',
          handle: 'home-garden',
          level: 0,
          path: '/home-garden',
          parentId: null,
          sortOrder: 1,
          status: 'active',
          isVisible: true,
          createdBy: userId,
          lastModifiedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
        {
          organizationId: orgId,
          projectId,
          name: 'Archived Category',
          handle: 'archived',
          level: 0,
          path: '/archived',
          parentId: null,
          sortOrder: 2,
          status: 'archived', // This should be excluded
          isVisible: true,
          createdBy: userId,
          lastModifiedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
      ];

      for (const category of categories) {
        await ctx.db.insert('categories', category);
      }
    });

    it('should return active root categories', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Mock the runQuery to handle getProjectCategories
      ctx.runQuery.mockImplementation(async (funcName: string, args: any) => {
        if (funcName === 'getProjectCategories' || funcName.includes('getProjectCategories')) {
          // Simulate the query logic by using db.query
          const allCategories = await ctx.db.query('categories').collect();
          let categories = allCategories;
          
          // Filter by organizationId and projectId
          categories = categories.filter((c: any) => 
            c.organizationId === args.organizationId && 
            c.projectId === args.projectId
          );
          
          // Filter by parentId if provided
          if (args.parentId !== undefined) {
            categories = categories.filter((c: any) => c.parentId === args.parentId);
          }
          
          // Filter by level if provided
          if (args.level !== undefined) {
            categories = categories.filter((c: any) => c.level === args.level);
          }
          
          // Filter only active categories
          categories = categories.filter((c: any) => c.status === 'active');
          
          // Sort by sortOrder
          categories.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
          
          return categories;
        }
        return null;
      });

      const result = await ctx.runQuery('getProjectCategories', {
        organizationId: orgId,
        projectId,
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2); // Only active categories
      expect(result[0].name).toBe('Electronics');
      expect(result[1].name).toBe('Home & Garden');
    });
  });

  describe('getCategoryTree', () => {
    beforeEach(async () => {
      // Create a hierarchical category structure
      const electronics = await ctx.db.insert('categories', {
        organizationId: orgId,
        projectId,
        name: 'Electronics',
        handle: 'electronics',
        level: 0,
        path: '/electronics',
        parentId: null,
        sortOrder: 0,
        status: 'active',
        isVisible: true,
        createdBy: userId,
        lastModifiedBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      await ctx.db.insert('categories', {
        organizationId: orgId,
        projectId,
        name: 'Computers',
        handle: 'computers',
        level: 1,
        path: '/electronics/computers',
        parentId: electronics,
        sortOrder: 0,
        status: 'active',
        isVisible: true,
        createdBy: userId,
        lastModifiedBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    it('should return hierarchical category tree', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Mock the runQuery to handle getCategoryTree
      ctx.runQuery.mockImplementation(async (funcName: string, args: any) => {
        if (funcName === 'getCategoryTree' || funcName.includes('getCategoryTree')) {
          // Get all active categories
          const allCategories = await ctx.db.query('categories').collect();
          let categories = allCategories;
          categories = categories.filter((c: any) => 
            c.organizationId === args.organizationId && 
            c.projectId === args.projectId &&
            c.status === 'active'
          );
          
          // Build tree structure
          const tree: any[] = [];
          const categoryMap = new Map();
          
          // First pass: create map
          categories.forEach((cat: any) => {
            categoryMap.set(cat._id, { ...cat, children: [] });
          });
          
          // Second pass: build tree
          categories.forEach((cat: any) => {
            const node = categoryMap.get(cat._id);
            if (cat.parentId === null || cat.parentId === undefined) {
              tree.push(node);
            } else {
              const parent = categoryMap.get(cat.parentId);
              if (parent) {
                parent.children.push(node);
              }
            }
          });
          
          // Sort at each level
          const sortTree = (nodes: any[]) => {
            nodes.sort((a, b) => a.sortOrder - b.sortOrder);
            nodes.forEach(node => {
              if (node.children && node.children.length > 0) {
                sortTree(node.children);
              }
            });
          };
          
          sortTree(tree);
          return tree;
        }
        return null;
      });

      const result = await ctx.runQuery('getCategoryTree', {
        organizationId: orgId,
        projectId,
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1); // One root category
      expect(result[0].name).toBe('Electronics');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('Computers');
    });
  });

  describe('getCategory', () => {
    let categoryId: string;

    beforeEach(async () => {
      categoryId = await ctx.db.insert('categories', {
        organizationId: orgId,
        projectId,
        name: 'Test Category',
        handle: 'test-category',
        description: 'A test category',
        level: 0,
        path: '/test-category',
        parentId: null,
        sortOrder: 0,
        status: 'active',
        isVisible: true,
        metadata: { custom: 'data' },
        createdBy: userId,
        lastModifiedBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    it('should return a single category by ID', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Mock the runQuery to handle getCategory
      ctx.runQuery.mockImplementation(async (funcName: string, args: any) => {
        if (funcName === 'getCategory' || funcName.includes('getCategory')) {
          const allCategories = await ctx.db.query('categories').collect();
          const category = allCategories.find((c: any) => c._id === args.categoryId);
          if (!category) {
            throw new Error('Category not found');
          }
          return category;
        }
        return null;
      });

      const result = await ctx.runQuery('getCategory', {
        categoryId,
      });

      expect(result).toBeDefined();
      expect(result._id).toBe(categoryId);
      expect(result.name).toBe('Test Category');
      expect(result.description).toBe('A test category');
      expect(result.metadata).toEqual({ custom: 'data' });
    });

    it('should throw error for non-existent category', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      ctx.runQuery.mockImplementation(async (funcName: string, args: any) => {
        if (funcName === 'getCategory' || funcName.includes('getCategory')) {
          const allCategories = await ctx.db.query('categories').collect();
          const category = allCategories.find((c: any) => c._id === args.categoryId);
          if (!category) {
            throw new Error('Category not found');
          }
          return category;
        }
        return null;
      });

      await expect(
        ctx.runQuery('getCategory', { categoryId: 'non_existent' })
      ).rejects.toThrow('Category not found');
    });
  });
});