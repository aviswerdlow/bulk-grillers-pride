import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Track user sessions and activity
export const trackActivity = mutation({
  args: {
    activity: v.object({
      type: v.string(), // login, logout, page_view, action
      description: v.string(),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return;

    // Update last activity
    await ctx.db.patch(user._id, {
      lastLogin: Date.now(),
      updatedAt: Date.now(),
    });

    // For login events, also log to audit trail
    if (args.activity.type === 'login') {
      // Get user's organizations for audit logging
      const memberships = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();

      // Log login to each organization's audit trail
      for (const membership of memberships) {
        await ctx.db.insert('auditLogs', {
          organizationId: membership.organizationId,
          eventType: 'LOGIN',
          entityType: 'users',
          entityId: user._id,
          changes: [],
          context: {
            action: 'user_login',
            source: 'web',
            userAgent: args.activity.metadata?.userAgent,
            ipAddress: args.activity.metadata?.ipAddress,
            sessionId: args.activity.metadata?.sessionId,
          },
          performedBy: {
            type: 'user',
            userId: user._id,
            userEmail: user.email,
          },
          metadata: args.activity.metadata,
          timestamp: Date.now(),
          isRollbackable: false,
        });
      }
    }
  },
});

// Switch active organization
export const switchOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Verify user has access to the organization
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) {
      throw new Error('You do not have access to this organization');
    }

    // Log the switch
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'SWITCH_ORGANIZATION',
      entityType: 'users',
      entityId: user._id,
      changes: [],
      context: {
        action: 'switch_organization',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {},
      timestamp: Date.now(),
      isRollbackable: false,
    });

    return {
      organizationId: args.organizationId,
      role: membership.role,
      permissions: membership.permissions,
    };
  },
});

// Get active sessions for an organization
export const getActiveSessions = query({
  args: {
    organizationId: v.id('organizations'),
    timeWindow: v.optional(v.number()), // milliseconds, default 30 minutes
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return [];

    // Check if user has permission to view users
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient permissions to view active sessions');
    }

    // Get all active members
    const activeMemberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    const timeWindow = args.timeWindow || 30 * 60 * 1000; // 30 minutes default
    const cutoffTime = Date.now() - timeWindow;

    // Get user details and filter by recent activity
    const activeSessions = await Promise.all(
      activeMemberships.map(async (membership) => {
        const memberUser = await ctx.db.get(membership.userId);
        if (!memberUser || !memberUser.lastLogin || memberUser.lastLogin < cutoffTime) {
          return null;
        }

        return {
          userId: membership.userId,
          user: {
            id: memberUser._id,
            email: memberUser.email,
            firstName: memberUser.firstName,
            lastName: memberUser.lastName,
            avatar: memberUser.avatar,
          },
          role: membership.role,
          lastActivity: memberUser.lastLogin,
          isOnline: memberUser.lastLogin > Date.now() - 5 * 60 * 1000, // 5 minutes
        };
      })
    );

    return activeSessions.filter(Boolean);
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.avatar !== undefined) updates.avatar = args.avatar;

    await ctx.db.patch(user._id, updates);

    // Log profile update to user's organizations
    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    for (const membership of memberships) {
      await ctx.db.insert('auditLogs', {
        organizationId: membership.organizationId,
        eventType: 'UPDATE',
        entityType: 'users',
        entityId: user._id,
        changes: Object.entries(updates)
          .filter(([key]) => key !== 'updatedAt')
          .map(([field, newValue]) => ({
            field,
            oldValue: (user as any)[field],
            newValue,
            changeType: 'modified' as const,
          })),
        context: {
          action: 'update_profile',
          source: 'web',
        },
        performedBy: {
          type: 'user',
          userId: user._id,
          userEmail: user.email,
        },
        metadata: {},
        timestamp: Date.now(),
        isRollbackable: true,
        rollbackData: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      });
    }

    return user._id;
  },
});

// Validate user session
export const validateSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { valid: false, user: null };

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return { valid: false, user: null };

    // Check if user is suspended
    if (user.status === 'suspended') {
      return {
        valid: false,
        user: null,
        reason: 'User account is suspended',
      };
    }

    return {
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        status: user.status,
      },
    };
  },
});
