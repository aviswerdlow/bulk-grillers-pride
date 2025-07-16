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
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  updateProjectSettings,
} from '../../../functions/projects/projects';

describe('projects', () => {
  let db: MockDatabase;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = new MockDatabase();
    testData = await seedTestData(db);
    setupMockAuth(db, testData);
  });

  describe('getProjects', () => {
    it('should return projects for an organization', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getProjects, context, { organizationId: testData.orgId });

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(testData.projectId);
      expect(result[0].name).toBe('Test Project');
      expect(result[0].slug).toBe('test-project');
      expect(mockAuthHelpers.authenticateAndAuthorize).toHaveBeenCalledWith(
        expect.anything(),
        testData.orgId
      );
    });

    it('should filter by status when provided', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create an archived project
      await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Archived Project',
        slug: 'archived-project',
        description: 'An archived project',
        status: 'archived',
        settings: {
          defaultCurrency: 'USD',
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'sku'],
          },
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      // Query for active projects only
      const result = await runQuery(getProjects, context, {
        organizationId: testData.orgId,
        status: 'active',
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });

    it('should return multiple projects ordered by creation time', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create additional projects
      for (let i = 1; i <= 3; i++) {
        await db.insert('projects', {
          organizationId: testData.orgId,
          name: `Project ${i}`,
          slug: `project-${i}`,
          description: `Description ${i}`,
          status: 'active',
          settings: {
            defaultCurrency: 'USD',
            importSettings: {
              autoValidate: true,
              duplicateHandling: 'skip',
              requiredFields: ['title'],
            },
          },
          createdBy: testData.userId,
          createdAt: Date.now() + i * 1000, // Different creation times
          updatedAt: Date.now() + i * 1000,
          version: 1,
        });
      }

      const result = await runQuery(getProjects, context, { organizationId: testData.orgId });

      expect(result).toHaveLength(4); // Original + 3 new ones
      // Should be ordered by creation time descending
      expect(result[0].name).toBe('Project 3');
      expect(result[1].name).toBe('Project 2');
      expect(result[2].name).toBe('Project 1');
      expect(result[3].name).toBe('Test Project');
    });

    it('should throw error when not authenticated', async () => {
      const context = createMockQueryContext(null, db);

      mockAuthHelpers.authenticateAndAuthorize.mockRejectedValueOnce(
        new Error('Not authenticated')
      );

      await expect(
        runQuery(getProjects, context, { organizationId: testData.orgId })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('getProject', () => {
    it('should return a single project by ID', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);
      const result = await runQuery(getProject, context, { projectId: testData.projectId });

      expect(result._id).toBe(testData.projectId);
      expect(result.name).toBe('Test Project');
      expect(result.settings).toBeDefined();
      expect(result.settings.defaultCurrency).toBe('USD');
    });

    it('should include stats if requested', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Add some products and categories
      for (let i = 0; i < 5; i++) {
        await db.insert('products', {
          organizationId: testData.orgId,
          projectId: testData.projectId,
          title: `Product ${i}`,
          handle: `product-${i}`,
          status: 'active',
          tags: [],
          categories: [testData.rootCategoryId],
          images: [],
          metadata: {},
          version: 1,
          createdBy: testData.userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: testData.userId,
        });
      }

      const result = await runQuery(getProject, context, {
        projectId: testData.projectId,
        includeStats: true,
      });

      expect(result.stats).toBeDefined();
      expect(result.stats?.productCount).toBe(6); // 1 original + 5 new
      expect(result.stats?.categoryCount).toBe(2); // 1 root + 1 sub
      expect(result.stats?.lastUpdated).toBeDefined();
    });

    it('should throw error if project not found', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      await expect(runQuery(getProject, context, { projectId: 'projects_999999' })).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw error if user lacks access', async () => {
      const context = createMockQueryContext(mockIdentities.user, db);

      // Create a project in different org
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

      const otherProjectId = await db.insert('projects', {
        organizationId: otherOrgId,
        name: 'Other Project',
        slug: 'other-project',
        status: 'active',
        settings: {
          defaultCurrency: 'EUR',
          importSettings: {
            autoValidate: false,
            duplicateHandling: 'update',
            requiredFields: ['title'],
          },
        },
        createdBy: 'other-user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      mockAuthHelpers.authenticateAndAuthorize.mockRejectedValueOnce(new Error('Access denied'));

      await expect(runQuery(getProject, context, { projectId: otherProjectId })).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const projectId = await runMutation(createProject, context, {
        organizationId: testData.orgId,
        name: 'New Project',
        description: 'A brand new project',
        slug: 'new-project',
      });

      convexAssertions.expectToBeValidId(projectId, 'projects');

      const project = await db.get(projectId);
      expect(project.name).toBe('New Project');
      expect(project.description).toBe('A brand new project');
      expect(project.slug).toBe('new-project');
      expect(project.status).toBe('active');
      expect(project.createdBy).toBe(testData.userId);
      expect(project.version).toBe(1);

      // Check default settings
      expect(project.settings.defaultCurrency).toBe('USD');
      expect(project.settings.importSettings.autoValidate).toBe(true);
      expect(project.settings.importSettings.duplicateHandling).toBe('skip');

      // Verify auth was called with correct permissions
      expect(mockAuthHelpers.requireRole).toHaveBeenCalledWith(expect.anything(), testData.orgId, [
        'owner',
        'admin',
        'editor',
      ]);
    });

    it('should auto-generate slug from name', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const projectId = await runMutation(createProject, context, {
        organizationId: testData.orgId,
        name: 'My Amazing Project 2024!',
      });

      const project = await db.get(projectId);
      expect(project.slug).toBe('my-amazing-project-2024-');
    });

    it('should use custom settings when provided', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const projectId = await runMutation(createProject, context, {
        organizationId: testData.orgId,
        name: 'Custom Project',
        settings: {
          defaultCurrency: 'EUR',
          importSettings: {
            autoValidate: false,
            duplicateHandling: 'update',
            requiredFields: ['title', 'sku', 'price'],
          },
        },
      });

      const project = await db.get(projectId);
      expect(project.settings.defaultCurrency).toBe('EUR');
      expect(project.settings.importSettings.autoValidate).toBe(false);
      expect(project.settings.importSettings.duplicateHandling).toBe('update');
      expect(project.settings.importSettings.requiredFields).toEqual(['title', 'sku', 'price']);
    });

    it('should prevent duplicate slugs within organization', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await expect(
        runMutation(createProject, context, {
          organizationId: testData.orgId,
          name: 'Another Project',
          slug: 'test-project', // Already exists
        })
      ).rejects.toThrow('Project slug already exists in this organization');
    });

    it('should allow same slug in different organizations', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

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

      // Add user as member
      await db.insert('organizationMemberships', {
        organizationId: otherOrgId,
        userId: testData.userId,
        role: 'owner',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Should succeed with same slug in different org
      const projectId = await runMutation(createProject, context, {
        organizationId: otherOrgId,
        name: 'Test Project',
        slug: 'test-project', // Same as in testData org
      });

      convexAssertions.expectToBeValidId(projectId, 'projects');
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Mock requireRole to throw insufficient permissions
      mockAuthHelpers.requireRole.mockRejectedValueOnce(new Error('Insufficient permissions'));

      await expect(
        runMutation(createProject, context, {
          organizationId: testData.orgId,
          name: 'New Project',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateProject', () => {
    it('should update project details', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(updateProject, context, {
        projectId: testData.projectId,
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'paused',
      });

      expect(result).toBe(testData.projectId);

      const project = await db.get(testData.projectId);
      expect(project.name).toBe('Updated Project Name');
      expect(project.description).toBe('Updated description');
      expect(project.status).toBe('paused');
      expect(project.version).toBe(2);
      expect(project.lastModifiedBy).toBe(testData.userId);
    });

    it('should prevent duplicate slugs', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create another project
      const otherProjectId = await db.insert('projects', {
        organizationId: testData.orgId,
        name: 'Other Project',
        slug: 'other-project',
        status: 'active',
        settings: {
          defaultCurrency: 'USD',
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title'],
          },
        },
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      });

      await expect(
        runMutation(updateProject, context, {
          projectId: otherProjectId,
          slug: 'test-project', // Already exists
        })
      ).rejects.toThrow('Project slug already exists in this organization');
    });

    it('should skip update if no changes', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(updateProject, context, {
        projectId: testData.projectId,
        name: 'Test Project', // Same as current
      });

      const project = await db.get(testData.projectId);
      expect(project.version).toBe(1); // Version should not increment
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(updateProject, context, {
          projectId: testData.projectId,
          name: 'Updated Name',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateProjectSettings', () => {
    it('should update project settings', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      await runMutation(updateProjectSettings, context, {
        projectId: testData.projectId,
        settings: {
          defaultCurrency: 'EUR',
          importSettings: {
            autoValidate: false,
            duplicateHandling: 'update',
            requiredFields: ['title', 'sku', 'price'],
          },
        },
      });

      const project = await db.get(testData.projectId);
      expect(project.settings.defaultCurrency).toBe('EUR');
      expect(project.settings.importSettings.autoValidate).toBe(false);
      expect(project.settings.importSettings.duplicateHandling).toBe('update');
      expect(project.settings.importSettings.requiredFields).toEqual(['title', 'sku', 'price']);
    });

    it('should merge settings partially', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update only currency
      await runMutation(updateProjectSettings, context, {
        projectId: testData.projectId,
        settings: {
          defaultCurrency: 'GBP',
        },
      });

      const project = await db.get(testData.projectId);
      expect(project.settings.defaultCurrency).toBe('GBP');
      // Import settings should remain unchanged
      expect(project.settings.importSettings.autoValidate).toBe(true);
      expect(project.settings.importSettings.duplicateHandling).toBe('skip');
    });

    it('should update nested import settings', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      await runMutation(updateProjectSettings, context, {
        projectId: testData.projectId,
        settings: {
          importSettings: {
            requiredFields: ['title', 'sku', 'price', 'description'],
          },
        },
      });

      const project = await db.get(testData.projectId);
      // Only requiredFields should change
      expect(project.settings.importSettings.requiredFields).toEqual([
        'title',
        'sku',
        'price',
        'description',
      ]);
      // Other import settings should remain
      expect(project.settings.importSettings.autoValidate).toBe(true);
      expect(project.settings.importSettings.duplicateHandling).toBe('skip');
      // Currency should remain
      expect(project.settings.defaultCurrency).toBe('USD');
    });

    it('should require edit permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to viewer role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'viewer' });

      await expect(
        runMutation(updateProjectSettings, context, {
          projectId: testData.projectId,
          settings: {
            defaultCurrency: 'EUR',
          },
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('deleteProject', () => {
    it('should soft delete a project', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);
      const result = await runMutation(deleteProject, context, { projectId: testData.projectId });

      expect(result).toBe(testData.projectId);

      const project = await db.get(testData.projectId);
      expect(project.status).toBe('archived');
      expect(project.archivedAt).toBeDefined();
      expect(project.archivedBy).toBe(testData.userId);
    });

    it('should cascade archive products and categories', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Create more test data
      const productId2 = await db.insert('products', {
        organizationId: testData.orgId,
        projectId: testData.projectId,
        title: 'Another Product',
        handle: 'another-product',
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        metadata: {},
        version: 1,
        createdBy: testData.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: testData.userId,
      });

      await runMutation(deleteProject, context, { projectId: testData.projectId });

      // Check products were archived
      const product1 = await db.get(testData.productId);
      const product2 = await db.get(productId2);
      expect(product1.status).toBe('archived');
      expect(product2.status).toBe('archived');

      // Check categories were archived
      const category1 = await db.get(testData.rootCategoryId);
      const category2 = await db.get(testData.subCategoryId);
      expect(category1.status).toBe('archived');
      expect(category2.status).toBe('archived');
    });

    it('should require admin permissions', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Update membership to editor role
      const memberships = await db.query('organizationMemberships').collect();
      await db.patch(memberships[0]._id, { role: 'editor' });

      await expect(
        runMutation(deleteProject, context, { projectId: testData.projectId })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent deleting already archived project', async () => {
      const context = createMockMutationContext(mockIdentities.user, db);

      // Archive the project first
      await db.patch(testData.projectId, {
        status: 'archived',
        archivedAt: Date.now(),
        archivedBy: testData.userId,
      });

      await expect(
        runMutation(deleteProject, context, { projectId: testData.projectId })
      ).rejects.toThrow('Project is already archived');
    });
  });
});
