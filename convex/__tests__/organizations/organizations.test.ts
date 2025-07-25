import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
import { convexTest } from '../../test-helpers';
import { createOrganization, getOrganizationBySlug } from '../organizations';

describe('Organizations API', () => {
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization membership
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

  describe('getOrganization', () => {
    it('should return organization by ID when user is member', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getOrganization', { organizationId: orgId });

      expect(result).toBeDefined();
      expect(result._id).toBe(orgId);
      expect(result.name).toBe('Test Organization');
      expect(result.slug).toBe('test-org');
    });

    it('should throw error when organization not found', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await expect(
        ctx.runQuery('getOrganization', { organizationId: 'nonexistent' as any })
      ).rejects.toThrow();
    });

    it('should throw error when user is not a member', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create another org without membership
      const otherOrgId = await ctx.db.insert('organizations', {
        name: 'Other Org',
        clerkOrganizationId: 'org_456',
        slug: 'other-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runQuery('getOrganization', { organizationId: otherOrgId })
      ).rejects.toThrow();
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return organization by slug when user is member', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getOrganizationBySlug', { slug: 'test-org' });

      expect(result).toBeDefined();
      expect(result._id).toBe(orgId);
      expect(result.name).toBe('Test Organization');
      expect(result.slug).toBe('test-org');
    });

    it('should return null when organization not found', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getOrganizationBySlug', { slug: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations user is member of', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create another organization with membership
      const orgId2 = await ctx.db.insert('organizations', {
        name: 'Second Org',
        clerkOrganizationId: 'org_456',
        slug: 'second-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId2,
        userId,
        role: 'member',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery('getUserOrganizations', {});

      expect(result).toHaveLength(2);
      expect(result.map((org: any) => org._id)).toContain(orgId);
      expect(result.map((org: any) => org._id)).toContain(orgId2);
    });

    it('should return empty array when user has no organizations', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create user without any memberships
      const newUserId = await ctx.db.insert('users', {
        clerkId: 'user_456',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ctx.auth = {
        getUserIdentity: jest.fn().mockResolvedValue({ 
          subject: 'user_456',
          tokenIdentifier: 'user_456'
        }),
      };

      const result = await ctx.runQuery('getUserOrganizations', {});
      expect(result).toEqual([]);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization when user is admin', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const updates = {
        organizationId: orgId,
        name: 'Updated Organization',
        settings: {
          defaultProductStatus: 'draft' as const,
          requireProductApproval: true,
          enableAiCategorization: false,
        },
      };

      const result = await ctx.runMutation('updateOrganization', updates);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Organization');
      expect(result.settings.defaultProductStatus).toBe('draft');
      expect(result.settings.requireProductApproval).toBe(true);
    });

    it('should throw error when user is not admin', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update membership to member role
      await ctx.db.patch(await ctx.db.query('organizationMemberships').collect()[0]._id, {
        role: 'member',
      });

      await expect(
        ctx.runMutation('updateOrganization', {
          organizationId: orgId,
          name: 'Should Fail',
        })
      ).rejects.toThrow();
    });
  });

  describe('createOrganization', () => {
    it('should create new organization with user as owner', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const newOrg = {
        name: 'New Organization',
        clerkOrganizationId: 'org_789',
        slug: 'new-org',
      };

      const result = await ctx.runMutation('createOrganization', newOrg);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Organization');
      expect(result.slug).toBe('new-org');
      expect(result.status).toBe('active');

      // Check membership was created
      const memberships = await ctx.db
        .query('organizationMemberships')
        .filter((q: any) => q.eq(q.field('organizationId'), result._id))
        .collect();

      expect(memberships).toHaveLength(1);
      expect(memberships[0].userId).toBe(userId);
      expect(memberships[0].role).toBe('owner');
    });

    it('should throw error for duplicate slug', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await expect(
        ctx.runMutation('createOrganization', {
          name: 'Duplicate Org',
          clerkOrganizationId: 'org_999',
          slug: 'test-org', // Already exists
        })
      ).rejects.toThrow();
    });
  });

  describe('getOrganizationStats', () => {
    it('should return correct organization statistics', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create test data
      const projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create products
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: `Product ${i}`,
          handle: `product-${i}`,
          title: `Product ${i} Title`,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Create categories
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert('categories', {
          organizationId: orgId,
          projectId,
          name: `Category ${i}`,
          slug: `category-${i}`,
          isActive: true,
          productCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Add another member
      const userId2 = await ctx.db.insert('users', {
        clerkId: 'user_456',
        email: 'member@example.com',
        name: 'Team Member',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId: userId2,
        role: 'member',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const stats = await ctx.runQuery('getOrganizationStats', { organizationId: orgId });

      expect(stats).toBeDefined();
      expect(stats.totalProjects).toBe(1);
      expect(stats.totalProducts).toBe(5);
      expect(stats.totalCategories).toBe(3);
      expect(stats.totalMembers).toBe(2);
    });
  });
});