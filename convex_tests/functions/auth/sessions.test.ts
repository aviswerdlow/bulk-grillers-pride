import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../lib/auth');

import {
  createMockMutationContext,
  createMockQueryContext,
  MockDatabase,
  mockIdentities,
  seedTestData,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import { runMutation, runQuery } from '../../setup/test_runner';
import {
  trackActivity,
  switchOrganization,
  getActiveSessions,
  updateProfile,
  validateSession,
} from '../../../functions/auth/sessions';
import * as authModule from '../../../lib/auth';

const mockAuth = authModule as jest.Mocked<typeof authModule>;

describe('Auth Sessions', () => {
  let db: MockDatabase;
  let testData: any;
  let sessionId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);

    // Create a test session
    sessionId = await db.insert('userSessions', {
      userId: testData.userId,
      organizationId: testData.orgId,
      metadata: {
        userAgent: 'Mozilla/5.0 Test Browser',
        ipAddress: '127.0.0.1',
        location: 'Test Location',
      },
      lastActivityAt: Date.now() - 60000, // 1 minute ago
      expiresAt: Date.now() + 86400000, // 24 hours from now
      createdAt: Date.now() - 3600000, // 1 hour ago
      updatedAt: Date.now() - 60000,
    });
  });

  describe('trackActivity', () => {
    it('should track user activity with metadata', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(trackActivity, ctx, {
        event: 'page_view',
        metadata: {
          page: '/dashboard',
          referrer: '/home',
        },
      });

      // Check activity was logged
      const activities = await db.query('activityLogs').collect();
      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testData.userId);
      expect(activities[0].organizationId).toBe(testData.orgId);
      expect(activities[0].event).toBe('page_view');
      expect(activities[0].metadata).toEqual({
        page: '/dashboard',
        referrer: '/home',
      });
    });

    it('should update last activity timestamp on user session', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const beforeTime = Date.now();
      await runMutation(trackActivity, ctx, {
        event: 'api_call',
        metadata: {
          endpoint: '/api/products',
          method: 'GET',
        },
      });

      // Check session was updated
      const sessions = await db
        .query('userSessions')
        .filter((q) => q.eq('userId', testData.userId))
        .collect();

      expect(sessions[0].lastActivityAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should create audit log for sensitive events', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(trackActivity, ctx, {
        event: 'settings_update',
        metadata: {
          section: 'security',
          field: 'two_factor_auth',
          oldValue: false,
          newValue: true,
        },
      });

      // Check audit log
      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('UPDATE');
      expect(auditLogs[0].entityType).toBe('user_settings');
    });

    it('should require authentication', async () => {
      const ctx = createMockMutationContext(null, db);

      mockAuth.authenticateAndAuthorize.mockRejectedValueOnce(new Error('Not authenticated'));

      await expect(
        runMutation(trackActivity, ctx, {
          event: 'test_event',
          metadata: {},
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('switchOrganization', () => {
    let otherOrgId: string;

    beforeEach(async () => {
      // Create another organization the user is member of
      otherOrgId = await db.insert('organizations', {
        name: 'Other Organization',
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

      // Add user as member of other org
      await db.insert('organizationMemberships', {
        organizationId: otherOrgId,
        userId: testData.userId,
        role: 'editor',
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should switch to another organization', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(switchOrganization, ctx, {
        organizationId: otherOrgId,
      });

      // Check new session was created
      const sessions = await db
        .query('userSessions')
        .filter((q) => q.and(q.eq('userId', testData.userId), q.eq('organizationId', otherOrgId)))
        .collect();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].organizationId).toBe(otherOrgId);
    });

    it('should track organization switch in activity log', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(switchOrganization, ctx, {
        organizationId: otherOrgId,
      });

      const activities = await db
        .query('activityLogs')
        .filter((q) => q.eq('event', 'org_switch'))
        .collect();

      expect(activities).toHaveLength(1);
      expect(activities[0].metadata).toEqual({
        fromOrgId: testData.orgId,
        toOrgId: otherOrgId,
      });
    });

    it('should prevent switching to unauthorized organization', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create org user is NOT member of
      const unauthorizedOrgId = await db.insert('organizations', {
        name: 'Unauthorized Org',
        slug: 'unauthorized-org',
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
        runMutation(switchOrganization, ctx, {
          organizationId: unauthorizedOrgId,
        })
      ).rejects.toThrow('Not a member of this organization');
    });

    it('should handle switching to same organization gracefully', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Should not throw
      await runMutation(switchOrganization, ctx, {
        organizationId: testData.orgId,
      });

      // No new session should be created
      const sessions = await db
        .query('userSessions')
        .filter((q) => q.eq('userId', testData.userId))
        .collect();

      expect(sessions).toHaveLength(1); // Only original session
    });
  });

  describe('getActiveSessions', () => {
    beforeEach(async () => {
      // Create additional sessions
      await db.insert('userSessions', {
        userId: testData.userId,
        organizationId: testData.orgId,
        metadata: {
          userAgent: 'Mobile Device',
          ipAddress: '192.168.1.1',
          location: 'Mobile Location',
        },
        lastActivityAt: Date.now() - 300000, // 5 minutes ago
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now() - 7200000, // 2 hours ago
        updatedAt: Date.now() - 300000,
      });

      // Create expired session
      await db.insert('userSessions', {
        userId: testData.userId,
        organizationId: testData.orgId,
        metadata: {
          userAgent: 'Old Browser',
          ipAddress: '10.0.0.1',
          location: 'Old Location',
        },
        lastActivityAt: Date.now() - 172800000, // 2 days ago
        expiresAt: Date.now() - 86400000, // Expired 1 day ago
        createdAt: Date.now() - 259200000, // 3 days ago
        updatedAt: Date.now() - 172800000,
      });
    });

    it('should return active sessions for user', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const sessions = await runQuery(getActiveSessions, ctx, {});

      expect(sessions).toHaveLength(2); // Only active sessions
      expect(sessions.every((s) => s.userId === testData.userId)).toBe(true);
      expect(sessions.every((s) => s.expiresAt > Date.now())).toBe(true);
    });

    it('should include session metadata', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const sessions = await runQuery(getActiveSessions, ctx, {});

      expect(sessions[0].metadata).toBeDefined();
      expect(sessions[0].metadata.userAgent).toBeDefined();
      expect(sessions[0].metadata.ipAddress).toBeDefined();
      expect(sessions[0].metadata.location).toBeDefined();
    });

    it('should sort sessions by last activity', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const sessions = await runQuery(getActiveSessions, ctx, {});

      // Most recent activity first
      expect(sessions[0].lastActivityAt).toBeGreaterThan(sessions[1].lastActivityAt);
    });

    it('should require authentication', async () => {
      const ctx = createMockQueryContext(null, db);

      mockAuth.authenticateAndAuthorize.mockRejectedValueOnce(new Error('Not authenticated'));

      await expect(runQuery(getActiveSessions, ctx, {})).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateProfile, ctx, {
        name: 'Updated Name',
        email: 'updated@example.com',
        metadata: {
          bio: 'Updated bio',
          timezone: 'America/New_York',
        },
      });

      const user = await db.get(testData.userId);
      expect(user.name).toBe('Updated Name');
      expect(user.email).toBe('updated@example.com');
      expect(user.metadata).toEqual({
        bio: 'Updated bio',
        timezone: 'America/New_York',
      });
    });

    it('should create audit log for profile updates', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateProfile, ctx, {
        name: 'New Name',
      });

      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('UPDATE');
      expect(auditLogs[0].entityType).toBe('users');
      expect(auditLogs[0].entityId).toBe(testData.userId);
      expect(auditLogs[0].changes).toContainEqual({
        field: 'name',
        oldValue: 'Test User',
        newValue: 'New Name',
      });
    });

    it('should validate email format', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(updateProfile, ctx, {
          email: 'invalid-email',
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should prevent duplicate emails', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      // Create another user with email
      await db.insert('users', {
        email: 'existing@example.com',
        name: 'Other User',
        authProvider: 'clerk',
        externalId: 'clerk_other',
        status: 'active',
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        runMutation(updateProfile, ctx, {
          email: 'existing@example.com',
        })
      ).rejects.toThrow('Email already in use');
    });

    it('should update user version', async () => {
      const ctx = createMockMutationContext(mockIdentities.user, db);

      const originalUser = await db.get(testData.userId);
      const originalVersion = originalUser.version || 1;

      await runMutation(updateProfile, ctx, {
        name: 'Version Test',
      });

      const updatedUser = await db.get(testData.userId);
      expect(updatedUser.version).toBe(originalVersion + 1);
    });

    it('should require authentication', async () => {
      const ctx = createMockMutationContext(null, db);

      mockAuth.authenticateAndAuthorize.mockRejectedValueOnce(new Error('Not authenticated'));

      await expect(
        runMutation(updateProfile, ctx, {
          name: 'Test',
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      const result = await runQuery(validateSession, ctx, {});

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(testData.userId);
      expect(result.organizationId).toBe(testData.orgId);
      expect(result.role).toBe('admin');
    });

    it('should invalidate expired session', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update session to be expired
      await db.patch(sessionId, {
        expiresAt: Date.now() - 3600000, // Expired 1 hour ago
      });

      const result = await runQuery(validateSession, ctx, {});

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should invalidate session with inactive user', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update user to inactive
      await db.patch(testData.userId, {
        status: 'inactive',
      });

      const result = await runQuery(validateSession, ctx, {});

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('User inactive');
    });

    it('should invalidate session with suspended membership', async () => {
      const ctx = createMockQueryContext(mockIdentities.user, db);

      // Update membership to suspended
      const memberships = await db
        .query('organizationMemberships')
        .filter((q) => q.eq('userId', testData.userId))
        .collect();

      await db.patch(memberships[0]._id, {
        status: 'suspended',
      });

      const result = await runQuery(validateSession, ctx, {});

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Membership suspended');
    });

    it('should return invalid for unauthenticated request', async () => {
      const ctx = createMockQueryContext(null, db);

      const result = await runQuery(validateSession, ctx, {});

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not authenticated');
    });
  });
});
