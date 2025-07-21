import { Doc, Id } from '../../../_generated/dataModel';
import { MutationCtx } from '../../../_generated/server';
import {
  getUserAndVerifyEditPermissions,
  getUserAndVerifyDeletePermissions,
  generateHandle,
  createAuditLog,
} from '../helpers';

interface CreateCategoryArgs {
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
  metadata: any;
  sortOrder?: number;
}

export async function createCategoryHandler(
  ctx: MutationCtx,
  args: CreateCategoryArgs
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

    sortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;
  }

  const now = Date.now();
  const categoryId = await ctx.db.insert('categories', {
    organizationId: args.organizationId,
    projectId: args.projectId,
    name: args.name,
    description: args.description,
    handle,
    parentId: args.parentId,
    level,
    path: fullPath,
    sortOrder,
    color: args.color,
    icon: args.icon,
    seoTitle: args.seoTitle,
    seoDescription: args.seoDescription,
    status: 'active',
    isVisible: true,
    metadata: args.metadata || {},
    version: 1,
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
    lastModifiedBy: user._id,
  });

  // Create audit log
  await createAuditLog(ctx, {
    organizationId: args.organizationId,
    eventType: 'CREATE',
    entityType: 'categories',
    entityId: categoryId,
    changes: [
      {
        field: '*',
        oldValue: null,
        newValue: args,
        changeType: 'added',
      },
    ],
    context: {
      action: 'create_category',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    metadata: { projectId: args.projectId, parentId: args.parentId },
    isRollbackable: true,
  });

  return categoryId;
}

interface UpdateCategoryArgs {
  categoryId: Id<'categories'>;
  name?: string;
  description?: string;
  handle?: string;
  color?: string;
  icon?: string;
  seoTitle?: string;
  seoDescription?: string;
  metadata?: any;
  isVisible?: boolean;
}

export async function updateCategoryHandler(
  ctx: MutationCtx,
  args: UpdateCategoryArgs
): Promise<Id<'categories'>> {
  const category = await ctx.db.get(args.categoryId);
  if (!category) throw new Error('Category not found');

  const { user } = await getUserAndVerifyEditPermissions(ctx, category.organizationId);

  // Track changes for audit log
  const changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'modified' | 'removed';
  }> = [];

  const { categoryId, ...updates } = args;

  // Check handle uniqueness if handle is being changed
  if (args.handle && args.handle !== category.handle) {
    const existingCategory = await ctx.db
      .query('categories')
      .withIndex('by_handle', (q) =>
        q
          .eq('organizationId', category.organizationId)
          .eq('projectId', category.projectId)
          .eq('handle', args.handle!)
      )
      .unique();

    if (existingCategory) {
      throw new Error('Category handle already exists in this project');
    }

    // Update path if handle changed
    const oldPath = category.path;
    const newPath = oldPath.replace(category.handle, args.handle);
    (updates as any).path = newPath;

    // Update paths of all child categories
    const childCategories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', category.organizationId).eq('projectId', category.projectId)
      )
      .filter((q) =>
        q.and(q.neq(q.field('_id'), args.categoryId), q.gte(q.field('level'), category.level + 1))
      )
      .collect();

    for (const child of childCategories) {
      if (child.path.startsWith(oldPath)) {
        const newChildPath = child.path.replace(oldPath, newPath);
        await ctx.db.patch(child._id, {
          path: newChildPath,
          updatedAt: Date.now(),
          lastModifiedBy: user._id,
          version: child.version + 1,
        });
      }
    }
  }

  // Track changes
  Object.entries(updates).forEach(([field, newValue]) => {
    if (newValue !== undefined) {
      const oldValue = (category as any)[field];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
          changeType: oldValue === undefined ? 'added' : 'modified',
        });
      }
    }
  });

  if (changes.length === 0) {
    return args.categoryId; // No changes to make
  }

  const now = Date.now();
  await ctx.db.patch(args.categoryId, {
    ...updates,
    version: category.version + 1,
    updatedAt: now,
    lastModifiedBy: user._id,
  });

  // Create audit log
  await createAuditLog(ctx, {
    organizationId: category.organizationId,
    eventType: 'UPDATE',
    entityType: 'categories',
    entityId: args.categoryId,
    changes,
    beforeSnapshot: category,
    context: {
      action: 'update_category',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    metadata: { projectId: category.projectId },
    isRollbackable: true,
    rollbackData: category,
  });

  return args.categoryId;
}

interface DeleteCategoryArgs {
  categoryId: Id<'categories'>;
}

export async function deleteCategoryHandler(
  ctx: MutationCtx,
  args: DeleteCategoryArgs
): Promise<Id<'categories'>> {
  const { categoryId } = args;
  const category = await ctx.db.get(categoryId);
  if (!category) throw new Error('Category not found');

  const { user } = await getUserAndVerifyDeletePermissions(ctx, category.organizationId);

  // Check if category has children
  const childCategories = await ctx.db
    .query('categories')
    .withIndex('by_parent', (q) =>
      q
        .eq('organizationId', category.organizationId)
        .eq('projectId', category.projectId)
        .eq('parentId', categoryId)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  if (childCategories.length > 0) {
    throw new Error(
      'Cannot delete category with child categories. Move or delete children first.'
    );
  }

  // Check if category has assigned products
  const productAssignments = await ctx.db
    .query('categoryProductAssignments')
    .withIndex('by_category', (q) => q.eq('categoryId', categoryId))
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  if (productAssignments.length > 0) {
    throw new Error(
      'Cannot delete category with assigned products. Remove product assignments first.'
    );
  }

  const now = Date.now();
  await ctx.db.patch(categoryId, {
    status: 'archived',
    updatedAt: now,
    lastModifiedBy: user._id,
    version: category.version + 1,
  });

  // Create audit log
  await createAuditLog(ctx, {
    organizationId: category.organizationId,
    eventType: 'DELETE',
    entityType: 'categories',
    entityId: categoryId,
    changes: [
      {
        field: 'status',
        oldValue: category.status,
        newValue: 'archived',
        changeType: 'modified',
      },
    ],
    beforeSnapshot: category,
    context: {
      action: 'delete_category',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    metadata: { projectId: category.projectId },
    isRollbackable: true,
    rollbackData: category,
  });

  return categoryId;
}