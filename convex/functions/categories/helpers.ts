import { QueryCtx, MutationCtx } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Shared authentication and permission checking logic
export async function getUserAndVerifyAccess(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  // Verify user has access to this organization
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new Error('User not found');

  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) throw new Error('Access denied');

  return { user, membership };
}

export async function getUserAndVerifyEditPermissions(
  ctx: MutationCtx,
  organizationId: Id<'organizations'>
) {
  const { user, membership } = await getUserAndVerifyAccess(ctx, organizationId);

  if (!['owner', 'admin', 'editor'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  return { user, membership };
}

export async function getUserAndVerifyDeletePermissions(
  ctx: MutationCtx,
  organizationId: Id<'organizations'>
) {
  const { user, membership } = await getUserAndVerifyAccess(ctx, organizationId);

  if (!['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  return { user, membership };
}

// Generate a handle from a category name
export function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
}

// Create an audit log entry
export async function createAuditLog(
  ctx: MutationCtx,
  params: {
    organizationId: Id<'organizations'>;
    eventType: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: string;
    entityId: string;
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changeType: 'added' | 'modified' | 'removed';
    }>;
    beforeSnapshot?: any;
    context: {
      action: string;
      source: 'web' | 'api' | 'import' | 'ai';
    };
    performedBy: {
      type: 'user';
      userId: Id<'users'>;
      userEmail: string;
    };
    metadata?: any;
    isRollbackable?: boolean;
    rollbackData?: any;
  }
) {
  await ctx.db.insert('auditLogs', {
    ...params,
    metadata: params.metadata || {},
    isRollbackable: params.isRollbackable || false,
    timestamp: Date.now(),
  });
}
