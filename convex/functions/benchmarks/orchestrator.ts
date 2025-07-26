import { internal } from "../../_generated/api";
/**
 * Benchmark Orchestrator
 * 
 * Orchestrates full benchmark execution including warmup runs,
 * multiple test configurations, and comprehensive reporting.
 */

import { action, internalAction } from '../../_generated/server';
import { v } from 'convex/values';
import { api, internal } from '../../_generated/api';
import { Id } from '../../_generated/dataModel';

// Run complete benchmark suite
export const runBenchmarkSuite = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    includeSystemS: v.optional(v.array(v.union(v.literal('langchain'), v.literal('crewai')))),
    includeProviders: v.optional(v.array(v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')))),
  },
  handler: async (ctx, args) => {
    // Default configuration
    const config = {
      name: args.name,
      description: args.description || `Benchmark suite run at ${new Date().toISOString()}`,
      systems: args.includeSystemS || ['langchain', 'crewai'],
      providers: args.includeProviders || ['openai', 'anthropic', 'gemini'],
      
      testParams: {
        productCounts: [10, 50, 100, 500], // Test different scales
        batchSizes: [5, 10, 20], // Test different batch sizes
        concurrencyLevels: [1, 5, 10], // Test different concurrency levels
        warmupRuns: 2, // Number of warmup runs
        testRuns: 5, // Number of test runs to average
        timeoutMs: 300000, // 5 minute timeout per test
      },
      
      successCriteria: {
        maxResponseTimeP95: 5000, // 5 second P95 target
        minThroughput: 750, // 750 products/minute target
        maxErrorRate: 0.01, // 1% error rate threshold
        maxCostPerProduct: 0.10, // $0.10 per product max
      },
    };
    
    // Create benchmark record
    const benchmarkId = await ctx.runMutation(
      internal.benchmarks.performance.createBenchmark,
      config
    );
    
    // Update status to running
    await ctx.runMutation(
      internal.benchmarks.runner.updateBenchmarkStatus,
      { benchmarkId, status: 'running' }
    );
    
    try {
      // Execute benchmark suite
      const results = await ctx.runAction(
        internal.benchmarks.orchestrator.executeBenchmarkSuite,
        { benchmarkId, config }
      );
      
      // Update status to completed
      await ctx.runMutation(
        internal.benchmarks.runner.updateBenchmarkStatus,
        { benchmarkId, status: 'completed' }
      );
      
      // Generate final report
      const report = await ctx.runQuery(
        api.benchmarks.performance.compareSystemsPerformance,
        { benchmarkId }
      );
      
      return {
        success: true,
        benchmarkId,
        summary: results.summary,
        report,
      };
      
    } catch (error) {
      // Update status to failed
      await ctx.runMutation(
        internal.benchmarks.runner.updateBenchmarkStatus,
        { 
          benchmarkId, 
          status: 'failed',
          error: error.message,
        }
      );
      
      return {
        success: false,
        benchmarkId,
        error: error.message,
      };
    }
  },
});

// Execute the full benchmark suite
export const executeBenchmarkSuite = internalAction({
  args: {
    benchmarkId: v.id('performanceBenchmarks'),
    config: v.any(), // Benchmark configuration
  },
  handler: async (ctx, { benchmarkId, config }) => {
    const results = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      configurations: [] as any[],
    };
    
    // Iterate through all test configurations
    for (const system of config.systems) {
      for (const provider of config.providers) {
        for (const productCount of config.testParams.productCounts) {
          for (const batchSize of config.testParams.batchSizes) {
            for (const concurrency of config.testParams.concurrencyLevels) {
              // Skip invalid configurations
              if (batchSize > productCount) continue;
              
              const configName = `${system}-${provider}-${productCount}p-${batchSize}b-${concurrency}c`;
              console.log(`Running benchmark configuration: ${configName}`);
              
              try {
                // Run warmup runs (not recorded)
                for (let i = 0; i < config.testParams.warmupRuns; i++) {
                  await ctx.runAction(
                    internal.benchmarks.runner.executeBenchmarkRun,
                    {
                      benchmarkId,
                      system,
                      provider,
                      productCount,
                      batchSize,
                      concurrency,
                      testRun: -1, // Negative number indicates warmup
                    }
                  );
                }
                
                // Run actual test runs
                for (let testRun = 1; testRun <= config.testParams.testRuns; testRun++) {
                  const runResult = await ctx.runAction(
                    internal.benchmarks.runner.executeBenchmarkRun,
                    {
                      benchmarkId,
                      system,
                      provider,
                      productCount,
                      batchSize,
                      concurrency,
                      testRun,
                    }
                  );
                  
                  results.totalRuns++;
                  if (runResult.success) {
                    results.successfulRuns++;
                  } else {
                    results.failedRuns++;
                  }
                }
                
                results.configurations.push({
                  name: configName,
                  success: true,
                });
                
              } catch (error) {
                console.error(`Failed configuration ${configName}:`, error);
                results.configurations.push({
                  name: configName,
                  success: false,
                  error: error.message,
                });
                results.failedRuns++;
              }
            }
          }
        }
      }
    }
    
    // Calculate summary statistics
    const stats = await ctx.runQuery(
      api.benchmarks.performance.calculateStats,
      { benchmarkId }
    );
    
    return {
      summary: {
        totalRuns: results.totalRuns,
        successfulRuns: results.successfulRuns,
        failedRuns: results.failedRuns,
        successRate: results.totalRuns > 0 
          ? (results.successfulRuns / results.totalRuns) * 100 
          : 0,
        configurations: results.configurations.length,
        stats,
      },
    };
  },
});

// Run A/B comparison benchmark
export const runABComparison = action({
  args: {
    name: v.string(),
    baselineSystem: v.union(v.literal('langchain'), v.literal('crewai')),
    testSystem: v.union(v.literal('langchain'), v.literal('crewai')),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
    productCount: v.optional(v.number()),
    iterations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const productCount = args.productCount || 100;
    const iterations = args.iterations || 10;
    
    const config = {
      name: args.name,
      description: `A/B comparison: ${args.baselineSystem} vs ${args.testSystem} using ${args.provider}`,
      systems: [args.baselineSystem, args.testSystem],
      providers: [args.provider],
      
      testParams: {
        productCounts: [productCount],
        batchSizes: [10],
        concurrencyLevels: [5],
        warmupRuns: 1,
        testRuns: iterations,
        timeoutMs: 60000,
      },
      
      successCriteria: {
        maxResponseTimeP95: 5000,
        minThroughput: 750,
        maxErrorRate: 0.01,
        maxCostPerProduct: 0.10,
      },
    };
    
    // Run the benchmark
    const result = await ctx.run(async () => {
      return await runBenchmarkSuite(ctx, {
        name: config.name,
        description: config.description,
        includeSystemS: config.systems,
        includeProviders: config.providers,
      });
    });
    
    if (!result.success) {
      return result;
    }
    
    // Get comparison results
    const comparison = await ctx.runQuery(
      api.benchmarks.performance.compareSystemsPerformance,
      { benchmarkId: result.benchmarkId }
    );
    
    // Generate A/B test results
    const abResults = {
      winner: determineWinner(comparison),
      metrics: {
        responseTime: {
          baseline: comparison[args.baselineSystem]?.responseTime.p95,
          test: comparison[args.testSystem]?.responseTime.p95,
          improvement: comparison.comparison?.responseTimeImprovement.p95,
        },
        throughput: {
          baseline: comparison[args.baselineSystem]?.throughput.mean,
          test: comparison[args.testSystem]?.throughput.mean,
          improvement: comparison.comparison?.throughputImprovement,
        },
        cost: {
          baseline: comparison[args.baselineSystem]?.cost.mean,
          test: comparison[args.testSystem]?.cost.mean,
          savings: comparison.comparison?.costReduction,
        },
        accuracy: {
          baseline: comparison[args.baselineSystem]?.quality.accuracy,
          test: comparison[args.testSystem]?.quality.accuracy,
          improvement: comparison.comparison?.accuracyImprovement,
        },
      },
      recommendation: generateRecommendation(comparison, args.testSystem),
    };
    
    return {
      success: true,
      benchmarkId: result.benchmarkId,
      abResults,
      fullComparison: comparison,
    };
  },
});

// Determine winner based on multiple criteria
function determineWinner(comparison: any): string {
  if (!comparison.comparison) return 'inconclusive';
  
  let langchainScore = 0;
  let crewaiScore = 0;
  
  // Response time (lower is better)
  if (comparison.comparison.responseTimeImprovement.p95 > 0) {
    crewaiScore += 2; // Weight response time heavily
  } else {
    langchainScore += 2;
  }
  
  // Throughput (higher is better)
  if (comparison.comparison.throughputImprovement > 0) {
    crewaiScore += 2;
  } else {
    langchainScore += 2;
  }
  
  // Cost (lower is better)
  if (comparison.comparison.costReduction > 0) {
    crewaiScore += 1;
  } else {
    langchainScore += 1;
  }
  
  // Accuracy (higher is better)
  if (comparison.comparison.accuracyImprovement > 0) {
    crewaiScore += 3; // Weight accuracy highest
  } else {
    langchainScore += 3;
  }
  
  // Check if meets success criteria
  if (comparison.comparison.meetsSuccessCriteria) {
    if (comparison.comparison.meetsSuccessCriteria.responseTime &&
        comparison.comparison.meetsSuccessCriteria.throughput &&
        comparison.comparison.meetsSuccessCriteria.errorRate) {
      crewaiScore += 2;
    }
  }
  
  if (crewaiScore > langchainScore) {
    return 'crewai';
  } else if (langchainScore > crewaiScore) {
    return 'langchain';
  } else {
    return 'tie';
  }
}

// Generate recommendation based on results
function generateRecommendation(comparison: any, testSystem: string): string {
  const improvements = [];
  const concerns = [];
  
  if (comparison.comparison) {
    // Check improvements
    if (comparison.comparison.responseTimeImprovement.p95 > 10) {
      improvements.push(`${Math.round(comparison.comparison.responseTimeImprovement.p95)}% faster response times`);
    }
    if (comparison.comparison.throughputImprovement > 10) {
      improvements.push(`${Math.round(comparison.comparison.throughputImprovement)}% higher throughput`);
    }
    if (comparison.comparison.costReduction > 10) {
      improvements.push(`${Math.round(comparison.comparison.costReduction)}% cost reduction`);
    }
    if (comparison.comparison.accuracyImprovement > 5) {
      improvements.push(`${Math.round(comparison.comparison.accuracyImprovement)}% better accuracy`);
    }
    
    // Check concerns
    if (comparison.comparison.responseTimeImprovement.p95 < -10) {
      concerns.push(`${Math.round(-comparison.comparison.responseTimeImprovement.p95)}% slower response times`);
    }
    if (comparison.comparison.throughputImprovement < -10) {
      concerns.push(`${Math.round(-comparison.comparison.throughputImprovement)}% lower throughput`);
    }
    if (comparison.comparison.costReduction < -10) {
      concerns.push(`${Math.round(-comparison.comparison.costReduction)}% higher costs`);
    }
    
    // Check success criteria
    const meetsCriteria = comparison.comparison.meetsSuccessCriteria;
    if (!meetsCriteria.responseTime) {
      concerns.push('Does not meet response time target (5s P95)');
    }
    if (!meetsCriteria.throughput) {
      concerns.push('Does not meet throughput target (750 products/min)');
    }
    if (!meetsCriteria.errorRate) {
      concerns.push('Error rate exceeds 1% threshold');
    }
  }
  
  // Generate recommendation
  if (improvements.length > concerns.length && improvements.length >= 2) {
    return `Recommend switching to ${testSystem}. Key benefits: ${improvements.join(', ')}.${
      concerns.length > 0 ? ` Note: ${concerns.join(', ')}.` : ''
    }`;
  } else if (concerns.length > improvements.length) {
    return `Do not recommend switching to ${testSystem}. Concerns: ${concerns.join(', ')}.${
      improvements.length > 0 ? ` Some benefits: ${improvements.join(', ')}.` : ''
    }`;
  } else {
    return `Results are mixed. Improvements: ${improvements.join(', ') || 'none'}. Concerns: ${concerns.join(', ') || 'none'}. Consider running more tests or evaluating based on your specific priorities.`;
  }
}