import { QueryCtx, MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

export type AuthContext = QueryCtx | MutationCtx;

export interface AuthResult {
  user: {
    _id: Id<'users'>;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  membership: {
    _id: Id<'organizationMemberships'>;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    permissions: string[];
    status: 'active';
  };
}

/**
 * Authenticates a user and verifies their access to an organization.
 * This reduces the number of database queries from 3 to 2 per request.
 *
 * @param ctx - The query or mutation context
 * @param organizationId - The organization to check access for
 * @returns User and membership information
 * @throws Error if not authenticated or access denied
 */
export async function authenticateAndAuthorize(
  ctx: AuthContext,
  organizationId: Id<'organizations'>
): Promise<AuthResult> {
  console.log('[authenticateAndAuthorize] Starting for org:', organizationId);

  // Step 1: Get identity
  const identity = await ctx.auth.getUserIdentity();
  console.log(
    '[authenticateAndAuthorize] Identity:',
    identity
      ? {
          subject: identity.subject,
          tokenIdentifier: identity.tokenIdentifier,
          issuer: identity.issuer,
        }
      : 'null'
  );

  if (!identity) {
    console.error('[authenticateAndAuthorize] No identity found');
    throw new Error('Not authenticated');
  }

  // Step 2: Get user
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  console.log(
    '[authenticateAndAuthorize] User lookup:',
    user
      ? {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
        }
      : 'null'
  );

  if (!user) {
    console.error('[authenticateAndAuthorize] User not found for clerkId:', identity.subject);
    throw new Error('User not found');
  }

  // Step 3: Get membership
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
 * Authenticates a user and verifies they have one of the required roles.
 *
 * @param ctx - The query or mutation context
 * @param organizationId - The organization to check access for
 * @param requiredRoles - Array of roles that are allowed
 * @returns User and membership information
 * @throws Error if not authenticated, access denied, or insufficient permissions
 */
export async function requireRole(
  ctx: AuthContext,
  organizationId: Id<'organizations'>,
  requiredRoles: Array<'owner' | 'admin' | 'editor' | 'viewer'>
): Promise<AuthResult> {
  const auth = await authenticateAndAuthorize(ctx, organizationId);

  if (!requiredRoles.includes(auth.membership.role)) {
    throw new Error('Insufficient permissions');
  }

  return auth;
}

/**
 * Authenticates a user without requiring organization membership.
 * Useful for operations that don't require organization context.
 *
 * @param ctx - The query or mutation context
 * @returns User information
 * @throws Error if not authenticated
 */
export async function authenticateUser(ctx: AuthContext) {
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

  return user;
}

/**
 * Check if a user has a specific permission within an organization.
 *
 * @param auth - The auth result from authenticateAndAuthorize
 * @param permission - The permission to check
 * @returns boolean
 */
export function hasPermission(auth: AuthResult, permission: string): boolean {
  return auth.membership.permissions.includes(permission);
}

/**
 * Role hierarchy for permission checks
 */
export const ROLE_HIERARCHY = {
  owner: ['owner', 'admin', 'editor', 'viewer'],
  admin: ['admin', 'editor', 'viewer'],
  editor: ['editor', 'viewer'],
  viewer: ['viewer'],
} as const;

/**
 * Check if a role has access based on hierarchy
 */
export function roleHasAccess(
  userRole: 'owner' | 'admin' | 'editor' | 'viewer',
  requiredRole: 'owner' | 'admin' | 'editor' | 'viewer'
): boolean {
  return (ROLE_HIERARCHY[userRole] as readonly string[]).includes(requiredRole);
}
