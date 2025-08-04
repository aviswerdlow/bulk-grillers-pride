import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { timestampFields } from './common';

/**
 * CrewAI agent registry and session management
 * These are imported from the existing schema/crewai.ts file
 */

// Agent Registry
export const agentRegistry = defineTable({
  name: v.string(),
  role: v.string(),
  goal: v.string(),
  backstory: v.string(),
  tools: v.array(v.string()),
  llmConfig: v.object({
    provider: v.string(),
    model: v.string(),
    temperature: v.number(),
    maxTokens: v.optional(v.number()),
  }),
  capabilities: v.object({
    canAnalyze: v.boolean(),
    canCategorize: v.boolean(),
    canValidate: v.boolean(),
    canGenerateReports: v.boolean(),
  }),
  performance: v.object({
    tasksCompleted: v.number(),
    successRate: v.number(),
    avgExecutionTime: v.number(),
    lastActiveAt: v.optional(v.number()),
  }),
  status: v.string(), // 'active' | 'inactive' | 'maintenance'
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_status', ['status'])
  .index('by_name', ['name']);

// Agent Memory
export const agentMemory = defineTable({
  agentId: v.string(),
  memoryType: v.string(), // 'short_term' | 'long_term' | 'episodic'
  key: v.string(),
  value: v.any(),
  importance: v.number(),
  lastAccessed: v.number(),
  accessCount: v.number(),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
})
  .index('by_agent', ['agentId'])
  .index('by_agent_type', ['agentId', 'memoryType'])
  .index('by_importance', ['agentId', 'importance']);

// Agent Tasks
export const agentTasks = defineTable({
  agentId: v.string(),
  taskType: v.string(),
  description: v.string(),
  input: v.any(),
  output: v.optional(v.any()),
  status: v.string(), // 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: v.number(),
  dependencies: v.array(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  executionTime: v.optional(v.number()),
  error: v.optional(v.string()),
  retryCount: v.number(),
  maxRetries: v.number(),
  createdAt: v.number(),
})
  .index('by_agent', ['agentId'])
  .index('by_status', ['status'])
  .index('by_priority', ['priority']);

// Crew Sessions
export const crewSessions = defineTable({
  name: v.string(),
  agents: v.array(v.string()),
  tasks: v.array(v.string()),
  status: v.string(), // 'initializing' | 'running' | 'completed' | 'failed'
  config: v.object({
    processType: v.string(), // 'sequential' | 'parallel' | 'hierarchical'
    maxIterations: v.number(),
    timeoutMs: v.number(),
    verbose: v.boolean(),
  }),
  metrics: v.object({
    totalTasks: v.number(),
    completedTasks: v.number(),
    failedTasks: v.number(),
    totalDuration: v.optional(v.number()),
    avgTaskDuration: v.optional(v.number()),
  }),
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_status', ['status'])
  .index('by_created', ['createdAt']);

/**
 * CrewAI monitoring and optimization tables
 */

export const crewAITables = {
  // CrewAI Metrics
  crewAIMetrics: defineTable({
    jobId: v.string(),
    organizationId: v.string(),
    timestamp: v.number(),
    metricType: v.string(),
    metricName: v.string(),
    value: v.number(),
    unit: v.string(),
    tags: v.any(),
    metadata: v.optional(v.any()),
  })
    .index('by_job', ['jobId'])
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_metric_name', ['metricName', 'timestamp']),

  // Aggregated Metrics
  crewAIAggregatedMetrics: defineTable({
    organizationId: v.string(),
    period: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    metricName: v.string(),
    count: v.number(),
    sum: v.number(),
    min: v.number(),
    max: v.number(),
    avg: v.number(),
    p50: v.number(),
    p95: v.number(),
    p99: v.number(),
    tags: v.any(),
  })
    .index('by_organization_time', ['organizationId', 'startTime'])
    .index('by_metric_period', ['metricName', 'period', 'startTime']),

  // Alerts
  crewAIAlerts: defineTable({
    organizationId: v.string(),
    jobId: v.optional(v.string()),
    severity: v.string(),
    type: v.string(),
    message: v.string(),
    metric: v.string(),
    threshold: v.number(),
    actualValue: v.number(),
    timestamp: v.number(),
    acknowledged: v.boolean(),
    acknowledgedBy: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    resolution: v.optional(v.string()),
    actions: v.array(v.string()),
    correlationId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    notes: v.optional(v.string()),
    occurrenceCount: v.optional(v.number()),
    lastOccurrence: v.optional(v.number()),
    remediationAttempts: v.optional(v.number()),
    lastRemediationAt: v.optional(v.number()),
    lastRemediationSuccess: v.optional(v.boolean()),
  })
    .index('by_organization_status', ['organizationId', 'resolved'])
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_organization_type', ['organizationId', 'type'])
    .index('by_job', ['jobId']),

  // Alert History
  crewAIAlertHistory: defineTable({
    alertId: v.string(),
    action: v.string(),
    userId: v.string(),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_alert', ['alertId', 'timestamp']),

  // Optimizations
  crewAIOptimizations: defineTable({
    organizationId: v.string(),
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
      duration: v.optional(v.number()),
    }),
    status: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    implementationStarted: v.optional(v.number()),
    implementationNotes: v.optional(v.string()),
    actualImpact: v.optional(v.any()),
    successMetrics: v.optional(v.any()),
    resultsUpdatedAt: v.optional(v.number()),
    estimatedValue: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    estimatedROI: v.optional(v.number()),
    paybackPeriod: v.optional(v.number()),
    targetMetric: v.optional(v.string()),
    relevanceScore: v.optional(v.number()),
    expectedGapReduction: v.optional(v.number()),
    tactics: v.optional(v.array(v.string())),
  })
    .index('by_organization_status', ['organizationId', 'status'])
    .index('by_organization_priority', ['organizationId', 'priority'])
    .index('by_type', ['type', 'status']),

  // Cost Tracking
  crewAICostTracking: defineTable({
    jobId: v.string(),
    organizationId: v.string(),
    timestamp: v.number(),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    inputCost: v.number(),
    outputCost: v.number(),
    totalCost: v.number(),
    productCount: v.number(),
    costPerCategorization: v.number(),
    cacheHits: v.optional(v.number()),
  })
    .index('by_job', ['jobId'])
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_provider_model', ['provider', 'model', 'timestamp']),

  // Monthly Reports
  crewAIMonthlyReports: defineTable({
    organizationId: v.string(),
    month: v.number(),
    year: v.number(),
    stats: v.any(),
    comparison: v.any(),
    trends: v.any(),
    insights: v.any(),
    createdAt: v.number(),
  })
    .index('by_organization_period', ['organizationId', 'year', 'month']),

  // A/B Tests
  crewAIABTests: defineTable({
    organizationId: v.string(),
    optimizationId: v.string(),
    config: v.any(),
    status: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    results: v.optional(v.any()),
  })
    .index('by_organization_status', ['organizationId', 'status'])
    .index('by_optimization', ['optimizationId']),

  // Learnings
  crewAILearnings: defineTable({
    organizationId: v.string(),
    optimizationType: v.string(),
    learnings: v.any(),
    createdAt: v.number(),
  })
    .index('by_organization_type', ['organizationId', 'optimizationType']),

  // Remediation Log
  crewAIRemediationLog: defineTable({
    alertId: v.string(),
    action: v.string(),
    success: v.boolean(),
    result: v.string(),
    timestamp: v.number(),
  })
    .index('by_alert', ['alertId', 'timestamp']),
};