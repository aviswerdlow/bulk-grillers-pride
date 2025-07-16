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
} from '../../setup/convex-test-helpers';
import { runMutation, runQuery } from '../../setup/test-runner';
import {
  checkPermission,
  updateUserRole,
  removeUserFromOrganization,
  getUserPermissions,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../../../functions/auth/permissions';

describe('Permissions Module', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('checkPermission', () => {
    it('should return true for owner with any permission', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(checkPermission, ctx, {
        organizationId: testData.orgId,
        permission: PERMISSIONS.MANAGE_ORGANIZATION,
      });

      expect(result).toBe(true);
    });

    it('should check specific permissions for non-owner roles', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update membership to editor role
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, {
        role: 'editor',
        permissions: ROLE_PERMISSIONS.editor,
      });

      // Should have editor permissions
      const canCreate = await runQuery(checkPermission, ctx, {
        organizationId: testData.orgId,
        permission: PERMISSIONS.CREATE_PRODUCTS,
      });
      expect(canCreate).toBe(true);

      // Should not have admin-only permissions
      const canDelete = await runQuery(checkPermission, ctx, {
        organizationId: testData.orgId,
        permission: PERMISSIONS.DELETE_PROJECTS,
      });
      expect(canDelete).toBe(false);
    });

    it('should handle custom permissions', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update membership with custom permissions
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, {
        role: 'viewer',
        permissions: [PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.CREATE_PRODUCTS], // Custom permission
      });

      const result = await runQuery(checkPermission, ctx, {
        organizationId: testData.orgId,
        permission: PERMISSIONS.CREATE_PRODUCTS,
      });

      expect(result).toBe(true);
    });

    it('should return false for unauthenticated user', async () => {
      const ctx = createMockQueryContext(null, db);

      const result = await runQuery(checkPermission, ctx, {
        organizationId: testData.orgId,
        permission: PERMISSIONS.VIEW_PRODUCTS,
      });

      expect(result).toBe(false);
    });

    it('should return false for non-member', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Create another organization
      const otherOrgId = await db.insert('organizations', {
        name: 'Other Org',
        slug: 'other-org',
        status: 'active',
        subscription: testData.org.subscription,
        settings: testData.org.settings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      const result = await runQuery(checkPermission, ctx, {
        organizationId: otherOrgId,
        permission: PERMISSIONS.VIEW_PRODUCTS,
      });

      expect(result).toBe(false);
    });

    it('should return false for inactive membership', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update membership to inactive
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, { status: 'inactive' });

      const result = await runQuery(checkPermission, ctx, {
        organizationId: testData.orgId,
        permission: PERMISSIONS.VIEW_PRODUCTS,
      });

      expect(result).toBe(false);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role and permissions', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another user
      const targetUserId = await db.insert('users', {
        clerkId: 'clerk_target',
        email: 'target@example.com',
        name: 'Target User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create membership for target user
      const targetMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: targetUserId,
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runMutation(updateUserRole, ctx, {
        membershipId: targetMembershipId,
        newRole: 'editor',
      });

      expect(result).toBe(targetMembershipId);

      const membership = await db.get(targetMembershipId);
      expect(membership.role).toBe('editor');
      expect(membership.permissions).toEqual(ROLE_PERMISSIONS.editor);
      expect(membership.updatedAt).toBeGreaterThan(membership.createdAt);
    });

    it('should apply custom permissions when provided', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another user
      const targetUserId = await db.insert('users', {
        clerkId: 'clerk_custom',
        email: 'custom@example.com',
        name: 'Custom User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create membership
      const targetMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: targetUserId,
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const customPermissions = [
        PERMISSIONS.VIEW_PRODUCTS,
        PERMISSIONS.CREATE_PRODUCTS,
        PERMISSIONS.UPDATE_PRODUCTS,
      ];

      await runMutation(updateUserRole, ctx, {
        membershipId: targetMembershipId,
        newRole: 'editor',
        customPermissions,
      });

      const membership = await db.get(targetMembershipId);
      expect(membership.permissions).toEqual(customPermissions);
    });

    it('should create audit log for role update', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another user
      const targetUserId = await db.insert('users', {
        clerkId: 'clerk_audit',
        email: 'audit@example.com',
        name: 'Audit User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create membership
      const targetMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: targetUserId,
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await runMutation(updateUserRole, ctx, {
        membershipId: targetMembershipId,
        newRole: 'admin',
      });

      const auditLogs = await db
        .query('auditLogs')
        .withIndex('by_organization', (q) => q.eq('organizationId', testData.orgId))
        .collect();

      const roleUpdateLog = auditLogs.find(
        (log) => log.eventType === 'UPDATE' && log.context.action === 'update_user_role'
      );

      expect(roleUpdateLog).toBeDefined();
      expect(roleUpdateLog.entityId).toBe(targetMembershipId);
      expect(roleUpdateLog.changes).toHaveLength(2);
      expect(roleUpdateLog.changes[0].field).toBe('role');
      expect(roleUpdateLog.changes[0].oldValue).toBe('viewer');
      expect(roleUpdateLog.changes[0].newValue).toBe('admin');
      expect(roleUpdateLog.metadata.targetUserId).toBe(targetUserId);
    });

    it('should prevent changing owner role', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Get the owner membership
      const ownerMembership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();

      await expect(
        runMutation(updateUserRole, ctx, {
          membershipId: ownerMembership._id,
          newRole: 'admin',
        })
      ).rejects.toThrow('Cannot change owner role');
    });

    it('should require UPDATE_USER_ROLES permission', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Update current user to editor (no permission to update roles)
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, {
        role: 'editor',
        permissions: ROLE_PERMISSIONS.editor,
      });

      // Create target user
      const targetUserId = await db.insert('users', {
        clerkId: 'clerk_noperm',
        email: 'noperm@example.com',
        name: 'No Perm User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const targetMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: targetUserId,
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        runMutation(updateUserRole, ctx, {
          membershipId: targetMembershipId,
          newRole: 'editor',
        })
      ).rejects.toThrow('Insufficient permissions to update user roles');
    });

    it('should throw error if membership not found', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(updateUserRole, ctx, {
          membershipId: 'organizationMemberships_999999' as any,
          newRole: 'editor',
        })
      ).rejects.toThrow('Membership not found');
    });
  });

  describe('removeUserFromOrganization', () => {
    it('should mark membership as revoked', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create target user
      const targetUserId = await db.insert('users', {
        clerkId: 'clerk_remove',
        email: 'remove@example.com',
        name: 'Remove User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const targetMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: targetUserId,
        role: 'editor',
        permissions: ROLE_PERMISSIONS.editor,
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runMutation(removeUserFromOrganization, ctx, {
        membershipId: targetMembershipId,
      });

      expect(result).toBe(true);

      const membership = await db.get(targetMembershipId);
      expect(membership.status).toBe('revoked');
    });

    it('should allow users to remove themselves', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another owner so we can remove ourselves
      const anotherOwnerId = await db.insert('users', {
        clerkId: 'clerk_owner2',
        email: 'owner2@example.com',
        name: 'Owner 2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: anotherOwnerId,
        role: 'owner',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update current user to editor (no REMOVE_USERS permission)
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, {
        role: 'editor',
        permissions: ROLE_PERMISSIONS.editor,
      });

      // Should be able to remove self
      const result = await runMutation(removeUserFromOrganization, ctx, {
        membershipId: membership._id,
      });

      expect(result).toBe(true);

      const updatedMembership = await db.get(membership._id);
      expect(updatedMembership.status).toBe('revoked');
    });

    it('should create audit log with self-removal flag', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another owner
      const anotherOwnerId = await db.insert('users', {
        clerkId: 'clerk_owner3',
        email: 'owner3@example.com',
        name: 'Owner 3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: anotherOwnerId,
        role: 'owner',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();

      await runMutation(removeUserFromOrganization, ctx, {
        membershipId: membership._id,
      });

      const auditLogs = await db
        .query('auditLogs')
        .withIndex('by_organization', (q) => q.eq('organizationId', testData.orgId))
        .collect();

      const removeLog = auditLogs.find(
        (log) => log.eventType === 'UPDATE' && log.context.action === 'leave_organization'
      );

      expect(removeLog).toBeDefined();
      expect(removeLog.metadata.isSelfRemoval).toBe(true);
      expect(removeLog.metadata.removedUserId).toBe(testData.userId);
    });

    it('should prevent removing the last owner', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();

      await expect(
        runMutation(removeUserFromOrganization, ctx, {
          membershipId: membership._id,
        })
      ).rejects.toThrow('Cannot remove the last owner of an organization');
    });

    it('should require REMOVE_USERS permission for removing others', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Update current user to viewer (no REMOVE_USERS permission)
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, {
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
      });

      // Create target user
      const targetUserId = await db.insert('users', {
        clerkId: 'clerk_cantremove',
        email: 'cantremove@example.com',
        name: 'Cant Remove',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const targetMembershipId = await db.insert('organizationMemberships', {
        organizationId: testData.orgId,
        userId: targetUserId,
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        runMutation(removeUserFromOrganization, ctx, {
          membershipId: targetMembershipId,
        })
      ).rejects.toThrow('Insufficient permissions to remove users');
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for owner', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(getUserPermissions, ctx, {
        userId: testData.userId,
        organizationId: testData.orgId,
      });

      expect(result).toBeDefined();
      expect(result.role).toBe('owner');
      expect(result.customPermissions).toContain('*');
      expect(result.effectivePermissions).toEqual(Object.values(PERMISSIONS));
    });

    it('should return role-based permissions', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update to editor role
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, {
        role: 'editor',
        permissions: ROLE_PERMISSIONS.editor,
      });

      const result = await runQuery(getUserPermissions, ctx, {
        userId: testData.userId,
        organizationId: testData.orgId,
      });

      expect(result.role).toBe('editor');
      expect(result.effectivePermissions).toEqual(ROLE_PERMISSIONS.editor);
    });

    it('should merge custom and role permissions', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update with custom permissions
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();

      const customPermissions = [
        ...ROLE_PERMISSIONS.viewer,
        PERMISSIONS.CREATE_PRODUCTS, // Additional permission
      ];

      await db.patch(membership._id, {
        role: 'viewer',
        permissions: customPermissions,
      });

      const result = await runQuery(getUserPermissions, ctx, {
        userId: testData.userId,
        organizationId: testData.orgId,
      });

      expect(result.role).toBe('viewer');
      expect(result.customPermissions).toEqual(customPermissions);
      expect(result.effectivePermissions).toContain(PERMISSIONS.CREATE_PRODUCTS);
      expect(result.effectivePermissions).toContain(PERMISSIONS.VIEW_PRODUCTS);
    });

    it('should return null for non-member', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const nonMemberUserId = await db.insert('users', {
        clerkId: 'clerk_nonmember',
        email: 'nonmember@example.com',
        name: 'Non Member',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getUserPermissions, ctx, {
        userId: nonMemberUserId,
        organizationId: testData.orgId,
      });

      expect(result).toBeNull();
    });

    it('should return null for inactive membership', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update membership to inactive
      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q) =>
          q.eq('organizationId', testData.orgId).eq('userId', testData.userId)
        )
        .unique();
      await db.patch(membership._id, { status: 'inactive' });

      const result = await runQuery(getUserPermissions, ctx, {
        userId: testData.userId,
        organizationId: testData.orgId,
      });

      expect(result).toBeNull();
    });
  });
});
