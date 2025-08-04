import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { timestampFields } from './common';

/**
 * A/B testing, rate limiting, and performance benchmarking tables
 */

export const infrastructureTables = {
  // A/B Test Configuration
  abTestConfigurations: defineTable({
    testName: v.string(),
    enabled: v.boolean(),
    
    // Traffic configuration
    trafficPercentage: v.object({
      crewAI: v.number(),
      langchain: v.number(),
    }),
    
    // Progressive rollout schedule
    rolloutSchedule: v.array(v.object({
      date: v.number(),
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
      targetedOrganizations: v.array(v.string()),
      excludedOrganizations: v.array(v.string()),
      betaUsers: v.array(v.string()),
    }),
    
    // Performance thresholds for auto-rollback
    performanceThresholds: v.object({
      maxResponseTime: v.number(),
      minAccuracy: v.number(),
      maxErrorRate: v.number(),
      maxCostIncrease: v.number(),
    }),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string(),
    lastRollbackAt: v.optional(v.number()),
    rollbackReason: v.optional(v.string()),
  })
    .index('by_testName', ['testName'])
    .index('by_enabled', ['enabled']),

  // A/B Test Metrics
  abTestMetrics: defineTable({
    organizationId: v.string(),
    system: v.string(), // 'crewai' | 'langchain'
    
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
    productIds: v.array(v.string()),
    jobId: v.string(),
  })
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_system_time', ['system', 'timestamp'])
    .index('by_job', ['jobId']),

  // A/B Test Alerts
  abTestAlerts: defineTable({
    timestamp: v.number(),
    system: v.string(),
    organizationId: v.string(),
    violations: v.array(v.string()),
    metrics: v.object({
      responseTime: v.number(),
      accuracy: v.number(),
      errorRate: v.number(),
      tokenUsage: v.number(),
      cost: v.number(),
      batchSize: v.number(),
      categoryCount: v.number(),
      cacheHitRate: v.number(),
    }),
    severity: v.string(), // 'warning' | 'critical'
  })
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_severity', ['severity'])
    .index('by_system', ['system']),

  // A/B Test Audit Log
  abTestAuditLog: defineTable({
    action: v.string(),
    userId: v.string(), // User ID or 'system'
    timestamp: v.number(),
    changes: v.optional(v.any()),
    previousConfig: v.optional(v.any()),
    reason: v.optional(v.string()),
  })
    .index('by_user_time', ['userId', 'timestamp'])
    .index('by_action', ['action']),

  // Rate Limits
  rateLimits: defineTable({
    organizationId: v.string(),
    userId: v.optional(v.string()),
    identifier: v.string(),
    resource: v.string(),
    windowStart: v.number(),
    windowDuration: v.number(),
    requestCount: v.number(),
    limit: v.number(),
    tokensUsed: v.optional(v.number()),
    tokenLimit: v.optional(v.number()),
    burstLimit: v.optional(v.number()),
    burstRemaining: v.optional(v.number()),
    isBlocked: v.boolean(),
    blockedUntil: v.optional(v.number()),
    lastRequest: v.number(),
    ...timestampFields,
  })
    .index('by_identifier_resource', ['identifier', 'resource'])
    .index('by_organization_resource', ['organizationId', 'resource'])
    .index('by_window_start', ['windowStart'])
    .index('by_blocked', ['isBlocked', 'blockedUntil']),

  // Rate Limit Configurations
  rateLimitConfigurations: defineTable({
    resource: v.string(),
    plan: v.string(),
    requestsPerMinute: v.optional(v.number()),
    requestsPerHour: v.optional(v.number()),
    requestsPerDay: v.optional(v.number()),
    tokensPerMinute: v.optional(v.number()),
    tokensPerHour: v.optional(v.number()),
    tokensPerDay: v.optional(v.number()),
    burstMultiplier: v.number(),
    burstDuration: v.number(),
    costPerRequest: v.optional(v.number()),
    maxCostPerDay: v.optional(v.number()),
    retryAfter: v.number(),
    errorMessage: v.string(),
    isEnabled: v.boolean(),
    allowOverride: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index('by_resource_plan', ['resource', 'plan'])
    .index('by_enabled', ['isEnabled']),

  // Rate Limit Violations
  rateLimitViolations: defineTable({
    organizationId: v.string(),
    userId: v.optional(v.string()),
    identifier: v.string(),
    resource: v.string(),
    timestamp: v.number(),
    requestCount: v.number(),
    limit: v.number(),
    endpoint: v.string(),
    method: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    statusCode: v.number(),
    retryAfter: v.number(),
    severity: v.string(), // 'low' | 'medium' | 'high' | 'critical'
    violationCount24h: v.number(),
    isRepeatOffender: v.boolean(),
  })
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_identifier_time', ['identifier', 'timestamp'])
    .index('by_resource', ['resource', 'timestamp'])
    .index('by_severity', ['severity', 'timestamp']),

  // Performance Benchmarks
  performanceBenchmarks: defineTable({
    name: v.string(),
    description: v.string(),
    status: v.string(), // 'pending' | 'running' | 'completed' | 'failed'
    systems: v.array(v.string()), // 'langchain' | 'crewai'
    providers: v.array(v.string()), // 'openai' | 'anthropic' | 'gemini'
    
    testParams: v.object({
      productCounts: v.array(v.number()),
      batchSizes: v.array(v.number()),
      concurrencyLevels: v.array(v.number()),
      warmupRuns: v.number(),
      testRuns: v.number(),
      timeoutMs: v.number(),
    }),
    
    successCriteria: v.object({
      maxResponseTimeP95: v.number(),
      minThroughput: v.number(),
      maxErrorRate: v.number(),
      maxCostPerProduct: v.number(),
    }),
    
    results: v.array(v.string()), // Array of benchmark metric IDs
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_createdAt', ['createdAt']),

  // Benchmark Metrics
  benchmarkMetrics: defineTable({
    benchmarkId: v.string(),
    timestamp: v.number(),
    system: v.string(),
    provider: v.string(),
    
    responseTime: v.object({
      p50: v.number(),
      p95: v.number(),
      p99: v.number(),
      mean: v.number(),
      min: v.number(),
      max: v.number(),
    }),
    
    throughput: v.object({
      productsPerMinute: v.number(),
      requestsPerSecond: v.number(),
      batchSize: v.number(),
    }),
    
    resourceUsage: v.object({
      tokenCount: v.number(),
      memoryUsageMB: v.number(),
      cpuPercentage: v.number(),
    }),
    
    cost: v.object({
      totalCost: v.number(),
      costPerProduct: v.number(),
      tokenCost: v.number(),
    }),
    
    quality: v.object({
      accuracy: v.number(),
      errorRate: v.number(),
      validationPassRate: v.number(),
    }),
    
    testConfig: v.object({
      productCount: v.number(),
      concurrency: v.number(),
      warmupRuns: v.number(),
      testRuns: v.number(),
    }),
    
    createdAt: v.number(),
  })
    .index('by_benchmarkId', ['benchmarkId'])
    .index('by_system_provider', ['system', 'provider'])
    .index('by_timestamp', ['timestamp']),
};