import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

// Create or update user (called automatically when user signs in)
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: String(identity.email || ""),
        firstName: String(identity.given_name || ""),
        lastName: String(identity.family_name || ""),
        avatar: identity.picture ? String(identity.picture) : undefined,
        lastLogin: now,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: String(identity.email || ""),
        firstName: String(identity.given_name || ""),
        lastName: String(identity.family_name || ""),
        avatar: identity.picture ? String(identity.picture) : undefined,
        status: "active",
        lastLogin: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get current authenticated user
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

// Get current user with organization memberships
export const currentWithOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

    return {
      ...user,
      organizations,
    };
  },
}); 