import { v } from 'convex/values';
import { internalQuery, internalMutation } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

/**
 * Aggregated metrics structure
 */
export interface AggregatedMetric {
  operation: string;
  date: string;
  hour?: number;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  totalItems?: number;
  avgItems?: number;
  totalMemory?: number;
  avgMemory?: number;
}

/**
 * Generate hourly aggregations for performance metrics
 */
export const generateHourlyAggregations = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    date: v.string(), // YYYY-MM-DD
    hour: v.number(), // 0-23
  },
  handler: async (ctx, args) => {
    // Get all metrics for the specified hour
    const metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_date', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field('date'), args.date),
          q.eq(q.field('hour'), args.hour)
        )
      )
      .collect();

    // Group by operation
    const operationGroups = new Map<string, typeof metrics>();
    metrics.forEach((metric) => {
      const group = operationGroups.get(metric.operation) || [];
      group.push(metric);
      operationGroups.set(metric.operation, group);
    });

    // Generate aggregations for each operation
    const aggregations: AggregatedMetric[] = [];
    
    for (const [operation, opMetrics] of operationGroups) {
      if (opMetrics.length === 0) continue;

      const durations = opMetrics.map((m) => m.duration).sort((a, b) => a - b);
      const successCount = opMetrics.filter((m) => m.success).length;
      const errorCount = opMetrics.length - successCount;

      // Calculate percentiles
      const p50Index = Math.floor(durations.length * 0.5);
      const p95Index = Math.floor(durations.length * 0.95);
      const p99Index = Math.floor(durations.length * 0.99);

      // Calculate memory stats
      const memoryMetrics = opMetrics.filter((m) => m.memoryUsed !== undefined);
      const totalMemory = memoryMetrics.reduce((sum, m) => sum + (m.memoryUsed || 0), 0);

      // Calculate item stats
      const itemMetrics = opMetrics.filter((m) => m.itemCount !== undefined);
      const totalItems = itemMetrics.reduce((sum, m) => sum + (m.itemCount || 0), 0);

      aggregations.push({
        operation,
        date: args.date,
        hour: args.hour,
        count: opMetrics.length,
        totalDuration: durations.reduce((sum, d) => sum + d, 0),
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p50Duration: durations[p50Index] || 0,
        p95Duration: durations[p95Index] || 0,
        p99Duration: durations[p99Index] || 0,
        successCount,
        errorCount,
        errorRate: (errorCount / opMetrics.length) * 100,
        totalItems: itemMetrics.length > 0 ? totalItems : undefined,
        avgItems: itemMetrics.length > 0 ? totalItems / itemMetrics.length : undefined,
        totalMemory: memoryMetrics.length > 0 ? totalMemory : undefined,
        avgMemory: memoryMetrics.length > 0 ? totalMemory / memoryMetrics.length : undefined,
      });
    }

    return aggregations;
  },
});

/**
 * Get daily performance summary
 */
export const getDailyPerformanceSummary = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_date', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('date'), args.date))
      .collect();

    // Overall summary
    const totalOperations = metrics.length;
    const successfulOperations = metrics.filter((m) => m.success).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);

    // Group by operation for breakdown
    const operationBreakdown = new Map<string, {
      count: number;
      avgDuration: number;
      errorRate: number;
    }>();

    metrics.forEach((metric) => {
      const current = operationBreakdown.get(metric.operation) || {
        count: 0,
        totalDuration: 0,
        errors: 0,
      };

      current.count++;
      current.totalDuration = (current.totalDuration || 0) + metric.duration;
      if (!metric.success) current.errors = (current.errors || 0) + 1;

      operationBreakdown.set(metric.operation, current);
    });

    // Convert to array and calculate averages
    const breakdown = Array.from(operationBreakdown.entries()).map(([operation, stats]) => ({
      operation,
      count: stats.count,
      avgDuration: stats.totalDuration / stats.count,
      errorRate: (stats.errors / stats.count) * 100,
    }));

    // Find slowest operations
    const slowestOperations = [...breakdown]
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    // Find most error-prone operations
    const errorProneOperations = [...breakdown]
      .filter((op) => op.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);

    return {
      date: args.date,
      summary: {
        totalOperations,
        successfulOperations,
        failedOperations: totalOperations - successfulOperations,
        overallSuccessRate: (successfulOperations / totalOperations) * 100,
        avgDuration: totalDuration / totalOperations,
        uniqueOperations: operationBreakdown.size,
      },
      slowestOperations,
      errorProneOperations,
      operationBreakdown: breakdown,
    };
  },
});

/**
 * Get performance trends over time
 */
export const getPerformanceTrends = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    operation: v.string(),
    days: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const trends: Array<{
      date: string;
      avgDuration: number;
      p95Duration: number;
      errorRate: number;
      volume: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const metrics = await ctx.db
        .query('performanceMetrics')
        .withIndex('by_operation_date', (q) =>
          q.eq('operation', args.operation).eq('date', dateStr)
        )
        .filter((q) => q.eq(q.field('organizationId'), args.organizationId))
        .collect();

      if (metrics.length > 0) {
        const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
        const p95Index = Math.floor(durations.length * 0.95);
        const errorCount = metrics.filter((m) => !m.success).length;

        trends.push({
          date: dateStr,
          avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          p95Duration: durations[p95Index] || 0,
          errorRate: (errorCount / metrics.length) * 100,
          volume: metrics.length,
        });
      } else {
        trends.push({
          date: dateStr,
          avgDuration: 0,
          p95Duration: 0,
          errorRate: 0,
          volume: 0,
        });
      }
    }

    return trends;
  },
});

/**
 * Get top resource-consuming operations
 */
export const getResourceIntensiveOperations = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    metric: v.union(v.literal('duration'), v.literal('memory'), v.literal('items')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const since = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours

    const metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_timestamp', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.gte(q.field('startTime'), since))
      .collect();

    // Group by operation and calculate averages
    const operationStats = new Map<string, {
      count: number;
      totalDuration: number;
      totalMemory: number;
      totalItems: number;
      memoryCount: number;
      itemCount: number;
    }>();

    metrics.forEach((metric) => {
      const stats = operationStats.get(metric.operation) || {
        count: 0,
        totalDuration: 0,
        totalMemory: 0,
        totalItems: 0,
        memoryCount: 0,
        itemCount: 0,
      };

      stats.count++;
      stats.totalDuration += metric.duration;
      
      if (metric.memoryUsed !== undefined) {
        stats.totalMemory += metric.memoryUsed;
        stats.memoryCount++;
      }
      
      if (metric.itemCount !== undefined) {
        stats.totalItems += metric.itemCount;
        stats.itemCount++;
      }

      operationStats.set(metric.operation, stats);
    });

    // Convert to array and sort by requested metric
    const operations = Array.from(operationStats.entries()).map(([operation, stats]) => ({
      operation,
      avgDuration: stats.totalDuration / stats.count,
      avgMemory: stats.memoryCount > 0 ? stats.totalMemory / stats.memoryCount : 0,
      avgItems: stats.itemCount > 0 ? stats.totalItems / stats.itemCount : 0,
      totalCalls: stats.count,
    }));

    // Sort by requested metric
    const sorted = operations.sort((a, b) => {
      switch (args.metric) {
        case 'duration':
          return b.avgDuration - a.avgDuration;
        case 'memory':
          return b.avgMemory - a.avgMemory;
        case 'items':
          return b.avgItems - a.avgItems;
        default:
          return 0;
      }
    });

    return sorted.slice(0, limit);
  },
});