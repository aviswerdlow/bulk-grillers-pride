import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { 
  createCategoryHandler, 
  updateCategoryHandler, 
  deleteCategoryHandler 
} from './handlers/mutations';

// Create a new category
export const createCategory = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    name: v.string(),
    description: v.optional(v.string()),
    handle: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    metadata: v.any(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return createCategoryHandler(ctx, args);
  },
});

// Update a category
export const updateCategory = mutation({
  args: {
    categoryId: v.id('categories'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    handle: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    metadata: v.optional(v.any()),
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return updateCategoryHandler(ctx, args);
  },
});

// Delete a category (soft delete)
export const deleteCategory = mutation({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    return deleteCategoryHandler(ctx, args);
  },
});
