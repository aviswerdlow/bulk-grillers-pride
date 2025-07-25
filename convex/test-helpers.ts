import { Id } from './_generated/dataModel';

// Test user identities
export const testIdentities = {
  owner: {
    tokenIdentifier: 'test-owner|123',
    subject: 'test-owner|123',
    name: 'Test Owner',
    email: 'owner@example.com',
    pictureUrl: 'https://example.com/owner.jpg',
    emailVerified: true,
  },
  admin: {
    tokenIdentifier: 'test-admin|456',
    subject: 'test-admin|456',
    name: 'Test Admin',
    email: 'admin@example.com',
    pictureUrl: 'https://example.com/admin.jpg',
    emailVerified: true,
  },
  member: {
    tokenIdentifier: 'test-member|789',
    subject: 'test-member|789',
    name: 'Test Member',
    email: 'member@example.com',
    pictureUrl: 'https://example.com/member.jpg',
    emailVerified: true,
  },
  unauthenticated: null,
};

// Helper to set auth context for tests
export function setAuthContext(ctx: any, identity: any) {
  if (ctx.auth && ctx.auth.getUserIdentity) {
    ctx.auth.getUserIdentity.mockResolvedValue(identity);
  }
}

// Helper to create test user in database
export async function createTestUser(ctx: any, userId: string, identity: any) {
  const user = {
    _id: userId as Id<'users'>,
    _creationTime: Date.now(),
    clerkId: identity.subject, // This is what the helper queries for
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name,
    email: identity.email,
    image: identity.pictureUrl,
    role: 'customer' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await ctx.db.insert('users', user);
  return user;
}

// Helper to create test organization
export async function createTestOrganization(ctx: any, orgId: string, ownerId: string) {
  const org = {
    _id: orgId as Id<'organizations'>,
    _creationTime: Date.now(),
    name: 'Test Organization',
    slug: 'test-org',
    ownerId: ownerId as Id<'users'>,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPersonal: false,
    subscriptionStatus: 'active' as const,
    subscriptionPlan: 'free' as const,
    enforceUniqueSku: false,
  };
  
  await ctx.db.insert('organizations', org);
  
  // Also create membership
  const membership = {
    _id: `member_${orgId}_${ownerId}` as Id<'organizationMemberships'>,
    _creationTime: Date.now(),
    userId: ownerId as Id<'users'>,
    organizationId: orgId as Id<'organizations'>,
    role: 'owner' as const,
    status: 'active' as const, // The helper queries for active status
    joinedAt: Date.now(),
  };
  
  await ctx.db.insert('organizationMemberships', membership);
  
  return { org, membership };
}

// Helper to create test project
export async function createTestProject(ctx: any, projectId: string, orgId: string) {
  const project = {
    _id: projectId as Id<'projects'>,
    _creationTime: Date.now(),
    organizationId: orgId as Id<'organizations'>,
    name: 'Test Project',
    slug: 'test-project',
    status: 'active' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await ctx.db.insert('projects', project);
  return project;
}

// Helper to setup authenticated test context
export async function setupAuthenticatedContext(
  ctx: any, 
  options: {
    userId?: string;
    orgId?: string;
    projectId?: string;
    identity?: any;
    role?: 'owner' | 'admin' | 'member';
  } = {}
) {
  const userId = options.userId || 'user123';
  const orgId = options.orgId || 'org123';
  const projectId = options.projectId || 'project123';
  const identity = options.identity || testIdentities[options.role || 'owner'];
  
  // Set auth context
  setAuthContext(ctx, identity);
  
  // Create user
  const user = await createTestUser(ctx, userId, identity);
  
  // Create organization
  const { org, membership } = await createTestOrganization(ctx, orgId, userId);
  
  // Create project
  const project = await createTestProject(ctx, projectId, orgId);
  
  return { user, org, membership, project, identity };
}