import { internal } from "../../_generated/api";
import { v } from 'convex/values';
import { query } from '../../_generated/server';
import { getOrganizationId } from '../../lib/organizationUtils';
import { checkAlertThresholds, getAlertSummary } from './alerts';
import { getAggregatedMetrics } from './performance';

/**
 * Main dashboard query for performance monitoring
 */
export const getPerformanceDashboard = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Get current date range (last 24 hours)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get aggregated metrics for different operations
    const operations = [
      'trash.query.list',
      'trash.query.search',
      'dashboard.load',
      'ai.categorization',
      'products.query.list',
    ];

    const operationMetrics = await Promise.all(
      operations.map(async (operation) => {
        const metrics = await ctx.runQuery(internal.monitoring.performance.getAggregatedMetrics, {
          organizationId,
          operation,
          startDate: startDateStr,
          endDate: endDateStr,
        });
        return {
          operation,
          ...metrics,
        };
      })
    );

    // Get current alerts
    const alerts = await ctx.runQuery(internal.functions.monitoring.alerts.checkAlertThresholds, {
      organizationId,
      timeWindow: 5, // Last 5 minutes
    });

    // Get alert summary
    const alertSummary = await ctx.runQuery(internal.functions.monitoring.alerts.getAlertSummary, { organizationId });

    // Get recent performance trends (hourly for last 24 hours)
    const hourlyTrends = await getHourlyTrends(ctx, organizationId);

    return {
      summary: {
        totalOperations: operationMetrics.reduce((sum, m) => sum + m.count, 0),
        avgResponseTime: calculateWeightedAverage(operationMetrics, 'avgDuration', 'count'),
        errorRate: calculateWeightedAverage(operationMetrics, 'errorRate', 'count'),
        alertsActive: alerts.length,
      },
      operationMetrics,
      alerts: alerts.slice(0, 10), // Top 10 alerts
      alertSummary,
      hourlyTrends,
    };
  },
});

/**
 * Get detailed metrics for a specific operation
 */
export const getOperationDetails = query({
  args: {
    operation: v.string(),
    timeRange: v.optional(v.object({
      startDate: v.string(),
      endDate: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Default to last 7 days
    const endDate = args.timeRange?.endDate || new Date().toISOString().split('T')[0];
    const startDate = args.timeRange?.startDate || 
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get aggregated metrics
    const aggregated = await ctx.runQuery(internal.monitoring.performance.getAggregatedMetrics, {
      organizationId,
      operation: args.operation,
      startDate,
      endDate,
    });

    // Get recent individual metrics
    const recentMetrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_organization_operation', (q) =>
        q.eq('organizationId', organizationId).eq('operation', args.operation)
      )
      .order('desc')
      .take(100);

    // Calculate distribution
    const distribution = calculateDistribution(
      recentMetrics.map((m) => m.duration)
    );

    // Get error breakdown
    const errors = recentMetrics
      .filter((m) => !m.success)
      .reduce((acc, m) => {
        const error = m.error || 'Unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      aggregated,
      recentMetrics: recentMetrics.slice(0, 20), // Last 20 entries
      distribution,
      errorBreakdown: errors,
    };
  },
});

/**
 * Get performance comparison between operations
 */
export const getOperationComparison = query({
  args: {
    operations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    const operations = args.operations || [
      'trash.query.list',
      'dashboard.load',
      'products.query.list',
      'ai.categorization',
    ];

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const comparisons = await Promise.all(
      operations.map(async (operation) => {
        const metrics = await ctx.runQuery(internal.monitoring.performance.getAggregatedMetrics, {
          organizationId,
          operation,
          startDate,
          endDate,
        });

        return {
          operation,
          avgDuration: metrics.avgDuration,
          p95Duration: metrics.p95Duration,
          errorRate: metrics.errorRate,
          volume: metrics.count,
        };
      })
    );

    return comparisons.sort((a, b) => b.avgDuration - a.avgDuration);
  },
});

/**
 * Helper function to get hourly trends
 */
async function getHourlyTrends(ctx: any, organizationId: any) {
  const hours = 24;
  const hourlyData = [];
  const now = new Date();

  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    const metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_timestamp', (q) => q.eq('organizationId', organizationId))
      .filter((q) => 
        q.and(
          q.gte(q.field('startTime'), hourStart.getTime()),
          q.lt(q.field('startTime'), hourEnd.getTime())
        )
      )
      .collect();

    const avgDuration = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
      : 0;

    const errorCount = metrics.filter((m) => !m.success).length;

    hourlyData.push({
      hour: hourStart.getHours(),
      timestamp: hourStart.getTime(),
      operationCount: metrics.length,
      avgDuration,
      errorCount,
      errorRate: metrics.length > 0 ? (errorCount / metrics.length) * 100 : 0,
    });
  }

  return hourlyData;
}

/**
 * Calculate weighted average
 */
function calculateWeightedAverage(
  items: any[],
  valueField: string,
  weightField: string
): number {
  const totalWeight = items.reduce((sum, item) => sum + item[weightField], 0);
  if (totalWeight === 0) return 0;

  const weightedSum = items.reduce(
    (sum, item) => sum + item[valueField] * item[weightField],
    0
  );

  return weightedSum / totalWeight;
}

/**
 * Calculate distribution buckets
 */
function calculateDistribution(values: number[]) {
  if (values.length === 0) return [];

  const buckets = [0, 100, 200, 500, 1000, 2000, 5000, 10000];
  const distribution = buckets.map((bucket, i) => {
    const nextBucket = buckets[i + 1] || Infinity;
    const count = values.filter((v) => v >= bucket && v < nextBucket).length;
    return {
      range: nextBucket === Infinity ? `${bucket}+ms` : `${bucket}-${nextBucket}ms`,
      count,
      percentage: (count / values.length) * 100,
    };
  });

  return distribution.filter((d) => d.count > 0);
}