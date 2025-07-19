// Jest doesn't need explicit imports for expect, test, describe, beforeEach;
import { getDashboardStats, getRecentActivity } from '../functions/dashboard';
import { convexTest } from 'convex-test';
import schema from '../schema';

// Mock the authenticateAndAuthorize function
jest.mock('../lib/auth', () => ({
  authenticateAndAuthorize: jest.fn().mockResolvedValue({
    user: {
      _id: 'user123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
    membership: {
      _id: 'membership123',
      organizationId: 'org123',
      userId: 'user123',
      role: 'admin',
      status: 'active',
    },
  }),
}));

describe('Dashboard Functions', () => {
  describe('getDashboardStats', () => {
    const t = convexTest(schema);

    beforeEach(async () => {
      // Reset database before each test
      await t.run(async (ctx) => {
        // Clear all tables
        const tables = [
          'organizations',
          'projects',
          'products',
          'aiCategorizationJobs',
          'organizationMemberships',
          'importJobs',
        ];
        for (const table of tables) {
          const items = await ctx.db.query(table as any).collect();
          for (const item of items) {
            await ctx.db.delete(item._id);
          }
        }
      });
    });

    test('should return dashboard stats for valid organization', async () => {
      const organizationId = await t.run(async (ctx) => {
        // Create test organization
        const orgId = await ctx.db.insert('organizations', {
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create test projects
        await ctx.db.insert('projects', {
          organizationId: orgId,
          name: 'Project 1',
          slug: 'project-1',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('projects', {
          organizationId: orgId,
          name: 'Project 2',
          slug: 'project-2',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create test products
        const projectId = await ctx.db.insert('projects', {
          organizationId: orgId,
          name: 'Project 3',
          slug: 'project-3',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Active products
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert('products', {
            organizationId: orgId,
            projectId,
            name: `Active Product ${i}`,
            sku: `SKU-A-${i}`,
            status: 'active',
            categories: i < 3 ? ['category1', 'category2'] : [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Draft products
        for (let i = 0; i < 2; i++) {
          await ctx.db.insert('products', {
            organizationId: orgId,
            projectId,
            name: `Draft Product ${i}`,
            sku: `SKU-D-${i}`,
            status: 'draft',
            categories: ['category1'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Create AI categorization jobs
        await ctx.db.insert('aiCategorizationJobs', {
          organizationId: orgId,
          projectId,
          status: 'pending',
          productCount: 10,
          createdAt: Date.now(),
          createdBy: 'user123',
        });

        await ctx.db.insert('aiCategorizationJobs', {
          organizationId: orgId,
          projectId,
          status: 'running',
          productCount: 5,
          startedAt: Date.now(),
          createdAt: Date.now() - 60000,
          createdBy: 'user123',
        });

        // Create team members
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert('organizationMemberships', {
            organizationId: orgId,
            userId: `user${i}`,
            role: i === 0 ? 'owner' : 'member',
            status: 'active',
            joinedAt: Date.now() - i * 86400000,
          });
        }

        // Create import job
        await ctx.db.insert('importJobs', {
          organizationId: orgId,
          projectId,
          fileName: 'products.csv',
          status: 'completed',
          importResults: {
            createdRecords: ['prod1', 'prod2', 'prod3'],
            updatedRecords: ['prod4', 'prod5'],
            skippedRecords: ['dup1'],
            processingErrors: [],
          },
          startedAt: Date.now() - 3600000,
          completedAt: Date.now() - 3000000,
          createdAt: Date.now() - 4000000,
          createdBy: 'user123',
        });

        return orgId;
      });

      // Test getDashboardStats
      const stats = await t.run(async (ctx) => {
        return await getDashboardStats(ctx, { organizationId });
      });

      expect(stats).toBeDefined();
      expect(stats.projectsCount).toBe(3);
      expect(stats.productsCount).toBe(7);
      expect(stats.activeAiJobsCount).toBe(2);
      expect(stats.teamMembersCount).toBe(3);
      expect(stats.productsByStatus).toEqual({
        active: 5,
        draft: 2,
        total: 7,
      });
      expect(stats.categorizedProducts).toBe(5);
      expect(stats.uncategorizedProducts).toBe(2);
      expect(stats.recentImports).toHaveLength(1);
      expect(stats.recentImports[0]).toMatchObject({
        filename: 'products.csv',
        status: 'completed',
        stats: {
          successful: 5,
          failed: 0,
          skipped: 1,
        },
      });
    });

    test('should handle empty organization data', async () => {
      const organizationId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Empty Organization',
          slug: 'empty-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const stats = await t.run(async (ctx) => {
        return await getDashboardStats(ctx, { organizationId });
      });

      expect(stats).toBeDefined();
      expect(stats.projectsCount).toBe(0);
      expect(stats.productsCount).toBe(0);
      expect(stats.activeAiJobsCount).toBe(0);
      expect(stats.teamMembersCount).toBe(0);
      expect(stats.productsByStatus).toEqual({
        active: 0,
        draft: 0,
        total: 0,
      });
      expect(stats.categorizedProducts).toBe(0);
      expect(stats.uncategorizedProducts).toBe(0);
      expect(stats.recentImports).toHaveLength(0);
    });

    test('should throw error for missing organizationId', async () => {
      await expect(
        t.run(async (ctx) => {
          return await getDashboardStats(ctx, { organizationId: null as any });
        })
      ).rejects.toThrow('organizationId is required');
    });

    test('should filter out archived products', async () => {
      const organizationId = await t.run(async (ctx) => {
        const orgId = await ctx.db.insert('organizations', {
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const projectId = await ctx.db.insert('projects', {
          organizationId: orgId,
          name: 'Project',
          slug: 'project',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create active and archived products
        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: 'Active Product',
          sku: 'SKU-1',
          status: 'active',
          categories: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('products', {
          organizationId: orgId,
          projectId,
          name: 'Archived Product',
          sku: 'SKU-2',
          status: 'archived',
          categories: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return orgId;
      });

      const stats = await t.run(async (ctx) => {
        return await getDashboardStats(ctx, { organizationId });
      });

      expect(stats.productsCount).toBe(1); // Only active product counted
    });
  });

  describe('getRecentActivity', () => {
    const t = convexTest(schema);

    beforeEach(async () => {
      await t.run(async (ctx) => {
        const tables = ['organizations', 'auditLogs', 'users'];
        for (const table of tables) {
          const items = await ctx.db.query(table as any).collect();
          for (const item of items) {
            await ctx.db.delete(item._id);
          }
        }
      });
    });

    test('should return recent activity for organization', async () => {
      const { organizationId, userId } = await t.run(async (ctx) => {
        const orgId = await ctx.db.insert('organizations', {
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const userId = await ctx.db.insert('users', {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: Date.now(),
        });

        // Create audit logs
        await ctx.db.insert('auditLogs', {
          organizationId: orgId,
          eventType: 'CREATE',
          entityType: 'products',
          entityId: 'prod123',
          performedBy: {
            type: 'user',
            userId,
            userEmail: 'test@example.com',
          },
          timestamp: Date.now(),
          context: {
            action: 'created',
            details: { name: 'New Product' },
          },
        });

        await ctx.db.insert('auditLogs', {
          organizationId: orgId,
          eventType: 'UPDATE',
          entityType: 'categories',
          entityId: 'cat456',
          performedBy: {
            type: 'system',
            service: 'AI Categorization',
          },
          timestamp: Date.now() - 3600000,
          context: {
            action: 'updated',
            details: { categoriesAdded: 5 },
          },
        });

        await ctx.db.insert('auditLogs', {
          organizationId: orgId,
          eventType: 'CREATE',
          entityType: 'importJobs',
          entityId: 'import789',
          performedBy: {
            type: 'ai',
            model: 'gpt-4',
          },
          timestamp: Date.now() - 7200000,
          context: {
            action: 'created',
            details: { fileName: 'products.csv' },
          },
        });

        return { organizationId: orgId, userId };
      });

      const activity = await t.run(async (ctx) => {
        return await getRecentActivity(ctx, { organizationId, limit: 5 });
      });

      expect(activity).toHaveLength(3);
      expect(activity[0]).toMatchObject({
        eventType: 'CREATE',
        entityType: 'products',
        performedBy: {
          type: 'user',
          name: 'Test User',
        },
      });
      expect(activity[1]).toMatchObject({
        eventType: 'UPDATE',
        entityType: 'categories',
        performedBy: {
          type: 'system',
          name: 'AI Categorization',
        },
      });
      expect(activity[2]).toMatchObject({
        eventType: 'CREATE',
        entityType: 'importJobs',
        performedBy: {
          type: 'ai',
          name: 'AI (gpt-4)',
        },
      });
    });

    test('should handle missing user data gracefully', async () => {
      const organizationId = await t.run(async (ctx) => {
        const orgId = await ctx.db.insert('organizations', {
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create audit log with non-existent user
        await ctx.db.insert('auditLogs', {
          organizationId: orgId,
          eventType: 'CREATE',
          entityType: 'products',
          entityId: 'prod123',
          performedBy: {
            type: 'user',
            userId: 'nonexistent' as any,
            userEmail: 'deleted@example.com',
          },
          timestamp: Date.now(),
          context: {
            action: 'created',
            details: {},
          },
        });

        return orgId;
      });

      const activity = await t.run(async (ctx) => {
        return await getRecentActivity(ctx, { organizationId });
      });

      expect(activity).toHaveLength(1);
      expect(activity[0].performedBy.name).toBe('deleted@example.com');
    });

    test('should respect limit parameter', async () => {
      const organizationId = await t.run(async (ctx) => {
        const orgId = await ctx.db.insert('organizations', {
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create 10 audit logs
        for (let i = 0; i < 10; i++) {
          await ctx.db.insert('auditLogs', {
            organizationId: orgId,
            eventType: 'CREATE',
            entityType: 'products',
            entityId: `prod${i}`,
            performedBy: {
              type: 'system',
              service: 'Import Service',
            },
            timestamp: Date.now() - i * 60000,
            context: {
              action: 'created',
              details: {},
            },
          });
        }

        return orgId;
      });

      const activity = await t.run(async (ctx) => {
        return await getRecentActivity(ctx, { organizationId, limit: 3 });
      });

      expect(activity).toHaveLength(3);
    });

    test('should handle invalid limit values', async () => {
      const organizationId = await t.run(async (ctx) => {
        const orgId = await ctx.db.insert('organizations', {
          name: 'Test Organization',
          slug: 'test-org',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create some audit logs
        for (let i = 0; i < 15; i++) {
          await ctx.db.insert('auditLogs', {
            organizationId: orgId,
            eventType: 'CREATE',
            entityType: 'products',
            entityId: `prod${i}`,
            performedBy: {
              type: 'system',
              service: 'Import Service',
            },
            timestamp: Date.now() - i * 60000,
            context: {
              action: 'created',
              details: {},
            },
          });
        }

        return orgId;
      });

      // Test with limit > 100
      const activity1 = await t.run(async (ctx) => {
        return await getRecentActivity(ctx, { organizationId, limit: 150 });
      });
      expect(activity1).toHaveLength(10); // Should default to 10

      // Test with limit < 1
      const activity2 = await t.run(async (ctx) => {
        return await getRecentActivity(ctx, { organizationId, limit: 0 });
      });
      expect(activity2).toHaveLength(10); // Should default to 10
    });

    test('should throw error for missing organizationId', async () => {
      await expect(
        t.run(async (ctx) => {
          return await getRecentActivity(ctx, { organizationId: null as any });
        })
      ).rejects.toThrow('organizationId is required');
    });
  });
});
