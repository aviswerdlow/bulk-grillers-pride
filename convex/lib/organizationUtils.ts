import { Auth } from 'convex/server';
import { Id } from '../_generated/dataModel';
import { DatabaseReader } from '../_generated/server';

/**
 * Get organization ID from the current authenticated user
 * Note: This function returns the first active organization membership.
 * In a multi-tenant system, you may want to pass the organizationId explicitly
 * or store the current organization in session/context.
 */
export async function getOrganizationId(
  ctx: { auth: Auth; db: DatabaseReader }
): Promise<Id<'organizations'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Get user from the database
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    return null;
  }

  // Get the user's first active organization membership
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .filter((q) => q.eq(q.field('status'), 'active'))
    .first();

  return membership?.organizationId || null;
}

/**
 * Verify user has access to a specific organization
 */
export async function verifyOrganizationAccess(
  ctx: { auth: Auth; db: DatabaseReader },
  organizationId: Id<'organizations'>
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return false;
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    return false;
  }

  // Check if user is a member of the organization
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .unique();

  return membership !== null && membership.status === 'active';
}