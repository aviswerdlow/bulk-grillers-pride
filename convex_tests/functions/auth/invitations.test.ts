import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the auth module before importing anything that uses it
jest.mock('../../../lib/auth');

import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  convexAssertions,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import { runMutation, runQuery } from '../../setup/test_runner';
import {
  inviteToOrganization,
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
  revokeInvitation,
} from '../../../functions/auth/invitations';

describe('Invitations Module', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('inviteToOrganization', () => {
    it('should create a pending membership invitation', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const membershipId = await runMutation(inviteToOrganization, ctx, {
        organizationId: testData.orgId,
        email: 'newuser@example.com',
        role: 'editor',
        permissions: ['products.read', 'products.write'],
      });

      convexAssertions.expectToBeValidId(membershipId, 'organizationMemberships');

      const membership = await db.get(membershipId);
      expect(membership.organizationId).toBe(testData.orgId);
      expect(membership.userId).toBe('pending_newuser@example.com');
      expect(membership.role).toBe('editor');
      expect(membership.permissions).toEqual(['products.read', 'products.write']);
      expect(membership.status).toBe('pending');
      expect(membership.invitedBy).toBe(testData.userId);
      expect(membership.invitedAt).toBeDefined();
      convexAssertions.expectToHaveTimestamps(membership);
    });

    it('should create audit log for invitation', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(inviteToOrganization, ctx, {
        organizationId: testData.orgId,
        email: 'newuser@example.com',
        role: 'viewer',
      });

      const auditLogs = await db
        .query('auditLogs')
        .withIndex('by_organization', (q) => q.eq('organizationId', testData.orgId))
        .collect();

      const inviteLog = auditLogs.find(
        (log) => log.eventType === 'CREATE' && log.context.action === 'invite_user'
      );

      expect(inviteLog).toBeDefined();
      expect(inviteLog.entityType).toBe('organizationMemberships');
      expect(inviteLog.performedBy.userId).toBe(testData.userId);
      expect(inviteLog.metadata.inviteeEmail).toBe('newuser@example.com');
    });

    it('should reactivate existing inactive membership', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create an existing user
      const existingUserId = await db.insert('users', {
        clerkId: 'clerk_existing',
        email: 'existing@example.com',
        name: 'Existing User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create inactive membership
      const oldMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: existingUserId,
        role: 'viewer',
        permissions: ['products.read'],
        status: 'inactive',
        joinedAt: Date.now() - 1000000,
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now() - 1000000,
      });

      const membershipId = await runMutation(inviteToOrganization, ctx, {
        organizationId: testData.orgId,
        email: 'existing@example.com',
        role: 'editor',
        permissions: ['products.read', 'products.write'],
      });

      expect(membershipId).toBe(oldMembershipId);

      const membership = await db.get(membershipId);
      expect(membership.status).toBe('pending');
      expect(membership.role).toBe('editor');
      expect(membership.permissions).toEqual(['products.read', 'products.write']);
      expect(membership.invitedBy).toBe(testData.userId);
    });

    it('should throw error if user is already an active member', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create an existing user
      const existingUserId = await db.insert('users', {
        clerkId: 'clerk_active',
        email: 'active@example.com',
        name: 'Active User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create active membership
      await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: existingUserId,
        role: 'editor',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        runMutation(inviteToOrganization, ctx, {
          organizationId: testData.orgId,
          email: 'active@example.com',
          role: 'viewer',
        })
      ).rejects.toThrow('User is already a member of this organization');
    });

    it('should require admin or owner role to invite', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Update membership to editor role
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, { role: 'editor' });

      await expect(
        runMutation(inviteToOrganization, ctx, {
          organizationId: testData.orgId,
          email: 'newuser@example.com',
          role: 'viewer',
        })
      ).rejects.toThrow('Insufficient permissions to invite users');
    });

    it('should throw error for unauthenticated user', async () => {
      const ctx = createMockMutationContext(null, db);

      await expect(
        runMutation(inviteToOrganization, ctx, {
          organizationId: testData.orgId,
          email: 'newuser@example.com',
          role: 'viewer',
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('acceptInvitation', () => {
    it('should activate pending membership', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: testData.userId,
        role: 'editor',
        permissions: ['products.read', 'products.write'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runMutation(acceptInvitation, ctx, {
        organizationId: testData.orgId,
      });

      expect(result).toBe(membershipId);

      const membership = await db.get(membershipId);
      expect(membership.status).toBe('active');
      expect(membership.joinedAt).toBeDefined();
      expect(membership.updatedAt).toBeGreaterThan(membership.createdAt);
    });

    it('should accept invitation by email match', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership with email-based temporary ID
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: `pending_${testData.user.email}` as any,
        role: 'viewer',
        permissions: ['products.read'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runMutation(acceptInvitation, ctx, {
        organizationId: testData.orgId,
      });

      expect(result).toBe(membershipId);

      const membership = await db.get(membershipId);
      expect(membership.status).toBe('active');
      expect(membership.userId).toBe(testData.userId); // Should be updated to actual user ID
      expect(membership.joinedAt).toBeDefined();
    });

    it('should create audit log for acceptance', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: testData.userId,
        role: 'editor',
        permissions: ['*'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await runMutation(acceptInvitation, ctx, {
        organizationId: testData.orgId,
      });

      const auditLogs = await db
        .query('auditLogs')
        .withIndex('by_organization', (q) => q.eq('organizationId', testData.orgId))
        .collect();

      const acceptLog = auditLogs.find(
        (log) => log.eventType === 'UPDATE' && log.context.action === 'accept_invitation'
      );

      expect(acceptLog).toBeDefined();
      expect(acceptLog.entityId).toBe(membershipId);
      expect(acceptLog.changes[0].field).toBe('status');
      expect(acceptLog.changes[0].oldValue).toBe('pending');
      expect(acceptLog.changes[0].newValue).toBe('active');
    });

    it('should throw error if no pending invitation found', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(acceptInvitation, ctx, {
          organizationId: testData.orgId,
        })
      ).rejects.toThrow('No pending invitation found');
    });

    it('should throw error for unauthenticated user', async () => {
      const ctx = createMockMutationContext(null, db);

      await expect(
        runMutation(acceptInvitation, ctx, {
          organizationId: testData.orgId,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('declineInvitation', () => {
    it('should delete pending membership', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: testData.userId,
        role: 'editor',
        permissions: ['*'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runMutation(declineInvitation, ctx, {
        organizationId: testData.orgId,
      });

      expect(result).toBe(true);

      // Membership should be deleted
      const membership = await db.get(membershipId);
      expect(membership).toBeNull();
    });

    it('should create audit log for decline', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: testData.userId,
        role: 'viewer',
        permissions: ['products.read'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await runMutation(declineInvitation, ctx, {
        organizationId: testData.orgId,
      });

      const auditLogs = await db
        .query('auditLogs')
        .withIndex('by_organization', (q) => q.eq('organizationId', testData.orgId))
        .collect();

      const declineLog = auditLogs.find(
        (log) => log.eventType === 'DELETE' && log.context.action === 'decline_invitation'
      );

      expect(declineLog).toBeDefined();
      expect(declineLog.entityId).toBe(membershipId);
      expect(declineLog.changes[0].oldValue).toBe('pending');
      expect(declineLog.changes[0].newValue).toBe('declined');
    });

    it('should throw error if no pending invitation found', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(declineInvitation, ctx, {
          organizationId: testData.orgId,
        })
      ).rejects.toThrow('No pending invitation found');
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations for current user', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create another organization
      const org2Id = await db.insert('organizations', {
        name: 'Second Org',
        slug: 'second-org',
        status: 'active',
        subscription: {
          plan: 'pro',
          status: 'active',
          seats: 10,
          features: ['all'],
        },
        settings: testData.org.settings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      // Create pending invitations
      await db.insert('organizationMemberships', {
        organizationId: org2Id,
        userId: testData.userId,
        role: 'admin',
        permissions: ['*'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now() - 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getPendingInvitations, ctx, {});

      expect(result).toHaveLength(1);
      expect(result[0].organization._id).toBe(org2Id);
      expect(result[0].organization.name).toBe('Second Org');
      expect(result[0].role).toBe('admin');
      expect(result[0].invitedBy._id).toBe(testData.userId);
    });

    it('should return pending invitations by email match', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create another organization
      const org2Id = await db.insert('organizations', {
        name: 'Email Org',
        slug: 'email-org',
        status: 'active',
        subscription: testData.org.subscription,
        settings: testData.org.settings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      // Create pending invitation with email-based ID
      await db.insert('organizationMemberships', {
        organizationId: org2Id,
        userId: `pending_${testData.user.email}` as any,
        role: 'viewer',
        permissions: ['products.read'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getPendingInvitations, ctx, {});

      expect(result).toHaveLength(1);
      expect(result[0].organization._id).toBe(org2Id);
      expect(result[0].role).toBe('viewer');
    });

    it('should return empty array for unauthenticated user', async () => {
      const ctx = createMockQueryContext(null, db);

      const result = await runQuery(getPendingInvitations, ctx, {});

      expect(result).toEqual([]);
    });

    it('should filter out invitations for deleted organizations', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create pending invitation
      await db.insert('organizationMemberships', {
        organizationId: 'organizations_deleted' as any,
        userId: testData.userId,
        role: 'admin',
        permissions: ['*'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getPendingInvitations, ctx, {});

      expect(result).toHaveLength(0);
    });
  });

  describe('revokeInvitation', () => {
    it('should delete pending invitation', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: 'pending_revokeme@example.com' as any,
        role: 'editor',
        permissions: ['*'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runMutation(revokeInvitation, ctx, {
        membershipId,
      });

      expect(result).toBe(true);

      // Membership should be deleted
      const membership = await db.get(membershipId);
      expect(membership).toBeNull();
    });

    it('should create audit log for revocation', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: 'pending_revokeme@example.com' as any,
        role: 'viewer',
        permissions: ['products.read'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await runMutation(revokeInvitation, ctx, {
        membershipId,
      });

      const auditLogs = await db
        .query('auditLogs')
        .withIndex('by_organization', (q) => q.eq('organizationId', testData.orgId))
        .collect();

      const revokeLog = auditLogs.find(
        (log) => log.eventType === 'DELETE' && log.context.action === 'revoke_invitation'
      );

      expect(revokeLog).toBeDefined();
      expect(revokeLog.entityId).toBe(membershipId);
      expect(revokeLog.metadata.revokedUserId).toBe('pending_revokeme@example.com');
    });

    it('should require admin or owner role to revoke', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create pending membership
      const membershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: 'pending_test@example.com' as any,
        role: 'viewer',
        permissions: ['products.read'],
        status: 'pending',
        invitedBy: testData.userId,
        invitedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update current user's role to editor
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, { role: 'editor' });

      await expect(
        runMutation(revokeInvitation, ctx, {
          membershipId,
        })
      ).rejects.toThrow('Insufficient permissions to invite users');
    });

    it('should throw error if invitation not found', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(revokeInvitation, ctx, {
          membershipId: 'organizationMemberships_999999' as any,
        })
      ).rejects.toThrow('Invitation not found');
    });

    it('should throw error if trying to revoke active membership', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Get the active membership
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();

      await expect(
        runMutation(revokeInvitation, ctx, {
          membershipId: membership._id,
        })
      ).rejects.toThrow('Can only revoke pending invitations');
    });
  });
});
