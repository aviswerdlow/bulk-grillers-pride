import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
import { convexTest } from '../../test-helpers';

describe('Projects API', () => {
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

  describe('getProjects', () => {
    beforeEach(async () => {
      // Create test projects
      for (let i = 0; i < 5; i++) {
        const projectId = await ctx.db.insert('projects', {
          organizationId: orgId,
          name: `Project ${i}`,
          slug: `project-${i}`,
          description: i % 2 === 0 ? `Description for project ${i}` : null,
          status: i === 4 ? 'archived' : 'active',
          settings: {
            enableComments: i % 2 === 0,
            requireApproval: i % 3 === 0,
          },
          createdAt: Date.now() - (i * 10000),
          updatedAt: Date.now() - (i * 10000),
        });

        // Add some products to projects
        for (let j = 0; j < i + 1; j++) {
          await ctx.db.insert('products', {
            organizationId: orgId,
            projectId,
            name: `Product ${i}-${j}`,
            handle: `product-${i}-${j}`,
            title: `Product ${i}-${j}`,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    });

    it('should return all active projects for organization', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getProjects', { organizationId: orgId });

      expect(result).toHaveLength(4); // Excluding archived project
      expect(result[0].name).toBe('Project 0'); // Ordered by creation date
      expect(result.every((p: any) => p.status === 'active')).toBe(true);
    });

    it('should include product counts', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getProjects', { organizationId: orgId });

      expect(result[0].productCount).toBe(1); // Project 0 has 1 product
      expect(result[1].productCount).toBe(2); // Project 1 has 2 products
      expect(result[2].productCount).toBe(3); // Project 2 has 3 products
      expect(result[3].productCount).toBe(4); // Project 3 has 4 products
    });

    it('should include archived projects when requested', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getProjects', {
        organizationId: orgId,
        includeArchived: true,
      });

      expect(result).toHaveLength(5);
      expect(result.find((p: any) => p.status === 'archived')).toBeDefined();
    });

    it('should return empty array for org without projects', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const newOrgId = await ctx.db.insert('organizations', {
        name: 'Empty Org',
        clerkOrganizationId: 'org_456',
        slug: 'empty-org',
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

      const result = await ctx.runQuery('getProjects', { organizationId: newOrgId });
      expect(result).toEqual([]);
    });
  });

  describe('getProject', () => {
    let projectId: string;

    beforeEach(async () => {
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test project description',
        status: 'active',
        settings: {
          enableComments: true,
          requireApproval: false,
          defaultCurrency: 'USD',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should return project by ID', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getProject', { projectId });

      expect(result).toBeDefined();
      expect(result._id).toBe(projectId);
      expect(result.name).toBe('Test Project');
      expect(result.slug).toBe('test-project');
      expect(result.settings.enableComments).toBe(true);
    });

    it('should throw error for non-existent project', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await expect(
        ctx.runQuery('getProject', { projectId: 'nonexistent' as any })
      ).rejects.toThrow();
    });

    it('should throw error when user not in organization', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create project in different org
      const otherOrgId = await ctx.db.insert('organizations', {
        name: 'Other Org',
        clerkOrganizationId: 'org_789',
        slug: 'other-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const otherProjectId = await ctx.db.insert('projects', {
        organizationId: otherOrgId,
        name: 'Other Project',
        slug: 'other-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runQuery('getProject', { projectId: otherProjectId })
      ).rejects.toThrow();
    });
  });

  describe('getProjectBySlug', () => {
    beforeEach(async () => {
      await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Slug Test Project',
        slug: 'slug-test',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should return project by slug', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getProjectBySlug', {
        organizationId: orgId,
        slug: 'slug-test',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Slug Test Project');
      expect(result.slug).toBe('slug-test');
    });

    it('should return null for non-existent slug', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runQuery('getProjectBySlug', {
        organizationId: orgId,
        slug: 'does-not-exist',
      });

      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create new project with generated slug', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const projectData = {
        organizationId: orgId,
        name: 'New Project',
        description: 'New project description',
        settings: {
          enableComments: true,
          requireApproval: false,
        },
      };

      const result = await ctx.runMutation('createProject', projectData);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Project');
      expect(result.slug).toBe('new-project');
      expect(result.status).toBe('active');
      expect(result.settings.enableComments).toBe(true);
    });

    it('should use custom slug when provided', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('createProject', {
        organizationId: orgId,
        name: 'Custom Slug Project',
        slug: 'my-custom-slug',
      });

      expect(result.slug).toBe('my-custom-slug');
    });

    it('should ensure unique slugs within organization', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create first project
      await ctx.runMutation('createProject', {
        organizationId: orgId,
        name: 'First Project',
        slug: 'unique-slug',
      });

      // Try to create with same slug
      await expect(
        ctx.runMutation('createProject', {
          organizationId: orgId,
          name: 'Second Project',
          slug: 'unique-slug',
        })
      ).rejects.toThrow();
    });

    it('should allow same slug in different organizations', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Create project in first org
      const project1 = await ctx.runMutation('createProject', {
        organizationId: orgId,
        name: 'Project One',
        slug: 'shared-slug',
      });

      // Create second org
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
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Should succeed with same slug in different org
      const project2 = await ctx.runMutation('createProject', {
        organizationId: orgId2,
        name: 'Project Two',
        slug: 'shared-slug',
      });

      expect(project1.slug).toBe('shared-slug');
      expect(project2.slug).toBe('shared-slug');
      expect(project1.organizationId).not.toBe(project2.organizationId);
    });

    it('should create audit log entry', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('createProject', {
        organizationId: orgId,
        name: 'Audited Project',
      });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), result._id))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('project.created');
      expect(auditLogs[0].entityType).toBe('project');
    });
  });

  describe('updateProject', () => {
    let projectId: string;

    beforeEach(async () => {
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Original Project',
        slug: 'original-project',
        description: 'Original description',
        status: 'active',
        settings: {
          enableComments: false,
          requireApproval: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should update project fields', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const updates = {
        projectId,
        name: 'Updated Project',
        description: 'Updated description',
        settings: {
          enableComments: true,
          requireApproval: false,
          defaultCurrency: 'EUR',
        },
      };

      const result = await ctx.runMutation('updateProject', updates);

      expect(result.name).toBe('Updated Project');
      expect(result.description).toBe('Updated description');
      expect(result.settings.enableComments).toBe(true);
      expect(result.settings.requireApproval).toBe(false);
      expect(result.settings.defaultCurrency).toBe('EUR');
      expect(result.slug).toBe('original-project'); // Slug not changed
    });

    it('should update slug when explicitly provided', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const result = await ctx.runMutation('updateProject', {
        projectId,
        slug: 'new-slug',
      });

      expect(result.slug).toBe('new-slug');
    });

    it('should require admin role', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update membership to member role
      const membership = (await ctx.db.query('organizationMemberships').collect())[0];
      await ctx.db.patch(membership._id, { role: 'member' });

      await expect(
        ctx.runMutation('updateProject', {
          projectId,
          name: 'Should Fail',
        })
      ).rejects.toThrow();
    });
  });

  describe('archiveProject', () => {
    let projectId: string;

    beforeEach(async () => {
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Project to Archive',
        slug: 'archive-me',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Add some products
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: `Product ${i}`,
          handle: `product-${i}`,
          title: `Product ${i}`,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });

    it('should archive project and its products', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await ctx.runMutation('archiveProject', { projectId });

      const project = await ctx.db.get(projectId);
      expect(project.status).toBe('archived');

      // Check that products are also archived
      const products = await ctx.db
        .query('products')
        .filter((q: any) => q.eq(q.field('projectId'), projectId))
        .collect();

      expect(products).toHaveLength(3);
      expect(products.every((p: any) => p.status === 'archived')).toBe(true);
    });

    it('should create audit log for archiving', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      await ctx.runMutation('archiveProject', { projectId });

      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q: any) => q.eq(q.field('entityId'), projectId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].eventType).toBe('project.archived');
      expect(auditLogs[0].context.productsArchived).toBe(3);
    });
  });

  describe('deleteProject', () => {
    let projectId: string;

    beforeEach(async () => {
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Project to Delete',
        slug: 'delete-me',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should require owner role', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Admin should not be able to delete
      await expect(
        ctx.runMutation('deleteProject', { projectId })
      ).rejects.toThrow();

      // Update to owner
      const membership = (await ctx.db.query('organizationMemberships').collect())[0];
      await ctx.db.patch(membership._id, { role: 'owner' });

      // Now should succeed
      await ctx.runMutation('deleteProject', { projectId });
      
      const project = await ctx.db.get(projectId);
      expect(project.deletedAt).toBeDefined();
    });

    it('should not allow deletion with existing products', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      // Update to owner
      const membership = (await ctx.db.query('organizationMemberships').collect())[0];
      await ctx.db.patch(membership._id, { role: 'owner' });

      // Add a product
      await ctx.db.insert('products', {
        organizationId: orgId,
        projectId,
        name: 'Blocking Product',
        handle: 'blocking-product',
        title: 'Blocking Product',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runMutation('deleteProject', { projectId })
      ).rejects.toThrow('Cannot delete project with existing products');
    });
  });
});