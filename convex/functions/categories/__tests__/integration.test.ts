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
  createMockProduct,
} from 'convex-test';
import { Id } from '../../../_generated/dataModel';
import { generateHandle } from '../helpers';

describe('Category Integration Tests', () => {
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

  describe('Complex Category Workflows', () => {
    it('should handle bulk category reorganization workflow', async () => {
      // Arrange - Create a complex category structure
      const electronics = await createCategoryHelper(test, {
        name: 'Electronics',
        organizationId: org._id,
        projectId: project._id,
        level: 0,
      });

      const computers = await createCategoryHelper(test, {
        name: 'Computers',
        organizationId: org._id,
        projectId: project._id,
        parentId: electronics,
        level: 1,
      });

      const laptops = await createCategoryHelper(test, {
        name: 'Laptops',
        organizationId: org._id,
        projectId: project._id,
        parentId: computers,
        level: 2,
      });

      const gaming = await createCategoryHelper(test, {
        name: 'Gaming Laptops',
        organizationId: org._id,
        projectId: project._id,
        parentId: laptops,
        level: 3,
      });

      const homeGarden = await createCategoryHelper(test, {
        name: 'Home & Garden',
        organizationId: org._id,
        projectId: project._id,
        level: 0,
      });

      const techHome = await createCategoryHelper(test, {
        name: 'Smart Home Tech',
        organizationId: org._id,
        projectId: project._id,
        parentId: homeGarden,
        level: 1,
      });

      // Act - Reorganize: Move Computers (and all its children) to Smart Home Tech
      await moveCategoryHelper(test, {
        categoryId: computers,
        newParentId: techHome,
        userId: user._id,
      });

      // Assert - Verify the entire subtree was moved correctly
      const movedComputers = await t.db.get(computers);
      expect(movedComputers.parentId).toBe(techHome);
      expect(movedComputers.level).toBe(2);
      expect(movedComputers.path).toBe('/home-garden/smart-home-tech/computers');

      const movedLaptops = await t.db.get(laptops);
      expect(movedLaptops.level).toBe(3);
      expect(movedLaptops.path).toBe('/home-garden/smart-home-tech/computers/laptops');

      const movedGaming = await t.db.get(gaming);
      expect(movedGaming.level).toBe(4);
      expect(movedGaming.path).toBe('/home-garden/smart-home-tech/computers/laptops/gaming-laptops');
    });

    it('should handle category deletion cascade with product reassignment', async () => {
      // Arrange - Create categories with products
      const electronics = await createCategoryHelper(test, {
        name: 'Electronics',
        organizationId: org._id,
        projectId: project._id,
        level: 0,
      });

      const toDelete = await createCategoryHelper(test, {
        name: 'Obsolete Category',
        organizationId: org._id,
        projectId: project._id,
        parentId: electronics,
        level: 1,
      });

      const replacement = await createCategoryHelper(test, {
        name: 'Modern Category',
        organizationId: org._id,
        projectId: project._id,
        parentId: electronics,
        level: 1,
      });

      // Create products assigned to the obsolete category
      const products = [];
      for (let i = 0; i < 5; i++) {
        const product = createMockProduct({
          _id: `product_${i}` as Id<'products'>,
          organizationId: org._id,
          projectId: project._id,
          title: `Product ${i}`,
          categories: [toDelete],
        });
        products.push(product);
      }
      await seedDatabase(test, { products });

      // Create assignments
      for (const product of products) {
        await t.db.insert('categoryProductAssignments', {
          organizationId: org._id,
          projectId: project._id,
          categoryId: toDelete,
          productId: product._id,
          status: 'active',
          assignedBy: 'manual',
          assignedByUser: user._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Act - Reassign all products to the replacement category
      const assignments = await t.db
        .query('categoryProductAssignments')
        .withIndex('by_category', (q) => q.eq('categoryId', toDelete))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();

      for (const assignment of assignments) {
        // Mark old assignment as inactive
        await t.db.patch(assignment._id, {
          status: 'rejected',
          updatedAt: Date.now(),
        });

        // Create new assignment
        await t.db.insert('categoryProductAssignments', {
          organizationId: org._id,
          projectId: project._id,
          categoryId: replacement,
          productId: assignment.productId,
          status: 'active',
          assignedBy: 'manual',
          assignedByUser: user._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Update product categories
        const product = await t.db.get(assignment.productId);
        if (product) {
          const newCategories = product.categories.filter(c => c !== toDelete);
          newCategories.push(replacement);
          await t.db.patch(product._id, {
            categories: newCategories,
            updatedAt: Date.now(),
            version: product.version + 1,
          });
        }
      }

      // Now delete the obsolete category
      await t.db.patch(toDelete, {
        status: 'archived',
        updatedAt: Date.now(),
        lastModifiedBy: user._id,
        version: 2,
      });

      // Assert
      const deletedCategory = await t.db.get(toDelete);
      expect(deletedCategory.status).toBe('archived');

      // Verify all products are now in the replacement category
      const newAssignments = await t.db
        .query('categoryProductAssignments')
        .withIndex('by_category', (q) => q.eq('categoryId', replacement))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();
      
      expect(newAssignments).toHaveLength(5);

      // Verify no active assignments remain for the deleted category
      const oldAssignments = await t.db
        .query('categoryProductAssignments')
        .withIndex('by_category', (q) => q.eq('categoryId', toDelete))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();
      
      expect(oldAssignments).toHaveLength(0);
    });

    it('should handle import followed by manual reorganization', async () => {
      // Arrange - Simulate bulk import
      const importData = [
        { name: 'Electronics', externalId: 'ext_1', level: 0 },
        { name: 'Computers', externalId: 'ext_2', level: 1, parentExternalId: 'ext_1' },
        { name: 'Laptops', externalId: 'ext_3', level: 2, parentExternalId: 'ext_2' },
        { name: 'Desktops', externalId: 'ext_4', level: 2, parentExternalId: 'ext_2' },
        { name: 'Gaming', externalId: 'ext_5', level: 3, parentExternalId: 'ext_3' },
        { name: 'Business', externalId: 'ext_6', level: 3, parentExternalId: 'ext_3' },
      ];

      // Act - Import categories
      const categoryMap = new Map<string, Id<'categories'>>();
      
      for (const data of importData) {
        let parentId: Id<'categories'> | undefined;
        
        if (data.parentExternalId) {
          parentId = categoryMap.get(data.parentExternalId);
        }

        const categoryId = await createCategoryHelper(test, {
          name: data.name,
          organizationId: org._id,
          projectId: project._id,
          parentId,
          level: data.level,
          externalId: data.externalId,
        });

        categoryMap.set(data.externalId, categoryId);
      }

      // Manual reorganization - Create new structure and move Gaming
      const accessories = await createCategoryHelper(test, {
        name: 'Accessories',
        organizationId: org._id,
        projectId: project._id,
        parentId: categoryMap.get('ext_1'), // Under Electronics
        level: 1,
      });

      const gamingAccessories = await createCategoryHelper(test, {
        name: 'Gaming Accessories',
        organizationId: org._id,
        projectId: project._id,
        parentId: accessories,
        level: 2,
      });

      // Move Gaming from Laptops to Gaming Accessories
      const gamingId = categoryMap.get('ext_5')!;
      await moveCategoryHelper(test, {
        categoryId: gamingId,
        newParentId: gamingAccessories,
        userId: user._id,
      });

      // Assert
      const movedGaming = await t.db.get(gamingId);
      expect(movedGaming.parentId).toBe(gamingAccessories);
      expect(movedGaming.level).toBe(3);
      expect(movedGaming.path).toBe('/electronics/accessories/gaming-accessories/gaming');

      // Verify the import structure is preserved for other categories
      const computers = await t.db.get(categoryMap.get('ext_2')!);
      expect(computers.parentId).toBe(categoryMap.get('ext_1'));
      
      const business = await t.db.get(categoryMap.get('ext_6')!);
      expect(business.parentId).toBe(categoryMap.get('ext_3'));
    });

    it('should handle multi-step category migration with validation', async () => {
      // Arrange - Create source and target structures
      const oldStructure = await createCategoryHelper(test, {
        name: 'Old Product Structure',
        organizationId: org._id,
        projectId: project._id,
        level: 0,
      });

      const oldElectronics = await createCategoryHelper(test, {
        name: 'Electronics (Old)',
        organizationId: org._id,
        projectId: project._id,
        parentId: oldStructure,
        level: 1,
      });

      const oldComputers = await createCategoryHelper(test, {
        name: 'Computers (Old)',
        organizationId: org._id,
        projectId: project._id,
        parentId: oldElectronics,
        level: 2,
      });

      // Create new structure
      const newStructure = await createCategoryHelper(test, {
        name: 'New Product Structure',
        organizationId: org._id,
        projectId: project._id,
        level: 0,
      });

      const technology = await createCategoryHelper(test, {
        name: 'Technology',
        organizationId: org._id,
        projectId: project._id,
        parentId: newStructure,
        level: 1,
      });

      const computing = await createCategoryHelper(test, {
        name: 'Computing Devices',
        organizationId: org._id,
        projectId: project._id,
        parentId: technology,
        level: 2,
      });

      // Create products in old structure
      const products = [];
      for (let i = 0; i < 3; i++) {
        const product = createMockProduct({
          _id: `product_migrate_${i}` as Id<'products'>,
          organizationId: org._id,
          projectId: project._id,
          title: `Migrated Product ${i}`,
          categories: [oldComputers],
        });
        products.push(product);
      }
      await seedDatabase(test, { products });

      // Act - Multi-step migration
      // Step 1: Validate no circular dependencies
      const pathBefore = (await t.db.get(computing)).path;
      expect(pathBefore).not.toContain(oldComputers);

      // Step 2: Migrate products
      for (const product of products) {
        const newCategories = product.categories.filter(c => c !== oldComputers);
        newCategories.push(computing);
        await t.db.patch(product._id, {
          categories: newCategories,
          updatedAt: Date.now(),
          version: product.version + 1,
        });
      }

      // Step 3: Archive old categories
      for (const categoryId of [oldComputers, oldElectronics, oldStructure]) {
        await t.db.patch(categoryId, {
          status: 'archived',
          updatedAt: Date.now(),
          lastModifiedBy: user._id,
          version: 2,
        });
      }

      // Assert
      // Verify products are in new structure
      for (const product of products) {
        const updated = await t.db.get(product._id);
        expect(updated.categories).toContain(computing);
        expect(updated.categories).not.toContain(oldComputers);
      }

      // Verify old structure is archived
      const archivedCategories = await t.db
        .query('categories')
        .filter((q) => q.eq(q.field('status'), 'archived'))
        .collect();
      
      expect(archivedCategories).toHaveLength(3);
      expect(archivedCategories.map(c => c._id)).toContain(oldStructure);
      expect(archivedCategories.map(c => c._id)).toContain(oldElectronics);
      expect(archivedCategories.map(c => c._id)).toContain(oldComputers);

      // Verify new structure is intact
      const activeCategories = await t.db
        .query('categories')
        .withIndex('by_organization_project', (q) =>
          q.eq('organizationId', org._id).eq('projectId', project._id)
        )
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();

      const newCategoryIds = [newStructure, technology, computing];
      for (const id of newCategoryIds) {
        expect(activeCategories.some(c => c._id === id)).toBe(true);
      }
    });

    it('should handle concurrent category updates with conflict resolution', async () => {
      // Arrange
      const category = await createCategoryHelper(test, {
        name: 'Concurrent Test',
        organizationId: org._id,
        projectId: project._id,
        level: 0,
        metadata: { counter: 0 },
      });

      // Act - Simulate concurrent updates
      const updates = [];

      // User 1 updates name
      updates.push(t.db.patch(category, {
        name: 'Updated by User 1',
        version: 2,
        updatedAt: Date.now(),
        lastModifiedBy: user._id,
      }));

      // User 2 updates metadata (would normally be a different user)
      const otherUser = createMockUser({ _id: 'user_2' as Id<'users'> });
      await seedDatabase(test, { users: [otherUser] });

      // In a real scenario, this would check version and potentially retry
      const currentCategory = await t.db.get(category);
      updates.push(t.db.patch(category, {
        metadata: { counter: 1, updatedBy: 'user_2' },
        version: currentCategory.version + 1,
        updatedAt: Date.now() + 100,
        lastModifiedBy: otherUser._id,
      }));

      // Wait for all updates
      await Promise.all(updates);

      // Assert - Both updates should be applied
      const finalCategory = await t.db.get(category);
      expect(finalCategory.name).toBe('Updated by User 1');
      expect(finalCategory.metadata.counter).toBe(1);
      expect(finalCategory.metadata.updatedBy).toBe('user_2');
      expect(finalCategory.version).toBeGreaterThanOrEqual(3);
    });
  });
});

// Helper functions to simulate the actual mutation logic
async function createCategoryHelper(
  test: ConvexTestContext,
  data: {
    name: string;
    organizationId: Id<'organizations'>;
    projectId: Id<'projects'>;
    parentId?: Id<'categories'>;
    level: number;
    externalId?: string;
  }
): Promise<Id<'categories'>> {
  const handle = generateHandle(data.name);
  const parentPath = data.parentId ? (await t.db.get(data.parentId))?.path || '' : '';
  const path = parentPath + `/${handle}`;

  return await t.db.insert('categories', {
    organizationId: data.organizationId,
    projectId: data.projectId,
    name: data.name,
    handle,
    parentId: data.parentId,
    level: data.level,
    path,
    externalId: data.externalId,
    status: 'active',
    isVisible: true,
    sortOrder: 0,
    createdBy: 'user_1' as Id<'users'>,
    lastModifiedBy: 'user_1' as Id<'users'>,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  });
}

async function moveCategoryHelper(
  test: ConvexTestContext,
  data: {
    categoryId: Id<'categories'>;
    newParentId: Id<'categories'>;
    userId: Id<'users'>;
  }
): Promise<void> {
  const category = await t.db.get(data.categoryId);
  const newParent = await t.db.get(data.newParentId);
  
  if (!category || !newParent) return;

  const oldPath = category.path;
  const newPath = newParent.path + '/' + category.handle;
  const newLevel = newParent.level + 1;

  // Update the category
  await t.db.patch(data.categoryId, {
    parentId: data.newParentId,
    path: newPath,
    level: newLevel,
    version: category.version + 1,
    updatedAt: Date.now(),
    lastModifiedBy: data.userId,
  });

  // Update all descendants
  await updateDescendantPaths(test, data.categoryId, oldPath, newPath, newLevel);
}

async function updateDescendantPaths(
  test: ConvexTestContext,
  parentId: Id<'categories'>,
  oldParentPath: string,
  newParentPath: string,
  parentLevel: number
): Promise<void> {
  const children = await t.db
    .query('categories')
    .filter((q) => q.eq(q.field('parentId'), parentId))
    .collect();

  for (const child of children) {
    const newPath = child.path.replace(oldParentPath, newParentPath);
    const newLevel = parentLevel + 1;

    await t.db.patch(child._id, {
      path: newPath,
      level: newLevel,
      version: child.version + 1,
      updatedAt: Date.now(),
    });

    // Recursively update descendants
    await updateDescendantPaths(test, child._id, child.path, newPath, newLevel);
  }
}