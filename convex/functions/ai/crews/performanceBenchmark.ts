import { internal } from "../../_generated/api";
/**
 * Performance Benchmarking for CrewAI Concurrent Processing
 * 
 * Tests and monitors performance to ensure we meet the 750 products/minute target
 */

import { v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";
import { Id } from "../../../_generated/dataModel";
import { ConcurrentProcessor } from "./concurrentProcessor";
import { createCrewConfig } from "./crewManager";

export interface BenchmarkResult {
  testId: string;
  timestamp: number;
  config: {
    productCount: number;
    maxConcurrentTasks: number;
    workerDistribution: Record<string, number>;
  };
  results: {
    totalDuration: number;
    throughput: number; // products per minute
    successRate: number;
    averageTaskDuration: number;
    memoryPeakUsage: number;
    memoryAverageUsage: number;
  };
  breakdown: {
    analyzerMetrics: TaskMetrics;
    matcherMetrics: TaskMetrics;
    validatorMetrics: TaskMetrics;
  };
  targetMet: boolean;
  recommendations: string[];
}

interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
}

const TARGET_THROUGHPUT = 750; // products per minute
const BENCHMARK_CONFIGURATIONS = [
  { productCount: 50, maxConcurrentTasks: 5 },
  { productCount: 100, maxConcurrentTasks: 10 },
  { productCount: 250, maxConcurrentTasks: 15 },
  { productCount: 500, maxConcurrentTasks: 20 },
  { productCount: 750, maxConcurrentTasks: 25 },
];

export const runPerformanceBenchmark = internalAction({
  args: {
    organizationId: v.id('organizations'),
    productCount: v.optional(v.number()),
    maxConcurrentTasks: v.optional(v.number()),
    warmupRuns: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, productCount = 100, maxConcurrentTasks = 10, warmupRuns = 2 } = args;
    
    try {
      // Get sample products and categories for testing
      const { products, categories } = await getSampleData(ctx, organizationId, productCount);
      
      if (products.length === 0) {
        throw new Error("No products available for benchmarking");
      }
      
      // Run warmup rounds
      console.log(`Running ${warmupRuns} warmup rounds...`);
      for (let i = 0; i < warmupRuns; i++) {
        await runSingleBenchmark(ctx, organizationId, products.slice(0, 10), categories, 5);
      }
      
      // Run actual benchmark
      console.log(`Running benchmark with ${products.length} products...`);
      const result = await runSingleBenchmark(
        ctx,
        organizationId,
        products,
        categories,
        maxConcurrentTasks
      );
      
      // Analyze results and generate recommendations
      const recommendations = analyzeResults(result);
      result.recommendations = recommendations;
      
      // Store benchmark results
      await storeBenchmarkResults(ctx, organizationId, result);
      
      return result;
    } catch (error) {
      console.error("Benchmark failed:", error);
      throw error;
    }
  },
});

export const runComprehensiveBenchmark = internalAction({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const results: BenchmarkResult[] = [];
    
    console.log("Starting comprehensive benchmark suite...");
    
    for (const config of BENCHMARK_CONFIGURATIONS) {
      console.log(`Testing configuration: ${config.productCount} products, ${config.maxConcurrentTasks} concurrent tasks`);
      
      try {
        const result = await ctx.runAction(internal.ai.crews.performanceBenchmark.runPerformanceBenchmark, {
          organizationId: args.organizationId,
          productCount: config.productCount,
          maxConcurrentTasks: config.maxConcurrentTasks,
          warmupRuns: 1,
        });
        
        results.push(result);
        
        // Log progress
        console.log(`Configuration complete: Throughput = ${result.results.throughput.toFixed(2)} products/min`);
        
      } catch (error) {
        console.error(`Configuration failed:`, error);
      }
    }
    
    // Generate comprehensive report
    const report = generateComprehensiveReport(results);
    
    return report;
  },
});

async function runSingleBenchmark(
  ctx: any,
  organizationId: Id<'organizations'>,
  products: any[],
  categories: any[],
  maxConcurrentTasks: number
): Promise<BenchmarkResult> {
  const testId = `benchmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // Create crew configuration
  const crewConfig = {
    ...createCrewConfig(organizationId, { maxConcurrentTasks }),
    maxConcurrentTasks,
  };
  
  // Initialize processor with monitoring
  const processor = new ConcurrentProcessor(ctx, crewConfig);
  const memorySnapshots: number[] = [];
  
  // Monitor memory usage
  const memoryMonitor = setInterval(async () => {
    try {
      const stats = await processor['memoryManager'].getStats();
      memorySnapshots.push(stats.totalSizeBytes);
    } catch (error) {
      // Ignore errors during monitoring
    }
  }, 1000);
  
  try {
    // Create task contexts
    const contexts = products.map(product => ({
      productId: product._id,
      productData: product,
      categories,
    }));
    
    // Process batch
    const result = await processor.processBatch(contexts);
    const endTime = Date.now();
    
    clearInterval(memoryMonitor);
    
    // Calculate metrics
    const totalDuration = endTime - startTime;
    const throughput = (products.length / (totalDuration / 60000));
    const successCount = result.products.filter(p => !p.error).length;
    const successRate = successCount / products.length;
    
    // Calculate task breakdown
    const taskBreakdown = calculateTaskBreakdown(result);
    
    // Memory statistics
    const memoryPeakUsage = Math.max(...memorySnapshots, 0);
    const memoryAverageUsage = memorySnapshots.length > 0 
      ? memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length 
      : 0;
    
    return {
      testId,
      timestamp: startTime,
      config: {
        productCount: products.length,
        maxConcurrentTasks,
        workerDistribution: getWorkerDistribution(maxConcurrentTasks),
      },
      results: {
        totalDuration,
        throughput,
        successRate,
        averageTaskDuration: result.metrics.averageTaskDuration,
        memoryPeakUsage,
        memoryAverageUsage,
      },
      breakdown: taskBreakdown,
      targetMet: throughput >= TARGET_THROUGHPUT,
      recommendations: [],
    };
  } finally {
    clearInterval(memoryMonitor);
  }
}

function getWorkerDistribution(totalWorkers: number): Record<string, number> {
  return {
    analyzer: Math.max(1, Math.floor(totalWorkers * 0.4)),
    matcher: Math.max(1, Math.floor(totalWorkers * 0.35)),
    validator: Math.max(1, Math.ceil(totalWorkers * 0.25)),
  };
}

function calculateTaskBreakdown(result: any): any {
  const analyzerTasks: number[] = [];
  const matcherTasks: number[] = [];
  const validatorTasks: number[] = [];
  
  // Extract task durations by type
  result.products.forEach((product: any) => {
    if (product.analysisResult && product.processingTime) {
      analyzerTasks.push(product.processingTime / 3); // Approximate
    }
    if (product.matchingResult && product.processingTime) {
      matcherTasks.push(product.processingTime / 3);
    }
    if (product.validationResult && product.processingTime) {
      validatorTasks.push(product.processingTime / 3);
    }
  });
  
  return {
    analyzerMetrics: calculateTaskMetrics(analyzerTasks),
    matcherMetrics: calculateTaskMetrics(matcherTasks),
    validatorMetrics: calculateTaskMetrics(validatorTasks),
  };
}

function calculateTaskMetrics(durations: number[]): TaskMetrics {
  if (durations.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
    };
  }
  
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    totalTasks: durations.length,
    completedTasks: durations.length,
    failedTasks: 0,
    averageDuration: sum / durations.length,
    minDuration: sorted[0],
    maxDuration: sorted[sorted.length - 1],
    p50Duration: sorted[Math.floor(sorted.length * 0.5)],
    p95Duration: sorted[Math.floor(sorted.length * 0.95)],
    p99Duration: sorted[Math.floor(sorted.length * 0.99)],
  };
}

function analyzeResults(result: BenchmarkResult): string[] {
  const recommendations: string[] = [];
  
  // Check throughput
  if (result.results.throughput < TARGET_THROUGHPUT) {
    const deficit = TARGET_THROUGHPUT - result.results.throughput;
    const percentDeficit = (deficit / TARGET_THROUGHPUT) * 100;
    
    recommendations.push(
      `Throughput is ${percentDeficit.toFixed(1)}% below target. Consider:`
    );
    
    // Analyze bottlenecks
    const { analyzerMetrics, matcherMetrics, validatorMetrics } = result.breakdown;
    
    const slowestAgent = [
      { name: 'analyzer', metrics: analyzerMetrics },
      { name: 'matcher', metrics: matcherMetrics },
      { name: 'validator', metrics: validatorMetrics },
    ].sort((a, b) => b.metrics.averageDuration - a.metrics.averageDuration)[0];
    
    recommendations.push(
      `- ${slowestAgent.name} is the bottleneck (avg: ${slowestAgent.metrics.averageDuration.toFixed(0)}ms)`
    );
    
    // Worker distribution recommendations
    const currentWorkers = result.config.maxConcurrentTasks;
    const neededWorkers = Math.ceil(currentWorkers * (TARGET_THROUGHPUT / result.results.throughput));
    
    recommendations.push(
      `- Increase concurrent tasks from ${currentWorkers} to ${neededWorkers}`
    );
    
    // Memory recommendations
    if (result.results.memoryPeakUsage > 400 * 1024 * 1024) { // 400MB
      recommendations.push(
        `- High memory usage (${(result.results.memoryPeakUsage / 1024 / 1024).toFixed(0)}MB). Enable memory compression`
      );
    }
  } else {
    recommendations.push(
      `✓ Target throughput achieved: ${result.results.throughput.toFixed(0)} products/min`
    );
  }
  
  // Success rate recommendations
  if (result.results.successRate < 0.95) {
    recommendations.push(
      `- Success rate is ${(result.results.successRate * 100).toFixed(1)}%. Investigate failures`
    );
  }
  
  // Task duration recommendations
  if (result.results.averageTaskDuration > 5000) { // 5 seconds
    recommendations.push(
      `- Average task duration is high (${(result.results.averageTaskDuration / 1000).toFixed(1)}s). Consider:`
    );
    recommendations.push(`  - Reducing LLM max tokens`);
    recommendations.push(`  - Using faster models`);
    recommendations.push(`  - Implementing result caching`);
  }
  
  return recommendations;
}

function generateComprehensiveReport(results: BenchmarkResult[]): any {
  const report = {
    summary: {
      totalTests: results.length,
      targetThroughput: TARGET_THROUGHPUT,
      bestThroughput: Math.max(...results.map(r => r.results.throughput)),
      averageThroughput: results.reduce((sum, r) => sum + r.results.throughput, 0) / results.length,
      targetsMet: results.filter(r => r.targetMet).length,
    },
    configurations: results.map(r => ({
      productCount: r.config.productCount,
      workers: r.config.maxConcurrentTasks,
      throughput: r.results.throughput,
      successRate: r.results.successRate,
      targetMet: r.targetMet,
    })),
    recommendations: {
      optimalConfiguration: findOptimalConfiguration(results),
      scalingStrategy: generateScalingStrategy(results),
    },
  };
  
  return report;
}

function findOptimalConfiguration(results: BenchmarkResult[]): any {
  // Find configuration that meets target with minimum resources
  const validConfigs = results.filter(r => r.targetMet);
  
  if (validConfigs.length === 0) {
    // Find best performing config
    const best = results.sort((a, b) => b.results.throughput - a.results.throughput)[0];
    return {
      found: false,
      recommendation: `No configuration met target. Best: ${best.config.maxConcurrentTasks} workers → ${best.results.throughput.toFixed(0)} products/min`,
      config: best.config,
    };
  }
  
  // Find config with minimum workers that meets target
  const optimal = validConfigs.sort((a, b) => a.config.maxConcurrentTasks - b.config.maxConcurrentTasks)[0];
  
  return {
    found: true,
    recommendation: `Optimal: ${optimal.config.maxConcurrentTasks} workers → ${optimal.results.throughput.toFixed(0)} products/min`,
    config: optimal.config,
  };
}

function generateScalingStrategy(results: BenchmarkResult[]): any {
  // Analyze scaling characteristics
  const scalingData = results.map(r => ({
    workers: r.config.maxConcurrentTasks,
    throughput: r.results.throughput,
    efficiency: r.results.throughput / r.config.maxConcurrentTasks,
  }));
  
  // Calculate scaling efficiency
  const efficiencyDrop = scalingData.length > 1 
    ? (scalingData[0].efficiency - scalingData[scalingData.length - 1].efficiency) / scalingData[0].efficiency
    : 0;
  
  return {
    linearScaling: efficiencyDrop < 0.2,
    efficiencyDrop: efficiencyDrop,
    recommendation: efficiencyDrop < 0.2 
      ? "System scales well linearly - add workers proportionally to load"
      : "Diminishing returns at scale - consider horizontal scaling across multiple crews",
  };
}

async function getSampleData(ctx: any, organizationId: Id<'organizations'>, count: number): Promise<any> {
  // Get sample products and categories for benchmarking
  const products = await ctx.runQuery(internal.products.list, {
    organizationId,
    limit: count,
  });
  
  const categories = await ctx.runQuery(internal.categories.list, {
    organizationId,
    limit: 50,
  });
  
  return { products, categories };
}

async function storeBenchmarkResults(ctx: any, organizationId: Id<'organizations'>, result: BenchmarkResult): Promise<void> {
  // Store benchmark results for historical analysis
  await ctx.runMutation(internal.ai.metrics.storeBenchmarkResult, {
    organizationId,
    result,
  });
}