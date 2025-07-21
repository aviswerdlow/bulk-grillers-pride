import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import {
  createConvexTest,
  createQueryContext,
  createMutationContext,
  setupAuth,
  seedDatabase,
  clearDatabase,
  getTableData,
} from '../convex-test-standard';
import { ConvexTestContext } from '../convex-test-standard';
import {
  storeHandler,
  currentHandler,
  ensureUserHandler,
  currentWithOrganizationsHandler,
  getUserByIdHandler,
  getOrganizationUsersHandler,
  searchUsersHandler,
} from '../../functions/auth/users.handlers';

describe('auth/users', () => {
  let test: ConvexTestContext;

  beforeEach(() => {
    test = createConvexTest();
  });

  afterEach(() => {
    clearDatabase(test);
  });

  describe('store mutation', () => {
    it('should create a new user when authenticated', async () => {
      // Setup auth with Clerk identity
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
        email: 'test@example.com',
      });

      // Mock getUserIdentity to return full JWT claims
      test.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
        pictureUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
        issuer: 'clerk',
      });

      const ctx = createMutationContext(test);
      const userId = await storeHandler(ctx);

      // Verify user was created
      const users = getTableData(test, 'users');
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        status: 'active',
      });
      expect(users[0]._id).toBe(userId);
    });

    it('should update existing user on subsequent calls', async () => {
      // Seed existing user
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'old@example.com',
          firstName: 'Old',
          lastName: 'Name',
          status: 'active',
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
        }],
      });

      // Setup auth
      test.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
        email: 'new@example.com',
        givenName: 'New',
        familyName: 'Name',
        emailVerified: true,
        issuer: 'clerk',
      });

      const ctx = createMutationContext(test);
      const userId = await storeHandler(ctx);

      // Verify user was updated
      expect(userId).toBe('user_1');
      const users = getTableData(test, 'users');
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        _id: 'user_1',
        clerkId: 'clerk_test_123',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Name',
        status: 'active',
      });
      expect(users[0].lastLogin).toBeGreaterThan(users[0].createdAt);
    });

    it('should throw error when not authenticated', async () => {
      setupAuth(test, null);

      const ctx = createMutationContext(test);
      await expect(storeHandler(ctx)).rejects.toThrow('Authentication required');
    });

    it('should handle alternative JWT claim formats', async () => {
      // Test with given_name/family_name format
      test.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        emailVerified: true,
        issuer: 'clerk',
      });

      const ctx = createMutationContext(test);
      await storeHandler(ctx);

      const users = getTableData(test, 'users');
      expect(users[0]).toMatchObject({
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
      });
    });
  });

  describe('current query', () => {
    it('should return current authenticated user', async () => {
      // Seed user
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          status: 'active',
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const user = await currentHandler(ctx);

      expect(user).toMatchObject({
        _id: 'user_1',
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
      });
    });

    it('should return null when not authenticated', async () => {
      setupAuth(test, null);

      const ctx = createQueryContext(test);
      const user = await currentHandler(ctx);

      expect(user).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const user = await currentHandler(ctx);

      expect(user).toBeNull();
    });
  });

  describe('ensureUser mutation', () => {
    it('should create user if not exists', async () => {
      test.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User',
        emailVerified: true,
        issuer: 'clerk',
      });

      const ctx = createMutationContext(test);
      const userId = await ensureUserHandler(ctx);

      const users = getTableData(test, 'users');
      expect(users).toHaveLength(1);
      expect(users[0]._id).toBe(userId);
    });

    it('should return existing user ID if user exists', async () => {
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'test@example.com',
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createMutationContext(test);
      const userId = await ensureUserHandler(ctx);

      expect(userId).toBe('user_1');
      const users = getTableData(test, 'users');
      expect(users).toHaveLength(1); // No duplicate created
    });
  });

  describe('currentWithOrganizations query', () => {
    it('should return user with organization memberships', async () => {
      // Seed data
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }],
        organizations: [{
          _id: 'org_1',
          name: 'Test Org 1',
          slug: 'test-org-1',
        }, {
          _id: 'org_2',
          name: 'Test Org 2',
          slug: 'test-org-2',
        }],
        organizationMemberships: [{
          _id: 'mem_1',
          organizationId: 'org_1',
          userId: 'user_1',
          role: 'owner',
          status: 'active',
          permissions: ['all'],
          joinedAt: Date.now(),
        }, {
          _id: 'mem_2',
          organizationId: 'org_2',
          userId: 'user_1',
          role: 'member',
          status: 'active',
          permissions: ['read'],
          joinedAt: Date.now(),
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const result = await currentWithOrganizationsHandler(ctx);

      expect(result).toBeDefined();
      expect(result?._id).toBe('user_1');
      expect(result?.email).toBe('test@example.com');
      expect(result?.organizations).toHaveLength(2);
      
      // Check organizations exist and filter out null values
      const orgs = result?.organizations.filter(org => org !== null);
      expect(orgs).toHaveLength(2);
      
      const org1 = orgs?.find(org => org._id === 'org_1');
      expect(org1).toMatchObject({
        name: 'Test Org 1',
        membership: {
          role: 'owner',
          permissions: ['all'],
        },
      });
      
      const org2 = orgs?.find(org => org._id === 'org_2');
      expect(org2).toMatchObject({
        name: 'Test Org 2',
        membership: {
          role: 'member',
          permissions: ['read'],
        },
      });
    });

    it('should only return active memberships', async () => {
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
        }],
        organizations: [{
          _id: 'org_1',
          name: 'Active Org',
        }, {
          _id: 'org_2',
          name: 'Inactive Org',
        }],
        organizationMemberships: [{
          _id: 'mem_1',
          organizationId: 'org_1',
          userId: 'user_1',
          role: 'member',
          status: 'active',
          permissions: [],
          joinedAt: Date.now(),
        }, {
          _id: 'mem_2',
          organizationId: 'org_2',
          userId: 'user_1',
          role: 'member',
          status: 'inactive',
          permissions: [],
          joinedAt: Date.now(),
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const result = await currentWithOrganizationsHandler(ctx);

      expect(result?.organizations).toHaveLength(1);
      expect(result?.organizations[0].name).toBe('Active Org');
    });
  });

  describe('getUserById query', () => {
    beforeEach(async () => {
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
        }, {
          _id: 'user_2',
          clerkId: 'clerk_test_456',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
        }],
        organizations: [{
          _id: 'org_1',
          name: 'Shared Org',
        }],
        organizationMemberships: [{
          organizationId: 'org_1',
          userId: 'user_1',
          role: 'member',
          status: 'active',
        }, {
          organizationId: 'org_1',
          userId: 'user_2',
          role: 'member',
          status: 'active',
        }],
      });
    });

    it('should return full user info when users share an organization', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const user = await getUserByIdHandler(ctx, { userId: 'user_2' as any });

      expect(user).toMatchObject({
        _id: 'user_2',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
      });
    });

    it('should return limited info when users do not share organizations', async () => {
      // Add user_3 without shared org
      await seedDatabase(test, {
        users: [{
          _id: 'user_3',
          clerkId: 'clerk_test_789',
          email: 'user3@example.com',
          firstName: 'User',
          lastName: 'Three',
          avatar: 'https://example.com/avatar.jpg',
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const user = await getUserByIdHandler(ctx, { userId: 'user_3' as any });

      expect(user).toEqual({
        id: 'user_3',
        firstName: 'User',
        lastName: 'Three',
        avatar: 'https://example.com/avatar.jpg',
      });
      expect(user).not.toHaveProperty('email');
    });

    it('should return null when user does not exist', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const user = await getUserByIdHandler(ctx, { userId: 'nonexistent' as any });

      expect(user).toBeNull();
    });
  });

  describe('getOrganizationUsers query', () => {
    beforeEach(async () => {
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'owner@example.com',
          firstName: 'Owner',
          lastName: 'User',
        }, {
          _id: 'user_2',
          clerkId: 'clerk_test_456',
          email: 'member@example.com',
          firstName: 'Member',
          lastName: 'User',
          avatar: 'https://example.com/avatar.jpg',
          lastLogin: Date.now(),
        }],
        organizations: [{
          _id: 'org_1',
          name: 'Test Organization',
        }],
        organizationMemberships: [{
          _id: 'mem_1',
          organizationId: 'org_1',
          userId: 'user_1',
          role: 'owner',
          status: 'active',
          permissions: ['all'],
          joinedAt: Date.now() - 10000,
        }, {
          _id: 'mem_2',
          organizationId: 'org_1',
          userId: 'user_2',
          role: 'member',
          status: 'active',
          permissions: ['read', 'write'],
          joinedAt: Date.now() - 5000,
          invitedAt: Date.now() - 20000,
          invitedBy: 'user_1',
        }],
      });
    });

    it('should return all active users in organization', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const users = await getOrganizationUsersHandler(ctx, { 
        organizationId: 'org_1' as any,
        includeInvited: false,
      });

      expect(users).toHaveLength(2);
      expect(users).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'user_1',
          email: 'owner@example.com',
          membership: expect.objectContaining({
            role: 'owner',
            status: 'active',
          }),
        }),
        expect.objectContaining({
          id: 'user_2',
          email: 'member@example.com',
          membership: expect.objectContaining({
            role: 'member',
            status: 'active',
            invitedBy: expect.objectContaining({
              id: 'user_1',
              email: 'owner@example.com',
            }),
          }),
        }),
      ]));
    });

    it('should handle pending invitations when includeInvited is true', async () => {
      // Add pending invitation
      await seedDatabase(test, {
        organizationMemberships: [{
          _id: 'mem_3',
          organizationId: 'org_1',
          userId: 'pending_invited@example.com',
          role: 'member',
          status: 'invited',
          permissions: ['read'],
          invitedAt: Date.now(),
          invitedBy: 'user_1',
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const users = await getOrganizationUsersHandler(ctx, { 
        organizationId: 'org_1' as any,
        includeInvited: true,
      });

      expect(users).toHaveLength(3);
      expect(users).toEqual(expect.arrayContaining([
        expect.objectContaining({
          email: 'invited@example.com',
          status: 'invited',
          membership: expect.objectContaining({
            status: 'invited',
          }),
        }),
      ]));
    });

    it('should return empty array when user lacks access', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_789',
        subject: 'clerk_test_789',
      });

      // Add user without membership
      await seedDatabase(test, {
        users: [{
          _id: 'user_3',
          clerkId: 'clerk_test_789',
        }],
      });

      const ctx = createQueryContext(test);
      const users = await getOrganizationUsersHandler(ctx, { 
        organizationId: 'org_1' as any,
      });

      expect(users).toEqual([]);
    });
  });

  describe('searchUsers query', () => {
    beforeEach(async () => {
      await seedDatabase(test, {
        users: [{
          _id: 'user_1',
          clerkId: 'clerk_test_123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }, {
          _id: 'user_2',
          clerkId: 'clerk_test_456',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        }, {
          _id: 'user_3',
          clerkId: 'clerk_test_789',
          email: 'bob.johnson@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
        }],
        organizations: [{
          _id: 'org_1',
          name: 'Org 1',
        }, {
          _id: 'org_2',
          name: 'Org 2',
        }],
        organizationMemberships: [{
          organizationId: 'org_1',
          userId: 'user_1',
          role: 'member',
          status: 'active',
        }, {
          organizationId: 'org_1',
          userId: 'user_2',
          role: 'member',
          status: 'active',
        }, {
          organizationId: 'org_2',
          userId: 'user_1',
          role: 'member',
          status: 'active',
        }, {
          organizationId: 'org_2',
          userId: 'user_3',
          role: 'member',
          status: 'active',
        }],
      });
    });

    it('should search users by email within organization', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const results = await searchUsersHandler(ctx, { 
        query: 'jane',
        organizationId: 'org_1' as any,
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        email: 'jane.smith@example.com',
        firstName: 'Jane',
      });
    });

    it('should search users by name across shared organizations', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const results = await searchUsersHandler(ctx, { 
        query: 'john',
      });

      expect(results).toHaveLength(2); // John and Johnson
      expect(results).toEqual(expect.arrayContaining([
        expect.objectContaining({
          firstName: 'John',
        }),
        expect.objectContaining({
          lastName: 'Johnson',
        }),
      ]));
    });

    it('should not return users from unshared organizations', async () => {
      // User 4 is only in org_3
      await seedDatabase(test, {
        users: [{
          _id: 'user_4',
          clerkId: 'clerk_test_999',
          email: 'john.private@example.com',
          firstName: 'John',
          lastName: 'Private',
        }],
        organizations: [{
          _id: 'org_3',
          name: 'Private Org',
        }],
        organizationMemberships: [{
          organizationId: 'org_3',
          userId: 'user_4',
          role: 'member',
          status: 'active',
        }],
      });

      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const results = await searchUsersHandler(ctx, { 
        query: 'john',
      });

      // Should not include John Private
      expect(results.find(u => u.lastName === 'Private')).toBeUndefined();
    });

    it('should handle case-insensitive search', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_123',
        subject: 'clerk_test_123',
      });

      const ctx = createQueryContext(test);
      const results = await searchUsersHandler(ctx, { 
        query: 'JANE',
        organizationId: 'org_1' as any,
      });

      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Jane');
    });

    it('should return empty array when no access to organization', async () => {
      setupAuth(test, {
        tokenIdentifier: 'clerk_test_999',
        subject: 'clerk_test_999',
      });

      await seedDatabase(test, {
        users: [{
          _id: 'user_5',
          clerkId: 'clerk_test_999',
        }],
      });

      const ctx = createQueryContext(test);
      const results = await searchUsersHandler(ctx, { 
        query: 'jane',
        organizationId: 'org_1' as any,
      });

      expect(results).toEqual([]);
    });
  });
});