import type { AuthContext, AuthResult } from '../../lib/auth';
import type { Id } from '../../_generated/dataModel';

/**
 * Mock implementation of authenticateAndAuthorize for testing
 */
export async function mockAuthenticateAndAuthorize(
  ctx: AuthContext,
  organizationId: Id<'organizations'>
): Promise<AuthResult> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    throw new Error('User not found');
  }

  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) {
    throw new Error('Access denied');
  }

  return {
    user: {
      _id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    membership: {
      _id: membership._id,
      role: membership.role,
      permissions: membership.permissions,
      status: membership.status as 'active',
    },
  };
}

/**
 * Mock implementation of requireRole for testing
 */
export async function mockRequireRole(
  ctx: AuthContext,
  organizationId: Id<'organizations'>,
  requiredRoles: Array<'owner' | 'admin' | 'editor' | 'viewer'>
): Promise<AuthResult> {
  const auth = await mockAuthenticateAndAuthorize(ctx, organizationId);

  if (!requiredRoles.includes(auth.membership.role)) {
    throw new Error('Insufficient permissions');
  }

  return auth;
}