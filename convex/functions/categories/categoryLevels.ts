import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { Doc, Id } from "../../_generated/dataModel";

// Get category level definitions for a project
export const getCategoryLevels = query({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { organizationId, projectId }) => {
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

    const levels = await ctx.db
      .query("categoryLevelDefinitions")
      .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return levels.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Create or update category level definitions for a project
export const setupCategoryLevels = mutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    levels: v.array(v.object({
      level: v.number(),
      friendlyName: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
      isRequired: v.boolean(),
      maxCategories: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { organizationId, projectId, levels }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Verify user has admin permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Delete existing level definitions for this project
    const existingLevels = await ctx.db
      .query("categoryLevelDefinitions")
      .withIndex("by_organization_project", (q) => 
        q.eq("organizationId", organizationId).eq("projectId", projectId)
      )
      .collect();

    for (const existing of existingLevels) {
      await ctx.db.delete(existing._id);
    }

    // Create new level definitions
    const now = Date.now();
    const createdLevels: Id<"categoryLevelDefinitions">[] = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const levelId = await ctx.db.insert("categoryLevelDefinitions", {
        organizationId,
        projectId,
        level: level.level,
        friendlyName: level.friendlyName,
        description: level.description,
        icon: level.icon,
        color: level.color,
        isRequired: level.isRequired,
        maxCategories: level.maxCategories,
        sortOrder: i,
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

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId,
      eventType: "CREATE",
      entityType: "categoryLevelDefinitions",
      entityId: "bulk_setup",
      changes: [{
        field: "levels",
        oldValue: existingLevels,
        newValue: levels,
        changeType: "modified" as const,
      }],
      context: {
        action: "setup_category_levels",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { 
        projectId,
        levelCount: levels.length,
      },
      timestamp: now,
      isRollbackable: true,
    });

    return {
      success: true,
      createdLevels,
      levelCount: levels.length,
    };
  },
});

// Create default category levels for food/grocery business
export const createDefaultFoodCategoryLevels = mutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { organizationId, projectId }) => {
    const defaultLevels = [
      {
        level: 0,
        friendlyName: "Aisle",
        description: "Top-level organization (e.g., Uncooked Foods, Prepared Foods)",
        icon: "Store",
        color: "#3B82F6",
        isRequired: true,
        maxCategories: undefined,
      },
      {
        level: 1,
        friendlyName: "Product Type",
        description: "Major product categories (e.g., Beef, Poultry, Fish)",
        icon: "Package",
        color: "#10B981",
        isRequired: true,
        maxCategories: undefined,
      },
      {
        level: 2,
        friendlyName: "Master Category",
        description: "Broad categorization (e.g., Ground, Steaks, Roasts)",
        icon: "FolderTree",
        color: "#F59E0B",
        isRequired: false,
        maxCategories: undefined,
      },
      {
        level: 3,
        friendlyName: "Category",
        description: "Specific product categories (e.g., Boneless Steaks, Ribeye)",
        icon: "Tag",
        color: "#EF4444",
        isRequired: false,
        maxCategories: undefined,
      },
      {
        level: 4,
        friendlyName: "Sub Category",
        description: "Most specific categorization (e.g., Bone-In, Boneless)",
        icon: "Tags",
        color: "#8B5CF6",
        isRequired: false,
        maxCategories: undefined,
      },
    ];

    // Setup the default levels directly
    const createdLevels = [];
    
    for (const level of defaultLevels) {
      const existingLevel = await ctx.db
        .query("categoryLevelDefinitions")
        .withIndex("by_project_level", (q) => 
          q.eq("projectId", projectId).eq("level", level.level)
        )
        .unique();

      if (!existingLevel) {
        const levelId = await ctx.db.insert("categoryLevelDefinitions", {
          organizationId,
          projectId,
          ...level,
          sortOrder: level.level,
          isActive: true,
          metadata: {},
          version: 1,
          createdBy: (await ctx.db.query("users").first())?._id!, // Temporary for build
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: (await ctx.db.query("users").first())?._id!, // Temporary for build
        });
        createdLevels.push(levelId);
      }
    }

    return {
      success: true,
      createdLevels,
      levelCount: defaultLevels.length,
    };
  },
});

// Get category level definition by level number
export const getCategoryLevelByNumber = query({
  args: {
    projectId: v.id("projects"),
    level: v.number(),
  },
  handler: async (ctx, { projectId, level }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const levelDef = await ctx.db
      .query("categoryLevelDefinitions")
      .withIndex("by_project_level", (q) => q.eq("projectId", projectId).eq("level", level))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();

    return levelDef;
  },
});

// Update a single category level definition
export const updateCategoryLevel = mutation({
  args: {
    levelId: v.id("categoryLevelDefinitions"),
    friendlyName: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isRequired: v.optional(v.boolean()),
    maxCategories: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const levelDef = await ctx.db.get(args.levelId);
    if (!levelDef) throw new Error("Category level not found");

    // Verify user has admin permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", levelDef.organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Track changes for audit log
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changeType: "added" | "modified" | "removed";
    }> = [];

    const { levelId, ...updates } = args;

    Object.entries(updates).forEach(([field, newValue]) => {
      if (newValue !== undefined) {
        const oldValue = (levelDef as any)[field];
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
      return args.levelId; // No changes to make
    }

    const now = Date.now();
    await ctx.db.patch(args.levelId, {
      ...updates,
      version: levelDef.version + 1,
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: levelDef.organizationId,
      eventType: "UPDATE",
      entityType: "categoryLevelDefinitions",
      entityId: args.levelId,
      changes,
      beforeSnapshot: levelDef,
      context: {
        action: "update_category_level",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: levelDef.projectId },
      timestamp: now,
      isRollbackable: true,
      rollbackData: levelDef,
    });

    return args.levelId;
  },
});