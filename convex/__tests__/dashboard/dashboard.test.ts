import { convexTest } from '../test-helpers';

describe('Dashboard API', () => {
  let ctx: any;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    ctx = convexTest();

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

    // Create test project
    projectId = await ctx.db.insert('projects', {
      organizationId: orgId,
      name: 'Test Project',
      slug: 'test-project',
      status: 'active',
      settings: {},
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

  describe('getDashboardStats', () => {
    beforeEach(async () => {
      // Create test data
      // Products with different statuses
      const productStatuses = ['active', 'active', 'draft', 'archived'];
      const productIds = [];
      for (let i = 0; i < 4; i++) {
        const id = await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: `Product ${i}`,
          handle: `product-${i}`,
          title: `Product ${i}`,
          status: productStatuses[i] as any,
          createdAt: Date.now() - (i * 86400000), // Different days
          updatedAt: Date.now(),
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
          slug: `category-${i}`,
          isActive: i !== 2, // Last one inactive
          productCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        categoryIds.push(id);
      }

      // Category assignments
      await ctx.db.insert('categoryProductAssignments', {
        categoryId: categoryIds[0],
        productId: productIds[0],
        assignedBy: 'user',
        confidence: 1.0,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('categoryProductAssignments', {
        categoryId: categoryIds[1],
        productId: productIds[1],
        assignedBy: 'ai',
        confidence: 0.95,
        rationale: 'AI categorization',
        jobId: 'job_123' as any,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Team members
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

      // Import job
      await ctx.db.insert('importJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'products',
        fileName: 'products.csv',
        fileSize: 1024,
        status: 'completed',
        progress: {
          total: 10,
          processed: 10,
          successful: 8,
          failed: 2,
          skipped: 0,
        },
        fieldMapping: {
          name: 'title',
          description: 'description',
          price: 'price',
          options: {},
        },
        createdBy: userId,
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 1800000, // 30 min ago
      });

      // AI categorization job
      await ctx.db.insert('aiCategorizationJobs', {
        organizationId: orgId,
        projectId,
        jobType: 'batch',
        status: 'completed',
        prompt: 'Categorize products',
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        productIds: productIds.slice(0, 2),
        categoryContext: {},
        progress: {
          total: 2,
          processed: 2,
          successful: 2,
          failed: 0,
          skipped: 0,
        },
        results: [
          { productId: productIds[0], categoryId: categoryIds[0], confidence: 0.95 },
          { productId: productIds[1], categoryId: categoryIds[1], confidence: 0.90 },
        ],
        errors: [],
        notifications: { onComplete: true, onError: true },
        notificationsSent: true,
        createdBy: userId,
        createdAt: Date.now() - 7200000, // 2 hours ago
        updatedAt: Date.now() - 3600000, // 1 hour ago
      });
    });

    it('should return comprehensive dashboard statistics', async () => {
      const stats = await ctx.runQuery('getDashboardStats', { organizationId: orgId });

      expect(stats).toBeDefined();
      
      // Organization stats
      expect(stats.organization).toBeDefined();
      expect(stats.organization.name).toBe('Test Organization');
      expect(stats.organization.projectCount).toBe(1);
      expect(stats.organization.memberCount).toBe(2);

      // Product stats
      expect(stats.products).toBeDefined();
      expect(stats.products.total).toBe(4);
      expect(stats.products.active).toBe(2);
      expect(stats.products.draft).toBe(1);
      expect(stats.products.archived).toBe(1);
      expect(stats.products.categorized).toBe(2);
      expect(stats.products.uncategorized).toBe(2);

      // Category stats
      expect(stats.categories).toBeDefined();
      expect(stats.categories.total).toBe(3);
      expect(stats.categories.active).toBe(2);
      expect(stats.categories.withProducts).toBe(2);
      expect(stats.categories.empty).toBe(1);

      // Import stats
      expect(stats.imports).toBeDefined();
      expect(stats.imports.total).toBe(1);
      expect(stats.imports.completed).toBe(1);
      expect(stats.imports.failed).toBe(0);
      expect(stats.imports.inProgress).toBe(0);

      // AI categorization stats
      expect(stats.aiCategorization).toBeDefined();
      expect(stats.aiCategorization.totalJobs).toBe(1);
      expect(stats.aiCategorization.completedJobs).toBe(1);
      expect(stats.aiCategorization.productsProcessed).toBe(2);
      expect(stats.aiCategorization.successRate).toBe(100);
    });

    it('should handle organization with no data', async () => {
      // Create empty org
      const emptyOrgId = await ctx.db.insert('organizations', {
        name: 'Empty Org',
        clerkOrganizationId: 'org_456',
        slug: 'empty-org',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: emptyOrgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const stats = await ctx.runQuery('getDashboardStats', { organizationId: emptyOrgId });

      expect(stats.organization.projectCount).toBe(0);
      expect(stats.products.total).toBe(0);
      expect(stats.categories.total).toBe(0);
      expect(stats.imports.total).toBe(0);
      expect(stats.aiCategorization.totalJobs).toBe(0);
    });
  });

  describe('getRecentActivity', () => {
    beforeEach(async () => {
      // Create various audit log entries
      const now = Date.now();
      const activities = [
        {
          eventType: 'product.created',
          entityType: 'product',
          entityId: 'prod_1' as any,
          entityName: 'New Product',
          context: { projectId },
          timestamp: now - 300000, // 5 min ago
        },
        {
          eventType: 'category.updated',
          entityType: 'category',
          entityId: 'cat_1' as any,
          entityName: 'Updated Category',
          context: { changes: { name: { from: 'Old', to: 'New' } } },
          timestamp: now - 600000, // 10 min ago
        },
        {
          eventType: 'import.completed',
          entityType: 'import',
          entityId: 'import_1' as any,
          entityName: 'products.csv',
          context: { 
            totalRows: 100,
            successfulRows: 95,
            failedRows: 5,
          },
          timestamp: now - 900000, // 15 min ago
        },
        {
          eventType: 'ai_categorization.started',
          entityType: 'aiCategorizationJob',
          entityId: 'job_1' as any,
          context: {
            productCount: 50,
            aiProvider: 'openai',
            aiModel: 'gpt-4',
          },
          timestamp: now - 1200000, // 20 min ago
        },
        {
          eventType: 'project.created',
          entityType: 'project',
          entityId: projectId,
          entityName: 'Test Project',
          context: {},
          timestamp: now - 1500000, // 25 min ago
        },
      ];

      for (const activity of activities) {
        await ctx.db.insert('auditLogs', {
          organizationId: orgId,
          userId,
          ...activity,
        });
      }
    });

    it('should return recent activity in chronological order', async () => {
      const activities = await ctx.runQuery('getRecentActivity', {
        organizationId: orgId,
        limit: 10,
      });

      expect(activities).toHaveLength(5);
      
      // Should be ordered by timestamp desc (newest first)
      expect(activities[0].eventType).toBe('product.created');
      expect(activities[1].eventType).toBe('category.updated');
      expect(activities[2].eventType).toBe('import.completed');
      expect(activities[3].eventType).toBe('ai_categorization.started');
      expect(activities[4].eventType).toBe('project.created');
    });

    it('should include user information', async () => {
      const activities = await ctx.runQuery('getRecentActivity', {
        organizationId: orgId,
        limit: 10,
      });

      expect(activities[0].user).toBeDefined();
      expect(activities[0].user.name).toBe('Test User');
      expect(activities[0].user.email).toBe('test@example.com');
    });

    it('should respect limit parameter', async () => {
      const activities = await ctx.runQuery('getRecentActivity', {
        organizationId: orgId,
        limit: 3,
      });

      expect(activities).toHaveLength(3);
    });

    it('should filter by project if provided', async () => {
      // Create another project with activity
      const projectId2 = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Second Project',
        slug: 'second-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('auditLogs', {
        organizationId: orgId,
        userId,
        eventType: 'product.created',
        entityType: 'product',
        entityId: 'prod_2' as any,
        entityName: 'Second Project Product',
        context: { projectId: projectId2 },
        timestamp: Date.now(),
      });

      // Filter by first project
      const activities = await ctx.runQuery('getRecentActivity', {
        organizationId: orgId,
        projectId,
        limit: 10,
      });

      // Should only include activities from first project
      expect(activities.every((a: any) => 
        !a.context.projectId || a.context.projectId === projectId
      )).toBe(true);
    });

    it('should handle empty activity log', async () => {
      const emptyOrgId = await ctx.db.insert('organizations', {
        name: 'Empty Activity Org',
        clerkOrganizationId: 'org_789',
        slug: 'empty-activity',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: emptyOrgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const activities = await ctx.runQuery('getRecentActivity', {
        organizationId: emptyOrgId,
        limit: 10,
      });

      expect(activities).toEqual([]);
    });
  });

  describe('getDashboardMetrics', () => {
    it('should calculate growth metrics', async () => {
      const now = Date.now();
      const dayMs = 86400000;

      // Create products over time
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: `Product ${i}`,
          handle: `product-${i}`,
          title: `Product ${i}`,
          status: 'active',
          createdAt: now - (i * dayMs * 3), // Every 3 days
          updatedAt: now - (i * dayMs * 3),
        });
      }

      const metrics = await ctx.runQuery('getDashboardMetrics', {
        organizationId: orgId,
        timeframe: 'week',
      });

      expect(metrics).toBeDefined();
      expect(metrics.productGrowth).toBeDefined();
      expect(metrics.productGrowth.current).toBeGreaterThan(0);
      expect(metrics.productGrowth.previous).toBeGreaterThan(0);
      expect(metrics.productGrowth.percentageChange).toBeDefined();
    });
  });
});