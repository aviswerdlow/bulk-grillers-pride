import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

// Create a new organization
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }
    const now = Date.now();
    
    // Check if slug is unique
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingOrg) {
      throw new Error("Organization slug already exists");
    }

    // Create organization with default settings
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      status: "trial",
      subscription: {
        plan: "trial",
        status: "active",
        trialEnds: now + 14 * 24 * 60 * 60 * 1000, // 14 days trial
        seats: 5,
        features: ["basic_products", "basic_categories", "ai_categorization"]
      },
      settings: {
        aiProvider: "openai",
        aiModel: "gpt-4o-mini",
        apiKeys: {
          openai: undefined,
          anthropic: undefined,
          gemini: undefined
        },
        categorization: {
          batchSize: 10,
          prompt: "Categorize this product based on its title and description. Consider the product type, intended use, and target audience.",
          autoApprove: false,
          confidenceThreshold: 0.8
        },
        storage: {
          maxFileSize: 10485760, // 10MB
          totalStorageLimit: 1073741824, // 1GB
          allowedFileTypes: ["image/jpeg", "image/png", "image/webp", "text/csv"]
        }
      },
      createdAt: now,
      updatedAt: now,
      version: 1
    });

    // Create owner membership for creator
    await ctx.db.insert("organizationMemberships", {
      organizationId,
      userId: user._id,
      role: "owner",
      permissions: ["*"], // All permissions
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    });

    return organizationId;
  },
});

// Get organization by slug
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Get organizations for a user
export const getUserOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return {
          ...org,
          membership: {
            role: membership.role,
            permissions: membership.permissions,
            joinedAt: membership.joinedAt,
          },
        };
      })
    );

    return organizations.filter(Boolean);
  },
});

// Update organization settings
export const updateOrganizationSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    settings: v.any(), // Partial settings update - validated at runtime
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    await ctx.db.patch(args.organizationId, {
      settings: { ...org.settings, ...args.settings },
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      eventType: "UPDATE",
      entityType: "organizations",
      entityId: args.organizationId,
      changes: [
        {
          field: "settings",
          oldValue: org.settings,
          newValue: { ...org.settings, ...args.settings },
          changeType: "modified",
        },
      ],
      context: {
        action: "update_organization_settings",
        source: "web",
      },
      performedBy: {
        type: "user",
        userId: args.updatedBy,
        userEmail: "", // Will be filled by the client
      },
      metadata: {},
      timestamp: Date.now(),
      isRollbackable: true,
    });
  },
});

// Check if user has permission in organization
export const checkUserPermission = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership) return false;

    // Owner and admin have all permissions
    if (membership.role === "owner" || membership.role === "admin") {
      return true;
    }

    // Check specific permissions
    return (
      membership.permissions.includes("*") ||
      membership.permissions.includes(args.permission)
    );
  },
}); 