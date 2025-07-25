/**
 * Performance Benchmarking System
 * 
 * Automated benchmarking framework to compare CrewAI vs LangChain
 * for AI categorization performance, cost, and reliability.
 */

import { internalAction, internalMutation, internalQuery } from '../../_generated/server';
import { v } from 'convex/values';
import { api } from '../../_generated/api';
import { Id } from '../../_generated/dataModel';

// Performance metrics schema
export const performanceMetricSchema = v.object({
  benchmarkId: v.string(),
  timestamp: v.number(),
  system: v.union(v.literal('langchain'), v.literal('crewai')),
  provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
  
  // Timing metrics (in milliseconds)
  responseTime: v.object({
    p50: v.number(),
    p95: v.number(),
    p99: v.number(),
    mean: v.number(),
    min: v.number(),
    max: v.number(),
  }),
  
  // Throughput metrics
  throughput: v.object({
    productsPerMinute: v.number(),
    requestsPerSecond: v.number(),
    batchSize: v.number(),
  }),
  
  // Resource usage
  resourceUsage: v.object({
    tokenCount: v.number(),
    memoryUsageMB: v.number(),
    cpuPercentage: v.number(),
  }),
  
  // Cost metrics
  cost: v.object({
    totalCost: v.number(),
    costPerProduct: v.number(),
    tokenCost: v.number(),
  }),
  
  // Quality metrics
  quality: v.object({
    accuracy: v.number(), // 0-1
    errorRate: v.number(), // 0-1
    validationPassRate: v.number(), // 0-1
  }),
  
  // Test configuration
  testConfig: v.object({
    productCount: v.number(),
    concurrency: v.number(),
    warmupRuns: v.number(),
    testRuns: v.number(),
  }),
});

// Benchmark configuration schema
export const benchmarkConfigSchema = v.object({
  name: v.string(),
  description: v.string(),
  systems: v.array(v.union(v.literal('langchain'), v.literal('crewai'))),
  providers: v.array(v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini'))),
  
  // Test parameters
  testParams: v.object({
    productCounts: v.array(v.number()), // e.g., [10, 50, 100, 500]
    batchSizes: v.array(v.number()), // e.g., [1, 5, 10, 20]
    concurrencyLevels: v.array(v.number()), // e.g., [1, 5, 10]
    warmupRuns: v.number(), // Number of warmup runs before measurement
    testRuns: v.number(), // Number of test runs to average
    timeoutMs: v.number(), // Timeout per test
  }),
  
  // Success criteria
  successCriteria: v.object({
    maxResponseTimeP95: v.number(), // e.g., 5000ms
    minThroughput: v.number(), // e.g., 750 products/min
    maxErrorRate: v.number(), // e.g., 0.01
    maxCostPerProduct: v.number(), // e.g., $0.10
  }),
});

// Store benchmark configuration
export const createBenchmark = internalMutation({
  args: benchmarkConfigSchema,
  handler: async (ctx, config) => {
    const benchmarkId = await ctx.db.insert('performanceBenchmarks', {
      ...config,
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      results: [],
    });
    
    return benchmarkId;
  },
});

// Record performance metrics
export const recordMetrics = internalMutation({
  args: {
    benchmarkId: v.id('performanceBenchmarks'),
    metrics: performanceMetricSchema,
  },
  handler: async (ctx, { benchmarkId, metrics }) => {
    // Store individual metric record
    const metricId = await ctx.db.insert('performanceMetrics', {
      ...metrics,
      benchmarkId,
      createdAt: Date.now(),
    });
    
    // Update benchmark with latest results
    const benchmark = await ctx.db.get(benchmarkId);
    if (benchmark) {
      await ctx.db.patch(benchmarkId, {
        results: [...(benchmark.results || []), metricId] as any,
        updatedAt: Date.now(),
      });
    }
    
    return metricId;
  },
});

// Calculate performance statistics
export const calculateStats = internalQuery({
  args: {
    benchmarkId: v.id('performanceBenchmarks'),
    system: v.optional(v.union(v.literal('langchain'), v.literal('crewai'))),
    provider: v.optional(v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini'))),
  },
  handler: async (ctx, { benchmarkId, system, provider }) => {
    const benchmark = await ctx.db.get(benchmarkId);
    if (!benchmark) return null;
    
    // Get all metrics for this benchmark
    let metrics = await ctx.db
      .query('performanceMetrics')
      .withIndex('by_benchmarkId', q => q.eq('benchmarkId', benchmarkId))
      .collect();
    
    // Filter by system and provider if specified
    if (system) {
      metrics = metrics.filter(m => m.system === system);
    }
    if (provider) {
      metrics = metrics.filter(m => m.provider === provider);
    }
    
    if (metrics.length === 0) return null;
    
    // Calculate aggregate statistics
    const stats = {
      system,
      provider,
      sampleSize: metrics.length,
      
      responseTime: {
        p50: calculatePercentile(metrics.map(m => m.responseTime.p50), 50),
        p95: calculatePercentile(metrics.map(m => m.responseTime.p95), 95),
        p99: calculatePercentile(metrics.map(m => m.responseTime.p99), 99),
        mean: calculateMean(metrics.map(m => m.responseTime.mean)),
      },
      
      throughput: {
        mean: calculateMean(metrics.map(m => m.throughput.productsPerMinute)),
        min: Math.min(...metrics.map(m => m.throughput.productsPerMinute)),
        max: Math.max(...metrics.map(m => m.throughput.productsPerMinute)),
      },
      
      cost: {
        mean: calculateMean(metrics.map(m => m.cost.costPerProduct)),
        total: metrics.reduce((sum, m) => sum + m.cost.totalCost, 0),
      },
      
      quality: {
        accuracy: calculateMean(metrics.map(m => m.quality.accuracy)),
        errorRate: calculateMean(metrics.map(m => m.quality.errorRate)),
      },
      
      resourceUsage: {
        avgTokens: calculateMean(metrics.map(m => m.resourceUsage.tokenCount)),
        avgMemoryMB: calculateMean(metrics.map(m => m.resourceUsage.memoryUsageMB)),
      },
    };
    
    return stats;
  },
});

// Compare systems performance
export const compareSystemsPerformance = internalQuery({
  args: {
    benchmarkId: v.id('performanceBenchmarks'),
  },
  handler: async (ctx, { benchmarkId }) => {
    const langchainStats = await ctx.runQuery(
      api.benchmarks.performance.calculateStats,
      { benchmarkId, system: 'langchain' }
    );
    
    const crewaiStats = await ctx.runQuery(
      api.benchmarks.performance.calculateStats,
      { benchmarkId, system: 'crewai' }
    );
    
    if (!langchainStats || !crewaiStats) {
      return { error: 'Insufficient data for comparison' };
    }
    
    // Calculate performance deltas
    const comparison = {
      responseTimeImprovement: {
        p95: ((langchainStats.responseTime.p95 - crewaiStats.responseTime.p95) / 
              langchainStats.responseTime.p95) * 100,
        p99: ((langchainStats.responseTime.p99 - crewaiStats.responseTime.p99) / 
              langchainStats.responseTime.p99) * 100,
      },
      
      throughputImprovement: 
        ((crewaiStats.throughput.mean - langchainStats.throughput.mean) / 
         langchainStats.throughput.mean) * 100,
      
      costReduction: 
        ((langchainStats.cost.mean - crewaiStats.cost.mean) / 
         langchainStats.cost.mean) * 100,
      
      accuracyImprovement:
        ((crewaiStats.quality.accuracy - langchainStats.quality.accuracy) / 
         langchainStats.quality.accuracy) * 100,
      
      tokenEfficiency:
        ((langchainStats.resourceUsage.avgTokens - crewaiStats.resourceUsage.avgTokens) / 
         langchainStats.resourceUsage.avgTokens) * 100,
      
      // Determine if CrewAI meets success criteria
      meetsSuccessCriteria: {
        responseTime: crewaiStats.responseTime.p95 <= 5000, // 5s target
        throughput: crewaiStats.throughput.mean >= 750, // 750 products/min target
        errorRate: crewaiStats.quality.errorRate <= 0.01, // 1% error rate
      },
    };
    
    return {
      langchain: langchainStats,
      crewai: crewaiStats,
      comparison,
    };
  },
});

// Helper functions
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return sorted[index] || 0;
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// Check for performance regression
export const checkRegression = internalQuery({
  args: {
    currentBenchmarkId: v.id('performanceBenchmarks'),
    baselineBenchmarkId: v.id('performanceBenchmarks'),
    threshold: v.number(), // e.g., 0.10 for 10% regression threshold
  },
  handler: async (ctx, { currentBenchmarkId, baselineBenchmarkId, threshold }) => {
    const currentStats = await ctx.runQuery(
      api.benchmarks.performance.compareSystemsPerformance,
      { benchmarkId: currentBenchmarkId }
    );
    
    const baselineStats = await ctx.runQuery(
      api.benchmarks.performance.compareSystemsPerformance,
      { benchmarkId: baselineBenchmarkId }
    );
    
    if (!currentStats.crewai || !baselineStats.crewai) {
      return { error: 'Insufficient data for regression check' };
    }
    
    const regressions = [];
    
    // Check response time regression
    const p95Regression = 
      (currentStats.crewai.responseTime.p95 - baselineStats.crewai.responseTime.p95) / 
      baselineStats.crewai.responseTime.p95;
    
    if (p95Regression > threshold) {
      regressions.push({
        metric: 'responseTimeP95',
        regression: p95Regression * 100,
        baseline: baselineStats.crewai.responseTime.p95,
        current: currentStats.crewai.responseTime.p95,
      });
    }
    
    // Check throughput regression
    const throughputRegression = 
      (baselineStats.crewai.throughput.mean - currentStats.crewai.throughput.mean) / 
      baselineStats.crewai.throughput.mean;
    
    if (throughputRegression > threshold) {
      regressions.push({
        metric: 'throughput',
        regression: throughputRegression * 100,
        baseline: baselineStats.crewai.throughput.mean,
        current: currentStats.crewai.throughput.mean,
      });
    }
    
    // Check error rate regression
    const errorRateIncrease = 
      currentStats.crewai.quality.errorRate - baselineStats.crewai.quality.errorRate;
    
    if (errorRateIncrease > 0.01) { // More than 1% increase in error rate
      regressions.push({
        metric: 'errorRate',
        regression: errorRateIncrease * 100,
        baseline: baselineStats.crewai.quality.errorRate,
        current: currentStats.crewai.quality.errorRate,
      });
    }
    
    return {
      hasRegression: regressions.length > 0,
      regressions,
      summary: regressions.length > 0 
        ? `Performance regression detected in ${regressions.length} metrics`
        : 'No performance regression detected',
    };
  },
});