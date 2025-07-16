import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { getUserAndVerifyEditPermissions, createAuditLog } from './helpers';

// Move category to new parent (reorder hierarchy)
export const moveCategory = mutation({
  args: {
    categoryId: v.id('categories'),
    newParentId: v.optional(v.id('categories')),
    newSortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { categoryId, newParentId, newSortOrder }) => {
    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error('Category not found');

    const { user } = await getUserAndVerifyEditPermissions(ctx, category.organizationId);

    // Prevent moving category to be its own child
    if (newParentId) {
      const newParent = await ctx.db.get(newParentId);
      if (!newParent) throw new Error('New parent category not found');

      if (newParent.path.startsWith(category.path)) {
        throw new Error('Cannot move category to be its own descendant');
      }
    }

    // Calculate new level and path
    let newLevel = 0;
    let newPath = '/' + category.handle;

    if (newParentId) {
      const newParent = await ctx.db.get(newParentId);
      if (newParent) {
        newLevel = newParent.level + 1;
        newPath = newParent.path + '/' + category.handle;
      }
    }

    // Calculate sort order if not provided
    let sortOrder = newSortOrder;
    if (sortOrder === undefined) {
      const siblings = await ctx.db
        .query('categories')
        .withIndex('by_parent', (q) =>
          q
            .eq('organizationId', category.organizationId)
            .eq('projectId', category.projectId)
            .eq('parentId', newParentId)
        )
        .collect();

      sortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;
    }

    const oldPath = category.path;
    const now = Date.now();

    // Update the category
    await ctx.db.patch(categoryId, {
      parentId: newParentId,
      level: newLevel,
      path: newPath,
      sortOrder,
      updatedAt: now,
      lastModifiedBy: user._id,
      version: category.version + 1,
    });

    // Update all child categories' paths and levels
    const childCategories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', category.organizationId).eq('projectId', category.projectId)
      )
      .filter((q) =>
        q.and(q.neq(q.field('_id'), categoryId), q.gte(q.field('level'), category.level + 1))
      )
      .collect();

    for (const child of childCategories) {
      if (child.path.startsWith(oldPath)) {
        const newChildPath = child.path.replace(oldPath, newPath);
        const levelDiff = newLevel - category.level;
        const newChildLevel = child.level + levelDiff;

        await ctx.db.patch(child._id, {
          path: newChildPath,
          level: newChildLevel,
          updatedAt: now,
          lastModifiedBy: user._id,
          version: child.version + 1,
        });
      }
    }

    // Create audit log
    await createAuditLog(ctx, {
      organizationId: category.organizationId,
      eventType: 'UPDATE',
      entityType: 'categories',
      entityId: categoryId,
      changes: [
        {
          field: 'parentId',
          oldValue: category.parentId,
          newValue: newParentId,
          changeType: 'modified',
        },
        {
          field: 'level',
          oldValue: category.level,
          newValue: newLevel,
          changeType: 'modified',
        },
        {
          field: 'path',
          oldValue: category.path,
          newValue: newPath,
          changeType: 'modified',
        },
      ],
      beforeSnapshot: category,
      context: {
        action: 'move_category',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        projectId: category.projectId,
        oldParentId: category.parentId,
        newParentId,
      },
      isRollbackable: true,
      rollbackData: category,
    });

    return categoryId;
  },
});
