import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { getUserAndVerifyEditPermissions, generateHandle } from './helpers';

// Create or update category level definitions for import
export const createCategoryLevelDefinitions = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    levelDefinitions: v.array(
      v.object({
        level: v.number(),
        friendlyName: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await getUserAndVerifyEditPermissions(ctx, args.organizationId);

    const now = Date.now();
    const createdLevels = [];

    for (const levelDef of args.levelDefinitions) {
      // Check if level definition already exists
      const existingLevel = await ctx.db
        .query('categoryLevelDefinitions')
        .withIndex('by_project_level', (q) =>
          q.eq('projectId', args.projectId).eq('level', levelDef.level)
        )
        .unique();

      if (existingLevel) {
        // Update existing level definition
        await ctx.db.patch(existingLevel._id, {
          friendlyName: levelDef.friendlyName,
          description: levelDef.description,
          updatedAt: now,
          lastModifiedBy: user._id,
          version: existingLevel.version + 1,
        });
        createdLevels.push(existingLevel._id);
      } else {
        // Create new level definition
        const levelId = await ctx.db.insert('categoryLevelDefinitions', {
          organizationId: args.organizationId,
          projectId: args.projectId,
          level: levelDef.level,
          friendlyName: levelDef.friendlyName,
          description: levelDef.description,
          icon: undefined,
          color: undefined,
          isRequired: false,
          maxCategories: undefined,
          sortOrder: levelDef.level,
          isActive: true,
          metadata: {},
          version: 1,
          createdBy: user._id,
          createdAt: now,
          updatedAt: now,
          lastModifiedBy: user._id,
        });
        createdLevels.push(levelId);
      }
    }

    return createdLevels;
  },
});

// Import category with external ID
export const importCategory = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    name: v.string(),
    externalId: v.string(),
    level: v.number(),
    description: v.optional(v.string()),
    parentExternalId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { user } = await getUserAndVerifyEditPermissions(ctx, args.organizationId);

    // Check if category with external ID already exists
    const existingCategory = await ctx.db
      .query('categories')
      .withIndex('by_external_id', (q) =>
        q
          .eq('organizationId', args.organizationId)
          .eq('projectId', args.projectId)
          .eq('externalId', args.externalId)
      )
      .unique();

    if (existingCategory) {
      // Update existing category
      const now = Date.now();
      await ctx.db.patch(existingCategory._id, {
        name: args.name,
        description: args.description,
        level: args.level,
        metadata: args.metadata || {},
        updatedAt: now,
        lastModifiedBy: user._id,
        version: existingCategory.version + 1,
      });
      return existingCategory._id;
    }

    // Find parent category if parentExternalId is provided
    let parentId: Id<'categories'> | undefined;
    let path = '/';

    if (args.parentExternalId) {
      const parentCategory = await ctx.db
        .query('categories')
        .withIndex('by_external_id', (q) =>
          q
            .eq('organizationId', args.organizationId)
            .eq('projectId', args.projectId)
            .eq('externalId', args.parentExternalId)
        )
        .unique();

      if (parentCategory) {
        parentId = parentCategory._id;
        path = parentCategory.path;
      }
    }

    // Generate handle
    const handle = generateHandle(args.name);

    // Build full path
    const fullPath = path === '/' ? `/${handle}` : `${path}/${handle}`;

    // Determine sort order
    const siblings = await ctx.db
      .query('categories')
      .withIndex('by_parent', (q) =>
        q
          .eq('organizationId', args.organizationId)
          .eq('projectId', args.projectId)
          .eq('parentId', parentId)
      )
      .collect();

    const sortOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

    const now = Date.now();
    const categoryId = await ctx.db.insert('categories', {
      organizationId: args.organizationId,
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      handle,
      externalId: args.externalId,
      parentId,
      level: args.level,
      path: fullPath,
      sortOrder,
      color: undefined,
      icon: undefined,
      seoTitle: undefined,
      seoDescription: undefined,
      status: 'active',
      isVisible: true,
      metadata: args.metadata || {},
      version: 1,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    return categoryId;
  },
});

// Bulk import categories
export const bulkImportCategories = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    categories: v.array(
      v.object({
        name: v.string(),
        externalId: v.string(),
        level: v.number(),
        description: v.optional(v.string()),
        parentExternalId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await getUserAndVerifyEditPermissions(ctx, args.organizationId);

    const importedIds: Id<'categories'>[] = [];
    const errors: Array<{ externalId: string; error: string }> = [];

    // Sort categories by level to ensure parents are created before children
    const sortedCategories = [...args.categories].sort((a, b) => a.level - b.level);

    for (const categoryData of sortedCategories) {
      try {
        // Import the category by calling the handler directly
        const categoryId = await ctx.db
          .query('categories')
          .withIndex('by_external_id', (q: any) =>
            q
              .eq('organizationId', args.organizationId)
              .eq('projectId', args.projectId)
              .eq('externalId', categoryData.externalId)
          )
          .unique();

        if (categoryId) {
          // Update existing category
          const now = Date.now();
          await ctx.db.patch(categoryId._id, {
            name: categoryData.name,
            description: categoryData.description,
            level: categoryData.level,
            metadata: categoryData.metadata || {},
            updatedAt: now,
            lastModifiedBy: user._id,
            version: categoryId.version + 1,
          });
          importedIds.push(categoryId._id);
        } else {
          // Create new category
          let parentId: Id<'categories'> | undefined;
          let path = '/';

          if (categoryData.parentExternalId) {
            const parentCategory = await ctx.db
              .query('categories')
              .withIndex('by_external_id', (q: any) =>
                q
                  .eq('organizationId', args.organizationId)
                  .eq('projectId', args.projectId)
                  .eq('externalId', categoryData.parentExternalId)
              )
              .unique();

            if (parentCategory) {
              parentId = parentCategory._id;
              path = parentCategory.path;
            }
          }

          const handle = generateHandle(categoryData.name);
          const fullPath = path === '/' ? `/${handle}` : `${path}/${handle}`;

          const siblings = await ctx.db
            .query('categories')
            .withIndex('by_parent', (q: any) =>
              q
                .eq('organizationId', args.organizationId)
                .eq('projectId', args.projectId)
                .eq('parentId', parentId)
            )
            .collect();

          const sortOrder =
            siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

          const now = Date.now();
          const newCategoryId = await ctx.db.insert('categories', {
            organizationId: args.organizationId,
            projectId: args.projectId,
            name: categoryData.name,
            description: categoryData.description,
            handle,
            externalId: categoryData.externalId,
            parentId,
            level: categoryData.level,
            path: fullPath,
            sortOrder,
            color: undefined,
            icon: undefined,
            seoTitle: undefined,
            seoDescription: undefined,
            status: 'active',
            isVisible: true,
            metadata: categoryData.metadata || {},
            version: 1,
            createdBy: user._id,
            createdAt: now,
            updatedAt: now,
            lastModifiedBy: user._id,
          });
          importedIds.push(newCategoryId);
        }
      } catch (error) {
        errors.push({
          externalId: categoryData.externalId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      imported: importedIds.length,
      errors,
    };
  },
});
