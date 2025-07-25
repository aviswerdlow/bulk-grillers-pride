import { v } from 'convex/values';
import { mutation, query, internalQuery } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';
import { AIProvider } from '../langchain';

/**
 * Enhanced A/B Testing Infrastructure for CrewAI Migration
 * 
 * Supports percentage-based rollout, user-specific targeting,
 * component-level feature flags, and rapid rollback capabilities.
 * 
 * Author: ai-agent
 * Task: #152
 */

// AB Test configuration schema
export const abTestConfigSchema = v.object({
  // Core test configuration
  testName: v.string(),
  enabled: v.boolean(),
  
  // Traffic configuration
  trafficPercentage: v.object({
    crewAI: v.number(), // 0-100
    langchain: v.number(), // 0-100
  }),
  
  // Progressive rollout schedule
  rolloutSchedule: v.array(v.object({
    date: v.number(), // timestamp
    crewAIPercentage: v.number(),
    langchainPercentage: v.number(),
    applied: v.boolean(),
  })),
  
  // Component-level flags
  componentFlags: v.object({
    productAnalyzer: v.boolean(),
    categoryMatcher: v.boolean(),
    qualityValidator: v.boolean(),
    memorySystem: v.boolean(),
    caching: v.boolean(),
    monitoring: v.boolean(),
  }),
  
  // User targeting
  userTargeting: v.object({
    enabled: v.boolean(),
    targetedOrganizations: v.array(v.id('organizations')),
    excludedOrganizations: v.array(v.id('organizations')),
    betaUsers: v.array(v.id('users')),
  }),
  
  // Performance thresholds for auto-rollback
  performanceThresholds: v.object({
    maxResponseTime: v.number(), // milliseconds
    minAccuracy: v.number(), // percentage
    maxErrorRate: v.number(), // percentage
    maxCostIncrease: v.number(), // percentage
  }),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  updatedBy: v.id('users'),
  lastRollbackAt: v.optional(v.number()),
  rollbackReason: v.optional(v.string()),
});

// Metrics collection schema
const abTestMetricsSchema = v.object({
  organizationId: v.id('organizations'),
  system: v.union(v.literal('crewai'), v.literal('langchain')),
  
  // Performance metrics
  responseTime: v.number(),
  accuracy: v.number(),
  errorRate: v.number(),
  tokenUsage: v.number(),
  cost: v.number(),
  
  // Operational metrics
  batchSize: v.number(),
  categoryCount: v.number(),
  cacheHitRate: v.number(),
  
  // Context
  timestamp: v.number(),
  productIds: v.array(v.id('products')),
  jobId: v.id('aiCategorizationJobs'),
});

// Get current A/B test configuration
export const getABTestConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('abTestConfigurations')
      .filter((q) => q.eq(q.field('testName'), 'crewai_migration'))
      .first();
    
    if (!config) {
      // Return default configuration
      return {
        testName: 'crewai_migration',
        enabled: false,
        trafficPercentage: {
          crewAI: 0,
          langchain: 100,
        },
        rolloutSchedule: [],
        componentFlags: {
          productAnalyzer: true,
          categoryMatcher: true,
          qualityValidator: true,
          memorySystem: true,
          caching: true,
          monitoring: true,
        },
        userTargeting: {
          enabled: false,
          targetedOrganizations: [],
          excludedOrganizations: [],
          betaUsers: [],
        },
        performanceThresholds: {
          maxResponseTime: 10000, // 10 seconds
          minAccuracy: 70, // 70%
          maxErrorRate: 5, // 5%
          maxCostIncrease: 50, // 50%
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    
    return config;
  },
});

// Update A/B test configuration
export const updateABTestConfig = mutation({
  args: {
    config: v.any(), // TODO: Create partial schema manually
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const existingConfig = await ctx.db
      .query('abTestConfigurations')
      .filter((q) => q.eq(q.field('testName'), 'crewai_migration'))
      .first();
    
    const updatedConfig = {
      ...args.config,
      testName: 'crewai_migration',
      updatedAt: Date.now(),
      updatedBy: user._id,
    };
    
    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, updatedConfig);
    } else {
      await ctx.db.insert('abTestConfigurations', {
        ...updatedConfig,
        createdAt: Date.now(),
      } as any);
    }
    
    // Log configuration change
    await ctx.db.insert('abTestAuditLog', {
      action: 'config_update',
      userId: user._id,
      timestamp: Date.now(),
      changes: args.config,
      previousConfig: existingConfig,
    });
    
    return {
      success: true,
      message: 'A/B test configuration updated',
      config: updatedConfig,
    };
  },
});

// Determine which system to use for a specific request
export const determineSystem = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const config = await getABTestConfig(ctx, {});
    
    // If A/B test is disabled, use LangChain
    if (!config.enabled) {
      return {
        system: 'langchain' as const,
        reason: 'AB test disabled',
      };
    }
    
    // Check if organization is excluded
    if (config.userTargeting.excludedOrganizations.includes(args.organizationId)) {
      return {
        system: 'langchain' as const,
        reason: 'Organization excluded from test',
      };
    }
    
    // Check if organization is specifically targeted
    if (config.userTargeting.enabled && 
        config.userTargeting.targetedOrganizations.length > 0 &&
        !config.userTargeting.targetedOrganizations.includes(args.organizationId)) {
      return {
        system: 'langchain' as const,
        reason: 'Organization not in target group',
      };
    }
    
    // Check if user is a beta user
    if (args.userId && config.userTargeting.betaUsers.includes(args.userId)) {
      return {
        system: 'crewai' as const,
        reason: 'Beta user',
      };
    }
    
    // Use consistent hash for stable assignment
    const hash = hashOrganizationId(args.organizationId);
    const percentage = hash % 100;
    
    if (percentage < config.trafficPercentage.crewAI) {
      return {
        system: 'crewai' as const,
        reason: 'Traffic percentage assignment',
      };
    }
    
    return {
      system: 'langchain' as const,
      reason: 'Traffic percentage assignment',
    };
  },
});

// Record A/B test metrics
export const recordABTestMetrics = internalQuery({
  args: abTestMetricsSchema,
  handler: async (ctx, args) => {
    // Store metrics
    await ctx.db.insert('abTestMetrics', args);
    
    // Check if metrics violate thresholds
    const config = await getABTestConfig(ctx, {});
    const violations = [];
    
    if (args.responseTime > config.performanceThresholds.maxResponseTime) {
      violations.push(`Response time ${args.responseTime}ms exceeds threshold ${config.performanceThresholds.maxResponseTime}ms`);
    }
    
    if (args.accuracy < config.performanceThresholds.minAccuracy) {
      violations.push(`Accuracy ${args.accuracy}% below threshold ${config.performanceThresholds.minAccuracy}%`);
    }
    
    if (args.errorRate > config.performanceThresholds.maxErrorRate) {
      violations.push(`Error rate ${args.errorRate}% exceeds threshold ${config.performanceThresholds.maxErrorRate}%`);
    }
    
    // If violations detected, trigger alert
    if (violations.length > 0 && args.system === 'crewai') {
      await ctx.db.insert('abTestAlerts', {
        timestamp: Date.now(),
        system: args.system,
        organizationId: args.organizationId,
        violations,
        metrics: args,
        severity: violations.length >= 2 ? 'critical' : 'warning',
      });
    }
    
    return { recorded: true, violations };
  },
});

// Instant rollback to LangChain
export const rollbackToLangChain = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update configuration to route 100% to LangChain
    await updateABTestConfig(ctx, {
      config: {
        enabled: false,
        trafficPercentage: {
          crewAI: 0,
          langchain: 100,
        },
        lastRollbackAt: Date.now(),
        rollbackReason: args.reason,
      },
    });
    
    // Log rollback
    await ctx.db.insert('abTestAuditLog', {
      action: 'emergency_rollback',
      userId: user._id,
      timestamp: Date.now(),
      reason: args.reason,
    });
    
    // Clear any scheduled rollouts
    const config = await getABTestConfig(ctx, {});
    if (config.rolloutSchedule.length > 0) {
      await updateABTestConfig(ctx, {
        config: {
          rolloutSchedule: config.rolloutSchedule.map(schedule => ({
            ...schedule,
            applied: true, // Mark as applied to prevent future execution
          })),
        },
      });
    }
    
    return {
      success: true,
      message: 'Successfully rolled back to LangChain',
      rollbackTime: Date.now(),
    };
  },
});

// Get A/B test metrics summary
export const getABTestMetrics = query({
  args: {
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    const metricsQuery = ctx.db
      .query('abTestMetrics')
      .filter((q) => {
        let filter = q.and(
          q.gte(q.field('timestamp'), args.timeRange.start),
          q.lte(q.field('timestamp'), args.timeRange.end)
        );
        
        if (args.organizationId) {
          filter = q.and(filter, q.eq(q.field('organizationId'), args.organizationId));
        }
        
        return filter;
      });
    
    const metrics = await metricsQuery.collect();
    
    // Calculate aggregate metrics
    const aggregateBySystem = (system: 'crewai' | 'langchain') => {
      const systemMetrics = metrics.filter(m => m.system === system);
      if (systemMetrics.length === 0) return null;
      
      return {
        count: systemMetrics.length,
        avgResponseTime: average(systemMetrics.map(m => m.responseTime)),
        avgAccuracy: average(systemMetrics.map(m => m.accuracy)),
        avgErrorRate: average(systemMetrics.map(m => m.errorRate)),
        avgCost: average(systemMetrics.map(m => m.cost)),
        totalTokens: sum(systemMetrics.map(m => m.tokenUsage)),
        avgCacheHitRate: average(systemMetrics.map(m => m.cacheHitRate)),
      };
    };
    
    const crewAIMetrics = aggregateBySystem('crewai');
    const langchainMetrics = aggregateBySystem('langchain');
    
    // Calculate statistical significance if both systems have data
    let significance = null;
    if (crewAIMetrics && langchainMetrics && crewAIMetrics.count >= 30 && langchainMetrics.count >= 30) {
      significance = calculateSignificance(
        metrics.filter(m => m.system === 'crewai').map(m => m.accuracy),
        metrics.filter(m => m.system === 'langchain').map(m => m.accuracy)
      );
    }
    
    return {
      crewAI: crewAIMetrics,
      langchain: langchainMetrics,
      totalSamples: metrics.length,
      timeRange: args.timeRange,
      significance,
      recommendation: generateRecommendation(crewAIMetrics, langchainMetrics, significance),
    };
  },
});

// Apply scheduled rollout
export const applyScheduledRollout = mutation({
  args: {},
  handler: async (ctx) => {
    const config = await getABTestConfig(ctx, {});
    const now = Date.now();
    
    // Find the next scheduled rollout that hasn't been applied
    const nextRollout = config.rolloutSchedule
      .filter(schedule => !schedule.applied && schedule.date <= now)
      .sort((a, b) => a.date - b.date)[0];
    
    if (!nextRollout) {
      return { applied: false, message: 'No scheduled rollout to apply' };
    }
    
    // Apply the rollout
    await updateABTestConfig(ctx, {
      config: {
        trafficPercentage: {
          crewAI: nextRollout.crewAIPercentage,
          langchain: nextRollout.langchainPercentage,
        },
        rolloutSchedule: config.rolloutSchedule.map(schedule => 
          schedule.date === nextRollout.date 
            ? { ...schedule, applied: true }
            : schedule
        ),
      },
    });
    
    // Log the rollout
    await ctx.db.insert('abTestAuditLog', {
      action: 'scheduled_rollout',
      userId: 'system' as any,
      timestamp: now,
      changes: {
        from: config.trafficPercentage,
        to: {
          crewAI: nextRollout.crewAIPercentage,
          langchain: nextRollout.langchainPercentage,
        },
      },
    });
    
    return {
      applied: true,
      message: `Applied rollout: CrewAI ${nextRollout.crewAIPercentage}%, LangChain ${nextRollout.langchainPercentage}%`,
    };
  },
});

// Helper functions
function hashOrganizationId(orgId: string): number {
  let hash = 0;
  for (let i = 0; i < orgId.length; i++) {
    const char = orgId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

function calculateSignificance(sample1: number[], sample2: number[]): {
  pValue: number;
  significant: boolean;
  confidenceInterval: [number, number];
} {
  // Simplified t-test implementation
  const n1 = sample1.length;
  const n2 = sample2.length;
  const mean1 = average(sample1);
  const mean2 = average(sample2);
  
  const variance1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1);
  const variance2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1);
  
  const pooledSE = Math.sqrt(variance1 / n1 + variance2 / n2);
  const tStat = Math.abs(mean1 - mean2) / pooledSE;
  
  // Approximate p-value (simplified)
  const df = n1 + n2 - 2;
  const pValue = Math.min(1, 2 * (1 - normalCDF(tStat)));
  
  // 95% confidence interval
  const marginOfError = 1.96 * pooledSE;
  const difference = mean1 - mean2;
  
  return {
    pValue,
    significant: pValue < 0.05,
    confidenceInterval: [difference - marginOfError, difference + marginOfError],
  };
}

function normalCDF(x: number): number {
  // Approximation of the cumulative distribution function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2.0);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

function generateRecommendation(
  crewAI: any,
  langchain: any,
  significance: any
): string {
  if (!crewAI || !langchain) {
    return 'Insufficient data to make a recommendation';
  }
  
  const improvements = {
    accuracy: ((crewAI.avgAccuracy - langchain.avgAccuracy) / langchain.avgAccuracy) * 100,
    speed: ((langchain.avgResponseTime - crewAI.avgResponseTime) / langchain.avgResponseTime) * 100,
    cost: ((crewAI.avgCost - langchain.avgCost) / langchain.avgCost) * 100,
    errors: ((langchain.avgErrorRate - crewAI.avgErrorRate) / langchain.avgErrorRate) * 100,
  };
  
  const wins = Object.entries(improvements).filter(([metric, value]) => 
    metric === 'cost' ? value < 0 : value > 0
  ).length;
  
  if (wins >= 3 && significance?.significant) {
    return `CrewAI shows significant improvements in ${wins}/4 metrics. Recommend proceeding with migration.`;
  } else if (wins >= 2) {
    return `Mixed results with ${wins}/4 metrics improved. Continue testing with larger sample size.`;
  } else {
    return 'LangChain performs better overall. Consider pausing CrewAI rollout.';
  }
}