import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Helper to verify user has permission to invite
async function verifyInvitePermission(
  ctx: any,
  organizationId: Id<'organizations'>,
  userId: Id<'users'>
) {
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q: any) =>
      q.eq('organizationId', organizationId).eq('userId', userId)
    )
    .filter((q: any) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) {
    throw new Error('Not a member of this organization');
  }

  // Only owner and admin can invite
  if (!['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions to invite users');
  }

  return membership;
}

// Send invitation to join organization
export const inviteToOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    permissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get inviter user
    const inviter = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!inviter) throw new Error('User not found');

    // Verify inviter has permission
    await verifyInvitePermission(ctx, args.organizationId, inviter._id);

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    const now = Date.now();

    if (existingUser) {
      // Check if already a member
      const existingMembership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', args.organizationId).eq('userId', existingUser._id)
        )
        .unique();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          throw new Error('User is already a member of this organization');
        }
        // Reactivate existing membership
        await ctx.db.patch(existingMembership._id, {
          status: 'pending',
          role: args.role,
          permissions: args.permissions || [],
          invitedBy: inviter._id,
          invitedAt: now,
          updatedAt: now,
        });
        return existingMembership._id;
      }
    }

    // Create pending membership
    const membershipId = await ctx.db.insert('organizationMemberships', {
      organizationId: args.organizationId,
      userId: existingUser?._id || (('pending_' + args.email) as Id<'users'>), // Temporary ID for non-existing users
      role: args.role,
      permissions: args.permissions || [],
      invitedBy: inviter._id,
      invitedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Log the invitation
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'CREATE',
      entityType: 'organizationMemberships',
      entityId: membershipId,
      changes: [
        {
          field: '*',
          oldValue: null,
          newValue: {
            email: args.email,
            role: args.role,
            permissions: args.permissions,
          },
          changeType: 'added',
        },
      ],
      context: {
        action: 'invite_user',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: inviter._id,
        userEmail: inviter.email,
      },
      metadata: { inviteeEmail: args.email },
      timestamp: now,
      isRollbackable: true,
    });

    // TODO: Send invitation email via email service

    return membershipId;
  },
});

// Accept invitation
export const acceptInvitation = mutation({
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

    // Find pending membership
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .unique();

    if (!membership) {
      // Check if there's a pending membership by email
      const pendingByEmail = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .filter((q) =>
          q.and(
            q.eq(q.field('status'), 'pending'),
            q.eq(q.field('userId'), ('pending_' + user.email) as Id<'users'>)
          )
        )
        .unique();

      if (!pendingByEmail) {
        throw new Error('No pending invitation found');
      }

      // Update the membership with actual user ID
      await ctx.db.patch(pendingByEmail._id, {
        userId: user._id,
        status: 'active',
        joinedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return pendingByEmail._id;
    }

    // Accept the invitation
    const now = Date.now();
    await ctx.db.patch(membership._id, {
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    // Log acceptance
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'UPDATE',
      entityType: 'organizationMemberships',
      entityId: membership._id,
      changes: [
        {
          field: 'status',
          oldValue: 'pending',
          newValue: 'active',
          changeType: 'modified',
        },
      ],
      context: {
        action: 'accept_invitation',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {},
      timestamp: now,
      isRollbackable: false,
    });

    return membership._id;
  },
});

// Decline invitation
export const declineInvitation = mutation({
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

    // Find pending membership
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .unique();

    if (!membership) {
      throw new Error('No pending invitation found');
    }

    // Delete the invitation
    await ctx.db.delete(membership._id);

    // Log decline
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'DELETE',
      entityType: 'organizationMemberships',
      entityId: membership._id,
      changes: [
        {
          field: 'status',
          oldValue: 'pending',
          newValue: 'declined',
          changeType: 'removed',
        },
      ],
      context: {
        action: 'decline_invitation',
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

    return true;
  },
});

// Get pending invitations for current user
export const getPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return [];

    // Get memberships where user ID matches or email matches
    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect();

    // Also check for pending invitations by email
    const pendingByEmail = await ctx.db
      .query('organizationMemberships')
      .filter((q) =>
        q.and(
          q.eq(q.field('status'), 'pending'),
          q.eq(q.field('userId'), ('pending_' + user.email) as Id<'users'>)
        )
      )
      .collect();

    const allPending = [...memberships, ...pendingByEmail];

    // Get organization details for each invitation
    const invitations = await Promise.all(
      allPending.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        const inviter = membership.invitedBy ? await ctx.db.get(membership.invitedBy) : null;

        return {
          membershipId: membership._id,
          organization: org,
          role: membership.role,
          permissions: membership.permissions,
          invitedBy: inviter,
          invitedAt: membership.invitedAt,
        };
      })
    );

    return invitations.filter((inv) => inv.organization !== null);
  },
});

// Revoke invitation
export const revokeInvitation = mutation({
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
    if (!membership) throw new Error('Invitation not found');

    // Verify user has permission
    await verifyInvitePermission(ctx, membership.organizationId, user._id);

    if (membership.status !== 'pending') {
      throw new Error('Can only revoke pending invitations');
    }

    // Delete the invitation
    await ctx.db.delete(args.membershipId);

    // Log revocation
    await ctx.db.insert('auditLogs', {
      organizationId: membership.organizationId,
      eventType: 'DELETE',
      entityType: 'organizationMemberships',
      entityId: args.membershipId,
      changes: [
        {
          field: 'status',
          oldValue: 'pending',
          newValue: 'revoked',
          changeType: 'removed',
        },
      ],
      context: {
        action: 'revoke_invitation',
        source: 'web',
      },
      performedBy: {
        type: 'user',
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { revokedUserId: membership.userId },
      timestamp: Date.now(),
      isRollbackable: false,
    });

    return true;
  },
});
