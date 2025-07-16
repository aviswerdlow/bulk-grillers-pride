import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  convexAssertions,
  runMutation,
  runQuery,
} from '../../setup/convex-test-setup';
import * as users from '../../../functions/auth/users';

describe('Auth/Users Module', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  describe('mutations', () => {
    describe('store', () => {
      it('should create new user when they first sign in', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        const userId = await runMutation(users.store, ctx, {});

        convexAssertions.expectToBeValidId(userId, 'users');

        const user = await db.get(userId);
        expect(user.clerkId).toBe(mockIdentities.user.subject);
        expect(user.email).toBe(mockIdentities.user.email);
        expect(user.firstName).toBe(mockIdentities.user.given_name);
        expect(user.lastName).toBe(mockIdentities.user.family_name);
        expect(user.avatar).toBe(mockIdentities.user.picture);
        expect(user.status).toBe('active');
        convexAssertions.expectToHaveTimestamps(user);
      });

      it('should update existing user on subsequent sign ins', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // First sign in
        const userId = await runMutation(users.store, ctx, {});
        const originalUser = await db.get(userId);
        const originalLogin = originalUser.lastLogin;

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Second sign in
        const secondUserId = await runMutation(users.store, ctx, {});

        expect(secondUserId).toBe(userId); // Should return same user ID

        const updatedUser = await db.get(userId);
        expect(updatedUser.lastLogin).toBeGreaterThan(originalLogin);
        expect(updatedUser.updatedAt).toBeGreaterThan(originalUser.updatedAt);
      });

      it('should handle missing email gracefully', async () => {
        const ctx = createMockMutationContext(mockIdentities.noEmail, db);

        const userId = await runMutation(users.store, ctx, {});

        const user = await db.get(userId);
        expect(user.email).toBe(''); // Should default to empty string
        expect(user.firstName).toBe(mockIdentities.noEmail.given_name);
      });

      it('should throw error when called without authentication', async () => {
        const ctx = createMockMutationContext(null, db);

        await expect(runMutation(users.store, ctx, {})).rejects.toThrow('Authentication required');
      });

      it('should handle different JWT claim formats', async () => {
        const alternativeIdentity = {
          ...mockIdentities.user,
          givenName: 'Alternative',
          familyName: 'Format',
          pictureUrl: 'https://example.com/alt-avatar.jpg',
          // Remove the underscore versions
          given_name: undefined,
          family_name: undefined,
          picture: undefined,
        };

        const ctx = createMockMutationContext(alternativeIdentity, db);

        const userId = await runMutation(users.store, ctx, {});

        const user = await db.get(userId);
        expect(user.firstName).toBe('Alternative');
        expect(user.lastName).toBe('Format');
        expect(user.avatar).toBe('https://example.com/alt-avatar.jpg');
      });
    });

    describe('ensureUser', () => {
      it('should create user if not exists', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        const userId = await runMutation(users.ensureUser, ctx, {});

        convexAssertions.expectToBeValidId(userId, 'users');

        const user = await db.get(userId);
        expect(user.clerkId).toBe(mockIdentities.user.subject);
        expect(user.status).toBe('active');
      });

      it('should return existing user ID if user exists', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Create user first
        const firstId = await runMutation(users.ensureUser, ctx, {});

        // Call again
        const secondId = await runMutation(users.ensureUser, ctx, {});

        expect(secondId).toBe(firstId);
      });

      it('should throw error when not authenticated', async () => {
        const ctx = createMockMutationContext(null, db);

        await expect(runMutation(users.ensureUser, ctx, {})).rejects.toThrow(
          'Authentication required'
        );
      });
    });
  });

  describe('queries', () => {
    describe('current', () => {
      it('should return current authenticated user', async () => {
        // First create the user
        const mutationCtx = createMockMutationContext(mockIdentities.user, db);
        await runMutation(users.store, mutationCtx, {});

        // Then query
        const queryCtx = createMockQueryContext(mockIdentities.user, db);
        const currentUser = await runQuery(users.current, queryCtx, {});

        expect(currentUser).toBeDefined();
        expect(currentUser?.clerkId).toBe(mockIdentities.user.subject);
        expect(currentUser?.email).toBe(mockIdentities.user.email);
      });

      it('should return null for unauthenticated user', async () => {
        const ctx = createMockQueryContext(null, db);

        const currentUser = await runQuery(users.current, ctx, {});

        expect(currentUser).toBeNull();
      });

      it('should return null if user not in database', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        const currentUser = await runQuery(users.current, ctx, {});

        expect(currentUser).toBeNull();
      });
    });

    describe('currentWithOrganizations', () => {
      it('should return user with organization memberships', async () => {
        // Setup: Create user, org, and membership
        const mutationCtx = createMockMutationContext(mockIdentities.user, db);
        const userId = await runMutation(users.store, mutationCtx, {});

        const orgId = await db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          createdBy: userId,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          userId,
          organizationId: orgId,
          role: 'owner',
          permissions: ['*'],
          status: 'active',
          joinedAt: Date.now(),
        });

        // Query
        const queryCtx = createMockQueryContext(mockIdentities.user, db);
        const userWithOrgs = await runQuery(users.currentWithOrganizations, queryCtx, {});

        expect(userWithOrgs).toBeDefined();
        expect(userWithOrgs?.organizations).toHaveLength(1);
        expect(userWithOrgs?.organizations[0].name).toBe('Test Org');
        expect(userWithOrgs?.organizations[0].membership.role).toBe('owner');
      });

      it('should return null for unauthenticated user', async () => {
        const ctx = createMockQueryContext(null, db);

        const result = await runQuery(users.currentWithOrganizations, ctx, {});

        expect(result).toBeNull();
      });

      it('should only return active memberships', async () => {
        // Setup
        const mutationCtx = createMockMutationContext(mockIdentities.user, db);
        const userId = await runMutation(users.store, mutationCtx, {});

        const activeOrgId = await db.insert('organizations', {
          name: 'Active Org',
          slug: 'active-org',
          createdBy: userId,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const inactiveOrgId = await db.insert('organizations', {
          name: 'Inactive Org',
          slug: 'inactive-org',
          createdBy: userId,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Active membership
        await db.insert('organizationMemberships', {
          userId,
          organizationId: activeOrgId,
          role: 'member',
          permissions: ['read'],
          status: 'active',
          joinedAt: Date.now(),
        });

        // Inactive membership
        await db.insert('organizationMemberships', {
          userId,
          organizationId: inactiveOrgId,
          role: 'member',
          permissions: ['read'],
          status: 'inactive',
          joinedAt: Date.now(),
        });

        // Query
        const queryCtx = createMockQueryContext(mockIdentities.user, db);
        const userWithOrgs = await runQuery(users.currentWithOrganizations, queryCtx, {});

        expect(userWithOrgs?.organizations).toHaveLength(1);
        expect(userWithOrgs?.organizations[0].name).toBe('Active Org');
      });
    });

    describe('getUserById', () => {
      it('should return full user info for users in same organization', async () => {
        // Setup: Create two users in same org
        const mutationCtx1 = createMockMutationContext(mockIdentities.user, db);
        const user1Id = await runMutation(users.store, mutationCtx1, {});

        const mutationCtx2 = createMockMutationContext(mockIdentities.admin, db);
        const user2Id = await runMutation(users.store, mutationCtx2, {});

        const orgId = await db.insert('organizations', {
          name: 'Shared Org',
          slug: 'shared-org',
          createdBy: user1Id,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Add both users to org
        await db.insert('organizationMemberships', {
          userId: user1Id,
          organizationId: orgId,
          role: 'owner',
          permissions: ['*'],
          status: 'active',
          joinedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          userId: user2Id,
          organizationId: orgId,
          role: 'member',
          permissions: ['read'],
          status: 'active',
          joinedAt: Date.now(),
        });

        // User 1 queries User 2
        const queryCtx = createMockQueryContext(mockIdentities.user, db);
        const targetUser = await runQuery(users.getUserById, queryCtx, { userId: user2Id });

        expect(targetUser).toBeDefined();
        expect(targetUser?.email).toBe(mockIdentities.admin.email); // Full info visible
        expect(targetUser?.clerkId).toBe(mockIdentities.admin.subject);
      });

      it('should return limited info for users not in same organization', async () => {
        // Setup: Create two users in different orgs
        const mutationCtx1 = createMockMutationContext(mockIdentities.user, db);
        const user1Id = await runMutation(users.store, mutationCtx1, {});

        const mutationCtx2 = createMockMutationContext(mockIdentities.admin, db);
        const user2Id = await runMutation(users.store, mutationCtx2, {});

        // Create separate orgs
        const org1Id = await db.insert('organizations', {
          name: 'Org 1',
          slug: 'org-1',
          createdBy: user1Id,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const org2Id = await db.insert('organizations', {
          name: 'Org 2',
          slug: 'org-2',
          createdBy: user2Id,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Add users to their respective orgs
        await db.insert('organizationMemberships', {
          userId: user1Id,
          organizationId: org1Id,
          role: 'owner',
          permissions: ['*'],
          status: 'active',
          joinedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          userId: user2Id,
          organizationId: org2Id,
          role: 'owner',
          permissions: ['*'],
          status: 'active',
          joinedAt: Date.now(),
        });

        // User 1 queries User 2
        const queryCtx = createMockQueryContext(mockIdentities.user, db);
        const targetUser = await runQuery(users.getUserById, queryCtx, { userId: user2Id });

        expect(targetUser).toBeDefined();
        expect(targetUser?.firstName).toBe(mockIdentities.admin.given_name);
        expect(targetUser?.email).toBeUndefined(); // Limited info
        expect(targetUser?.clerkId).toBeUndefined(); // Limited info
      });
    });

    describe('searchUsers', () => {
      it('should search users by email within organization', async () => {
        // Setup
        const mutationCtx1 = createMockMutationContext(mockIdentities.user, db);
        const user1Id = await runMutation(users.store, mutationCtx1, {});

        const mutationCtx2 = createMockMutationContext(mockIdentities.admin, db);
        const user2Id = await runMutation(users.store, mutationCtx2, {});

        const orgId = await db.insert('organizations', {
          name: 'Search Org',
          slug: 'search-org',
          createdBy: user1Id,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Add both users
        await db.insert('organizationMemberships', {
          userId: user1Id,
          organizationId: orgId,
          role: 'owner',
          permissions: ['*'],
          status: 'active',
          joinedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          userId: user2Id,
          organizationId: orgId,
          role: 'member',
          permissions: ['read'],
          status: 'active',
          joinedAt: Date.now(),
        });

        // Search
        const queryCtx = createMockQueryContext(mockIdentities.user, db);
        const results = await runQuery(users.searchUsers, queryCtx, {
          query: 'admin',
          organizationId: orgId,
        });

        expect(results).toHaveLength(1);
        expect(results[0].email).toBe('admin@example.com');
      });

      it('should return empty array for unauthenticated user', async () => {
        const ctx = createMockQueryContext(null, db);

        const results = await runQuery(users.searchUsers, ctx, {
          query: 'test',
        });

        expect(results).toEqual([]);
      });
    });
  });
});
