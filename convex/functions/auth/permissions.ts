import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Permission definitions
export const PERMISSIONS = {
  // Organization management
  MANAGE_ORGANIZATION: 'organization:manage',
  VIEW_ORGANIZATION: 'organization:view',
  UPDATE_ORGANIZATION_SETTINGS: 'organization:settings:update',

  // User management
  INVITE_USERS: 'users:invite',
  REMOVE_USERS: 'users:remove',
  UPDATE_USER_ROLES: 'users:roles:update',
  VIEW_USERS: 'users:view',

  // Project management
  CREATE_PROJECTS: 'projects:create',
  UPDATE_PROJECTS: 'projects:update',
  DELETE_PROJECTS: 'projects:delete',
  VIEW_PROJECTS: 'projects:view',

  // Product management
  CREATE_PRODUCTS: 'products:create',
  UPDATE_PRODUCTS: 'products:update',
  DELETE_PRODUCTS: 'products:delete',
  VIEW_PRODUCTS: 'products:view',
  IMPORT_PRODUCTS: 'products:import',
  EXPORT_PRODUCTS: 'products:export',

  // Category management
  CREATE_CATEGORIES: 'categories:create',
  UPDATE_CATEGORIES: 'categories:update',
  DELETE_CATEGORIES: 'categories:delete',
  VIEW_CATEGORIES: 'categories:view',
  ASSIGN_CATEGORIES: 'categories:assign',

  // AI operations
  USE_AI_CATEGORIZATION: 'ai:categorization:use',
  CONFIGURE_AI_SETTINGS: 'ai:settings:configure',
  VIEW_AI_JOBS: 'ai:jobs:view',

  // Import/Export
  IMPORT_DATA: 'data:import',
  EXPORT_DATA: 'data:export',

  // Audit logs
  VIEW_AUDIT_LOGS: 'audit:view',
};

// Role-based permission mappings
export const ROLE_PERMISSIONS = {
  owner: ['*'], // All permissions
  admin: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.UPDATE_ORGANIZATION_SETTINGS,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.REMOVE_USERS,
    PERMISSIONS.UPDATE_USER_ROLES,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.UPDATE_PROJECTS,
    PERMISSIONS.DELETE_PROJECTS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.UPDATE_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.IMPORT_PRODUCTS,
    PERMISSIONS.EXPORT_PRODUCTS,
    PERMISSIONS.CREATE_CATEGORIES,
    PERMISSIONS.UPDATE_CATEGORIES,
    PERMISSIONS.DELETE_CATEGORIES,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.ASSIGN_CATEGORIES,
    PERMISSIONS.USE_AI_CATEGORIZATION,
    PERMISSIONS.CONFIGURE_AI_SETTINGS,
    PERMISSIONS.VIEW_AI_JOBS,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  editor: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.UPDATE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.IMPORT_PRODUCTS,
    PERMISSIONS.CREATE_CATEGORIES,
    PERMISSIONS.UPDATE_CATEGORIES,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.ASSIGN_CATEGORIES,
    PERMISSIONS.USE_AI_CATEGORIZATION,
    PERMISSIONS.VIEW_AI_JOBS,
    PERMISSIONS.IMPORT_DATA,
  ],
  viewer: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.VIEW_AI_JOBS,
  ],
};

// Helper to check if a user has a specific permission
export async function hasPermission(
  ctx: any,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>,
  permission: string
): Promise<boolean> {
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q: any) =>
      q.eq('organizationId', organizationId).eq('userId', userId)
    )
    .filter((q: any) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) return false;

  // Check wildcard permission
  if (membership.permissions.includes('*')) return true;

  // Check specific permission
  if (membership.permissions.includes(permission)) return true;

  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[membership.role as keyof typeof ROLE_PERMISSIONS];
  if (rolePermissions) {
    return rolePermissions.includes('*') || rolePermissions.includes(permission);
  }

  return false;
}

// Check if current user has permission
export const checkPermission = query({
  args: {
    organizationId: v.id('organizations'),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return false;

    return hasPermission(ctx, user._id, args.organizationId, args.permission);
  },
});

// Update user role
export const updateUserRole = mutation({
  args: {
    membershipId: v.id('organizationMemberships'),
    newRole: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    customPermissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error('Membership not found');

    // Check if user has permission to update roles
    const canUpdateRoles = await hasPermission(
      ctx,
      user._id,
      membership.organizationId,
      PERMISSIONS.UPDATE_USER_ROLES
    );

    if (!canUpdateRoles) {
      throw new Error('Insufficient permissions to update user roles');
    }

    // Prevent changing owner role
    if (membership.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    // Get default permissions for new role
    const defaultPermissions =
      ROLE_PERMISSIONS[args.newRole as keyof typeof ROLE_PERMISSIONS] || [];
    const permissions = args.customPermissions || defaultPermissions;

    const now = Date.now();

    // Update membership
    await ctx.db.patch(args.membershipId, {
      role: args.newRole,
      permissions,
      updatedAt: now,
    });

    // Log the change
    await ctx.db.insert('auditLogs', {
      organizationId: membership.organizationId,
      eventType: 'UPDATE',
      entityType: 'organizationMemberships',
      entityId: args.membershipId,
      changes: [
        {
          field: 'role',
          oldValue: membership.role,
          newValue: args.newRole,
          changeType: 'modified',
        },
        {
          field: 'permissions',
          oldValue: membership.permissions,
          newValue: permissions,
          changeType: 'modified',
        },
      ],
      context: {
        action: 'update_user_role',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { targetUserId: membership.userId },
      timestamp: now,
      isRollbackable: true,
      rollbackData: {
        role: membership.role,
        permissions: membership.permissions,
      },
    });

    return args.membershipId;
  },
});

// Remove user from organization
export const removeUserFromOrganization = mutation({
  args: {
    membershipId: v.id('organizationMemberships'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error('Membership not found');

    // Check if user has permission to remove users
    const canRemoveUsers = await hasPermission(
      ctx,
      user._id,
      membership.organizationId,
      PERMISSIONS.REMOVE_USERS
    );

    // Users can also remove themselves
    const isSelfRemoval = membership.userId === user._id;

    if (!canRemoveUsers && !isSelfRemoval) {
      throw new Error('Insufficient permissions to remove users');
    }

    // Prevent removing the last owner
    if (membership.role === 'owner') {
      const ownerCount = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_organization', (q) => q.eq('organizationId', membership.organizationId))
        .filter((q) => q.and(q.eq(q.field('role'), 'owner'), q.eq(q.field('status'), 'active')))
        .collect();

      if (ownerCount.length <= 1) {
        throw new Error('Cannot remove the last owner of an organization');
      }
    }

    // Mark membership as revoked
    await ctx.db.patch(args.membershipId, {
      status: 'revoked',
      updatedAt: Date.now(),
    });

    // Log the removal
    await ctx.db.insert('auditLogs', {
      organizationId: membership.organizationId,
      eventType: 'UPDATE',
      entityType: 'organizationMemberships',
      entityId: args.membershipId,
      changes: [
        {
          field: 'status',
          oldValue: membership.status,
          newValue: 'revoked',
          changeType: 'modified',
        },
      ],
      context: {
        action: isSelfRemoval ? 'leave_organization' : 'remove_user',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        removedUserId: membership.userId,
        isSelfRemoval,
      },
      timestamp: Date.now(),
      isRollbackable: true,
      rollbackData: membership,
    });

    return true;
  },
});

// Get all permissions for a user in an organization
export const getUserPermissions = query({
  args: {
    userId: v.id('users'),
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', args.userId)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) return null;

    // Get effective permissions
    let effectivePermissions: string[] = [];

    if (membership.permissions.includes('*')) {
      // Return all available permissions
      effectivePermissions = Object.values(PERMISSIONS);
    } else {
      // Combine role-based and custom permissions
      const rolePermissions =
        ROLE_PERMISSIONS[membership.role as keyof typeof ROLE_PERMISSIONS] || [];
      effectivePermissions = [...new Set([...rolePermissions, ...membership.permissions])];
    }

    return {
      role: membership.role,
      customPermissions: membership.permissions,
      effectivePermissions,
    };
  },
});
