/**
 * Performance-monitored versions of deletion queries
 * 
 * This file wraps all deletion queries with performance tracking
 * to monitor query execution time, memory usage, and success rates.
 */

import { v } from 'convex/values';
import { query } from '../../_generated/server';
import { withPerformanceTracking } from '../monitoring/performance';
import { authenticateAndAuthorize } from '../auth/organizationAuth';

// Import the original implementations
import {
  getTrashItems as originalGetTrashItems,
  searchTrashItems as originalSearchTrashItems,
  getDeletionStats as originalGetDeletionStats,
  getDeletionActivityLogs as originalGetDeletionActivityLogs,
} from './deletion';

/**
 * Enhanced getTrashItems with performance monitoring
 */
export const getTrashItems = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal('deletedAt'),
      v.literal('expiresAt'),
      v.literal('title')
    )),
  },
  handler: async (ctx, args) => {
    const { membership, user } = await authenticateAndAuthorize(ctx, args.organizationId);

    return withPerformanceTracking(
      ctx,
      'trash.query.list',
      args.organizationId,
      async () => {
        // Call the original implementation with proper context
        return originalGetTrashItems.handler(ctx, args);
      },
      {
        userId: user._id,
        projectId: args.projectId,
        metadata: {
          limit: args.limit,
          hasCursor: !!args.cursor,
          sortBy: args.sortBy,
        },
      }
    );
  },
});

/**
 * Enhanced searchTrashItems with performance monitoring
 */
export const searchTrashItems = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { membership, user } = await authenticateAndAuthorize(ctx, args.organizationId);

    return withPerformanceTracking(
      ctx,
      'trash.query.search',
      args.organizationId,
      async () => {
        return originalSearchTrashItems.handler(ctx, args);
      },
      {
        userId: user._id,
        projectId: args.projectId,
        metadata: {
          searchTermLength: args.searchTerm.length,
          limit: args.limit,
        },
      }
    );
  },
});

/**
 * Enhanced getDeletionStats with performance monitoring
 */
export const getDeletionStats = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    timeRange: v.optional(v.union(
      v.literal('7d'),
      v.literal('30d'),
      v.literal('90d')
    )),
  },
  handler: async (ctx, args) => {
    const { membership, user } = await authenticateAndAuthorize(ctx, args.organizationId);

    return withPerformanceTracking(
      ctx,
      'trash.query.stats',
      args.organizationId,
      async () => {
        return originalGetDeletionStats.handler(ctx, args);
      },
      {
        userId: user._id,
        projectId: args.projectId,
        metadata: {
          timeRange: args.timeRange,
        },
      }
    );
  },
});

/**
 * Enhanced getDeletionActivityLogs with performance monitoring
 */
export const getDeletionActivityLogs = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { membership, user } = await authenticateAndAuthorize(ctx, args.organizationId);

    return withPerformanceTracking(
      ctx,
      'trash.query.activityLogs',
      args.organizationId,
      async () => {
        return originalGetDeletionActivityLogs.handler(ctx, args);
      },
      {
        userId: user._id,
        projectId: args.projectId,
        metadata: {
          limit: args.limit,
          hasCursor: !!args.cursor,
        },
      }
    );
  },
});

/**
 * Special monitoring for trash table size
 * This should be called periodically to track table growth
 */
export const monitorTrashTableSize = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const { membership } = await authenticateAndAuthorize(ctx, args.organizationId);

    return withPerformanceTracking(
      ctx,
      'trash.monitor.tableSize',
      args.organizationId,
      async () => {
        // Count all trash items for the organization
        const allItems = await ctx.db
          .query('productTrash')
          .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
          .collect();

        // Categorize by status
        const statusCounts = {
          recoverable: 0,
          recovering: 0,
          recovered: 0,
          expired: 0,
          permanently_deleted: 0,
        };

        allItems.forEach(item => {
          statusCounts[item.recoveryStatus]++;
        });

        // Calculate storage size estimate (rough)
        const totalSizeBytes = allItems.reduce((sum, item) => {
          return sum + JSON.stringify(item).length;
        }, 0);

        return {
          totalCount: allItems.length,
          statusCounts,
          estimatedSizeMB: totalSizeBytes / (1024 * 1024),
          warningThresholds: {
            count: allItems.length > 10000 ? 'WARNING' : 'OK',
            size: totalSizeBytes > 100 * 1024 * 1024 ? 'WARNING' : 'OK',
          },
        };
      },
      {
        metadata: { 
          monitoring: true,
          alerting: true,
        },
      }
    );
  },
});

/**
 * Performance alert thresholds
 * These values can be adjusted based on your performance requirements
 */
export const PERFORMANCE_THRESHOLDS = {
  'trash.query.list': {
    warningMs: 200,
    criticalMs: 500,
    maxItems: 10000,
  },
  'trash.query.search': {
    warningMs: 300,
    criticalMs: 1000,
    maxItems: 1000,
  },
  'trash.query.stats': {
    warningMs: 500,
    criticalMs: 2000,
  },
  'trash.query.activityLogs': {
    warningMs: 200,
    criticalMs: 500,
  },
  'trash.monitor.tableSize': {
    warningMs: 1000,
    criticalMs: 5000,
  },
};

/**
 * Check if any query is exceeding performance thresholds
 */
export const checkPerformanceAlerts = query({
  args: {
    organizationId: v.id('organizations'),
    timeWindowMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await authenticateAndAuthorize(ctx, args.organizationId);

    const timeWindow = (args.timeWindowMinutes || 60) * 60 * 1000;
    const startTime = Date.now() - timeWindow;

    const alerts = [];

    // Check each monitored operation
    for (const [operation, thresholds] of Object.entries(PERFORMANCE_THRESHOLDS)) {
      const metrics = await ctx.db
        .query('performanceMetrics')
        .withIndex('by_organization_operation', (q) =>
          q.eq('organizationId', args.organizationId).eq('operation', operation)
        )
        .filter((q) => q.gte(q.field('startTime'), startTime))
        .collect();

      if (metrics.length === 0) continue;

      // Calculate statistics
      const durations = metrics.map(m => m.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const errorCount = metrics.filter(m => !m.success).length;
      const errorRate = (errorCount / metrics.length) * 100;

      // Check thresholds
      if (maxDuration > thresholds.criticalMs) {
        alerts.push({
          severity: 'critical',
          operation,
          message: `Query exceeding critical threshold: ${maxDuration}ms > ${thresholds.criticalMs}ms`,
          maxDuration,
          avgDuration,
          sampleCount: metrics.length,
        });
      } else if (avgDuration > thresholds.warningMs) {
        alerts.push({
          severity: 'warning',
          operation,
          message: `Query average exceeding warning threshold: ${avgDuration}ms > ${thresholds.warningMs}ms`,
          maxDuration,
          avgDuration,
          sampleCount: metrics.length,
        });
      }

      // Check error rate
      if (errorRate > 10) {
        alerts.push({
          severity: 'critical',
          operation,
          message: `High error rate: ${errorRate.toFixed(1)}%`,
          errorCount,
          totalCount: metrics.length,
        });
      }
    }

    return {
      alerts,
      checkedAt: Date.now(),
      timeWindowMinutes: args.timeWindowMinutes || 60,
    };
  },
});