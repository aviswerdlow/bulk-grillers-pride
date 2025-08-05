import { v } from 'convex/values';
import { query, internalQuery } from '../../_generated/server';
import { Doc } from '../../_generated/dataModel';
import { getUserAndVerifyAccess } from './helpers';

// Get all categories for a project in hierarchical structure
export const getProjectCategories = Object.assign(query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    parentId: v.optional(v.id('categories')),
    level: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, projectId, parentId, level }) => {
    await getUserAndVerifyAccess(ctx, organizationId);

    let query = ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', organizationId).eq('projectId', projectId)
      );

    if (parentId !== undefined) {
      query = query.filter((q) => q.eq(q.field('parentId'), parentId));
    }

    if (level !== undefined) {
      query = query.filter((q) => q.eq(q.field('level'), level));
    }

    const categories = await query
      .filter((q) => q.eq(q.field('status'), 'active'))
      .order('asc')
      .collect();

    // Sort by sortOrder
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
}), { _name: 'getProjectCategories' });

// Get category tree (all categories in hierarchical structure)
export const getCategoryTree = Object.assign(query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
  },
  handler: async (ctx, { organizationId, projectId }) => {
    await getUserAndVerifyAccess(ctx, organizationId);

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', organizationId).eq('projectId', projectId)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    // Build tree structure
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    // First pass: create map of all categories
    categories.forEach((category) => {
      categoryMap.set(category._id, {
        ...category,
        children: [] as Category[],
      });
    });

    // Second pass: build tree structure
    categories.forEach((category) => {
      const categoryWithChildren = categoryMap.get(category._id);
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    // Sort each level by sortOrder
    const sortCategories = (categories: any[]) => {
      categories.sort((a, b) => a.sortOrder - b.sortOrder);
      categories.forEach((category) => {
        if (category.children.length > 0) {
          sortCategories(category.children);
        }
      });
    };

    sortCategories(rootCategories);
    return rootCategories;
  },
}), { _name: 'getCategoryTree' });

// Get a single category by ID
export const getCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, { categoryId }) => {
    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error('Category not found');

    await getUserAndVerifyAccess(ctx, category.organizationId);
    return category;
  },
});

// Internal query for CrewAI to get a category by ID
export const getById = internalQuery({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, { categoryId }) => {
    return await ctx.db.get(categoryId);
  },
});
