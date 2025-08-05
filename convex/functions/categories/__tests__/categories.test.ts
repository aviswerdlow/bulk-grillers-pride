import { api } from '../../../_generated/api';
import { t } from '../../../t.setup';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Id } from '../../../_generated/dataModel';
import { createCategoryHandler, updateCategoryHandler, deleteCategoryHandler } from '../handlers/mutations';
import { getCategoryTreeHandler, getBreadcrumbHandler } from '../handlers/queries';
import { setupAuthenticatedContext } from '../../../test-helpers';

describe('Categories Functions', () => {
  let userId: Id<'users'>;
  let orgId: Id<'organizations'>;
  let projectId: Id<'projects'>;
  let ctx: any;

  beforeEach(async () => {
    // Get the test context
    ctx = await t.run(async (runCtx) => runCtx);
    
    // Setup authenticated context with test user, organization, and project
    const setup = await setupAuthenticatedContext(ctx, {
      userId: 'user123',
      orgId: 'org123',
      projectId: 'project123',
      role: 'owner'
    });
    
    userId = setup.user._id;
    orgId = setup.org._id;
    projectId = setup.project._id;
  });

  // Helper to create test category
  const createTestCategory = async (data: any) => {
    return ctx.db.insert('categories', {
      _creationTime: Date.now(),
      organizationId: orgId,
      projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      isVisible: true,
      version: 1,
      metadata: {},
      ...data,
    });
  };

  describe('createCategory', () => {
    it('should create root category', async () => {
      const categoryId = await createCategoryHandler(ctx, {
        name: 'Electronics',
        organizationId: orgId,
        projectId,
        userId,
      });

      // The handler returns just the ID, so we need to fetch the created category
      expect(categoryId).toBeTruthy();
      expect(typeof categoryId).toBe('string');
      
      const createdCategory = await ctx.db.get(categoryId);
      expect(createdCategory).toMatchObject({
        _id: categoryId,
        name: 'Electronics',
        organizationId: orgId,
        parentId: undefined, // Handler stores undefined not null
        level: 0,
        path: '/electronics', // Handler stores path as string
        status: 'active',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should create child category with correct path', async () => {
      // Create parent category
      const parentId = 'parent123' as Id<'categories'>;
      await createTestCategory({
        _id: parentId,
        name: 'Electronics',
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        handle: 'electronics',
      });

      // Create child
      const categoryId = await createCategoryHandler(ctx, {
        name: 'Laptops',
        organizationId: orgId,
        projectId,
        parentId,
        userId,
      });

      expect(categoryId).toBeTruthy();
      
      const createdCategory = await ctx.db.get(categoryId);
      expect(createdCategory).toMatchObject({
        name: 'Laptops',
        parentId,
        level: 1,
        path: [parentId],
      });
    });

    it('should create nested category with full path', async () => {
      // Create grandparent
      const grandparentId = 'grandparent123' as Id<'categories'>;
      ctx.db.insert('categories', {
        _id: grandparentId,
        _creationTime: Date.now(),
        name: 'Electronics',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create parent
      const parentId = 'parent123' as Id<'categories'>;
      ctx.db.insert('categories', {
        _id: parentId,
        _creationTime: Date.now(),
        name: 'Computers',
        organizationId: orgId,
        parentId: grandparentId,
        level: 1,
        path: [grandparentId],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create child
      const ctx = { db: t.db, auth: t.auth };
      const result = await createCategoryHandler(ctx, {
        name: 'Gaming Laptops',
        organizationId: orgId,
        parentId,
        userId,
      });

      expect(result).toMatchObject({
        name: 'Gaming Laptops',
        parentId,
        level: 2,
        path: [grandparentId, parentId],
      });
    });

    it('should reject duplicate names at same level', async () => {
      // Create first category
      const ctx = { db: t.db, auth: t.auth };
      await createCategoryHandler(ctx, {
        name: 'Electronics',
        organizationId: orgId,
        userId,
      });

      // Try to create duplicate
      await expect(
        t.mutation(api.categories.createCategory, {
          name: 'Electronics',
          organizationId: orgId,
          userId,
        })
      ).rejects.toThrow('already exists');
    });

    it('should allow same name under different parents', async () => {
      // Create two parent categories
      const parent1Id = 'parent1' as Id<'categories'>;
      const parent2Id = 'parent2' as Id<'categories'>;
      
      ctx.db.insert('categories', {
        _id: parent1Id,
        _creationTime: Date.now(),
        name: 'Electronics',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ctx.db.insert('categories', {
        _id: parent2Id,
        _creationTime: Date.now(),
        name: 'Home & Garden',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create "Accessories" under both parents
      const ctx = { db: t.db, auth: t.auth };
      const result1 = await createCategoryHandler(ctx, {
        name: 'Accessories',
        organizationId: orgId,
        parentId: parent1Id,
        userId,
      });

      const result2 = await createCategoryHandler(ctx, {
        name: 'Accessories',
        organizationId: orgId,
        parentId: parent2Id,
        userId,
      });

      expect(result1.parentId).toBe(parent1Id);
      expect(result2.parentId).toBe(parent2Id);
    });

    it('should create with custom properties', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await createCategoryHandler(ctx, {
        name: 'Electronics',
        organizationId: orgId,
        description: 'Electronic devices and accessories',
        metadata: { color: 'blue', icon: 'laptop' },
        userId,
      });

      expect(result).toMatchObject({
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        metadata: { color: 'blue', icon: 'laptop' },
      });
    });
  });

  describe('updateCategory', () => {
    let categoryId: Id<'categories'>;

    beforeEach(async () => {
      categoryId = 'category123' as Id<'categories'>;
      await ctx.db.insert('categories', {
        _id: categoryId,
        _creationTime: Date.now(),
        name: 'Original Name',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update category name', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await updateCategoryHandler(ctx, {
        categoryId,
        name: 'Updated Name',
        userId,
      });

      expect(result).toMatchObject({
        _id: categoryId,
        name: 'Updated Name',
        updatedAt: expect.any(Number),
      });
    });

    it('should update multiple fields', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await updateCategoryHandler(ctx, {
        categoryId,
        name: 'New Name',
        description: 'New description',
        metadata: { featured: true },
        userId,
      });

      expect(result).toMatchObject({
        name: 'New Name',
        description: 'New description',
        metadata: { featured: true },
      });
    });

    it('should toggle active status', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await updateCategoryHandler(ctx, {
        categoryId,
        isActive: false,
        userId,
      });

      expect(result.isActive).toBe(false);
    });

    it('should reject duplicate name at same level', async () => {
      // Create another category
      const otherId = 'other123' as Id<'categories'>;
      ctx.db.insert('categories', {
        _id: otherId,
        _creationTime: Date.now(),
        name: 'Existing Name',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ctx = { db: t.db, auth: t.auth };
      await expect(
        updateCategoryHandler(ctx, {
          categoryId,
          name: 'Existing Name',
          userId,
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('deleteCategory', () => {
    let categoryId: Id<'categories'>;

    beforeEach(() => {
      categoryId = 'category123' as Id<'categories'>;
      ctx.db.insert('categories', {
        _id: categoryId,
        _creationTime: Date.now(),
        name: 'To Delete',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should delete category without children', async () => {
      const ctx = { db: t.db, auth: t.auth };
      await deleteCategoryHandler(ctx, {
        categoryId,
        userId,
      });

      const deleted = await t.db.get(categoryId);
      expect(deleted).toBeNull();
    });

    it('should reject deletion of category with children', async () => {
      // Create child category
      const childId = 'child123' as Id<'categories'>;
      ctx.db.insert('categories', {
        _id: childId,
        _creationTime: Date.now(),
        name: 'Child Category',
        organizationId: orgId,
        parentId: categoryId,
        level: 1,
        path: [categoryId],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ctx = { db: t.db, auth: t.auth };
      await expect(
        deleteCategoryHandler(ctx, {
          categoryId,
          userId,
        })
      ).rejects.toThrow('has child categories');
    });

    it('should reject deletion of category with products', async () => {
      // Create a product in this category
      const productId = 'product123' as Id<'products'>;
      ctx.db.insert('products', {
        _id: productId,
        _creationTime: Date.now(),
        title: 'Test Product',
        sku: 'TEST-001',
        handle: 'test-product',
        status: 'active',
        type: 'physical',
        organizationId: orgId,
        projectId: 'project123' as Id<'projects'>,
        categoryId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ctx = { db: t.db, auth: t.auth };
      await expect(
        deleteCategoryHandler(ctx, {
          categoryId,
          userId,
        })
      ).rejects.toThrow('has products');
    });
  });

  describe('getCategoryTree', () => {
    beforeEach(() => {
      // Create a category tree:
      // Electronics
      //   ├── Computers
      //   │   ├── Laptops
      //   │   └── Desktops
      //   └── Audio
      //       └── Headphones
      // Home & Garden

      const electronics = 'cat1' as Id<'categories'>;
      const computers = 'cat2' as Id<'categories'>;
      const laptops = 'cat3' as Id<'categories'>;
      const desktops = 'cat4' as Id<'categories'>;
      const audio = 'cat5' as Id<'categories'>;
      const headphones = 'cat6' as Id<'categories'>;
      const homeGarden = 'cat7' as Id<'categories'>;

      const categories = [
        { _id: electronics, name: 'Electronics', parentId: null, level: 0, path: [] },
        { _id: computers, name: 'Computers', parentId: electronics, level: 1, path: [electronics] },
        { _id: laptops, name: 'Laptops', parentId: computers, level: 2, path: [electronics, computers] },
        { _id: desktops, name: 'Desktops', parentId: computers, level: 2, path: [electronics, computers] },
        { _id: audio, name: 'Audio', parentId: electronics, level: 1, path: [electronics] },
        { _id: headphones, name: 'Headphones', parentId: audio, level: 2, path: [electronics, audio] },
        { _id: homeGarden, name: 'Home & Garden', parentId: null, level: 0, path: [] },
      ];

      categories.forEach(cat => {
        ctx.db.insert('categories', {
          ...cat,
          _creationTime: Date.now(),
          organizationId: orgId,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
    });

    it('should return full category tree', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await getCategoryTreeHandler(ctx, {
        organizationId: orgId,
        userId,
      });

      expect(result).toHaveLength(2); // Two root categories
      
      const electronics = result.find(c => c.name === 'Electronics');
      expect(electronics?.children).toHaveLength(2); // Computers and Audio
      
      const computers = electronics?.children?.find(c => c.name === 'Computers');
      expect(computers?.children).toHaveLength(2); // Laptops and Desktops
    });

    it('should exclude inactive categories', async () => {
      // Make Audio category inactive
      const audio = await t.db
        .query('categories')
        .filter(q => q.eq(q.field('name'), 'Audio'))
        .unique();
      
      if (audio) {
        t.db.patch(audio._id, { isActive: false });
      }

      const ctx = { db: t.db, auth: t.auth };
      const result = await getCategoryTreeHandler(ctx, {
        organizationId: orgId,
        includeInactive: false,
        userId,
      });

      const electronics = result.find(c => c.name === 'Electronics');
      expect(electronics?.children).toHaveLength(1); // Only Computers
      expect(electronics?.children?.[0].name).toBe('Computers');
    });

    it('should include inactive when requested', async () => {
      // Make a category inactive
      const audio = await t.db
        .query('categories')
        .filter(q => q.eq(q.field('name'), 'Audio'))
        .unique();
      
      if (audio) {
        t.db.patch(audio._id, { isActive: false });
      }

      const ctx = { db: t.db, auth: t.auth };
      const result = await getCategoryTreeHandler(ctx, {
        organizationId: orgId,
        includeInactive: true,
        userId,
      });

      const electronics = result.find(c => c.name === 'Electronics');
      expect(electronics?.children).toHaveLength(2); // Both Computers and Audio
    });
  });

  describe('getBreadcrumb', () => {
    let rootId: Id<'categories'>;
    let level1Id: Id<'categories'>;
    let level2Id: Id<'categories'>;

    beforeEach(() => {
      rootId = 'root123' as Id<'categories'>;
      level1Id = 'level1' as Id<'categories'>;
      level2Id = 'level2' as Id<'categories'>;

      // Create category hierarchy
      ctx.db.insert('categories', {
        _id: rootId,
        _creationTime: Date.now(),
        name: 'Electronics',
        organizationId: orgId,
        parentId: null,
        level: 0,
        path: [] as Id<'categories'>[],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ctx.db.insert('categories', {
        _id: level1Id,
        _creationTime: Date.now(),
        name: 'Computers',
        organizationId: orgId,
        parentId: rootId,
        level: 1,
        path: [rootId],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ctx.db.insert('categories', {
        _id: level2Id,
        _creationTime: Date.now(),
        name: 'Laptops',
        organizationId: orgId,
        parentId: level1Id,
        level: 2,
        path: [rootId, level1Id],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should return breadcrumb for leaf category', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await getBreadcrumbHandler(ctx, {
        categoryId: level2Id,
        userId,
      });

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Electronics');
      expect(result[1].name).toBe('Computers');
      expect(result[2].name).toBe('Laptops');
    });

    it('should return single item for root category', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await getBreadcrumbHandler(ctx, {
        categoryId: rootId,
        userId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
    });

    it('should return empty array for non-existent category', async () => {
      const ctx = { db: t.db, auth: t.auth };
      const result = await getBreadcrumbHandler(ctx, {
        categoryId: 'nonexistent' as Id<'categories'>,
        userId,
      });

      expect(result).toEqual([]);
    });
  });
});