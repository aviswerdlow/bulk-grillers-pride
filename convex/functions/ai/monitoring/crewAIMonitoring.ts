/**
 * CrewAI Monitoring and Optimization System
 * 
 * Comprehensive monitoring infrastructure for post-migration performance tracking,
 * cost analysis, and continuous optimization of the CrewAI categorization system.
 */

import { v } from 'convex/values';
import { 
  query, 
  mutation, 
  internalQuery, 
  internalMutation,
  internalAction,
  DatabaseReader,
  DatabaseWriter
} from '../../../_generated/server';
import { Doc, Id } from '../../../_generated/dataModel';
import { internal } from '../../../_generated/api';

// Monitoring Configuration
const MONITORING_CONFIG = {
  // Collection intervals
  METRICS_COLLECTION_INTERVAL: 60000, // 1 minute
  DASHBOARD_UPDATE_INTERVAL: 300000, // 5 minutes
  ALERT_CHECK_INTERVAL: 30000, // 30 seconds
  
  // Retention periods
  RAW_METRICS_RETENTION: 7 * 24 * 60 * 60 * 1000, // 7 days
  AGGREGATED_METRICS_RETENTION: 90 * 24 * 60 * 60 * 1000, // 90 days
  
  // Performance thresholds
  PERFORMANCE_TARGETS: {
    RESPONSE_TIME_P95: 5000, // 5 seconds
    THROUGHPUT_MIN: 750, // products per minute
    ACCURACY_MIN: 0.85, // 85%
    COST_PER_CATEGORIZATION_MAX: 0.05, // $0.05
    ERROR_RATE_MAX: 0.01, // 1%
    CACHE_HIT_RATE_MIN: 0.7, // 70%
  },
  
  // Alert thresholds
  ALERT_THRESHOLDS: {
    CRITICAL: {
      errorRate: 0.05, // 5%
      responseTimeP95: 8000, // 8 seconds
      throughput: 400, // products per minute
      accuracy: 0.75, // 75%
    },
    WARNING: {
      errorRate: 0.02, // 2%
      responseTimeP95: 6000, // 6 seconds
      throughput: 600, // products per minute
      accuracy: 0.82, // 82%
    },
  },
};

// Metric Types
export interface CrewAIMetric {
  timestamp: number;
  metricType: 'performance' | 'business' | 'infrastructure' | 'cost';
  metricName: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AggregatedMetric {
  period: 'minute' | 'hour' | 'day' | 'week' | 'month';
  startTime: number;
  endTime: number;
  metricName: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  tags: Record<string, string>;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: Id<'users'>;
  acknowledgedAt?: number;
  resolved: boolean;
  resolvedAt?: number;
  actions: string[];
}

export interface OptimizationRecommendation {
  id: string;
  type: 'performance' | 'cost' | 'quality' | 'scalability';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    improvementPercent: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
    steps: string[];
  };
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  createdAt: number;
  completedAt?: number;
}

// Collect real-time metrics from CrewAI jobs
export const collectCrewAIMetrics = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    metrics: v.array(v.object({
      metricType: v.string(),
      metricName: v.string(),
      value: v.number(),
      unit: v.string(),
      tags: v.any(),
    })),
  },
  handler: async (ctx, { jobId, metrics }) => {
    const timestamp = Date.now();
    
    // Store raw metrics
    for (const metric of metrics) {
      await ctx.db.insert('crewAIMetrics', {
        jobId,
        timestamp,
        ...metric,
        organizationId: await getJobOrganization(ctx.db, jobId),
      });
    }
    
    // Check for alert conditions
    await checkAlertConditions(ctx, metrics, jobId);
  },
});

// Aggregate metrics for dashboard
export const aggregateMetrics = internalAction({
  args: {
    period: v.union(
      v.literal('minute'),
      v.literal('hour'),
      v.literal('day'),
      v.literal('week'),
      v.literal('month')
    ),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { period, startTime, endTime }) => {
    const now = Date.now();
    const start = startTime || now - getPeriodDuration(period);
    const end = endTime || now;
    
    // Get raw metrics for the period
    const rawMetrics = await ctx.runQuery(internal.functions.ai.monitoring.crewAIMonitoring.getRawMetrics, {
      startTime: start,
      endTime: end,
    });
    
    // Group by metric name and tags
    const grouped = groupMetricsByNameAndTags(rawMetrics);
    
    // Calculate aggregations
    const aggregated = [];
    for (const [key, metrics] of grouped) {
      const values = metrics.map(m => m.value);
      const aggregation = {
        period,
        startTime: start,
        endTime: end,
        metricName: metrics[0].metricName,
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: calculatePercentile(values, 50),
        p95: calculatePercentile(values, 95),
        p99: calculatePercentile(values, 99),
        tags: metrics[0].tags,
      };
      
      aggregated.push(aggregation);
    }
    
    // Store aggregated metrics
    await ctx.runMutation(internal.functions.ai.monitoring.crewAIMonitoring.storeAggregatedMetrics, {
      metrics: aggregated,
    });
    
    return aggregated;
  },
});

// Get dashboard data
export const getDashboardData = query({
  args: {
    organizationId: v.id('organizations'),
    timeRange: v.union(
      v.literal('1h'),
      v.literal('6h'),
      v.literal('24h'),
      v.literal('7d'),
      v.literal('30d')
    ),
  },
  handler: async (ctx, { organizationId, timeRange }) => {
    const now = Date.now();
    const startTime = now - getTimeRangeDuration(timeRange);
    
    // Get aggregated metrics
    const metrics = await ctx.db
      .query('crewAIAggregatedMetrics')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('startTime', startTime)
      )
      .collect();
    
    // Get recent alerts
    const alerts = await ctx.db
      .query('crewAIAlerts')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('timestamp', startTime)
      )
      .order('desc')
      .take(50);
    
    // Get optimization recommendations
    const recommendations = await ctx.db
      .query('crewAIOptimizations')
      .withIndex('by_organization_status', q =>
        q.eq('organizationId', organizationId)
          .eq('status', 'proposed')
      )
      .collect();
    
    // Calculate key metrics
    const keyMetrics = calculateKeyMetrics(metrics);
    
    // Get performance trends
    const trends = calculateTrends(metrics, timeRange);
    
    return {
      keyMetrics,
      trends,
      alerts,
      recommendations,
      lastUpdated: now,
    };
  },
});

// Create optimization recommendation
export const createOptimizationRecommendation = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    recommendation: v.object({
      type: v.string(),
      priority: v.string(),
      title: v.string(),
      description: v.string(),
      expectedImpact: v.object({
        metric: v.string(),
        currentValue: v.number(),
        expectedValue: v.number(),
        improvementPercent: v.number(),
      }),
      implementation: v.object({
        effort: v.string(),
        risk: v.string(),
        steps: v.array(v.string()),
      }),
    }),
  },
  handler: async (ctx, { organizationId, recommendation }) => {
    const id = await ctx.db.insert('crewAIOptimizations', {
      organizationId,
      ...recommendation,
      status: 'proposed',
      createdAt: Date.now(),
    });
    
    // Create notification for organization admins
    await notifyAdmins(ctx, organizationId, {
      type: 'optimization_recommendation',
      title: recommendation.title,
      priority: recommendation.priority,
      link: `/optimizations/${id}`,
    });
    
    return id;
  },
});

// Alert monitoring and management
export const checkAlertConditions = async (
  ctx: DatabaseWriter,
  metrics: CrewAIMetric[],
  jobId: Id<'aiCategorizationJobs'>
) => {
  const thresholds = MONITORING_CONFIG.ALERT_THRESHOLDS;
  const alerts: Alert[] = [];
  
  for (const metric of metrics) {
    // Check error rate
    if (metric.metricName === 'error_rate') {
      if (metric.value > thresholds.CRITICAL.errorRate) {
        alerts.push(createAlert('critical', 'High Error Rate', metric, thresholds.CRITICAL.errorRate));
      } else if (metric.value > thresholds.WARNING.errorRate) {
        alerts.push(createAlert('warning', 'Elevated Error Rate', metric, thresholds.WARNING.errorRate));
      }
    }
    
    // Check response time
    if (metric.metricName === 'response_time_p95') {
      if (metric.value > thresholds.CRITICAL.responseTimeP95) {
        alerts.push(createAlert('critical', 'Slow Response Time', metric, thresholds.CRITICAL.responseTimeP95));
      } else if (metric.value > thresholds.WARNING.responseTimeP95) {
        alerts.push(createAlert('warning', 'Degraded Response Time', metric, thresholds.WARNING.responseTimeP95));
      }
    }
    
    // Check throughput
    if (metric.metricName === 'throughput') {
      if (metric.value < thresholds.CRITICAL.throughput) {
        alerts.push(createAlert('critical', 'Low Throughput', metric, thresholds.CRITICAL.throughput));
      } else if (metric.value < thresholds.WARNING.throughput) {
        alerts.push(createAlert('warning', 'Reduced Throughput', metric, thresholds.WARNING.throughput));
      }
    }
    
    // Check accuracy
    if (metric.metricName === 'categorization_accuracy') {
      if (metric.value < thresholds.CRITICAL.accuracy) {
        alerts.push(createAlert('critical', 'Low Accuracy', metric, thresholds.CRITICAL.accuracy));
      } else if (metric.value < thresholds.WARNING.accuracy) {
        alerts.push(createAlert('warning', 'Reduced Accuracy', metric, thresholds.WARNING.accuracy));
      }
    }
  }
  
  // Store alerts
  for (const alert of alerts) {
    await ctx.db.insert('crewAIAlerts', {
      ...alert,
      jobId,
      organizationId: await getJobOrganization(ctx.db, jobId),
    });
  }
  
  // Send notifications for critical alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    await sendAlertNotifications(ctx, criticalAlerts, jobId);
  }
};

// Cost tracking and analysis
export const trackCategorationCost = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalCost: v.number(),
    productCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { jobId, provider, model, inputTokens, outputTokens, totalCost, productCount } = args;
    
    // Calculate cost per categorization
    const costPerCategorization = productCount > 0 ? totalCost / productCount : 0;
    
    // Store cost metrics
    await ctx.db.insert('crewAICostTracking', {
      jobId,
      timestamp: Date.now(),
      provider,
      model,
      inputTokens,
      outputTokens,
      totalCost,
      productCount,
      costPerCategorization,
      organizationId: await getJobOrganization(ctx.db, jobId),
    });
    
    // Check if cost exceeds threshold
    if (costPerCategorization > MONITORING_CONFIG.PERFORMANCE_TARGETS.COST_PER_CATEGORIZATION_MAX) {
      await createOptimizationRecommendation(ctx, {
        organizationId: await getJobOrganization(ctx.db, jobId),
        recommendation: {
          type: 'cost',
          priority: 'high',
          title: 'High Categorization Cost Detected',
          description: `Current cost per categorization ($${costPerCategorization.toFixed(4)}) exceeds target ($${MONITORING_CONFIG.PERFORMANCE_TARGETS.COST_PER_CATEGORIZATION_MAX})`,
          expectedImpact: {
            metric: 'cost_per_categorization',
            currentValue: costPerCategorization,
            expectedValue: MONITORING_CONFIG.PERFORMANCE_TARGETS.COST_PER_CATEGORIZATION_MAX,
            improvementPercent: ((costPerCategorization - MONITORING_CONFIG.PERFORMANCE_TARGETS.COST_PER_CATEGORIZATION_MAX) / costPerCategorization) * 100,
          },
          implementation: {
            effort: 'medium',
            risk: 'low',
            steps: [
              'Review current prompt complexity and optimize for token usage',
              'Consider using a more cost-effective model for initial categorization',
              'Implement better caching strategies to reduce API calls',
              'Batch products more efficiently to maximize context usage',
            ],
          },
        },
      });
    }
  },
});

// Performance optimization workflows
export const runOptimizationAnalysis = internalAction({
  args: {
    organizationId: v.id('organizations'),
    timeRange: v.string(),
  },
  handler: async (ctx, { organizationId, timeRange }) => {
    const now = Date.now();
    const startTime = now - getTimeRangeDuration(timeRange);
    
    // Get performance metrics
    const metrics = await ctx.runQuery(internal.functions.ai.monitoring.crewAIMonitoring.getAggregatedMetrics, {
      organizationId,
      startTime,
      endTime: now,
    });
    
    // Analyze performance bottlenecks
    const bottlenecks = analyzeBottlenecks(metrics);
    
    // Generate optimization recommendations
    const recommendations = [];
    
    // Check agent performance
    const agentMetrics = metrics.filter(m => m.metricName.startsWith('agent_'));
    const slowestAgent = findSlowestAgent(agentMetrics);
    if (slowestAgent && slowestAgent.avgDuration > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: `Optimize ${slowestAgent.agentRole} Agent Performance`,
        description: `The ${slowestAgent.agentRole} agent is taking ${(slowestAgent.avgDuration / 1000).toFixed(2)}s on average, which is impacting overall throughput.`,
        expectedImpact: {
          metric: 'throughput',
          currentValue: calculateCurrentThroughput(metrics),
          expectedValue: calculateExpectedThroughput(metrics, slowestAgent.agentRole, 1500),
          improvementPercent: 25,
        },
        implementation: {
          effort: 'medium',
          risk: 'low',
          steps: [
            'Review and optimize agent prompts for efficiency',
            'Implement result caching for common patterns',
            'Consider parallelizing independent subtasks',
            'Reduce unnecessary context in agent instructions',
          ],
        },
      });
    }
    
    // Check memory usage
    const memoryMetrics = metrics.filter(m => m.metricName === 'memory_usage');
    const avgMemoryUsage = calculateAverage(memoryMetrics.map(m => m.avg));
    if (avgMemoryUsage > 400 * 1024 * 1024) { // 400MB
      recommendations.push({
        type: 'scalability',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: `Average memory usage (${(avgMemoryUsage / 1024 / 1024).toFixed(0)}MB) is approaching limits. Implement memory optimization strategies.`,
        expectedImpact: {
          metric: 'memory_usage',
          currentValue: avgMemoryUsage,
          expectedValue: 300 * 1024 * 1024,
          improvementPercent: 25,
        },
        implementation: {
          effort: 'high',
          risk: 'medium',
          steps: [
            'Implement memory summarization for long-running crews',
            'Optimize shared memory access patterns',
            'Add memory cleanup between batches',
            'Consider memory-efficient data structures',
          ],
        },
      });
    }
    
    // Store recommendations
    for (const rec of recommendations) {
      await ctx.runMutation(internal.functions.ai.monitoring.crewAIMonitoring.createOptimizationRecommendation, {
        organizationId,
        recommendation: rec,
      });
    }
    
    return {
      bottlenecks,
      recommendations,
      analyzedMetrics: metrics.length,
    };
  },
});

// Monthly performance review
export const generateMonthlyReport = internalAction({
  args: {
    organizationId: v.id('organizations'),
    month: v.number(), // 1-12
    year: v.number(),
  },
  handler: async (ctx, { organizationId, month, year }) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    // Get all metrics for the month
    const metrics = await ctx.runQuery(internal.functions.ai.monitoring.crewAIMonitoring.getAggregatedMetrics, {
      organizationId,
      startTime,
      endTime,
    });
    
    // Get cost data
    const costData = await ctx.runQuery(internal.functions.ai.monitoring.crewAIMonitoring.getCostData, {
      organizationId,
      startTime,
      endTime,
    });
    
    // Calculate monthly statistics
    const stats = {
      totalJobs: countUniqueJobs(metrics),
      totalProducts: sumMetric(metrics, 'products_processed'),
      averageResponseTime: calculateAverage(metrics.filter(m => m.metricName === 'response_time').map(m => m.avg)),
      averageThroughput: calculateAverage(metrics.filter(m => m.metricName === 'throughput').map(m => m.avg)),
      averageAccuracy: calculateAverage(metrics.filter(m => m.metricName === 'categorization_accuracy').map(m => m.avg)),
      totalCost: costData.totalCost,
      averageCostPerCategorization: costData.avgCostPerCategorization,
      errorRate: calculateErrorRate(metrics),
      cacheHitRate: calculateCacheHitRate(metrics),
      uptime: calculateUptime(metrics),
    };
    
    // Compare with previous month
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousStats = await getMonthlyStats(ctx, organizationId, previousMonth, previousYear);
    
    const comparison = compareStats(stats, previousStats);
    
    // Identify trends and patterns
    const trends = identifyTrends(metrics);
    
    // Generate insights
    const insights = generateInsights(stats, comparison, trends);
    
    // Store monthly report
    const reportId = await ctx.runMutation(internal.functions.ai.monitoring.crewAIMonitoring.storeMonthlyReport, {
      organizationId,
      month,
      year,
      stats,
      comparison,
      trends,
      insights,
    });
    
    return {
      reportId,
      stats,
      comparison,
      trends,
      insights,
    };
  },
});

// Helper functions
async function getJobOrganization(db: DatabaseReader, jobId: Id<'aiCategorizationJobs'>): Promise<Id<'organizations'>> {
  const job = await db.get(jobId);
  if (!job) throw new Error('Job not found');
  return job.organizationId;
}

function createAlert(
  severity: 'warning' | 'critical',
  type: string,
  metric: CrewAIMetric,
  threshold: number
): Alert {
  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    severity,
    type,
    message: `${type}: ${metric.metricName} is ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
    metric: metric.metricName,
    threshold,
    actualValue: metric.value,
    timestamp: Date.now(),
    acknowledged: false,
    resolved: false,
    actions: getRecommendedActions(type, severity),
  };
}

function getRecommendedActions(alertType: string, severity: 'warning' | 'critical'): string[] {
  const actions: Record<string, string[]> = {
    'High Error Rate': [
      'Check API key validity and permissions',
      'Review recent code changes',
      'Check provider service status',
      'Examine error logs for patterns',
    ],
    'Slow Response Time': [
      'Check provider API latency',
      'Review batch sizes and optimize',
      'Consider using faster model',
      'Check for memory pressure',
    ],
    'Low Throughput': [
      'Increase worker concurrency',
      'Optimize agent prompts',
      'Check for bottleneck agents',
      'Review rate limiting settings',
    ],
    'Low Accuracy': [
      'Review recent prompt changes',
      'Check category context quality',
      'Analyze failed categorizations',
      'Consider retraining or prompt tuning',
    ],
  };
  
  return actions[alertType] || ['Investigate the issue', 'Check system logs', 'Contact support if needed'];
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function getPeriodDuration(period: string): number {
  const durations: Record<string, number> = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  return durations[period] || durations.hour;
}

function getTimeRangeDuration(timeRange: string): number {
  const durations: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return durations[timeRange] || durations['24h'];
}

function groupMetricsByNameAndTags(metrics: CrewAIMetric[]): Map<string, CrewAIMetric[]> {
  const grouped = new Map<string, CrewAIMetric[]>();
  
  for (const metric of metrics) {
    const key = `${metric.metricName}_${JSON.stringify(metric.tags)}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(metric);
  }
  
  return grouped;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Notification helpers
async function notifyAdmins(
  ctx: DatabaseWriter,
  organizationId: Id<'organizations'>,
  notification: any
) {
  // Implementation would send notifications to organization admins
  console.log('Notifying admins:', notification);
}

async function sendAlertNotifications(
  ctx: DatabaseWriter,
  alerts: Alert[],
  jobId: Id<'aiCategorizationJobs'>
) {
  // Implementation would send alert notifications
  console.log('Sending alert notifications:', alerts.length);
}

// Analysis helpers
function analyzeBottlenecks(metrics: AggregatedMetric[]): any {
  // Analyze metrics to identify performance bottlenecks
  return {
    slowestAgent: findSlowestAgent(metrics),
    memoryPressure: checkMemoryPressure(metrics),
    throughputLimitations: analyzeThroughputLimitations(metrics),
  };
}

function findSlowestAgent(metrics: AggregatedMetric[]): any {
  const agentMetrics = metrics.filter(m => m.metricName.includes('agent_duration'));
  if (agentMetrics.length === 0) return null;
  
  const slowest = agentMetrics.reduce((prev, current) => 
    current.avg > prev.avg ? current : prev
  );
  
  return {
    agentRole: slowest.tags.agentRole,
    avgDuration: slowest.avg,
    p95Duration: slowest.p95,
  };
}

function checkMemoryPressure(metrics: AggregatedMetric[]): boolean {
  const memoryMetrics = metrics.filter(m => m.metricName === 'memory_usage');
  const avgMemory = calculateAverage(memoryMetrics.map(m => m.avg));
  return avgMemory > 400 * 1024 * 1024; // 400MB threshold
}

function analyzeThroughputLimitations(metrics: AggregatedMetric[]): any {
  const throughputMetrics = metrics.filter(m => m.metricName === 'throughput');
  const avgThroughput = calculateAverage(throughputMetrics.map(m => m.avg));
  return {
    currentThroughput: avgThroughput,
    targetThroughput: MONITORING_CONFIG.PERFORMANCE_TARGETS.THROUGHPUT_MIN,
    percentOfTarget: (avgThroughput / MONITORING_CONFIG.PERFORMANCE_TARGETS.THROUGHPUT_MIN) * 100,
  };
}

function calculateCurrentThroughput(metrics: AggregatedMetric[]): number {
  const throughputMetrics = metrics.filter(m => m.metricName === 'throughput');
  return calculateAverage(throughputMetrics.map(m => m.avg));
}

function calculateExpectedThroughput(
  metrics: AggregatedMetric[],
  optimizedAgent: string,
  targetDuration: number
): number {
  // Calculate expected throughput improvement
  const currentThroughput = calculateCurrentThroughput(metrics);
  const improvementFactor = 1.25; // 25% improvement estimate
  return currentThroughput * improvementFactor;
}

// Export internal queries for use in actions
export const getRawMetrics = internalQuery({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, { startTime, endTime }) => {
    return await ctx.db
      .query('crewAIMetrics')
      .withIndex('by_timestamp', q => 
        q.gte('timestamp', startTime).lte('timestamp', endTime)
      )
      .collect();
  },
});

export const getAggregatedMetrics = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, { organizationId, startTime, endTime }) => {
    return await ctx.db
      .query('crewAIAggregatedMetrics')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('startTime', startTime)
          .lte('endTime', endTime)
      )
      .collect();
  },
});

export const getCostData = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, { organizationId, startTime, endTime }) => {
    const costs = await ctx.db
      .query('crewAICostTracking')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('timestamp', startTime)
          .lte('timestamp', endTime)
      )
      .collect();
    
    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
    const totalProducts = costs.reduce((sum, c) => sum + c.productCount, 0);
    
    return {
      totalCost,
      totalProducts,
      avgCostPerCategorization: totalProducts > 0 ? totalCost / totalProducts : 0,
      costByProvider: groupCostsByProvider(costs),
      costByModel: groupCostsByModel(costs),
    };
  },
});

export const storeAggregatedMetrics = internalMutation({
  args: {
    metrics: v.array(v.any()),
  },
  handler: async (ctx, { metrics }) => {
    for (const metric of metrics) {
      await ctx.db.insert('crewAIAggregatedMetrics', metric);
    }
  },
});

export const storeMonthlyReport = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    month: v.number(),
    year: v.number(),
    stats: v.any(),
    comparison: v.any(),
    trends: v.any(),
    insights: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('crewAIMonthlyReports', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Additional helper functions
function countUniqueJobs(metrics: AggregatedMetric[]): number {
  const jobIds = new Set(metrics.map(m => m.tags.jobId).filter(Boolean));
  return jobIds.size;
}

function sumMetric(metrics: AggregatedMetric[], metricName: string): number {
  return metrics
    .filter(m => m.metricName === metricName)
    .reduce((sum, m) => sum + m.sum, 0);
}

function calculateErrorRate(metrics: AggregatedMetric[]): number {
  const errorMetrics = metrics.filter(m => m.metricName === 'error_rate');
  return calculateAverage(errorMetrics.map(m => m.avg));
}

function calculateCacheHitRate(metrics: AggregatedMetric[]): number {
  const cacheMetrics = metrics.filter(m => m.metricName === 'cache_hit_rate');
  return calculateAverage(cacheMetrics.map(m => m.avg));
}

function calculateUptime(metrics: AggregatedMetric[]): number {
  // Calculate system uptime based on successful metric collection
  const totalPeriods = metrics.filter(m => m.metricName === 'health_check').length;
  const successfulPeriods = metrics.filter(m => 
    m.metricName === 'health_check' && m.avg === 1
  ).length;
  
  return totalPeriods > 0 ? (successfulPeriods / totalPeriods) * 100 : 0;
}

function groupCostsByProvider(costs: any[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const cost of costs) {
    grouped[cost.provider] = (grouped[cost.provider] || 0) + cost.totalCost;
  }
  return grouped;
}

function groupCostsByModel(costs: any[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const cost of costs) {
    grouped[cost.model] = (grouped[cost.model] || 0) + cost.totalCost;
  }
  return grouped;
}

async function getMonthlyStats(ctx: any, organizationId: Id<'organizations'>, month: number, year: number): Promise<any> {
  // Fetch previous month's stats for comparison
  const report = await ctx.runQuery(internal.functions.ai.monitoring.crewAIMonitoring.getMonthlyReport, {
    organizationId,
    month,
    year,
  });
  
  return report?.stats || null;
}

function compareStats(current: any, previous: any): any {
  if (!previous) return null;
  
  return {
    jobsChange: ((current.totalJobs - previous.totalJobs) / previous.totalJobs) * 100,
    productsChange: ((current.totalProducts - previous.totalProducts) / previous.totalProducts) * 100,
    responseTimeChange: ((current.averageResponseTime - previous.averageResponseTime) / previous.averageResponseTime) * 100,
    throughputChange: ((current.averageThroughput - previous.averageThroughput) / previous.averageThroughput) * 100,
    accuracyChange: current.averageAccuracy - previous.averageAccuracy,
    costChange: ((current.totalCost - previous.totalCost) / previous.totalCost) * 100,
    errorRateChange: current.errorRate - previous.errorRate,
  };
}

function identifyTrends(metrics: AggregatedMetric[]): any {
  // Identify patterns and trends in the metrics
  return {
    peakUsageHours: findPeakUsageHours(metrics),
    performanceTrend: calculatePerformanceTrend(metrics),
    costTrend: calculateCostTrend(metrics),
    accuracyTrend: calculateAccuracyTrend(metrics),
  };
}

function generateInsights(stats: any, comparison: any, trends: any): string[] {
  const insights: string[] = [];
  
  // Performance insights
  if (stats.averageResponseTime > MONITORING_CONFIG.PERFORMANCE_TARGETS.RESPONSE_TIME_P95) {
    insights.push(`Response times (${stats.averageResponseTime}ms) exceed target. Consider optimization.`);
  }
  
  // Cost insights
  if (comparison && comparison.costChange > 20) {
    insights.push(`Costs increased by ${comparison.costChange.toFixed(1)}% compared to last month.`);
  }
  
  // Accuracy insights
  if (stats.averageAccuracy < MONITORING_CONFIG.PERFORMANCE_TARGETS.ACCURACY_MIN) {
    insights.push(`Accuracy (${(stats.averageAccuracy * 100).toFixed(1)}%) is below target. Review categorization logic.`);
  }
  
  // Throughput insights
  if (stats.averageThroughput < MONITORING_CONFIG.PERFORMANCE_TARGETS.THROUGHPUT_MIN) {
    insights.push(`Throughput (${stats.averageThroughput} products/min) is below target. Scale up workers.`);
  }
  
  return insights;
}

function findPeakUsageHours(metrics: AggregatedMetric[]): number[] {
  // Find hours with highest usage
  const hourlyUsage: Record<number, number> = {};
  
  for (const metric of metrics.filter(m => m.metricName === 'products_processed')) {
    const hour = new Date(metric.startTime).getHours();
    hourlyUsage[hour] = (hourlyUsage[hour] || 0) + metric.sum;
  }
  
  // Sort hours by usage and return top 3
  return Object.entries(hourlyUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
}

function calculatePerformanceTrend(metrics: AggregatedMetric[]): 'improving' | 'stable' | 'degrading' {
  // Simple trend calculation based on response times
  const responseTimeMetrics = metrics
    .filter(m => m.metricName === 'response_time')
    .sort((a, b) => a.startTime - b.startTime);
  
  if (responseTimeMetrics.length < 2) return 'stable';
  
  const firstHalf = responseTimeMetrics.slice(0, Math.floor(responseTimeMetrics.length / 2));
  const secondHalf = responseTimeMetrics.slice(Math.floor(responseTimeMetrics.length / 2));
  
  const firstAvg = calculateAverage(firstHalf.map(m => m.avg));
  const secondAvg = calculateAverage(secondHalf.map(m => m.avg));
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change < -5) return 'improving';
  if (change > 5) return 'degrading';
  return 'stable';
}

function calculateCostTrend(metrics: AggregatedMetric[]): 'increasing' | 'stable' | 'decreasing' {
  // Similar trend calculation for costs
  return 'stable'; // Placeholder
}

function calculateAccuracyTrend(metrics: AggregatedMetric[]): 'improving' | 'stable' | 'declining' {
  // Similar trend calculation for accuracy
  return 'stable'; // Placeholder
}

// Export internal query to get monthly report
export const getMonthlyReport = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    month: v.number(),
    year: v.number(),
  },
  handler: async (ctx, { organizationId, month, year }) => {
    return await ctx.db
      .query('crewAIMonthlyReports')
      .withIndex('by_organization_period', q =>
        q.eq('organizationId', organizationId)
          .eq('year', year)
          .eq('month', month)
      )
      .unique();
  },
});