import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { Doc, Id } from "../../_generated/dataModel";

// Get all categories for a project in hierarchical structure
export const getProjectCategories = query({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    parentId: v.optional(v.id("categories")),
    level: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, projectId, parentId, level }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user has access to this organization
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership) throw new Error("Access denied");

    let query = ctx.db
      .query("categories")
      .withIndex("by_organization_project", (q) => 
        q.eq("organizationId", organizationId).eq("projectId", projectId)
      );

    if (parentId !== undefined) {
      query = query.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (level !== undefined) {
      query = query.filter((q) => q.eq(q.field("level"), level));
    }

    const categories = await query
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("asc")
      .collect();

    // Sort by sortOrder
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Get category tree (all categories in hierarchical structure)
export const getCategoryTree = query({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { organizationId, projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user has access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership) throw new Error("Access denied");

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_organization_project", (q) => 
        q.eq("organizationId", organizationId).eq("projectId", projectId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map of all categories
    categories.forEach(category => {
      categoryMap.set(category._id, {
        ...category,
        children: []
      });
    });

    // Second pass: build tree structure
    categories.forEach(category => {
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
      categories.forEach(category => {
        if (category.children.length > 0) {
          sortCategories(category.children);
        }
      });
    };

    sortCategories(rootCategories);
    return rootCategories;
  },
});

// Get a single category by ID
export const getCategory = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error("Category not found");

    // Verify user has access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", category.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership) throw new Error("Access denied");

    return category;
  },
});

// Create a new category
export const createCategory = mutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    handle: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    metadata: v.any(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Determine level and path
    let level = 0;
    let path = "";
    let parentCategory: Doc<"categories"> | null = null;

    if (args.parentId) {
      parentCategory = await ctx.db.get(args.parentId);
      if (!parentCategory) throw new Error("Parent category not found");
      
      level = parentCategory.level + 1;
      path = parentCategory.path;
    }

    // Generate handle if not provided
    const handle = args.handle || args.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    // Check if handle is unique within the project
    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_handle", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("projectId", args.projectId)
         .eq("handle", handle)
      )
      .unique();

    if (existingCategory) {
      throw new Error("Category handle already exists in this project");
    }

    // Build full path
    const fullPath = path + "/" + handle;

    // Determine sort order
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      // Find the highest sort order at this level
      const siblings = await ctx.db
        .query("categories")
        .withIndex("by_parent", (q) => 
          q.eq("organizationId", args.organizationId)
           .eq("projectId", args.projectId)
           .eq("parentId", args.parentId)
        )
        .collect();
      
      sortOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sortOrder)) + 1 : 0;
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
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
      status: "active",
      isVisible: true,
      metadata: args.metadata || {},
      version: 1,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      eventType: "CREATE",
      entityType: "categories",
      entityId: categoryId,
      changes: [{
        field: "*",
        oldValue: null,
        newValue: args,
        changeType: "added" as const,
      }],
      context: {
        action: "create_category",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: args.projectId, parentId: args.parentId },
      timestamp: now,
      isRollbackable: true,
    });

    return categoryId;
  },
});

// Update a category
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", category.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Track changes for audit log
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changeType: "added" | "modified" | "removed";
    }> = [];

    const { categoryId, ...updates } = args;

    // Check handle uniqueness if handle is being changed
    if (args.handle && args.handle !== category.handle) {
      const existingCategory = await ctx.db
        .query("categories")
        .withIndex("by_handle", (q) => 
          q.eq("organizationId", category.organizationId)
           .eq("projectId", category.projectId)
           .eq("handle", args.handle!)
        )
        .unique();

      if (existingCategory) {
        throw new Error("Category handle already exists in this project");
      }

      // Update path if handle changed
      const oldPath = category.path;
      const newPath = oldPath.replace(category.handle, args.handle);
      (updates as any).path = newPath;

      // Update paths of all child categories
      const childCategories = await ctx.db
        .query("categories")
        .withIndex("by_organization_project", (q) => 
          q.eq("organizationId", category.organizationId)
           .eq("projectId", category.projectId)
        )
        .filter((q) => q.and(
          q.neq(q.field("_id"), args.categoryId),
          q.gte(q.field("level"), category.level + 1)
        ))
        .collect();

      for (const child of childCategories) {
        if (child.path.startsWith(oldPath)) {
          const newChildPath = child.path.replace(oldPath, newPath);
          await ctx.db.patch(child._id, { path: newChildPath });
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
            changeType: oldValue === undefined ? "added" : "modified",
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
    await ctx.db.insert("auditLogs", {
      organizationId: category.organizationId,
      eventType: "UPDATE",
      entityType: "categories",
      entityId: args.categoryId,
      changes,
      beforeSnapshot: category,
      context: {
        action: "update_category",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: category.projectId },
      timestamp: now,
      isRollbackable: true,
      rollbackData: category,
    });

    return args.categoryId;
  },
});

// Move category to new parent (reorder hierarchy)
export const moveCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    newParentId: v.optional(v.id("categories")),
    newSortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { categoryId, newParentId, newSortOrder }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error("Category not found");

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", category.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Prevent moving category to be its own child
    if (newParentId) {
      const newParent = await ctx.db.get(newParentId);
      if (!newParent) throw new Error("New parent category not found");
      
      if (newParent.path.startsWith(category.path)) {
        throw new Error("Cannot move category to be its own descendant");
      }
    }

    // Calculate new level and path
    let newLevel = 0;
    let newPath = "/" + category.handle;

    if (newParentId) {
      const newParent = await ctx.db.get(newParentId);
      if (newParent) {
        newLevel = newParent.level + 1;
        newPath = newParent.path + "/" + category.handle;
      }
    }

    // Calculate sort order if not provided
    let sortOrder = newSortOrder;
    if (sortOrder === undefined) {
      const siblings = await ctx.db
        .query("categories")
        .withIndex("by_parent", (q) => 
          q.eq("organizationId", category.organizationId)
           .eq("projectId", category.projectId)
           .eq("parentId", newParentId)
        )
        .collect();
      
      sortOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sortOrder)) + 1 : 0;
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
      .query("categories")
      .withIndex("by_organization_project", (q) => 
        q.eq("organizationId", category.organizationId)
         .eq("projectId", category.projectId)
      )
      .filter((q) => q.and(
        q.neq(q.field("_id"), categoryId),
        q.gte(q.field("level"), category.level + 1)
      ))
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
    await ctx.db.insert("auditLogs", {
      organizationId: category.organizationId,
      eventType: "UPDATE",
      entityType: "categories",
      entityId: categoryId,
      changes: [
        {
          field: "parentId",
          oldValue: category.parentId,
          newValue: newParentId,
          changeType: "modified" as const,
        },
        {
          field: "level",
          oldValue: category.level,
          newValue: newLevel,
          changeType: "modified" as const,
        },
        {
          field: "path",
          oldValue: category.path,
          newValue: newPath,
          changeType: "modified" as const,
        },
      ],
      beforeSnapshot: category,
      context: {
        action: "move_category",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { 
        projectId: category.projectId,
        oldParentId: category.parentId,
        newParentId,
      },
      timestamp: now,
      isRollbackable: true,
      rollbackData: category,
    });

    return categoryId;
  },
});

// Delete a category (soft delete)
export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error("Category not found");

    // Verify user has access and delete permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", category.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Check if category has children
    const childCategories = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => 
        q.eq("organizationId", category.organizationId)
         .eq("projectId", category.projectId)
         .eq("parentId", categoryId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (childCategories.length > 0) {
      throw new Error("Cannot delete category with child categories. Move or delete children first.");
    }

    // Check if category has assigned products
    const productAssignments = await ctx.db
      .query("categoryProductAssignments")
      .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (productAssignments.length > 0) {
      throw new Error("Cannot delete category with assigned products. Remove product assignments first.");
    }

    const now = Date.now();
    await ctx.db.patch(categoryId, {
      status: "archived",
      updatedAt: now,
      lastModifiedBy: user._id,
      version: category.version + 1,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: category.organizationId,
      eventType: "DELETE",
      entityType: "categories",
      entityId: categoryId,
      changes: [{
        field: "status",
        oldValue: category.status,
        newValue: "archived",
        changeType: "modified" as const,
      }],
      beforeSnapshot: category,
      context: {
        action: "delete_category",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: category.projectId },
      timestamp: now,
      isRollbackable: true,
      rollbackData: category,
    });

    return categoryId;
  },
});

// Assign product to category
export const assignProductToCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    productId: v.id("products"),
    assignedBy: v.union(v.literal("manual"), v.literal("ai"), v.literal("import")),
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const category = await ctx.db.get(args.categoryId);
    const product = await ctx.db.get(args.productId);

    if (!category) throw new Error("Category not found");
    if (!product) throw new Error("Product not found");

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", category.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Check if assignment already exists
    const existingAssignment = await ctx.db
      .query("categoryProductAssignments")
      .withIndex("by_organization_project", (q) => 
        q.eq("organizationId", category.organizationId)
         .eq("projectId", category.projectId)
      )
      .filter((q) => q.and(
        q.eq(q.field("categoryId"), args.categoryId),
        q.eq(q.field("productId"), args.productId),
        q.eq(q.field("status"), "active")
      ))
      .unique();

    if (existingAssignment) {
      throw new Error("Product is already assigned to this category");
    }

    const now = Date.now();
    const assignmentId = await ctx.db.insert("categoryProductAssignments", {
      organizationId: category.organizationId,
      projectId: category.projectId,
      categoryId: args.categoryId,
      productId: args.productId,
      assignedBy: args.assignedBy,
      confidence: args.confidence,
      rationale: args.rationale,
      status: "active",
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
    await ctx.db.insert("auditLogs", {
      organizationId: category.organizationId,
      eventType: "CREATE",
      entityType: "categoryProductAssignments",
      entityId: assignmentId,
      changes: [{
        field: "*",
        oldValue: null,
        newValue: args,
        changeType: "added" as const,
      }],
      context: {
        action: "assign_product_to_category",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { 
        projectId: category.projectId,
        categoryId: args.categoryId,
        productId: args.productId,
      },
      timestamp: now,
      isRollbackable: true,
    });

    return assignmentId;
  },
});

// Create or update category level definitions for import
export const createCategoryLevelDefinitions = mutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    levelDefinitions: v.array(v.object({
      level: v.number(),
      friendlyName: v.string(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    const now = Date.now();
    const createdLevels = [];

    for (const levelDef of args.levelDefinitions) {
      // Check if level definition already exists
      const existingLevel = await ctx.db
        .query("categoryLevelDefinitions")
        .withIndex("by_project_level", (q) => 
          q.eq("projectId", args.projectId).eq("level", levelDef.level)
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
        const levelId = await ctx.db.insert("categoryLevelDefinitions", {
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
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    name: v.string(),
    externalId: v.string(),
    level: v.number(),
    description: v.optional(v.string()),
    parentExternalId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Verify permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Check if category with external ID already exists
    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_external_id", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("projectId", args.projectId)
         .eq("externalId", args.externalId)
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
    let parentId: Id<"categories"> | undefined;
    let path = "/";
    
    if (args.parentExternalId) {
      const parentCategory = await ctx.db
        .query("categories")
        .withIndex("by_external_id", (q) => 
          q.eq("organizationId", args.organizationId)
           .eq("projectId", args.projectId)
           .eq("externalId", args.parentExternalId)
        )
        .unique();
      
      if (parentCategory) {
        parentId = parentCategory._id;
        path = parentCategory.path;
      }
    }

    // Generate handle
    const handle = args.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Build full path
    const fullPath = path === "/" ? `/${handle}` : `${path}/${handle}`;

    // Determine sort order
    const siblings = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("projectId", args.projectId)
         .eq("parentId", parentId)
      )
      .collect();
    
    const sortOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sortOrder)) + 1 : 0;

    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
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
      status: "active",
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