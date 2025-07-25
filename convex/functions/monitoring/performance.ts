import { internal } from "@convex/_generated/api";
import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

/**
 * Performance tracking wrapper for Convex operations
 * Logs execution time, memory usage, and success/failure metrics
 */
export async function withPerformanceTracking<T>(
  ctx: any,
  operation: string,
  organizationId: Id<'organizations'>,
  fn: () => Promise<T>,
  options?: {
    projectId?: Id<'projects'>;
    userId?: Id<'users'>;
    metadata?: any;
  }
): Promise<T> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage?.().heapUsed;

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const memoryUsed = startMemory ? process.memoryUsage().heapUsed - startMemory : undefined;

    // Calculate item count if result is array
    const itemCount = Array.isArray(result) ? result.length : undefined;

    // Log metrics asynchronously to avoid blocking
    await ctx.scheduler.runAfter(0, internal.monitoring.performance.logMetric, {
      organizationId,
      operation,
      startTime,
      duration,
      memoryUsed,
      itemCount,
      success: true,
      projectId: options?.projectId,
      userId: options?.userId,
      metadata: options?.metadata,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log error metric
    await ctx.scheduler.runAfter(0, internal.monitoring.performance.logMetric, {
      organizationId,
      operation,
      startTime,
      duration,
      success: false,
      error: error.message || 'Unknown error',
      projectId: options?.projectId,
      userId: options?.userId,
      metadata: options?.metadata,
    });

    throw error;
  }
}

/**
 * Internal mutation to log performance metrics
 */
export const logMetric = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    operation: v.string(),
    startTime: v.number(),
    duration: v.number(),
    memoryUsed: v.optional(v.number()),
    itemCount: v.optional(v.number()),
    success: v.boolean(),
    error: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    userId: v.optional(v.id('users')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const date = new Date(args.startTime);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = date.getHours();

    await ctx.db.insert('performanceMetrics', {
      ...args,
      date: dateStr,
      hour,
    });
  },
});

/**
 * Query to get recent performance metrics for an operation
 */
export const getOperationMetrics = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    operation: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    const metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_organization_operation', (q) =>
        q.eq('organizationId', args.organizationId).eq('operation', args.operation)
      )
      .order('desc')
      .take(limit);

    return metrics;
  },
});

/**
 * Query to get aggregated metrics for a time period
 */
export const getAggregatedMetrics = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    operation: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('performanceMetrics')
      .withIndex('by_date', (q) => q.eq('organizationId', args.organizationId));

    const metrics = await query.collect();

    // Filter by date range and operation
    const filtered = metrics.filter((m) => {
      if (m.date < args.startDate || m.date > args.endDate) return false;
      if (args.operation && m.operation !== args.operation) return false;
      return true;
    });

    // Aggregate metrics
    const aggregated = filtered.reduce(
      (acc, metric) => {
        acc.count++;
        acc.totalDuration += metric.duration;
        acc.successCount += metric.success ? 1 : 0;
        acc.errorCount += metric.success ? 0 : 1;
        
        if (metric.itemCount !== undefined) {
          acc.totalItems += metric.itemCount;
        }
        
        if (metric.memoryUsed !== undefined) {
          acc.totalMemory += metric.memoryUsed;
          acc.memoryCount++;
        }

        // Track percentiles
        acc.durations.push(metric.duration);

        return acc;
      },
      {
        count: 0,
        totalDuration: 0,
        successCount: 0,
        errorCount: 0,
        totalItems: 0,
        totalMemory: 0,
        memoryCount: 0,
        durations: [] as number[],
      }
    );

    // Calculate percentiles
    const sortedDurations = aggregated.durations.sort((a, b) => a - b);
    const p50Index = Math.floor(sortedDurations.length * 0.5);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);

    return {
      count: aggregated.count,
      avgDuration: aggregated.count > 0 ? aggregated.totalDuration / aggregated.count : 0,
      p50Duration: sortedDurations[p50Index] || 0,
      p95Duration: sortedDurations[p95Index] || 0,
      p99Duration: sortedDurations[p99Index] || 0,
      successRate: aggregated.count > 0 ? (aggregated.successCount / aggregated.count) * 100 : 0,
      errorRate: aggregated.count > 0 ? (aggregated.errorCount / aggregated.count) * 100 : 0,
      avgMemory: aggregated.memoryCount > 0 ? aggregated.totalMemory / aggregated.memoryCount : 0,
      totalItems: aggregated.totalItems,
    };
  },
});

/**
 * Cleanup old metrics (older than 30 days)
 */
export const cleanupOldMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Get all organizations
    const organizations = await ctx.db.query('organizations').collect();
    
    for (const org of organizations) {
      const oldMetrics = await ctx.db
        .query('performanceMetrics')
        .withIndex('by_timestamp', (q) => q.eq('organizationId', org._id))
        .filter((q) => q.lt(q.field('startTime'), thirtyDaysAgo))
        .take(100); // Process in batches

      for (const metric of oldMetrics) {
        await ctx.db.delete(metric._id);
      }
    }
  },
});