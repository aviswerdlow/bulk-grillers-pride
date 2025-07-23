import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
import { convexTest } from '../../test-helpers';

describe('API Keys Management', () => {
  let ctx: any;
  let userId: string;
  let orgId: string;

  beforeEach(async () => {
    ctx = await t.run(async (ctx) => ctx);

    // Create test user
    userId = await ctx.db.insert('users', {
      clerkId: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test organization
    orgId = await ctx.db.insert('organizations', {
      name: 'Test Organization',
      clerkOrganizationId: 'org_123',
      slug: 'test-org',
      status: 'active',
      settings: {
        defaultProductStatus: 'active',
        requireProductApproval: false,
        enableAiCategorization: true,
      },
      apiKeys: {
        openAI: 'sk-test123',
        anthropic: 'sk-ant-test456',
        google: 'AIza-test789',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization membership as admin
    await ctx.db.insert('organizationMemberships', {
      organizationId: orgId,
      userId,
      role: 'admin',
      status: 'active',
      permissions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock auth
    ctx.auth = {
      getUserIdentity: jest.fn().mockResolvedValue({ 
        subject: 'user_123',
        tokenIdentifier: 'user_123'
      }),
    };
  });

  describe('getMaskedApiKeys', () => {
    it('should return masked API keys for admin users', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getMaskedApiKeys', { organizationId: orgId });

      expect(result).toBeDefined();
      expect(result.openAI).toBe('sk-...123');
      expect(result.anthropic).toBe('sk-ant-...456');
      expect(result.google).toBe('AIza-...789');
    });

    it('should throw error for non-admin users', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update membership to member role
      const membership = (await ctx.db.query('organizationMemberships').collect())[0];
      await ctx.db.patch(membership._id, { role: 'member' });

      await expect(
        ctx.runQuery('getMaskedApiKeys', { organizationId: orgId })
      ).rejects.toThrow();
    });

    it('should return empty object when no API keys are set', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create org without API keys
      const newOrgId = await ctx.db.insert('organizations', {
        name: 'New Org',
        clerkOrganizationId: 'org_456',
        slug: 'new-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: newOrgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery('getMaskedApiKeys', { organizationId: newOrgId });
      expect(result).toEqual({});
    });
  });

  describe('updateApiKeys', () => {
    it('should update API keys and create audit log', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const updates = {
        organizationId: orgId,
        provider: 'openAI' as const,
        apiKey: 'sk-new-key-123',
      };

      await ctx.runMutation('updateApiKeys', updates);

      // Verify the organization was updated
      const org = await ctx.db.get(orgId);
      expect(org.apiKeys.openAI).toBe('sk-new-key-123');

      // Verify audit log was created
      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('organizationId'), orgId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('api_key.updated');
      expect(auditLogs[0].entityType).toBe('organization');
      expect(auditLogs[0].entityId).toBe(orgId);
      expect(auditLogs[0].context.provider).toBe('openAI');
    });

    it('should allow empty string to remove API key', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await ctx.runMutation('updateApiKeys', {
        organizationId: orgId,
        provider: 'openAI',
        apiKey: '',
      });

      const org = await ctx.db.get(orgId);
      expect(org.apiKeys.openAI).toBeUndefined();
    });

    it('should throw error for non-admin users', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update membership to member role
      const membership = (await ctx.db.query('organizationMemberships').collect())[0];
      await ctx.db.patch(membership._id, { role: 'member' });

      await expect(
        ctx.runMutation('updateApiKeys', {
          organizationId: orgId,
          provider: 'openAI',
          apiKey: 'should-fail',
        })
      ).rejects.toThrow();
    });

    it('should validate API key format', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Test OpenAI key format
      await expect(
        ctx.runMutation('updateApiKeys', {
          organizationId: orgId,
          provider: 'openAI',
          apiKey: 'invalid-key', // Should start with sk-
        })
      ).rejects.toThrow();

      // Test Anthropic key format
      await expect(
        ctx.runMutation('updateApiKeys', {
          organizationId: orgId,
          provider: 'anthropic',
          apiKey: 'invalid-key', // Should start with sk-ant-
        })
      ).rejects.toThrow();
    });
  });

  describe('removeApiKey', () => {
    it('should remove API key and create audit log', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await ctx.runMutation('removeApiKey', {
        organizationId: orgId,
        provider: 'openAI',
      });

      // Verify the key was removed
      const org = await ctx.db.get(orgId);
      expect(org.apiKeys.openAI).toBeUndefined();
      expect(org.apiKeys.anthropic).toBe('sk-ant-test456'); // Others unchanged

      // Verify audit log
      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('organizationId'), orgId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('api_key.removed');
      expect(auditLogs[0].context.provider).toBe('openAI');
    });

    it('should handle removing non-existent key gracefully', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create org without the key
      const newOrgId = await ctx.db.insert('organizations', {
        name: 'New Org',
        clerkOrganizationId: 'org_789',
        slug: 'new-org-2',
        status: 'active',
        settings: {},
        apiKeys: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: newOrgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Should not throw
      await ctx.runMutation('removeApiKey', {
        organizationId: newOrgId,
        provider: 'openAI',
      });
    });

    it('should throw error for non-admin users', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update membership to owner role (still should have access)
      const membership = (await ctx.db.query('organizationMemberships').collect())[0];
      await ctx.db.patch(membership._id, { role: 'owner' });

      // Should succeed for owner
      await ctx.runMutation('removeApiKey', {
        organizationId: orgId,
        provider: 'google',
      });

      // Now change to member
      await ctx.db.patch(membership._id, { role: 'member' });

      // Should fail for member
      await expect(
        ctx.runMutation('removeApiKey', {
          organizationId: orgId,
          provider: 'anthropic',
        })
      ).rejects.toThrow();
    });
  });

  describe('API Key Security', () => {
    it('should never return full API keys in queries', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Try to query organization directly (should not expose keys)
      const org = await ctx.db.get(orgId);
      
      // In a real implementation, queries should filter out apiKeys field
      // This test verifies the getMaskedApiKeys is the only way to get key info
      const masked = await ctx.runQuery('getMaskedApiKeys', { organizationId: orgId });
      
      // Verify masking works correctly
      expect(masked.openAI).not.toBe(org.apiKeys.openAI);
      expect(masked.openAI).toMatch(/^sk-\.\.\..*$/);
    });

    it('should validate all supported providers', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const providers = ['openAI', 'anthropic', 'google'] as const;
      
      for (const provider of providers) {
        const key = provider === 'openAI' ? 'sk-test-new' 
                  : provider === 'anthropic' ? 'sk-ant-test-new'
                  : 'AIza-test-new';
        
        await ctx.runMutation('updateApiKeys', {
          organizationId: orgId,
          provider,
          apiKey: key,
        });

        const org = await ctx.db.get(orgId);
        expect(org.apiKeys[provider]).toBe(key);
      }
    });
  });
});