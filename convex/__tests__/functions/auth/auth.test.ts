import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  convexAssertions,
  runMutation,
  runQuery,
} from '../../setup/convex-test-setup';
import * as users from '../../../functions/auth/users';
import * as invitations from '../../../functions/auth/invitations';
import * as permissions from '../../../functions/auth/permissions';
import * as sessions from '../../../functions/auth/sessions';

describe('Auth Module', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    db = new MockDatabase();
    testData = await seedTestData(db);
  });

  describe('users', () => {
    describe('getCurrentUser', () => {
      it('should return current user data', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        const result = await runQuery(users.current, ctx, {});

        expect(result).toBeDefined();
        expect(result?.clerkId).toBe(mockIdentities.user.subject);
        expect(result?.email).toBe(mockIdentities.user.email);
      });

      it('should return null for unauthenticated user', async () => {
        const ctx = createMockQueryContext(null, db);

        const result = await runQuery(users.current, ctx, {});

        expect(result).toBeNull();
      });

      it('should handle user without email', async () => {
        const ctx = createMockQueryContext(mockIdentities.noEmail, db);

        // Create user without email
        await db.insert('users', {
          clerkId: mockIdentities.noEmail.subject,
          firstName: mockIdentities.noEmail.given_name,
          lastName: mockIdentities.noEmail.family_name,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const result = await runQuery(users.current, ctx, {});

        expect(result).toBeDefined();
        expect(result?.email).toBeUndefined();
      });
    });

    describe('getOrganizationUsers', () => {
      it('should return users in organization', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        // Add another user to the organization
        const anotherUserId = await db.insert('users', {
          clerkId: 'user_another',
          email: 'another@example.com',
          firstName: 'Another',
          lastName: 'User',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          organizationId: testData.orgId,
          userId: anotherUserId,
          role: 'editor',
          permissions: ['VIEW_PRODUCTS', 'CREATE_PRODUCTS'],
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const result = await runQuery(users.getOrganizationUsers, ctx, {
          organizationId: testData.orgId,
        });

        expect(result).toHaveLength(2);
        expect(result.map((u: any) => u.email)).toContain('test@example.com');
        expect(result.map((u: any) => u.email)).toContain('another@example.com');
      });

      it('should include membership details', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        const result = await runQuery(users.getOrganizationUsers, ctx, {
          organizationId: testData.orgId,
        });

        expect(result[0].membership).toBeDefined();
        expect(result[0].membership?.role).toBe('owner');
        expect(result[0].membership?.status).toBe('active');
      });

      it('should throw error for unauthorized access', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        // Create another organization
        const otherOrgId = await db.insert('organizations', {
          name: 'Other Org',
          slug: 'other-org',
          status: 'active',
          subscription: {
            plan: 'free',
            status: 'active',
            seats: 1,
            features: [],
          },
          settings: {
            aiProvider: 'openai',
            aiModel: 'gpt-3.5-turbo',
            apiKeys: {},
            categorization: {
              batchSize: 50,
              prompt: 'Default prompt',
              autoApprove: false,
              confidenceThreshold: 0.8,
            },
            storage: {
              maxFileSize: 10485760,
              totalStorageLimit: 1073741824,
              allowedFileTypes: ['.csv', '.xlsx'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        });

        await expect(
          runQuery(users.getOrganizationUsers, ctx, {
            organizationId: otherOrgId,
          })
        ).rejects.toThrow('Access denied');
      });
    });

    describe('ensureUser', () => {
      it('should create user if not exists', async () => {
        const ctx = createMockMutationContext(mockIdentities.admin, db);

        const userId = await runMutation(users.ensureUser, ctx, {});

        convexAssertions.expectToBeValidId(userId, 'users');

        const user = await db.get(userId);
        expect(user.clerkId).toBe(mockIdentities.admin.subject);
        expect(user.email).toBe(mockIdentities.admin.email);
        expect(user.status).toBe('active');
      });

      it('should return existing user ID if already exists', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        const userId = await runMutation(users.ensureUser, ctx, {});

        expect(userId).toBe(testData.userId);
      });

      it('should update user data if changed', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Update the mock identity
        const updatedIdentity = {
          ...mockIdentities.user,
          given_name: 'Updated',
          family_name: 'Name',
        };
        const updatedCtx = createMockMutationContext(updatedIdentity, db);

        await runMutation(users.ensureUser, updatedCtx, {});

        const user = await db.get(testData.userId);
        expect(user.firstName).toBe('Updated');
        expect(user.lastName).toBe('Name');
      });
    });
  });

  describe('invitations', () => {
    describe('createInvitation', () => {
      it('should create a new invitation', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        const inviteId = await runMutation(invitations.inviteToOrganization, ctx, {
          organizationId: testData.orgId,
          email: 'newuser@example.com',
          role: 'editor',
          message: 'Welcome to our team!',
        });

        convexAssertions.expectToBeValidId(inviteId, 'invitations');

        const invite = await db.get(inviteId);
        expect(invite.email).toBe('newuser@example.com');
        expect(invite.role).toBe('editor');
        expect(invite.status).toBe('pending');
        expect(invite.invitedBy).toBe(testData.userId);
        expect(invite.expiresAt).toBeGreaterThan(Date.now());
      });

      it('should prevent duplicate pending invitations', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Create first invitation
        await runMutation(invitations.inviteToOrganization, ctx, {
          organizationId: testData.orgId,
          email: 'duplicate@example.com',
          role: 'viewer',
        });

        // Try to create duplicate
        await expect(
          runMutation(invitations.inviteToOrganization, ctx, {
            organizationId: testData.orgId,
            email: 'duplicate@example.com',
            role: 'editor',
          })
        ).rejects.toThrow('User already has a pending invitation');
      });

      it('should prevent inviting existing members', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        await expect(
          runMutation(invitations.inviteToOrganization, ctx, {
            organizationId: testData.orgId,
            email: 'test@example.com', // Already a member
            role: 'editor',
          })
        ).rejects.toThrow('User is already a member of this organization');
      });

      it('should require invite permissions', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Update membership to viewer role (no invite permission)
        const memberships = await db.query('organizationMemberships').collect();
        const membership = memberships.find(
          (m) => m.userId === testData.userId && m.organizationId === testData.orgId
        );
        await db.patch(membership._id, {
          role: 'viewer',
          permissions: ['VIEW_PRODUCTS', 'VIEW_CATEGORIES'],
        });

        await expect(
          runMutation(invitations.inviteToOrganization, ctx, {
            organizationId: testData.orgId,
            email: 'newuser@example.com',
            role: 'viewer',
          })
        ).rejects.toThrow('You do not have permission to invite users');
      });
    });

    describe('acceptInvitation', () => {
      let invitationId: string;

      beforeEach(async () => {
        // Create a pending invitation
        invitationId = await db.insert('invitations', {
          organizationId: testData.orgId,
          email: mockIdentities.admin.email,
          role: 'editor',
          status: 'pending',
          invitedBy: testData.userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      });

      it('should accept invitation and create membership', async () => {
        const ctx = createMockMutationContext(mockIdentities.admin, db);

        // Create the admin user first
        const adminUserId = await db.insert('users', {
          clerkId: mockIdentities.admin.subject,
          email: mockIdentities.admin.email,
          firstName: mockIdentities.admin.given_name,
          lastName: mockIdentities.admin.family_name,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const membershipId = await runMutation(invitations.acceptInvitation, ctx, {
          invitationId,
        });

        convexAssertions.expectToBeValidId(membershipId, 'organizationMemberships');

        // Check invitation was accepted
        const invitation = await db.get(invitationId);
        expect(invitation.status).toBe('accepted');
        expect(invitation.acceptedAt).toBeDefined();
        expect(invitation.acceptedBy).toBe(adminUserId);

        // Check membership was created
        const membership = await db.get(membershipId);
        expect(membership.userId).toBe(adminUserId);
        expect(membership.organizationId).toBe(testData.orgId);
        expect(membership.role).toBe('editor');
        expect(membership.status).toBe('active');
      });

      it('should throw error for expired invitation', async () => {
        const ctx = createMockMutationContext(mockIdentities.admin, db);

        // Update invitation to be expired
        await db.patch(invitationId, {
          expiresAt: Date.now() - 1000, // Expired
        });

        await expect(
          runMutation(invitations.acceptInvitation, ctx, {
            invitationId,
          })
        ).rejects.toThrow('This invitation has expired');
      });

      it('should throw error for wrong email', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        await expect(
          runMutation(invitations.acceptInvitation, ctx, {
            invitationId,
          })
        ).rejects.toThrow('This invitation is for a different email address');
      });

      it('should throw error for already accepted invitation', async () => {
        const ctx = createMockMutationContext(mockIdentities.admin, db);

        // Update invitation to be accepted
        await db.patch(invitationId, {
          status: 'accepted',
          acceptedAt: Date.now(),
        });

        await expect(
          runMutation(invitations.acceptInvitation, ctx, {
            invitationId,
          })
        ).rejects.toThrow('Invitation is no longer pending');
      });
    });

    describe('revokeInvitation', () => {
      let invitationId: string;

      beforeEach(async () => {
        invitationId = await db.insert('invitations', {
          organizationId: testData.orgId,
          email: 'invited@example.com',
          role: 'viewer',
          status: 'pending',
          invitedBy: testData.userId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      });

      it('should revoke pending invitation', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        await runMutation(invitations.revokeInvitation, ctx, {
          invitationId,
        });

        const invitation = await db.get(invitationId);
        expect(invitation.status).toBe('revoked');
        expect(invitation.revokedAt).toBeDefined();
        expect(invitation.revokedBy).toBe(testData.userId);
      });

      it('should require invite permissions', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Update membership to viewer role
        const memberships = await db.query('organizationMemberships').collect();
        const membership = memberships.find(
          (m) => m.userId === testData.userId && m.organizationId === testData.orgId
        );
        await db.patch(membership._id, {
          role: 'viewer',
          permissions: ['VIEW_PRODUCTS'],
        });

        await expect(
          runMutation(invitations.revokeInvitation, ctx, {
            invitationId,
          })
        ).rejects.toThrow('You do not have permission to revoke invitations');
      });
    });
  });

  describe('permissions', () => {
    describe('hasPermission', () => {
      it('should return true for owner with any permission', async () => {
        const result = await permissions.hasPermission(
          { db } as any,
          testData.userId,
          testData.orgId,
          'ANY_PERMISSION'
        );

        expect(result).toBe(true);
      });

      it('should check specific permissions for non-owner roles', async () => {
        // Create editor user
        const editorUserId = await db.insert('users', {
          clerkId: 'user_editor',
          email: 'editor@example.com',
          firstName: 'Editor',
          lastName: 'User',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          organizationId: testData.orgId,
          userId: editorUserId,
          role: 'editor',
          permissions: permissions.ROLE_PERMISSIONS.editor,
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Should have editor permissions
        const canEdit = await permissions.hasPermission(
          { db } as any,
          editorUserId as any,
          testData.orgId,
          permissions.PERMISSIONS.CREATE_PRODUCTS
        );
        expect(canEdit).toBe(true);

        // Should not have admin permissions
        const canInvite = await permissions.hasPermission(
          { db } as any,
          editorUserId as any,
          testData.orgId,
          permissions.PERMISSIONS.INVITE_USERS
        );
        expect(canInvite).toBe(false);
      });

      it('should return false for inactive membership', async () => {
        // Update membership to inactive
        const memberships = await db.query('organizationMemberships').collect();
        const membership = memberships.find(
          (m) => m.userId === testData.userId && m.organizationId === testData.orgId
        );
        await db.patch(membership._id, { status: 'inactive' });

        const result = await permissions.hasPermission(
          { db } as any,
          testData.userId,
          testData.orgId,
          permissions.PERMISSIONS.VIEW_PRODUCTS
        );

        expect(result).toBe(false);
      });
    });

    describe('updateUserRole', () => {
      let targetUserId: string;

      beforeEach(async () => {
        // Create a user to update
        targetUserId = await db.insert('users', {
          clerkId: 'user_target',
          email: 'target@example.com',
          firstName: 'Target',
          lastName: 'User',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await db.insert('organizationMemberships', {
          organizationId: testData.orgId,
          userId: targetUserId,
          role: 'viewer',
          permissions: permissions.ROLE_PERMISSIONS.viewer,
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      it('should update user role and permissions', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        await runMutation(permissions.updateUserRole, ctx, {
          organizationId: testData.orgId,
          userId: targetUserId,
          role: 'editor',
        });

        const memberships = await db.query('organizationMemberships').collect();
        const membership = memberships.find(
          (m) => m.userId === targetUserId && m.organizationId === testData.orgId
        );

        expect(membership?.role).toBe('editor');
        expect(membership?.permissions).toEqual(permissions.ROLE_PERMISSIONS.editor);
      });

      it('should prevent changing owner role', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        await expect(
          runMutation(permissions.updateUserRole, ctx, {
            organizationId: testData.orgId,
            userId: testData.userId, // Try to change own owner role
            role: 'admin',
          })
        ).rejects.toThrow('Cannot change the role of an organization owner');
      });

      it('should require role update permissions', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Update to editor role (no role update permission)
        const memberships = await db.query('organizationMemberships').collect();
        const membership = memberships.find(
          (m) => m.userId === testData.userId && m.organizationId === testData.orgId
        );
        await db.patch(membership._id, {
          role: 'editor',
          permissions: permissions.ROLE_PERMISSIONS.editor,
        });

        await expect(
          runMutation(permissions.updateUserRole, ctx, {
            organizationId: testData.orgId,
            userId: targetUserId,
            role: 'admin',
          })
        ).rejects.toThrow('You do not have permission to update user roles');
      });
    });
  });

  describe('sessions', () => {
    describe('getUserSessions', () => {
      it('should return user sessions', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        // Create some sessions
        await db.insert('sessions', {
          userId: testData.userId,
          organizationId: testData.orgId,
          token: 'session-1',
          expiresAt: Date.now() + 3600000,
          lastActivityAt: Date.now(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: Date.now(),
        });

        await db.insert('sessions', {
          userId: testData.userId,
          organizationId: testData.orgId,
          token: 'session-2',
          expiresAt: Date.now() + 7200000,
          lastActivityAt: Date.now() - 1800000,
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/96.0',
          createdAt: Date.now() - 3600000,
        });

        const result = await runQuery(sessions.getActiveSessions, ctx, {
          organizationId: testData.orgId,
        });

        expect(result).toHaveLength(2);
        expect(result[0].token).toBe('session-1');
        expect(result[0].isActive).toBe(true);
      });

      it('should filter out expired sessions', async () => {
        const ctx = createMockQueryContext(mockIdentities.user, db);

        // Create expired session
        await db.insert('sessions', {
          userId: testData.userId,
          organizationId: testData.orgId,
          token: 'expired-session',
          expiresAt: Date.now() - 1000, // Expired
          lastActivityAt: Date.now() - 3600000,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: Date.now() - 7200000,
        });

        const result = await runQuery(sessions.getActiveSessions, ctx, {
          organizationId: testData.orgId,
        });

        expect(result).toHaveLength(0);
      });
    });

    describe('updateActivity', () => {
      it('should update session activity timestamp', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Create a session
        const sessionId = await db.insert('sessions', {
          userId: testData.userId,
          organizationId: testData.orgId,
          token: 'active-session',
          expiresAt: Date.now() + 3600000,
          lastActivityAt: Date.now() - 600000, // 10 minutes ago
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: Date.now() - 1200000,
        });

        const beforeUpdate = await db.get(sessionId);
        const oldActivity = beforeUpdate.lastActivityAt;

        await runMutation(sessions.trackActivity, ctx, {
          sessionToken: 'active-session',
        });

        const afterUpdate = await db.get(sessionId);
        expect(afterUpdate.lastActivityAt).toBeGreaterThan(oldActivity);
      });

      it('should not update expired sessions', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Create expired session
        await db.insert('sessions', {
          userId: testData.userId,
          organizationId: testData.orgId,
          token: 'expired-session',
          expiresAt: Date.now() - 1000,
          lastActivityAt: Date.now() - 3600000,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: Date.now() - 7200000,
        });

        await expect(
          runMutation(sessions.trackActivity, ctx, {
            sessionToken: 'expired-session',
          })
        ).rejects.toThrow('Session not found or expired');
      });
    });

    // TODO: Re-enable when revokeSession is implemented
    describe.skip('revokeSession', () => {
      it('should delete a session', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Create a session
        const sessionId = await db.insert('sessions', {
          userId: testData.userId,
          organizationId: testData.orgId,
          token: 'revoke-me',
          expiresAt: Date.now() + 3600000,
          lastActivityAt: Date.now(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: Date.now(),
        });

        await runMutation(sessions.revokeSession, ctx, {
          sessionToken: 'revoke-me',
        });

        const session = await db.get(sessionId);
        expect(session).toBeNull();
      });

      it('should only revoke own sessions', async () => {
        const ctx = createMockMutationContext(mockIdentities.user, db);

        // Create another user's session
        const otherUserId = await db.insert('users', {
          clerkId: 'user_other',
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const sessionId = await db.insert('sessions', {
          userId: otherUserId,
          organizationId: testData.orgId,
          token: 'other-session',
          expiresAt: Date.now() + 3600000,
          lastActivityAt: Date.now(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: Date.now(),
        });

        await expect(
          runMutation(sessions.revokeSession, ctx, {
            sessionToken: 'other-session',
          })
        ).rejects.toThrow('Session not found');

        // Session should still exist
        const session = await db.get(sessionId);
        expect(session).toBeDefined();
      });
    });
  });
});
