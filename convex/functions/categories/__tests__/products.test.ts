import { describe, it, expect, beforeEach } from '@jest/globals';
import { t } from '../../../test.setup';
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
// Import the mutation objects to access their handlers
import { assignProductToCategory as assignProductToCategoryMutation, removeProductFromCategory as removeProductFromCategoryMutation } from '../products';

// Extract the handlers for use in tests
const assignProductToCategory = (ctx: any, args: any) => assignProductToCategoryMutation.handler(ctx, args);
const removeProductFromCategory = (ctx: any, args: any) => removeProductFromCategoryMutation.handler(ctx, args);
import { Id } from '../../../_generated/dataModel';

describe('Category Product Assignments', () => {
  let test: ConvexTestContext;
  let user: any;
  let org: any;
  let project: any;
  let membership: any;
  let category: any;
  let product: any;

  beforeEach(async () => {
    
    tes// t is already imported from test.setup
    
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
    category = createMockCategory({
      _id: 'category_1' as Id<'categories'>,
      organizationId: org._id,
      projectId: project._id,
      name: 'Electronics',
      handle: 'electronics',
    });
    product = createMockProduct({
      _id: 'product_1' as Id<'products'>,
      organizationId: org._id,
      projectId: project._id,
      title: 'Laptop',
      sku: 'LAPTOP-001',
      categories: [],
      version: 1,
    });

    await seedDatabase(test, {
      users: [user],
      organizations: [org],
      projects: [project],
      organizationMemberships: [membership],
      categories: [category],
      products: [product],
    });

    setupAuth(test, { tokenIdentifier: user.clerkId });
  });

  describe('assignProductToCategory', () => {
    describe('Happy Path', () => {
      it('should assign product to category with manual assignment', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        };

        // Act
        const assignmentId = await assignProductToCategory(ctx, args);

        // Assert
        expect(assignmentId).toBeDefined();
        expect(assignmentId).toMatch(/^categoryProductAssignments_\d+$/);

        // Verify assignment was created
        const assignments = getTableData(test, 'categoryProductAssignments');
        expect(assignments).toHaveLength(1);
        
        const assignment = assignments[0];
        expect(assignment).toMatchObject({
          _id: assignmentId,
          organizationId: org._id,
          projectId: project._id,
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual',
          status: 'active',
          assignedByUser: user._id,
        });

        // Verify product was updated
        const updatedProduct = await t.db.get(product._id);
        expect(updatedProduct.categories).toContain(category._id);
        expect(updatedProduct.version).toBe(2);
        expect(updatedProduct.lastModifiedBy).toBe(user._id);

        // Verify audit log
        const auditLogs = getTableData(test, 'auditLogs');
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          eventType: 'CREATE',
          entityType: 'categoryProductAssignments',
          entityId: assignmentId,
          metadata: {
            categoryId: category._id,
            productId: product._id,
          },
        });
      });

      it('should assign product with AI assignment details', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'ai' as const,
          confidence: 0.95,
          rationale: 'Product title contains "Laptop" which matches Electronics > Computers > Laptops category',
        };

        // Act
        const assignmentId = await assignProductToCategory(ctx, args);

        // Assert
        const assignment = await t.db.get(assignmentId);
        expect(assignment).toMatchObject({
          assignedBy: 'ai',
          confidence: 0.95,
          rationale: 'Product title contains "Laptop" which matches Electronics > Computers > Laptops category',
        });
      });

      it('should assign product with import assignment', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const args = {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'import' as const,
        };

        // Act
        const assignmentId = await assignProductToCategory(ctx, args);

        // Assert
        const assignment = await t.db.get(assignmentId);
        expect(assignment.assignedBy).toBe('import');
      });

      it('should handle product with existing categories', async () => {
        // Arrange
        const otherCategory = createMockCategory({
          _id: 'category_other' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
          name: 'Other',
        });
        
        product.categories = [otherCategory._id];
        await t.db.patch(product._id, { categories: [otherCategory._id] });
        
        await seedDatabase(test, { categories: [otherCategory] });
        
        const ctx = createMutationContext(test);

        // Act
        await assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        });

        // Assert
        const updatedProduct = await t.db.get(product._id);
        expect(updatedProduct.categories).toHaveLength(2);
        expect(updatedProduct.categories).toContain(otherCategory._id);
        expect(updatedProduct.categories).toContain(category._id);
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        })).rejects.toThrow('Unauthorized');
      });

      it('should fail for viewer role', async () => {
        // Arrange
        membership.role = 'viewer';
        await t.db.patch(membership._id, { role: 'viewer' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        })).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Validation', () => {
      it('should reject duplicate assignment', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        
        // First assignment
        await assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        });

        // Act & Assert - Second assignment should fail
        await expect(assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        })).rejects.toThrow('Product is already assigned to this category');
      });

      it('should allow assignment after previous removal', async () => {
        // Arrange
        // Create an inactive assignment
        await seedDatabase(test, {
          categoryProductAssignments: [{
            _id: 'assignment_old',
            _creationTime: Date.now(),
            organizationId: org._id,
            projectId: project._id,
            categoryId: category._id,
            productId: product._id,
            status: 'rejected',
            assignedBy: 'manual',
            assignedByUser: user._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }],
        });
        
        const ctx = createMutationContext(test);

        // Act
        const assignmentId = await assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'manual' as const,
        });

        // Assert
        expect(assignmentId).toBeDefined();
      });

      it('should fail for non-existent category', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(assignProductToCategory(ctx, {
          categoryId: 'category_nonexistent' as Id<'categories'>,
          productId: product._id,
          assignedBy: 'manual' as const,
        })).rejects.toThrow('Category not found');
      });

      it('should fail for non-existent product', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: 'product_nonexistent' as Id<'products'>,
          assignedBy: 'manual' as const,
        })).rejects.toThrow('Product not found');
      });
    });

    describe('Edge Cases', () => {
      it('should handle confidence score boundaries', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act - Test min confidence
        const assignment1 = await assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'ai' as const,
          confidence: 0,
        });

        // Create another product for max confidence test
        const product2 = createMockProduct({
          _id: 'product_2' as Id<'products'>,
          organizationId: org._id,
          projectId: project._id,
          categories: [],
        });
        await seedDatabase(test, { products: [product2] });

        const assignment2 = await assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product2._id,
          assignedBy: 'ai' as const,
          confidence: 1,
        });

        // Assert
        const a1 = await t.db.get(assignment1);
        const a2 = await t.db.get(assignment2);
        expect(a1.confidence).toBe(0);
        expect(a2.confidence).toBe(1);
      });

      it('should handle very long rationale', async () => {
        // Arrange
        const ctx = createMutationContext(test);
        const longRationale = 'A'.repeat(1000);

        // Act
        const assignmentId = await assignProductToCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
          assignedBy: 'ai' as const,
          rationale: longRationale,
        });

        // Assert
        const assignment = await t.db.get(assignmentId);
        expect(assignment.rationale).toBe(longRationale);
      });
    });
  });

  describe('removeProductFromCategory', () => {
    let assignmentId: string;

    beforeEach(async () => {
      // Create an active assignment
      const assignment = {
        _id: 'assignment_1',
        _creationTime: Date.now(),
        organizationId: org._id,
        projectId: project._id,
        categoryId: category._id,
        productId: product._id,
        status: 'active',
        assignedBy: 'manual' as const,
        assignedByUser: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await seedDatabase(test, {
        categoryProductAssignments: [assignment],
      });
      
      assignmentId = assignment._id;
      
      // Update product to have the category
      await t.db.patch(product._id, {
        categories: [category._id],
      });
    });

    describe('Happy Path', () => {
      it('should remove product from category', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        const result = await removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        });

        // Assert
        expect(result).toBe(assignmentId);
        
        // Verify assignment was soft deleted
        const assignment = await t.db.get(assignmentId);
        expect(assignment.status).toBe('rejected');
        
        // Verify product was updated
        const updatedProduct = await t.db.get(product._id);
        expect(updatedProduct.categories).not.toContain(category._id);
        expect(updatedProduct.version).toBe(2);
        
        // Verify audit log
        const auditLogs = getTableData(test, 'auditLogs');
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          eventType: 'DELETE',
          entityType: 'categoryProductAssignments',
          entityId: assignmentId,
          changes: [{
            field: 'status',
            oldValue: 'active',
            newValue: 'inactive',
            changeType: 'modified',
          }],
        });
      });

      it('should handle product with multiple categories', async () => {
        // Arrange
        const otherCategory = createMockCategory({
          _id: 'category_other' as Id<'categories'>,
          organizationId: org._id,
          projectId: project._id,
        });
        
        await seedDatabase(test, { categories: [otherCategory] });
        await t.db.patch(product._id, {
          categories: [category._id, otherCategory._id],
        });
        
        const ctx = createMutationContext(test);

        // Act
        await removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        });

        // Assert
        const updatedProduct = await t.db.get(product._id);
        expect(updatedProduct.categories).toHaveLength(1);
        expect(updatedProduct.categories).toContain(otherCategory._id);
        expect(updatedProduct.categories).not.toContain(category._id);
      });
    });

    describe('Authorization', () => {
      it('should fail for unauthenticated user', async () => {
        // Arrange
        setupAuth(test, null);
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        })).rejects.toThrow('Unauthorized');
      });

      it('should fail for viewer role', async () => {
        // Arrange
        membership.role = 'viewer';
        await t.db.patch(membership._id, { role: 'viewer' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        })).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Validation', () => {
      it('should fail if product is not assigned to category', async () => {
        // Arrange
        const otherProduct = createMockProduct({
          _id: 'product_other' as Id<'products'>,
          organizationId: org._id,
          projectId: project._id,
          categories: [],
        });
        
        await seedDatabase(test, { products: [otherProduct] });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: otherProduct._id,
        })).rejects.toThrow('Product is not assigned to this category');
      });

      it('should fail for already removed assignment', async () => {
        // Arrange
        await t.db.patch(assignmentId, { status: 'rejected' });
        
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        })).rejects.toThrow('Product is not assigned to this category');
      });

      it('should fail for non-existent category', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(removeProductFromCategory(ctx, {
          categoryId: 'category_nonexistent' as Id<'categories'>,
          productId: product._id,
        })).rejects.toThrow('Category not found');
      });

      it('should fail for non-existent product', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act & Assert
        await expect(removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: 'product_nonexistent' as Id<'products'>,
        })).rejects.toThrow('Product not found');
      });
    });

    describe('Edge Cases', () => {
      it('should handle removing last category from product', async () => {
        // Arrange
        const ctx = createMutationContext(test);

        // Act
        await removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        });

        // Assert
        const updatedProduct = await t.db.get(product._id);
        expect(updatedProduct.categories).toEqual([]);
      });

      it('should preserve other assignment metadata', async () => {
        // Arrange
        const originalAssignment = await t.db.get(assignmentId);
        originalAssignment.confidence = 0.95;
        originalAssignment.rationale = 'AI assigned';
        await t.db.patch(assignmentId, {
          confidence: 0.95,
          rationale: 'AI assigned',
        });
        
        const ctx = createMutationContext(test);

        // Act
        await removeProductFromCategory(ctx, {
          categoryId: category._id,
          productId: product._id,
        });

        // Assert
        const updatedAssignment = await t.db.get(assignmentId);
        expect(updatedAssignment.confidence).toBe(0.95);
        expect(updatedAssignment.rationale).toBe('AI assigned');
        expect(updatedAssignment.status).toBe('rejected');
      });
    });
  });
});