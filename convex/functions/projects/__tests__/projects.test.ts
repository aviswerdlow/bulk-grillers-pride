import { describe, it, expect, beforeEach } from '@jest/globals';
import { t, resetMockState } from '../../../test.setup';
import { createTestContext } from '../../../tests/helpers/convexTestCtx';
import type { TestContext } from '../../../tests/helpers/convexTestCtx';
import type { Id } from '../../../_generated/dataModel';

describe('Projects Functions', () => {
  let ctx: any;
  let testCtx: TestContext;
  let userId: Id<'users'>;
  let orgId: Id<'organizations'>;
  let membershipId: Id<'organizationMemberships'>;

  beforeEach(async () => {
    resetMockState();
    ctx = await t.run(async (ctx) => ctx);
    testCtx = createTestContext();

    // Create test user
    userId = await ctx.db.insert('users', {
      clerkId: 'test_user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test organization
    orgId = await ctx.db.insert('organizations', {
      name: 'Test Organization',
      slug: 'test-org',
      status: 'active',
      subscription: {
        plan: 'pro',
        status: 'active',
        trialEnds: null,
        seats: 10,
        features: ['basic_products', 'basic_categories', 'ai_categorization'],
      },
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4o-mini',
        apiKeys: {},
        categorization: {
          batchSize: 10,
          prompt: 'Default prompt',
          autoApprove: false,
          confidenceThreshold: 0.8,
        },
        storage: {
          maxFileSize: 10485760,
          totalStorageLimit: 1073741824,
          allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    // Create membership with admin role by default
    membershipId = await ctx.db.insert('organizationMemberships', {
      organizationId: orgId,
      userId,
      role: 'admin',
      permissions: ['*'],
      status: 'active',
      joinedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Setup auth
    t.auth.getUserIdentity.mockResolvedValue({
      tokenIdentifier: 'test_user_123',
      subject: 'test_user_123',
      email: 'test@example.com',
    });
  });

  describe('createProject', () => {
    describe('Happy Path', () => {
      it('should create project with required fields', async () => {
        // Act
        const projectId = await testCtx.handlers.createProject({
          organizationId: orgId,
          name: 'Test Project',
          slug: 'test-project',
          createdBy: userId,
        });

        // Assert
        expect(projectId).toBeDefined();
        const project = await ctx.db.get(projectId);
        expect(project).toMatchObject({
          organizationId: orgId,
          name: 'Test Project',
          slug: 'test-project',
          status: 'active',
          settings: {
            defaultCurrency: 'USD',
            defaultTaxRate: 0,
            importSettings: {
              autoValidate: true,
              duplicateHandling: 'skip',
              requiredFields: ['title', 'handle'],
            },
          },
          createdBy: userId,
          version: 1,
        });
      });

      it('should create project with description', async () => {
        // Act
        const projectId = await testCtx.handlers.createProject({
          organizationId: orgId,
          name: 'Project with Description',
          slug: 'project-desc',
          description: 'This is a test project description',
          createdBy: userId,
        });

        // Assert
        const project = await ctx.db.get(projectId);
        expect(project.description).toBe('This is a test project description');
      });

      it('should create audit log entry', async () => {
        // Act
        const projectId = await testCtx.handlers.createProject({
          organizationId: orgId,
          name: 'Audited Project',
          slug: 'audited-project',
          createdBy: userId,
        });

        // Assert
        const auditLogs = await ctx.db
          .query('auditLogs')
          .filter((q) => q.eq(q.field('entityId'), projectId))
          .collect();

        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          eventType: 'CREATE',
          entityType: 'projects',
          entityId: projectId,
          context: {
            action: 'create_project',
            source: 'web',
          },
          performedBy: {
            type: 'user',
            userId,
            userEmail: '',
          },
          metadata: {
            projectName: 'Audited Project',
            projectSlug: 'audited-project',
          },
        });
      });
    });

    describe('Slug Uniqueness', () => {
      it('should reject duplicate slug within organization', async () => {
        // Create first project
        await testCtx.handlers.createProject({
          organizationId: orgId,
          name: 'First Project',
          slug: 'unique-slug',
          createdBy: userId,
        });

        // Act & Assert
        await expect(
          testCtx.handlers.createProject({
            organizationId: orgId,
            name: 'Second Project',
            slug: 'unique-slug',
            createdBy: userId,
          })
        ).rejects.toThrow('Project slug already exists in this organization');
      });

      it('should allow same slug in different organizations', async () => {
        // Create another organization
        const otherOrgId = await ctx.db.insert('organizations', {
          name: 'Other Organization',
          slug: 'other-org',
          status: 'active',
          subscription: {
            plan: 'trial',
            status: 'active',
            trialEnds: Date.now() + 14 * 24 * 60 * 60 * 1000,
            seats: 5,
            features: ['basic_products', 'basic_categories', 'ai_categorization'],
          },
          settings: {
            aiProvider: 'openai',
            aiModel: 'gpt-4o-mini',
            apiKeys: {},
            categorization: {
              batchSize: 10,
              prompt: 'Default prompt',
              autoApprove: false,
              confidenceThreshold: 0.8,
            },
            storage: {
              maxFileSize: 10485760,
              totalStorageLimit: 1073741824,
              allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        });

        // Create project in first org
        const project1Id = await testCtx.handlers.createProject({
          organizationId: orgId,
          name: 'Project One',
          slug: 'shared-slug',
          createdBy: userId,
        });

        // Create project in second org
        const project2Id = await testCtx.handlers.createProject({
          organizationId: otherOrgId,
          name: 'Project Two',
          slug: 'shared-slug',
          createdBy: userId,
        });

        // Assert
        expect(project1Id).toBeDefined();
        expect(project2Id).toBeDefined();
        const project1 = await ctx.db.get(project1Id);
        const project2 = await ctx.db.get(project2Id);
        expect(project1.slug).toBe('shared-slug');
        expect(project2.slug).toBe('shared-slug');
        expect(project1.organizationId).not.toBe(project2.organizationId);
      });
    });
  });

  describe('updateProject', () => {
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      // Create test project
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Original Project',
        slug: 'original-project',
        description: 'Original description',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          defaultTaxRate: 0,
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'handle'],
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    describe('Happy Path', () => {
      it('should update project name', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          name: 'Updated Project Name',
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated.name).toBe('Updated Project Name');
        expect(updated.description).toBe('Original description'); // Unchanged
        expect(updated.version).toBe(2);
      });

      it('should update project description', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          description: 'Updated description',
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated.description).toBe('Updated description');
        expect(updated.name).toBe('Original Project'); // Unchanged
      });

      it('should update project status', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          status: 'draft',
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated.status).toBe('draft');
      });

      it('should update project settings', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          settings: {
            defaultCurrency: 'EUR',
            defaultTaxRate: 20,
            importSettings: {
              autoValidate: false,
              duplicateHandling: 'update',
              requiredFields: ['title', 'handle', 'sku'],
            },
          },
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated.settings).toMatchObject({
          defaultCurrency: 'EUR',
          defaultTaxRate: 20,
          importSettings: {
            autoValidate: false,
            duplicateHandling: 'update',
            requiredFields: ['title', 'handle', 'sku'],
          },
        });
      });

      it('should update multiple fields at once', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          name: 'New Name',
          description: 'New description',
          status: 'archived',
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated).toMatchObject({
          name: 'New Name',
          description: 'New description',
          status: 'archived',
        });
      });

      it('should create audit log for changes', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          name: 'Audited Update',
          status: 'draft',
        });

        // Assert
        const auditLogs = await ctx.db
          .query('auditLogs')
          .filter((q) => q.eq(q.field('entityId'), projectId))
          .collect();

        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          eventType: 'UPDATE',
          entityType: 'projects',
          entityId: projectId,
          context: {
            action: 'update_project',
            source: 'web',
          },
          performedBy: {
            type: 'user',
            userId,
            userEmail: 'test@example.com',
          },
        });
        expect(auditLogs[0].changes).toHaveLength(2);
      });

      it('should not create changes if no updates provided', async () => {
        // Act
        await testCtx.handlers.updateProject({
          projectId,
          name: 'Original Project', // Same as current
        });

        // Assert
        const auditLogs = await ctx.db
          .query('auditLogs')
          .filter((q) => q.eq(q.field('entityId'), projectId))
          .collect();

        expect(auditLogs).toHaveLength(0);
      });
    });

    describe('Authorization', () => {
      it('should fail for viewer role', async () => {
        // Update membership to viewer
        await ctx.db.patch(membershipId, { role: 'viewer' });

        // Act & Assert
        await expect(
          testCtx.handlers.updateProject({
            projectId,
            name: 'Should Fail',
          })
        ).rejects.toThrow('Insufficient permissions');
      });

      it('should fail for editor role', async () => {
        // Update membership to editor
        await ctx.db.patch(membershipId, { role: 'editor' });

        // Act & Assert
        await expect(
          testCtx.handlers.updateProject({
            projectId,
            name: 'Should Fail',
          })
        ).rejects.toThrow('Insufficient permissions');
      });

      it('should succeed for admin role', async () => {
        // Admin is already the default role

        // Act
        await testCtx.handlers.updateProject({
          projectId,
          name: 'Admin Update',
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated.name).toBe('Admin Update');
      });

      it('should succeed for owner role', async () => {
        // Update membership to owner
        await ctx.db.patch(membershipId, { role: 'owner' });

        // Act
        await testCtx.handlers.updateProject({
          projectId,
          name: 'Owner Update',
        });

        // Assert
        const updated = await ctx.db.get(projectId);
        expect(updated.name).toBe('Owner Update');
      });

      it('should fail for non-member', async () => {
        // Create another user without membership
        const otherUserId = await ctx.db.insert('users', {
          clerkId: 'other_user',
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Update auth to other user
        t.auth.getUserIdentity.mockResolvedValue({
          tokenIdentifier: 'other_user',
          subject: 'other_user',
          email: 'other@example.com',
        });

        // Act & Assert
        await expect(
          testCtx.handlers.updateProject({
            projectId,
            name: 'Unauthorized',
          })
        ).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Validation', () => {
      it('should fail for non-existent project', async () => {
        // Act & Assert
        await expect(
          testCtx.handlers.updateProject({
            projectId: 'proj_nonexistent' as Id<'projects'>,
            name: 'Should Fail',
          })
        ).rejects.toThrow('Project not found');
      });

      it('should fail for unauthenticated user', async () => {
        // Setup no auth
        t.auth.getUserIdentity.mockResolvedValue(null);

        // Act & Assert
        await expect(
          testCtx.handlers.updateProject({
            projectId,
            name: 'Should Fail',
          })
        ).rejects.toThrow('Not authenticated');
      });
    });
  });

  describe('deleteProject', () => {
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      // Create test project
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Project to Delete',
        slug: 'delete-me',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          defaultTaxRate: 0,
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'handle'],
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    describe('Happy Path', () => {
      it('should archive project (soft delete)', async () => {
        // Act
        await testCtx.handlers.deleteProject({ projectId });

        // Assert
        const deleted = await ctx.db.get(projectId);
        expect(deleted.status).toBe('archived');
      });

      it('should create audit log for deletion', async () => {
        // Act
        await testCtx.handlers.deleteProject({ projectId });

        // Assert
        const auditLogs = await ctx.db
          .query('auditLogs')
          .filter((q) => q.eq(q.field('entityId'), projectId))
          .collect();

        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          eventType: 'DELETE',
          entityType: 'projects',
          entityId: projectId,
          context: {
            action: 'delete_project',
            source: 'web',
          },
          metadata: {
            projectName: 'Project to Delete',
          },
        });
      });
    });

    describe('Authorization', () => {
      it('should fail for viewer role', async () => {
        // Update membership to viewer
        await ctx.db.patch(membershipId, { role: 'viewer' });

        // Act & Assert
        await expect(
          testCtx.handlers.deleteProject({ projectId })
        ).rejects.toThrow('Insufficient permissions to delete project');
      });

      it('should fail for editor role', async () => {
        // Update membership to editor
        await ctx.db.patch(membershipId, { role: 'editor' });

        // Act & Assert
        await expect(
          testCtx.handlers.deleteProject({ projectId })
        ).rejects.toThrow('Insufficient permissions to delete project');
      });

      it('should succeed for admin role', async () => {
        // Admin is already the default role

        // Act
        await testCtx.handlers.deleteProject({ projectId });

        // Assert
        const deleted = await ctx.db.get(projectId);
        expect(deleted.status).toBe('archived');
      });

      it('should succeed for owner role', async () => {
        // Update membership to owner
        await ctx.db.patch(membershipId, { role: 'owner' });

        // Act
        await testCtx.handlers.deleteProject({ projectId });

        // Assert
        const deleted = await ctx.db.get(projectId);
        expect(deleted.status).toBe('archived');
      });
    });
  });

  describe('archiveProject', () => {
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      // Create test project
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Project to Archive',
        slug: 'archive-me',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          defaultTaxRate: 0,
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'handle'],
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    it('should archive project', async () => {
      // Act
      await testCtx.handlers.archiveProject({
        projectId,
        archivedBy: userId,
      });

      // Assert
      const archived = await ctx.db.get(projectId);
      expect(archived.status).toBe('archived');
    });

    it('should create audit log entry', async () => {
      // Act
      await testCtx.handlers.archiveProject({
        projectId,
        archivedBy: userId,
      });

      // Assert
      const auditLogs = await ctx.db
        .query('auditLogs')
        .filter((q) => q.eq(q.field('entityId'), projectId))
        .collect();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        eventType: 'UPDATE',
        entityType: 'projects',
        entityId: projectId,
        context: {
          action: 'archive_project',
          source: 'web',
        },
        performedBy: {
          type: 'user',
          userId,
          userEmail: '',
        },
      });
    });

    it('should fail for non-existent project', async () => {
      // Act & Assert
      await expect(
        testCtx.handlers.archiveProject({
          projectId: 'proj_nonexistent' as Id<'projects'>,
          archivedBy: userId,
        })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getOrganizationProjects', () => {
    beforeEach(async () => {
      // Create multiple test projects
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert('projects', {
          organizationId: orgId,
          name: `Project ${i}`,
          slug: `project-${i}`,
          description: i % 2 === 0 ? `Description for project ${i}` : undefined,
          status: i === 4 ? 'archived' : 'active',
          settings: {
            defaultCurrency: 'USD',
            defaultTaxRate: 0,
            importSettings: {
              autoValidate: true,
              duplicateHandling: 'skip',
              requiredFields: ['title', 'handle'],
            },
          },
          createdBy: userId,
          createdAt: Date.now() - i * 10000,
          updatedAt: Date.now() - i * 10000,
          version: 1,
        });
      }
    });

    it('should return all active projects for organization', async () => {
      // Act
      const result = await testCtx.handlers.getOrganizationProjects({
        organizationId: orgId,
      });

      // Assert
      expect(result).toHaveLength(4); // Excluding archived project
      expect(result.every((p) => p.status === 'active')).toBe(true);
      expect(result.map((p) => p.name)).toContain('Project 0');
      expect(result.map((p) => p.name)).toContain('Project 1');
      expect(result.map((p) => p.name)).toContain('Project 2');
      expect(result.map((p) => p.name)).toContain('Project 3');
      expect(result.map((p) => p.name)).not.toContain('Project 4'); // Archived
    });

    it('should return empty array for org without projects', async () => {
      // Create new org
      const newOrgId = await ctx.db.insert('organizations', {
        name: 'Empty Org',
        slug: 'empty-org',
        status: 'active',
        subscription: {
          plan: 'trial',
          status: 'active',
          trialEnds: Date.now() + 14 * 24 * 60 * 60 * 1000,
          seats: 5,
          features: ['basic_products', 'basic_categories', 'ai_categorization'],
        },
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4o-mini',
          apiKeys: {},
          categorization: {
            batchSize: 10,
            prompt: 'Default prompt',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      // Act
      const result = await testCtx.handlers.getOrganizationProjects({
        organizationId: newOrgId,
      });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getProjectBySlug', () => {
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      // Create test project
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Slug Test Project',
        slug: 'slug-test',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          defaultTaxRate: 0,
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'handle'],
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });
    });

    it('should return project by slug', async () => {
      // Act
      const result = await testCtx.handlers.getProjectBySlug({
        organizationId: orgId,
        slug: 'slug-test',
      });

      // Assert
      expect(result).toMatchObject({
        _id: projectId,
        name: 'Slug Test Project',
        slug: 'slug-test',
      });
    });

    it('should return null for non-existent slug', async () => {
      // Act
      const result = await testCtx.handlers.getProjectBySlug({
        organizationId: orgId,
        slug: 'does-not-exist',
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should not find project from different organization', async () => {
      // Create another org
      const otherOrgId = await ctx.db.insert('organizations', {
        name: 'Other Org',
        slug: 'other-org',
        status: 'active',
        subscription: {
          plan: 'trial',
          status: 'active',
          trialEnds: Date.now() + 14 * 24 * 60 * 60 * 1000,
          seats: 5,
          features: ['basic_products', 'basic_categories', 'ai_categorization'],
        },
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4o-mini',
          apiKeys: {},
          categorization: {
            batchSize: 10,
            prompt: 'Default prompt',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10485760,
            totalStorageLimit: 1073741824,
            allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'text/csv'],
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      // Act
      const result = await testCtx.handlers.getProjectBySlug({
        organizationId: otherOrgId,
        slug: 'slug-test',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getProjectStats', () => {
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      // Create test project
      projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Stats Test Project',
        slug: 'stats-test',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          defaultTaxRate: 0,
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'handle'],
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      // Create products
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          title: `Product ${i}`,
          handle: `product-${i}`,
          status: i < 3 ? 'active' : 'draft',
          tags: [],
          categories: [],
          images: [],
          metadata: {},
          version: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        });
      }

      // Create categories
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert('categories', {
          organizationId: orgId,
          projectId,
          name: `Category ${i}`,
          handle: `category-${i}`,
          level: 1,
          path: [`category-${i}`],
          sortOrder: i,
          isVisible: true,
          parentId: null,
          status: 'active',
          metadata: {},
          version: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        });
      }

      // Create AI jobs
      await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        status: 'pending',
        type: 'bulk',
        totalProducts: 100,
        processedProducts: 0,
        successfulProducts: 0,
        failedProducts: 0,
        parameters: {
          productFilters: {},
          categoryScope: 'all',
          confidenceThreshold: 0.8,
          autoApprove: false,
        },
        metadata: {},
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        status: 'running',
        type: 'bulk',
        totalProducts: 50,
        processedProducts: 25,
        successfulProducts: 20,
        failedProducts: 5,
        parameters: {
          productFilters: {},
          categoryScope: 'all',
          confidenceThreshold: 0.8,
          autoApprove: false,
        },
        metadata: {},
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    it('should return project statistics', async () => {
      // Act
      const result = await testCtx.handlers.getProjectStats({ projectId });

      // Assert
      expect(result).toMatchObject({
        totalProducts: 5,
        activeProducts: 3,
        draftProducts: 2,
        totalCategories: 3,
        activeCategories: 3,
        activeAiJobs: 2,
      });
    });

    it('should return null for non-existent project', async () => {
      // Act
      const result = await testCtx.handlers.getProjectStats({
        projectId: 'proj_nonexistent' as Id<'projects'>,
      });

      // Assert
      expect(result).toBeNull();
    });
  });
});