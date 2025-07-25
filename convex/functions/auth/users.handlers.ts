import { QueryCtx, MutationCtx } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Handler functions extracted for testing

export async function storeHandler(ctx: MutationCtx) {
  console.log('[store] Starting user store mutation');

  const identity = await ctx.auth.getUserIdentity();
  console.log(
    '[store] Identity:',
    identity
      ? {
          subject: identity.subject,
          tokenIdentifier: identity.tokenIdentifier,
          issuer: identity.issuer,
          email: identity.email,
        }
      : 'null'
  );

  if (!identity) {
    console.error('[store] Store mutation called without authentication context');
    throw new Error('Authentication required');
  }

  // Check if user already exists
  const existingUser = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  console.log('[store] Existing user lookup:', existingUser ? 'found' : 'not found');

  const now = Date.now();

  // Handle different JWT claim formats from Clerk
  const email = String(identity.email || '');
  const firstName = String(identity.givenName || identity.given_name || '');
  const lastName = String(identity.familyName || identity.family_name || '');
  const avatar =
    identity.pictureUrl || identity.picture
      ? String(identity.pictureUrl || identity.picture)
      : undefined;

  console.log('[store] User data from JWT:', {
    email,
    firstName,
    lastName,
    hasAvatar: !!avatar,
  });

  if (existingUser) {
    // Update existing user
    console.log('[store] Updating existing user:', existingUser._id);
    await ctx.db.patch(existingUser._id, {
      email,
      firstName,
      lastName,
      avatar,
      lastLogin: now,
      updatedAt: now,
    });
    return existingUser._id;
  } else {
    // Create new user
    console.log('[store] Creating new user with clerkId:', identity.subject);
    const newUserId = await ctx.db.insert('users', {
      clerkId: identity.subject,
      email,
      firstName,
      lastName,
      avatar,
      status: 'active',
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    });
    console.log('[store] New user created with ID:', newUserId);
    return newUserId;
  }
}

export async function currentHandler(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
}

export async function ensureUserHandler(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Authentication required');
  }

  // Check if user already exists
  const existingUser = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (existingUser) {
    // User already exists, just return the ID
    return existingUser._id;
  }

  // Create new user
  const now = Date.now();
  return await ctx.db.insert('users', {
    clerkId: identity.subject,
    email: String(identity.email || ''),
    firstName: String(identity.givenName || identity.given_name || ''),
    lastName: String(identity.familyName || identity.family_name || ''),
    avatar:
      identity.pictureUrl || identity.picture
        ? String(identity.pictureUrl || identity.picture)
        : undefined,
    status: 'active',
    lastLogin: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function currentWithOrganizationsHandler(ctx: QueryCtx) {
  console.log('[currentWithOrganizations] Starting query');

  const identity = await ctx.auth.getUserIdentity();
  console.log(
    '[currentWithOrganizations] Identity:',
    identity
      ? {
          subject: identity.subject,
          tokenIdentifier: identity.tokenIdentifier,
          issuer: identity.issuer,
          email: identity.email,
        }
      : 'null'
  );

  if (!identity) {
    console.log('[currentWithOrganizations] No identity found, returning null');
    return null;
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  console.log(
    '[currentWithOrganizations] User lookup result:',
    user
      ? {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
        }
      : 'null'
  );

  if (!user) {
    console.log('[currentWithOrganizations] No user found for clerkId:', identity.subject);
    return null;
  }

  const memberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
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

  return {
    ...user,
    organizations,
  };
}

export async function getUserByIdHandler(ctx: QueryCtx, args: { userId: Id<'users'> }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const requestingUser = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!requestingUser) return null;

  const targetUser = await ctx.db.get(args.userId);
  if (!targetUser) return null;

  // Check if users share an organization
  const requestingUserMemberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_user', (q) => q.eq('userId', requestingUser._id))
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  const targetUserMemberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_user', (q) => q.eq('userId', args.userId))
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  const sharedOrgs = requestingUserMemberships.some((rm) =>
    targetUserMemberships.some((tm) => tm.organizationId === rm.organizationId)
  );

  if (!sharedOrgs) {
    // Only return basic info if no shared organizations
    return {
      id: targetUser._id,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      avatar: targetUser.avatar,
    };
  }

  // Return full user info if they share an organization
  return targetUser;
}

export async function getOrganizationUsersHandler(
  ctx: QueryCtx,
  args: {
    organizationId: Id<'organizations'>;
    includeInvited?: boolean;
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return [];

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) return [];

  // Verify user has access to organization
  const userMembership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', args.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!userMembership) return [];

  // Get all memberships
  let memberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
    .collect();

  // Filter by status
  if (!args.includeInvited) {
    memberships = memberships.filter((m) => m.status === 'active');
  }

  // Get user details for each membership
  const users = await Promise.all(
    memberships.map(async (membership) => {
      // Handle pending invitations
      if (membership.userId.startsWith('pending_')) {
        return {
          id: membership._id,
          email: membership.userId.replace('pending_', ''),
          firstName: '',
          lastName: '',
          status: 'invited' as const,
          membership: {
            id: membership._id,
            role: membership.role,
            permissions: membership.permissions,
            status: membership.status,
            invitedAt: membership.invitedAt,
            invitedBy: membership.invitedBy,
          },
        };
      }

      const memberUser = await ctx.db.get(membership.userId);
      if (!memberUser) return null;

      const inviter = membership.invitedBy ? await ctx.db.get(membership.invitedBy) : null;

      return {
        id: memberUser._id,
        email: memberUser.email,
        firstName: memberUser.firstName,
        lastName: memberUser.lastName,
        avatar: memberUser.avatar,
        status: memberUser.status,
        lastLogin: memberUser.lastLogin,
        membership: {
          id: membership._id,
          role: membership.role,
          permissions: membership.permissions,
          status: membership.status,
          joinedAt: membership.joinedAt,
          invitedAt: membership.invitedAt,
          invitedBy: inviter
            ? {
                id: inviter._id,
                email: inviter.email,
                firstName: inviter.firstName,
                lastName: inviter.lastName,
              }
            : undefined,
        },
      };
    })
  );

  return users.filter(Boolean);
}

export async function searchUsersHandler(
  ctx: QueryCtx,
  args: {
    query: string;
    organizationId?: Id<'organizations'>;
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return [];

  const requestingUser = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!requestingUser) return [];

  const searchQuery = args.query.toLowerCase();

  // If organization specified, only search within that org
  if (args.organizationId) {
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId!).eq('userId', requestingUser._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) return [];

    const orgMemberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization', (q: any) => q.eq('organizationId', args.organizationId!))
      .filter((q: any) => q.eq(q.field('status'), 'active'))
      .collect();

    const orgUsers = await Promise.all(
      orgMemberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;
        return {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        };
      })
    );

    return orgUsers
      .filter(Boolean)
      .filter(
        (user: any) =>
          user.email.toLowerCase().includes(searchQuery) ||
          user.firstName.toLowerCase().includes(searchQuery) ||
          user.lastName.toLowerCase().includes(searchQuery)
      );
  }

  // Search across all users that share organizations with the requesting user
  const requestingUserMemberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_user', (q) => q.eq('userId', requestingUser._id))
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  const organizationIds = requestingUserMemberships.map((m) => m.organizationId);
  const seenUserIds = new Set<Id<'users'>>();
  const matchingUsers = [];

  for (const orgId of organizationIds) {
    const orgMemberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization', (q) => q.eq('organizationId', orgId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    for (const membership of orgMemberships) {
      if (seenUserIds.has(membership.userId)) continue;
      seenUserIds.add(membership.userId);

      const user = await ctx.db.get(membership.userId);
      if (!user) continue;

      if (
        user.email.toLowerCase().includes(searchQuery) ||
        user.firstName.toLowerCase().includes(searchQuery) ||
        user.lastName.toLowerCase().includes(searchQuery)
      ) {
        matchingUsers.push({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        });
      }
    }
  }

  return matchingUsers;
}