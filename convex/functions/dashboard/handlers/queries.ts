import { QueryCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';
import { authenticateAndAuthorize } from '../../../lib/auth';

// Helper function for consistent logging
const log = (level: 'info' | 'warn' | 'error', component: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [DASHBOARD] [${level.toUpperCase()}] [${component}] ${message}`;

  if (data) {
    console.log(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.log(logMessage);
  }
};

// Handler for getDashboardStats
export async function getDashboardStatsHandler(
  ctx: QueryCtx,
  { organizationId }: { organizationId: Id<'organizations'> }
) {
  const startTime = Date.now();
  log('info', 'getDashboardStats', 'Starting dashboard stats query', { organizationId });

  try {
    // Validate input
    if (!organizationId) {
      log('error', 'getDashboardStats', 'Missing organizationId');
      throw new Error('organizationId is required');
    }

    // Authenticate and authorize
    log('info', 'getDashboardStats', 'Authenticating user');
    const { user, membership } = await authenticateAndAuthorize(ctx, organizationId);
    log('info', 'getDashboardStats', 'User authenticated', {
      userId: user._id,
      role: membership.role,
      organizationId,
    });

    // Get projects count
    log('info', 'getDashboardStats', 'Querying projects');
    const projectsStart = Date.now();
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();
    log(
      'info',
      'getDashboardStats',
      `Projects query completed in ${Date.now() - projectsStart}ms`,
      {
        count: projects.length,
      }
    );

    // Get total products count across all projects
    log('info', 'getDashboardStats', 'Querying products');
    const productsStart = Date.now();
    const products = await ctx.db
      .query('products')
      .withIndex('by_organization_project', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.neq(q.field('status'), 'archived'))
      .collect();
    log(
      'info',
      'getDashboardStats',
      `Products query completed in ${Date.now() - productsStart}ms`,
      {
        count: products.length,
      }
    );

    // Get active AI categorization jobs
    log('info', 'getDashboardStats', 'Querying AI categorization jobs');
    const aiJobsStart = Date.now();
    const aiJobs = await ctx.db
      .query('aiCategorizationJobs')
      .withIndex('by_organization_project', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.or(q.eq(q.field('status'), 'pending'), q.eq(q.field('status'), 'running')))
      .collect();
    log('info', 'getDashboardStats', `AI jobs query completed in ${Date.now() - aiJobsStart}ms`, {
      count: aiJobs.length,
    });

    // Get team members count
    log('info', 'getDashboardStats', 'Querying team members');
    const teamStart = Date.now();
    const teamMembers = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();
    log(
      'info',
      'getDashboardStats',
      `Team members query completed in ${Date.now() - teamStart}ms`,
      {
        count: teamMembers.length,
      }
    );

    // Get recent imports
    log('info', 'getDashboardStats', 'Querying recent imports');
    const importsStart = Date.now();
    const recentImports = await ctx.db
      .query('importJobs')
      .withIndex('by_organization_project', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(5)
      .collect();
    log(
      'info',
      'getDashboardStats',
      `Imports query completed in ${Date.now() - importsStart}ms`,
      {
        count: recentImports.length,
      }
    );

    // Get products by status
    const productsByStatus = {
      active: products.filter((p) => p.status === 'active').length,
      draft: products.filter((p) => p.status === 'draft').length,
      total: products.length,
    };
    log('info', 'getDashboardStats', 'Products by status calculated', productsByStatus);

    // Get categorized vs uncategorized products
    const categorizedProducts = products.filter(
      (p) => p.categories && p.categories.length > 0
    ).length;
    const uncategorizedProducts = products.length - categorizedProducts;
    log('info', 'getDashboardStats', 'Product categorization stats calculated', {
      categorized: categorizedProducts,
      uncategorized: uncategorizedProducts,
    });

    const result = {
      projectsCount: projects.length,
      productsCount: products.length,
      activeAiJobsCount: aiJobs.length,
      teamMembersCount: teamMembers.length,
      productsByStatus,
      categorizedProducts,
      uncategorizedProducts,
      recentImports: recentImports.map((job) => ({
        _id: job._id,
        filename: job.fileName || 'Unknown file',
        status: job.status,
        createdAt: job.createdAt,
        stats: job.importResults
          ? {
              successful:
                job.importResults.createdRecords.length + job.importResults.updatedRecords.length,
              failed: 0, // No direct failed count in the schema
              skipped: job.importResults.skippedRecords.length,
            }
          : null,
      })),
    };

    const totalTime = Date.now() - startTime;
    log(
      'info',
      'getDashboardStats',
      `Dashboard stats query completed successfully in ${totalTime}ms`,
      {
        totalTime,
        resultSummary: {
          projects: result.projectsCount,
          products: result.productsCount,
          aiJobs: result.activeAiJobsCount,
          teamMembers: result.teamMembersCount,
        },
      }
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    log('error', 'getDashboardStats', 'Dashboard stats query failed', {
      error: errorMessage,
      stack: errorStack,
      organizationId,
      timeElapsed: Date.now() - startTime,
    });

    throw error;
  }
}

// Handler for getRecentActivity
export async function getRecentActivityHandler(
  ctx: QueryCtx,
  { organizationId, limit = 10 }: { organizationId: Id<'organizations'>; limit?: number }
) {
  const startTime = Date.now();
  log('info', 'getRecentActivity', 'Starting recent activity query', { organizationId, limit });

  try {
    // Validate inputs
    if (!organizationId) {
      log('error', 'getRecentActivity', 'Missing organizationId');
      throw new Error('organizationId is required');
    }

    if (limit < 1 || limit > 100) {
      log('warn', 'getRecentActivity', 'Invalid limit, using default', { providedLimit: limit });
      limit = 10;
    }

    // Authenticate and authorize
    log('info', 'getRecentActivity', 'Authenticating user');
    const { user, membership } = await authenticateAndAuthorize(ctx, organizationId);
    log('info', 'getRecentActivity', 'User authenticated', {
      userId: user._id,
      role: membership.role,
    });

    // Get recent audit logs
    log('info', 'getRecentActivity', 'Querying audit logs');
    const auditStart = Date.now();
    const auditLogs = await ctx.db
      .query('auditLogs')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(limit)
      .collect();
    log(
      'info',
      'getRecentActivity',
      `Audit logs query completed in ${Date.now() - auditStart}ms`,
      {
        count: auditLogs.length,
      }
    );

    // Get user details for the activity feed
    const userIds = [
      ...new Set(
        auditLogs
          .map((log) => (log.performedBy.type === 'user' ? log.performedBy.userId : null))
          .filter(Boolean)
      ),
    ] as Id<'users'>[];

    log('info', 'getRecentActivity', 'Fetching user details', { userCount: userIds.length });
    const usersStart = Date.now();
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    log('info', 'getRecentActivity', `User details fetched in ${Date.now() - usersStart}ms`);

    const result = auditLogs.map((auditLog, index) => {
      let name = 'System';
      if (auditLog.performedBy.type === 'user') {
        const user = userMap.get(auditLog.performedBy.userId);
        if (user) {
          name =
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            auditLog.performedBy.userEmail;
        } else {
          name = auditLog.performedBy.userEmail;
          log('warn', 'getRecentActivity', `User not found for audit log`, {
            logId: auditLog._id,
            userId: auditLog.performedBy.userId,
          });
        }
      } else if (auditLog.performedBy.type === 'system') {
        name = auditLog.performedBy.service;
      } else if (auditLog.performedBy.type === 'ai') {
        name = `AI (${auditLog.performedBy.model})`;
      }

      return {
        _id: auditLog._id,
        timestamp: auditLog.timestamp,
        eventType: auditLog.eventType,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.context.action,
        performedBy: {
          ...auditLog.performedBy,
          name,
        },
      };
    });

    const totalTime = Date.now() - startTime;
    log(
      'info',
      'getRecentActivity',
      `Recent activity query completed successfully in ${totalTime}ms`,
      {
        totalTime,
        resultCount: result.length,
        eventTypes: [...new Set(result.map((r) => r.eventType))],
        entityTypes: [...new Set(result.map((r) => r.entityType))],
      }
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    log('error', 'getRecentActivity', 'Recent activity query failed', {
      error: errorMessage,
      stack: errorStack,
      organizationId,
      limit,
      timeElapsed: Date.now() - startTime,
    });

    throw error;
  }
}