import { QueryCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';

// Handler for getOrganizationBySlug
export async function getOrganizationBySlugHandler(
  ctx: QueryCtx,
  { slug }: { slug: string }
) {
  return await ctx.db
    .query('organizations')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
}

// Handler for getUserOrganizations
export async function getUserOrganizationsHandler(
  ctx: QueryCtx,
  { userId }: { userId: Id<'users'> }
) {
  const memberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .filter((q) => q.eq(q.field('status'), 'active'))
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
}

// Handler for checkUserPermission
export async function checkUserPermissionHandler(
  ctx: QueryCtx,
  {
    userId,
    organizationId,
    permission,
  }: {
    userId: Id<'users'>;
    organizationId: Id<'organizations'>;
    permission: string;
  }
) {
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', userId)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) return false;

  // Owner and admin have all permissions
  if (membership.role === 'owner' || membership.role === 'admin') {
    return true;
  }

  // Check specific permissions
  return membership.permissions.includes('*') || membership.permissions.includes(permission);
}