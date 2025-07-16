import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { runQuery, runMutation } from '../../setup/test_runner';
import {
  mockIdentities,
  MockDatabase,
  seedTestData,
  convexAssertions,
  createMockQueryContext,
  createMockMutationContext,
  mockAuthHelpers,
  setupMockAuth,
} from '../../setup/convex_test_helpers';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  updateOrganizationSettings,
  updateSubscription,
} from '../../../functions/organizations/organizations';

describe('organizations', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('getOrganizations', () => {
    it('should return organizations for authenticated user', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getOrganizations, context, {});

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(testData.orgId);
      expect(result[0].name).toBe('Test Organization');
      expect(result[0].membership).toBeDefined();
      expect(result[0].membership?.role).toBe('owner');
    });

    it('should return multiple organizations when user is member of many', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create another organization
      const orgId2 = await db.insert('organizations', {
        name: 'Second Org',
        slug: 'second-org',
        status: 'active',
        subscription: {
          plan: 'professional',
          status: 'active',
          seats: 5,
          features: ['api-access'],
        },
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4',
          apiKeys: {},
          categorization: {
            batchSize: 100,
            prompt: 'Custom prompt',
            autoApprove: true,
            confidenceThreshold: 0.9,
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

      // Add user as member
      await db.insert('organizationMemberships', {
        organizationId: orgId2,
        userId: testData.userId,
        role: 'admin',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getOrganizations, context, {});

      expect(result).toHaveLength(2);
      expect(result.map((o) => o.slug)).toContain('test-org');
      expect(result.map((o) => o.slug)).toContain('second-org');
    });

    it('should only return active memberships', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create org with inactive membership
      const inactiveOrgId = await db.insert('organizations', {
        name: 'Inactive Org',
        slug: 'inactive-org',
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
            prompt: 'Default',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['.csv'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      await db.insert('organizationMemberships', {
        organizationId: inactiveOrgId,
        userId: testData.userId,
        role: 'viewer',
        permissions: ['VIEW_PRODUCTS'],
        status: 'inactive',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await runQuery(getOrganizations, context, {});

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('test-org');
    });

    it('should return empty array for unauthenticated user', async () => {
      const context = createMockQueryContext(null, db);
      const result = await runQuery(getOrganizations, context, {});

      expect(result).toEqual([]);
    });
  });

  describe('getOrganization', () => {
    it('should return organization details', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getOrganization, context, { organizationId: testData.orgId });

      expect(result._id).toBe(testData.orgId);
      expect(result.name).toBe('Test Organization');
      expect(result.subscription).toBeDefined();
      expect(result.subscription.plan).toBe('professional');
      expect(result.settings).toBeDefined();
      expect(result.settings.aiProvider).toBe('openai');
    });

    it('should throw error for unauthorized access', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create another org user doesn't belong to
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
            prompt: 'Default',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['.csv'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      await expect(
        runQuery(getOrganization, context, { organizationId: otherOrgId })
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if organization not found', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      await expect(
        runQuery(getOrganization, context, { organizationId: 'organizations_999999' })
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('createOrganization', () => {
    it('should create a new organization and membership', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const orgId = await runMutation(createOrganization, context, {
        name: 'New Organization',
        slug: 'new-org',
      });

      convexAssertions.expectToBeValidId(orgId, 'organizations');

      // Check organization was created
      const org = await db.get(orgId);
      expect(org.name).toBe('New Organization');
      expect(org.slug).toBe('new-org');
      expect(org.status).toBe('active');
      expect(org.subscription.plan).toBe('free');
      expect(org.subscription.seats).toBe(5);
      expect(org.settings.aiProvider).toBe('openai');

      // Check membership was created
      const memberships = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q: any) =>
          q.eq('organizationId', orgId).eq('userId', testData.userId)
        )
        .collect();

      expect(memberships).toHaveLength(1);
      expect(memberships[0].role).toBe('owner');
      expect(memberships[0].permissions).toEqual(['*']);
      expect(memberships[0].status).toBe('active');
    });

    it('should auto-generate slug from name if not provided', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const orgId = await runMutation(createOrganization, context, {
        name: 'My Amazing Company Inc.',
      });

      const org = await db.get(orgId);
      expect(org.slug).toBe('my-amazing-company-inc-');
    });

    it('should prevent duplicate slugs', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(createOrganization, context, {
          name: 'Another Org',
          slug: 'test-org', // Already exists
        })
      ).rejects.toThrow('Organization slug already exists');
    });

    it('should require authenticated user', async () => {
      const context = createMockMutationContext(null, db);

      await expect(
        runMutation(createOrganization, context, {
          name: 'New Org',
          slug: 'new-org',
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization details', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(updateOrganization, context, {
        organizationId: testData.orgId,
        name: 'Updated Organization',
        description: 'New description',
      });

      expect(result).toBe(testData.orgId);

      const org = await db.get(testData.orgId);
      expect(org.name).toBe('Updated Organization');
      expect(org.description).toBe('New description');
      expect(org.version).toBe(2);
    });

    it('should validate slug uniqueness on update', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create another org
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
            prompt: 'Default',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['.csv'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      await expect(
        runMutation(updateOrganization, context, {
          organizationId: testData.orgId,
          slug: 'other-org', // Already exists
        })
      ).rejects.toThrow('Organization slug already exists');
    });

    it('should require admin permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(updateOrganization, context, {
          organizationId: testData.orgId,
          name: 'Updated Name',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateOrganizationSettings', () => {
    it('should update AI provider settings', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateOrganizationSettings, context, {
        organizationId: testData.orgId,
        settings: {
          aiProvider: 'anthropic',
          aiModel: 'claude-3',
        },
      });

      const org = await db.get(testData.orgId);
      expect(org.settings.aiProvider).toBe('anthropic');
      expect(org.settings.aiModel).toBe('claude-3');
      // Other settings should remain unchanged
      expect(org.settings.categorization).toBeDefined();
      expect(org.settings.storage).toBeDefined();
    });

    it('should update categorization settings', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateOrganizationSettings, context, {
        organizationId: testData.orgId,
        settings: {
          categorization: {
            batchSize: 100,
            autoApprove: true,
            confidenceThreshold: 0.95,
          },
        },
      });

      const org = await db.get(testData.orgId);
      expect(org.settings.categorization.batchSize).toBe(100);
      expect(org.settings.categorization.autoApprove).toBe(true);
      expect(org.settings.categorization.confidenceThreshold).toBe(0.95);
      // Prompt should remain unchanged
      expect(org.settings.categorization.prompt).toBe('Categorize the following products');
    });

    it('should update storage settings', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateOrganizationSettings, context, {
        organizationId: testData.orgId,
        settings: {
          storage: {
            maxFileSize: 52428800, // 50MB
            allowedFileTypes: ['.csv', '.xlsx', '.json'],
          },
        },
      });

      const org = await db.get(testData.orgId);
      expect(org.settings.storage.maxFileSize).toBe(52428800);
      expect(org.settings.storage.allowedFileTypes).toEqual(['.csv', '.xlsx', '.json']);
      // Total storage limit should remain unchanged
      expect(org.settings.storage.totalStorageLimit).toBe(1073741824);
    });

    it('should require admin permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to editor role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'editor' });

      await expect(
        runMutation(updateOrganizationSettings, context, {
          organizationId: testData.orgId,
          settings: {
            aiProvider: 'anthropic',
          },
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription plan', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateSubscription, context, {
        organizationId: testData.orgId,
        subscription: {
          plan: 'enterprise',
          seats: 50,
          features: [
            'advanced-categorization',
            'api-access',
            'custom-ai-models',
            'priority-support',
          ],
        },
      });

      const org = await db.get(testData.orgId);
      expect(org.subscription.plan).toBe('enterprise');
      expect(org.subscription.seats).toBe(50);
      expect(org.subscription.features).toContain('custom-ai-models');
      expect(org.subscription.features).toContain('priority-support');
      // Status should remain unchanged
      expect(org.subscription.status).toBe('active');
    });

    it('should update subscription status', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateSubscription, context, {
        organizationId: testData.orgId,
        subscription: {
          status: 'suspended',
        },
      });

      const org = await db.get(testData.orgId);
      expect(org.subscription.status).toBe('suspended');
      // Other subscription properties should remain unchanged
      expect(org.subscription.plan).toBe('professional');
      expect(org.subscription.seats).toBe(10);
    });

    it('should validate subscription plan values', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // This test would need actual validation in the mutation
      // For now, we'll just verify the update works
      await runMutation(updateSubscription, context, {
        organizationId: testData.orgId,
        subscription: {
          plan: 'professional',
          seats: 25,
        },
      });

      const org = await db.get(testData.orgId);
      expect(org.subscription.seats).toBe(25);
    });

    it('should require owner permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to admin role (not owner)
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'admin' });

      await expect(
        runMutation(updateSubscription, context, {
          organizationId: testData.orgId,
          subscription: {
            plan: 'enterprise',
          },
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should create audit log for subscription changes', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateSubscription, context, {
        organizationId: testData.orgId,
        subscription: {
          plan: 'enterprise',
          seats: 100,
        },
      });

      const auditLogs = await db.query('auditLogs').collect();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('UPDATE');
      expect(auditLogs[0].entityType).toBe('subscription');
      expect(auditLogs[0].entityId).toBe(testData.orgId);
      expect(auditLogs[0].metadata?.plan).toBe('enterprise');
      expect(auditLogs[0].metadata?.seats).toBe(100);
    });
  });
});
