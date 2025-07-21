/**
 * Handler functions for category mutations
 * These functions contain the business logic that can be tested directly
 */

import { MutationCtx } from '../../../_generated/server';
import { Doc, Id } from '../../../_generated/dataModel';
import {
  generateHandle,
} from '../helpers';
import { getUserAndVerifyEditPermissions, getUserAndVerifyDeletePermissions } from '../../auth/permissions';
import { createAuditLog } from '../../auditLogs/mutations';

export async function createCategoryHandler(
  ctx: MutationCtx,
  args: {
    organizationId: Id<'organizations'>;
    projectId: Id<'projects'>;
    name: string;
    description?: string;
    handle?: string;
    parentId?: Id<'categories'>;
    color?: string;
    icon?: string;
    seoTitle?: string;
    seoDescription?: string;
    metadata?: any;
    sortOrder?: number;
  }
): Promise<Id<'categories'>> {
  const { user } = await getUserAndVerifyEditPermissions(ctx, args.organizationId);

  // Determine level and path
  let level = 0;
  let path = '';
  let parentCategory: Doc<'categories'> | null = null;

  if (args.parentId) {
    parentCategory = await ctx.db.get(args.parentId);
    if (!parentCategory) throw new Error('Parent category not found');

    level = parentCategory.level + 1;
    path = parentCategory.path;
  }

  // Generate handle if not provided
  const handle = args.handle || generateHandle(args.name);

  // Check if handle is unique within the project
  const existingCategory = await ctx.db
    .query('categories')
    .withIndex('by_handle', (q) =>
      q
        .eq('organizationId', args.organizationId)
        .eq('projectId', args.projectId)
        .eq('handle', handle)
    )
    .unique();

  if (existingCategory) {
    throw new Error('Category handle already exists in this project');
  }

  // Build full path
  const fullPath = path + '/' + handle;

  // Determine sort order
  let sortOrder = args.sortOrder;
  if (sortOrder === undefined) {
    const siblings = await ctx.db
      .query('categories')
      .withIndex('by_parent', (q) =>
        q
          .eq('organizationId', args.organizationId)
          .eq('projectId', args.projectId)
          .eq('parentId', args.parentId)
      )
      .collect();
    
    sortOrder = siblings.length > 0 
      ? Math.max(...siblings.map(s => s.sortOrder || 0)) + 1 
      : 0;
  }

  const now = Date.now();
  const categoryId = await ctx.db.insert('categories', {
    organizationId: args.organizationId,
    projectId: args.projectId,
    name: args.name,
    description: args.description || '',
    handle,
    parentId: args.parentId,
    level,
    path: fullPath,
    color: args.color || '#000000',
    icon: args.icon || 'folder',
    seoTitle: args.seoTitle || args.name,
    seoDescription: args.seoDescription || args.description || '',
    metadata: args.metadata || {},
    sortOrder,
    isVisible: true,
    status: 'active',
    createdBy: user._id,
    lastModifiedBy: user._id,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  await createAuditLog(ctx, {
    organizationId: args.organizationId,
    eventType: 'CREATE',
    entityType: 'categories',
    entityId: categoryId,
    changes: [],
    context: {
      action: 'createCategory',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      categoryName: args.name,
      parentId: args.parentId,
    },
  });

  return categoryId;
}

export async function updateCategoryHandler(
  ctx: MutationCtx,
  args: {
    categoryId: Id<'categories'>;
    name?: string;
    description?: string;
    handle?: string;
    color?: string;
    icon?: string;
    seoTitle?: string;
    seoDescription?: string;
    metadata?: any;
    sortOrder?: number;
    isVisible?: boolean;
  }
): Promise<Id<'categories'>> {
  const category = await ctx.db.get(args.categoryId);
  if (!category) throw new Error('Category not found');

  const { user } = await getUserAndVerifyEditPermissions(ctx, category.organizationId);

  const changes: any[] = [];
  const updateFields: any = {
    lastModifiedBy: user._id,
    updatedAt: Date.now(),
    version: category.version + 1,
  };

  // Track changes for audit
  if (args.name !== undefined && args.name !== category.name) {
    changes.push({
      field: 'name',
      oldValue: category.name,
      newValue: args.name,
      changeType: 'modified',
    });
    updateFields.name = args.name;
  }

  if (args.description !== undefined && args.description !== category.description) {
    changes.push({
      field: 'description',
      oldValue: category.description,
      newValue: args.description,
      changeType: 'modified',
    });
    updateFields.description = args.description;
  }

  if (args.handle !== undefined && args.handle !== category.handle) {
    // Check if new handle is unique
    const existingCategory = await ctx.db
      .query('categories')
      .withIndex('by_handle', (q) =>
        q
          .eq('organizationId', category.organizationId)
          .eq('projectId', category.projectId)
          .eq('handle', args.handle)
      )
      .filter((q) => q.neq(q.field('_id'), args.categoryId))
      .unique();

    if (existingCategory) {
      throw new Error('Category handle already exists in this project');
    }

    changes.push({
      field: 'handle',
      oldValue: category.handle,
      newValue: args.handle,
      changeType: 'modified',
    });
    updateFields.handle = args.handle;

    // Update path
    const newPath = category.parentId 
      ? (await ctx.db.get(category.parentId))!.path + '/' + args.handle
      : '/' + args.handle;
    
    updateFields.path = newPath;

    // Update children paths
    await updateChildrenPaths(ctx, category._id, category.path, newPath);
  }

  // Update other fields
  ['color', 'icon', 'seoTitle', 'seoDescription', 'metadata', 'sortOrder', 'isVisible'].forEach(field => {
    if ((args as any)[field] !== undefined && (args as any)[field] !== (category as any)[field]) {
      changes.push({
        field,
        oldValue: (category as any)[field],
        newValue: (args as any)[field],
        changeType: 'modified',
      });
      updateFields[field] = (args as any)[field];
    }
  });

  await ctx.db.patch(args.categoryId, updateFields);

  await createAuditLog(ctx, {
    organizationId: category.organizationId,
    eventType: 'UPDATE',
    entityType: 'categories',
    entityId: args.categoryId,
    changes,
    beforeSnapshot: category,
    context: {
      action: 'updateCategory',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
  });

  return args.categoryId;
}

export async function deleteCategoryHandler(
  ctx: MutationCtx,
  args: {
    categoryId: Id<'categories'>;
  }
): Promise<Id<'categories'>> {
  const category = await ctx.db.get(args.categoryId);
  if (!category) throw new Error('Category not found');

  const { user } = await getUserAndVerifyDeletePermissions(ctx, category.organizationId);

  // Check for children
  const children = await ctx.db
    .query('categories')
    .withIndex('by_parent', (q) =>
      q
        .eq('organizationId', category.organizationId)
        .eq('projectId', category.projectId)
        .eq('parentId', args.categoryId)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  if (children.length > 0) {
    throw new Error('Cannot delete category with active children');
  }

  // Check for assigned products
  const assignments = await ctx.db
    .query('categoryProductAssignments')
    .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId))
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  if (assignments.length > 0) {
    throw new Error('Cannot delete category with assigned products');
  }

  // Soft delete
  await ctx.db.patch(args.categoryId, {
    status: 'archived',
    lastModifiedBy: user._id,
    updatedAt: Date.now(),
    version: category.version + 1,
  });

  await createAuditLog(ctx, {
    organizationId: category.organizationId,
    eventType: 'DELETE',
    entityType: 'categories',
    entityId: args.categoryId,
    changes: [{
      field: 'status',
      oldValue: 'active',
      newValue: 'archived',
      changeType: 'modified',
    }],
    beforeSnapshot: category,
    context: {
      action: 'deleteCategory',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    isRollbackable: true,
    rollbackData: category,
  });

  return args.categoryId;
}

async function updateChildrenPaths(
  ctx: MutationCtx,
  parentId: Id<'categories'>,
  oldPath: string,
  newPath: string
): Promise<void> {
  const children = await ctx.db
    .query('categories')
    .filter((q) => 
      q.and(
        q.eq(q.field('parentId'), parentId),
        q.eq(q.field('status'), 'active')
      )
    )
    .collect();

  for (const child of children) {
    const childNewPath = child.path.replace(oldPath, newPath);
    await ctx.db.patch(child._id, {
      path: childNewPath,
      updatedAt: Date.now(),
      version: child.version + 1,
    });

    // Recursively update children
    await updateChildrenPaths(ctx, child._id, child.path, childNewPath);
  }
}