import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { getUserAndVerifyEditPermissions, createAuditLog } from './helpers';

// Assign product to category
export const assignProductToCategory = mutation({
  args: {
    categoryId: v.id('categories'),
    productId: v.id('products'),
    assignedBy: v.union(v.literal('manual'), v.literal('ai'), v.literal('import')),
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    const product = await ctx.db.get(args.productId);

    if (!category) throw new Error('Category not found');
    if (!product) throw new Error('Product not found');

    const { user } = await getUserAndVerifyEditPermissions(ctx, category.organizationId);

    // Check if assignment already exists
    const existingAssignment = await ctx.db
      .query('categoryProductAssignments')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', category.organizationId).eq('projectId', category.projectId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('categoryId'), args.categoryId),
          q.eq(q.field('productId'), args.productId),
          q.eq(q.field('status'), 'active')
        )
      )
      .unique();

    if (existingAssignment) {
      throw new Error('Product is already assigned to this category');
    }

    const now = Date.now();
    const assignmentId = await ctx.db.insert('categoryProductAssignments', {
      organizationId: category.organizationId,
      projectId: category.projectId,
      categoryId: args.categoryId,
      productId: args.productId,
      assignedBy: args.assignedBy,
      confidence: args.confidence,
      rationale: args.rationale,
      status: 'active',
      assignedByUser: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Update product's categories array
    const updatedCategories = [...product.categories, args.categoryId];
    await ctx.db.patch(args.productId, {
      categories: updatedCategories,
      updatedAt: now,
      lastModifiedBy: user._id,
      version: product.version + 1,
    });

    // Create audit log
    await createAuditLog(ctx, {
      organizationId: category.organizationId,
      eventType: 'CREATE',
      entityType: 'categoryProductAssignments',
      entityId: assignmentId,
      changes: [
        {
          field: '*',
          oldValue: null,
          newValue: args,
          changeType: 'added',
        },
      ],
      context: {
        action: 'assign_product_to_category',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        projectId: category.projectId,
        categoryId: args.categoryId,
        productId: args.productId,
      },
      isRollbackable: true,
    });

    return assignmentId;
  },
});

// Remove product from category
export const removeProductFromCategory = mutation({
  args: {
    categoryId: v.id('categories'),
    productId: v.id('products'),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    const product = await ctx.db.get(args.productId);

    if (!category) throw new Error('Category not found');
    if (!product) throw new Error('Product not found');

    const { user } = await getUserAndVerifyEditPermissions(ctx, category.organizationId);

    // Find the assignment
    const assignment = await ctx.db
      .query('categoryProductAssignments')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', category.organizationId).eq('projectId', category.projectId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('categoryId'), args.categoryId),
          q.eq(q.field('productId'), args.productId),
          q.eq(q.field('status'), 'active')
        )
      )
      .unique();

    if (!assignment) {
      throw new Error('Product is not assigned to this category');
    }

    const now = Date.now();

    // Soft delete the assignment - mark as rejected
    await ctx.db.patch(assignment._id, {
      status: 'rejected',
      updatedAt: now,
    });

    // Update product's categories array
    const updatedCategories = product.categories.filter((catId) => catId !== args.categoryId);
    await ctx.db.patch(args.productId, {
      categories: updatedCategories,
      updatedAt: now,
      lastModifiedBy: user._id,
      version: product.version + 1,
    });

    // Create audit log
    await createAuditLog(ctx, {
      organizationId: category.organizationId,
      eventType: 'DELETE',
      entityType: 'categoryProductAssignments',
      entityId: assignment._id,
      changes: [
        {
          field: 'status',
          oldValue: 'active',
          newValue: 'inactive',
          changeType: 'modified',
        },
      ],
      beforeSnapshot: assignment,
      context: {
        action: 'remove_product_from_category',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        projectId: category.projectId,
        categoryId: args.categoryId,
        productId: args.productId,
      },
      isRollbackable: true,
      rollbackData: assignment,
    });

    return assignment._id;
  },
});
