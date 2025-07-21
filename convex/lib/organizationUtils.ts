import { Auth } from 'convex/server';
import { Id } from '../_generated/dataModel';
import { DatabaseReader } from '../_generated/server';

/**
 * Get organization ID from the current authenticated user
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

  // Return the user's current organization
  return user.currentOrganizationId || null;
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
    .query('organizationMembers')
    .withIndex('by_user_organization', (q) =>
      q.eq('userId', user._id).eq('organizationId', organizationId)
    )
    .unique();

  return membership !== null && membership.status === 'active';
}