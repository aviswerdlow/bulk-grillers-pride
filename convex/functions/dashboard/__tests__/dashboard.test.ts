import { describe, it, expect, beforeEach } from '@jest/globals';
import { t, resetMockState } from '../../../test.setup';
import { createTestContext } from '../../../tests/helpers/convexTestCtx';
import type { TestContext } from '../../../tests/helpers/convexTestCtx';
import type { Id } from '../../../_generated/dataModel';

describe('Dashboard Functions', () => {
  let ctx: any;
  let testCtx: TestContext;
  let userId: Id<'users'>;
  let orgId: Id<'organizations'>;
  let projectId: Id<'projects'>;
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

    // Create organization membership
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

    // Create test project
    projectId = await ctx.db.insert('projects', {
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    // Setup auth
    t.auth.getUserIdentity.mockResolvedValue({
      tokenIdentifier: 'test_user_123',
      subject: 'test_user_123',
      email: 'test@example.com',
    });
  });

  describe('getDashboardStats', () => {
    beforeEach(async () => {
      // Create test data
      // Products with different statuses
      const productStatuses = ['active', 'active', 'draft', 'archived'] as const;
      const productIds = [];
      for (let i = 0; i < 4; i++) {
        const id = await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          title: `Product ${i}`,
          handle: `product-${i}`,
          status: productStatuses[i],
          tags: [],
          categories: i < 2 ? [`cat_${i}`] : [], // First two products have categories
          images: [],
          metadata: {},
          version: 1,
          createdBy: userId,
          createdAt: Date.now() - (i * 86400000), // Different days
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        });
        productIds.push(id);
      }

      // Categories
      const categoryIds = [];
      for (let i = 0; i < 3; i++) {
        const id = await ctx.db.insert('categories', {
          organizationId: orgId,
          projectId,
          name: `Category ${i}`,
          handle: `category-${i}`,
          level: 1,
          path: [`category-${i}`],
          sortOrder: i,
          isVisible: i !== 2, // Last one not visible
          parentId: null,
          status: 'active',
          metadata: {},
          version: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        });
        categoryIds.push(id);
      }

      // Category assignments
      await ctx.db.insert('categoryProductAssignments', {
        productId: productIds[0],
        categoryId: categoryIds[0],
        assignedBy: 'user',
        assignedAt: Date.now(),
        confidence: 1.0,
        updatedAt: Date.now(),
      });

      await ctx.db.insert('categoryProductAssignments', {
        productId: productIds[1],
        categoryId: categoryIds[1],
        assignedBy: 'ai',
        assignedAt: Date.now(),
        confidence: 0.95,
        rationale: 'AI categorization',
        updatedAt: Date.now(),
      });

      // Team members
      const userId2 = await ctx.db.insert('users', {
        clerkId: 'user_456',
        email: 'member@example.com',
        firstName: 'Team',
        lastName: 'Member',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId: userId2,
        role: 'editor',
        permissions: ['read', 'write'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Import job
      await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        importType: 'products',
        fileName: 'products.csv',
        fileSize: 1024,
        fileStorageId: 'storage_1',
        status: 'completed',
        progress: {
          totalRows: 10,
          processedRows: 10,
          validRows: 8,
          invalidRows: 2,
          importedRows: 8,
          skippedRows: 0,
        },
        fieldMapping: {
          mappings: {
            name: 'title',
            description: 'description',
            price: 'price',
          },
          options: {
            hasHeaders: true,
            delimiter: ',',
            skipEmptyRows: true,
            duplicateHandling: 'skip',
          },
        },
        validationRules: [],
        validationErrors: [],
        importResults: {
          createdRecords: Array(8).fill('').map((_, idx) => `prod_${idx}`),
          updatedRecords: [],
          skippedRecords: [],
        },
        createdBy: userId,
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 1800000, // 30 min ago
      });

      // AI categorization job
      await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        status: 'completed',
        type: 'bulk',
        totalProducts: 2,
        processedProducts: 2,
        successfulProducts: 2,
        failedProducts: 0,
        parameters: {
          productFilters: {},
          categoryScope: 'all',
          confidenceThreshold: 0.8,
          autoApprove: false,
        },
        results: {
          categorized: productIds.slice(0, 2).map((id, idx) => ({
            productId: id,
            categoryId: categoryIds[idx],
            confidence: idx === 0 ? 0.95 : 0.90,
            rationale: 'Good match',
            status: 'applied' as const,
          })),
          errors: [],
        },
        metadata: {},
        createdBy: userId,
        createdAt: Date.now() - 7200000, // 2 hours ago
        updatedAt: Date.now() - 3600000, // 1 hour ago
      });

      // Add another AI job that's still running
      await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        status: 'running',
        type: 'bulk',
        totalProducts: 10,
        processedProducts: 5,
        successfulProducts: 4,
        failedProducts: 1,
        parameters: {
          productFilters: {},
          categoryScope: 'all',
          confidenceThreshold: 0.8,
          autoApprove: false,
        },
        metadata: {},
        createdBy: userId,
        createdAt: Date.now() - 600000, // 10 minutes ago
        updatedAt: Date.now(),
      });
    });

    it('should return comprehensive dashboard statistics', async () => {
      // Act
      const stats = await testCtx.handlers.getDashboardStats({ organizationId: orgId });

      // Assert
      expect(stats).toBeDefined();
      
      // Organization stats
      expect(stats.projectsCount).toBe(1);
      expect(stats.teamMembersCount).toBe(2);

      // Product stats
      expect(stats.productsCount).toBe(3); // 4 total - 1 archived
      expect(stats.productsByStatus).toMatchObject({
        active: 2,
        draft: 1,
        total: 3,
      });
      expect(stats.categorizedProducts).toBe(2);
      expect(stats.uncategorizedProducts).toBe(1);

      // AI jobs stats
      expect(stats.activeAiJobsCount).toBe(1); // 1 running job

      // Import stats
      expect(stats.recentImports).toHaveLength(1);
      expect(stats.recentImports[0]).toMatchObject({
        filename: 'products.csv',
        status: 'completed',
        stats: {
          successful: 8,
          failed: 0,
          skipped: 0,
        },
      });
    });

    it('should handle organization with no data', async () => {
      // Create empty org
      const emptyOrgId = await ctx.db.insert('organizations', {
        name: 'Empty Org',
        slug: 'empty-org',
        status: 'active',
        subscription: {
          plan: 'trial',
          status: 'active',
          trialEnds: Date.now() + 14 * 24 * 60 * 60 * 1000,
          seats: 5,
          features: ['basic_products', 'basic_categories'],
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

      await ctx.db.insert('organizationMemberships', {
        organizationId: emptyOrgId,
        userId,
        role: 'admin',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Act
      const stats = await testCtx.handlers.getDashboardStats({ organizationId: emptyOrgId });

      // Assert
      expect(stats.projectsCount).toBe(0);
      expect(stats.productsCount).toBe(0);
      expect(stats.productsByStatus.total).toBe(0);
      expect(stats.categorizedProducts).toBe(0);
      expect(stats.activeAiJobsCount).toBe(0);
      expect(stats.teamMembersCount).toBe(1);
      expect(stats.recentImports).toEqual([]);
    });

    it('should fail for unauthenticated user', async () => {
      // Setup no auth
      t.auth.getUserIdentity.mockResolvedValue(null);

      // Act & Assert
      await expect(
        testCtx.handlers.getDashboardStats({ organizationId: orgId })
      ).rejects.toThrow('Not authenticated');
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
        testCtx.handlers.getDashboardStats({ organizationId: orgId })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getRecentActivity', () => {
    beforeEach(async () => {
      // Create various audit log entries
      const now = Date.now();
      const activities = [
        {
          eventType: 'CREATE',
          entityType: 'products',
          entityId: 'prod_1' as Id<'products'>,
          changes: [
            {
              field: '*',
              oldValue: null,
              newValue: 'product_created',
              changeType: 'added' as const,
            },
          ],
          context: { 
            action: 'create_product',
            source: 'web' as const,
          },
          timestamp: now - 300000, // 5 min ago
        },
        {
          eventType: 'UPDATE',
          entityType: 'categories',
          entityId: 'cat_1' as Id<'categories'>,
          changes: [
            {
              field: 'name',
              oldValue: 'Old Category',
              newValue: 'New Category',
              changeType: 'modified' as const,
            },
          ],
          context: { 
            action: 'update_category',
            source: 'web' as const,
          },
          timestamp: now - 600000, // 10 min ago
        },
        {
          eventType: 'CREATE',
          entityType: 'importJobs',
          entityId: 'import_1' as Id<'importJobs'>,
          changes: [
            {
              field: '*',
              oldValue: null,
              newValue: { 
                importType: 'products',
                fileName: 'import.csv',
                fileSize: 2048,
              },
              changeType: 'added' as const,
            },
          ],
          context: { 
            action: 'create_import_job',
            source: 'web' as const,
          },
          metadata: {
            fileName: 'import.csv',
            totalRows: 100,
          },
          timestamp: now - 900000, // 15 min ago
        },
        {
          eventType: 'CREATE',
          entityType: 'aiCategorizationJobs',
          entityId: 'job_1' as Id<'aiCategorizationJobs'>,
          changes: [
            {
              field: '*',
              oldValue: null,
              newValue: {
                type: 'bulk',
                totalProducts: 50,
              },
              changeType: 'added' as const,
            },
          ],
          context: {
            action: 'create_ai_job',
            source: 'web' as const,
          },
          metadata: {
            productCount: 50,
            aiProvider: 'openai',
            aiModel: 'gpt-4',
          },
          timestamp: now - 1200000, // 20 min ago
        },
        {
          eventType: 'CREATE',
          entityType: 'projects',
          entityId: projectId,
          changes: [
            {
              field: '*',
              oldValue: null,
              newValue: 'project_created',
              changeType: 'added' as const,
            },
          ],
          context: {
            action: 'create_project',
            source: 'web' as const,
          },
          metadata: {
            projectName: 'Test Project',
            projectSlug: 'test-project',
          },
          timestamp: now - 1500000, // 25 min ago
        },
      ];

      for (const activity of activities) {
        await ctx.db.insert('auditLogs', {
          organizationId: orgId,
          ...activity,
          performedBy: {
            type: 'user' as const,
            userId,
            userEmail: 'test@example.com',
          },
          isRollbackable: false,
        });
      }

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add a system audit log
      await ctx.db.insert('auditLogs', {
        organizationId: orgId,
        eventType: 'UPDATE',
        entityType: 'system',
        entityId: 'sys_1' as any,
        changes: [],
        context: {
          action: 'system_update',
          source: 'system' as const,
        },
        performedBy: {
          type: 'system' as const,
          service: 'background-job',
        },
        timestamp: now - 100000, // Recent
        isRollbackable: false,
      });

      // Wait again
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add an AI audit log
      await ctx.db.insert('auditLogs', {
        organizationId: orgId,
        eventType: 'CREATE',
        entityType: 'categoryProductAssignments',
        entityId: 'assign_1' as any,
        changes: [],
        context: {
          action: 'ai_categorization',
          source: 'ai' as const,
        },
        performedBy: {
          type: 'ai' as const,
          model: 'gpt-4',
          confidence: 0.95,
        },
        timestamp: now - 50000, // Most recent
        isRollbackable: false,
      });
    });

    it('should return recent activity in chronological order', async () => {
      // Act
      const activities = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 10,
      });

      // Assert
      expect(activities).toHaveLength(7);
      
      // Should be ordered by timestamp desc (newest first)
      expect(activities[0].performedBy.type).toBe('ai');
      expect(activities[1].performedBy.type).toBe('system');
      expect(activities[2].entityType).toBe('products');
      expect(activities[3].entityType).toBe('categories');
      expect(activities[4].entityType).toBe('importJobs');
      expect(activities[5].entityType).toBe('aiCategorizationJobs');
      expect(activities[6].entityType).toBe('projects');
    });

    it('should include user information', async () => {
      // Act
      const activities = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 10,
      });

      // Assert
      const userActivity = activities.find(a => a.performedBy.type === 'user');
      expect(userActivity).toBeDefined();
      expect(userActivity!.performedBy.name).toBe('Test User');
    });

    it('should include system information', async () => {
      // Act
      const activities = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 10,
      });

      // Assert
      const systemActivity = activities.find(a => a.performedBy.type === 'system');
      expect(systemActivity).toBeDefined();
      expect(systemActivity!.performedBy.name).toBe('background-job');
    });

    it('should include AI information', async () => {
      // Act
      const activities = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 10,
      });

      // Assert
      const aiActivity = activities.find(a => a.performedBy.type === 'ai');
      expect(aiActivity).toBeDefined();
      expect(aiActivity!.performedBy.name).toBe('AI (gpt-4)');
    });

    it('should respect limit parameter', async () => {
      // Act
      const activities = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 3,
      });

      // Assert
      expect(activities).toHaveLength(3);
    });

    it('should handle invalid limit gracefully', async () => {
      // Act - limit too low
      const activitiesLow = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 0,
      });

      // Assert - should use default of 10
      expect(activitiesLow.length).toBeLessThanOrEqual(10);

      // Act - limit too high
      const activitiesHigh = await testCtx.handlers.getRecentActivity({
        organizationId: orgId,
        limit: 200,
      });

      // Assert - should use default of 10
      expect(activitiesHigh.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty activity log', async () => {
      // Create empty org
      const emptyOrgId = await ctx.db.insert('organizations', {
        name: 'Empty Activity Org',
        slug: 'empty-activity',
        status: 'active',
        subscription: {
          plan: 'trial',
          status: 'active',
          trialEnds: Date.now() + 14 * 24 * 60 * 60 * 1000,
          seats: 5,
          features: ['basic_products', 'basic_categories'],
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

      await ctx.db.insert('organizationMemberships', {
        organizationId: emptyOrgId,
        userId,
        role: 'admin',
        permissions: ['*'],
        status: 'active',
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Act
      const activities = await testCtx.handlers.getRecentActivity({
        organizationId: emptyOrgId,
        limit: 10,
      });

      // Assert
      expect(activities).toEqual([]);
    });

    it('should fail for unauthenticated user', async () => {
      // Setup no auth
      t.auth.getUserIdentity.mockResolvedValue(null);

      // Act & Assert
      await expect(
        testCtx.handlers.getRecentActivity({
          organizationId: orgId,
          limit: 10,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });
});