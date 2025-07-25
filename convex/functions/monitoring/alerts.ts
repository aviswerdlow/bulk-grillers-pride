import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { internal } from '../../_generated/api';

/**
 * Alert thresholds configuration
 */
export const ALERT_THRESHOLDS = {
  // Response time thresholds (in milliseconds)
  responseTime: {
    warning: 500,
    critical: 2000,
  },
  
  // Memory usage thresholds (in MB)
  memoryUsage: {
    warning: 100 * 1024 * 1024, // 100MB
    critical: 500 * 1024 * 1024, // 500MB
  },
  
  // Error rate thresholds (percentage)
  errorRate: {
    warning: 1,
    critical: 5,
  },
  
  // Trash table size thresholds
  trashTableSize: {
    warning: 10000,
    critical: 50000,
  },
  
  // Operation-specific thresholds
  operations: {
    'trash.query.list': {
      responseTime: { warning: 300, critical: 1000 },
    },
    'ai.categorization': {
      responseTime: { warning: 5000, critical: 20000 },
    },
    'dashboard.load': {
      responseTime: { warning: 200, critical: 500 },
    },
  },
};

export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertType = 'responseTime' | 'memoryUsage' | 'errorRate' | 'trashTableSize';

export interface Alert {
  type: AlertType;
  level: AlertLevel;
  operation: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * Check metrics against thresholds and generate alerts
 */
export const checkAlertThresholds = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    timeWindow: v.optional(v.number()), // minutes, default 5
  },
  handler: async (ctx, args) => {
    const alerts: Alert[] = [];
    const timeWindow = (args.timeWindow || 5) * 60 * 1000; // Convert to milliseconds
    const startTime = Date.now() - timeWindow;

    // Get recent metrics
    const metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_timestamp', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.gte(q.field('startTime'), startTime))
      .collect();

    // Group metrics by operation
    const operationMetrics = new Map<string, typeof metrics>();
    metrics.forEach((metric) => {
      const ops = operationMetrics.get(metric.operation) || [];
      ops.push(metric);
      operationMetrics.set(metric.operation, ops);
    });

    // Check each operation
    for (const [operation, opMetrics] of operationMetrics) {
      if (opMetrics.length === 0) continue;

      // Calculate statistics
      const durations = opMetrics.map((m) => m.duration);
      const p95Duration = calculatePercentile(durations, 95);
      const errorCount = opMetrics.filter((m) => !m.success).length;
      const errorRate = (errorCount / opMetrics.length) * 100;
      
      // Get operation-specific thresholds or use defaults
      const opThresholds = ALERT_THRESHOLDS.operations[operation] || {};
      const responseThreshold = opThresholds.responseTime || ALERT_THRESHOLDS.responseTime;

      // Check response time
      if (p95Duration > responseThreshold.critical) {
        alerts.push({
          type: 'responseTime',
          level: 'critical',
          operation,
          message: `${operation} p95 response time is critically high`,
          value: p95Duration,
          threshold: responseThreshold.critical,
          timestamp: Date.now(),
        });
      } else if (p95Duration > responseThreshold.warning) {
        alerts.push({
          type: 'responseTime',
          level: 'warning',
          operation,
          message: `${operation} p95 response time is above warning threshold`,
          value: p95Duration,
          threshold: responseThreshold.warning,
          timestamp: Date.now(),
        });
      }

      // Check error rate
      if (errorRate > ALERT_THRESHOLDS.errorRate.critical) {
        alerts.push({
          type: 'errorRate',
          level: 'critical',
          operation,
          message: `${operation} error rate is critically high`,
          value: errorRate,
          threshold: ALERT_THRESHOLDS.errorRate.critical,
          timestamp: Date.now(),
        });
      } else if (errorRate > ALERT_THRESHOLDS.errorRate.warning) {
        alerts.push({
          type: 'errorRate',
          level: 'warning',
          operation,
          message: `${operation} error rate is above warning threshold`,
          value: errorRate,
          threshold: ALERT_THRESHOLDS.errorRate.warning,
          timestamp: Date.now(),
        });
      }

      // Check memory usage
      const memoryMetrics = opMetrics.filter((m) => m.memoryUsed !== undefined);
      if (memoryMetrics.length > 0) {
        const avgMemory = memoryMetrics.reduce((sum, m) => sum + (m.memoryUsed || 0), 0) / memoryMetrics.length;
        
        if (avgMemory > ALERT_THRESHOLDS.memoryUsage.critical) {
          alerts.push({
            type: 'memoryUsage',
            level: 'critical',
            operation,
            message: `${operation} average memory usage is critically high`,
            value: avgMemory,
            threshold: ALERT_THRESHOLDS.memoryUsage.critical,
            timestamp: Date.now(),
          });
        } else if (avgMemory > ALERT_THRESHOLDS.memoryUsage.warning) {
          alerts.push({
            type: 'memoryUsage',
            level: 'warning',
            operation,
            message: `${operation} average memory usage is above warning threshold`,
            value: avgMemory,
            threshold: ALERT_THRESHOLDS.memoryUsage.warning,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check trash table size if we have those metrics
    const trashMetrics = operationMetrics.get('trash.query.count');
    if (trashMetrics && trashMetrics.length > 0) {
      const latestCount = trashMetrics[trashMetrics.length - 1].itemCount || 0;
      
      if (latestCount > ALERT_THRESHOLDS.trashTableSize.critical) {
        alerts.push({
          type: 'trashTableSize',
          level: 'critical',
          operation: 'trash.query.count',
          message: 'Trash table size is critically high',
          value: latestCount,
          threshold: ALERT_THRESHOLDS.trashTableSize.critical,
          timestamp: Date.now(),
        });
      } else if (latestCount > ALERT_THRESHOLDS.trashTableSize.warning) {
        alerts.push({
          type: 'trashTableSize',
          level: 'warning',
          operation: 'trash.query.count',
          message: 'Trash table size is above warning threshold',
          value: latestCount,
          threshold: ALERT_THRESHOLDS.trashTableSize.warning,
          timestamp: Date.now(),
        });
      }
    }

    return alerts;
  },
});

/**
 * Calculate percentile from array of numbers
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get alert history for an organization
 */
export const getAlertHistory = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // For now, we'll generate alerts on-demand
    // In a production system, you'd store alerts in a separate table
    const alerts = await ctx.runQuery(internal.functions.monitoring.alerts.checkAlertThresholds, {
      organizationId: args.organizationId,
      timeWindow: 60, // Check last hour
    });

    return alerts.slice(0, args.limit || 50);
  },
});

/**
 * Get current alert summary
 */
export const getAlertSummary = internalQuery({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.runQuery(internal.functions.monitoring.alerts.checkAlertThresholds, {
      organizationId: args.organizationId,
      timeWindow: 5, // Check last 5 minutes for current status
    });

    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.level === 'critical').length,
      warning: alerts.filter((a) => a.level === 'warning').length,
      info: alerts.filter((a) => a.level === 'info').length,
      byType: {
        responseTime: alerts.filter((a) => a.type === 'responseTime').length,
        memoryUsage: alerts.filter((a) => a.type === 'memoryUsage').length,
        errorRate: alerts.filter((a) => a.type === 'errorRate').length,
        trashTableSize: alerts.filter((a) => a.type === 'trashTableSize').length,
      },
    };

    return summary;
  },
});