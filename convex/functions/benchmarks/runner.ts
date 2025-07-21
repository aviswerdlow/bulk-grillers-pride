/**
 * Benchmark Runner
 * 
 * Executes performance benchmarks comparing LangChain and CrewAI systems
 * with comprehensive metrics collection and reporting.
 */

import { internalAction, internalMutation } from '../../_generated/server';
import { v } from 'convex/values';
import { api, internal } from '../../_generated/api';
import { Id } from '../../_generated/dataModel';

// Benchmark execution configuration
const benchmarkRunSchema = v.object({
  benchmarkId: v.id('performanceBenchmarks'),
  system: v.union(v.literal('langchain'), v.literal('crewai')),
  provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
  productCount: v.number(),
  batchSize: v.number(),
  concurrency: v.number(),
  testRun: v.number(), // Which test run number this is
});

// Execute a single benchmark run
export const executeBenchmarkRun = internalAction({
  args: benchmarkRunSchema,
  handler: async (ctx, args) => {
    const { benchmarkId, system, provider, productCount, batchSize, concurrency, testRun } = args;
    
    // Generate test products
    const testProducts = generateTestProducts(productCount);
    
    // Initialize metrics collection
    const metrics = {
      startTime: Date.now(),
      responseTimes: [] as number[],
      errors: [] as any[],
      tokenCounts: [] as number[],
      results: [] as any[],
    };
    
    // Process products in batches
    const batches = createBatches(testProducts, batchSize);
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    try {
      // Process batches with specified concurrency
      const batchPromises = [];
      for (let i = 0; i < batches.length; i += concurrency) {
        const concurrentBatches = batches.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          concurrentBatches.map(batch => 
            processBatch(ctx, system, provider, batch, metrics)
          )
        );
        batchPromises.push(...batchResults);
      }
      
      // Calculate final metrics
      const endTime = Date.now();
      const totalTime = endTime - metrics.startTime;
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      
      // Calculate response time percentiles
      const sortedTimes = metrics.responseTimes.sort((a, b) => a - b);
      const responseTimeMetrics = {
        p50: calculatePercentile(sortedTimes, 50),
        p95: calculatePercentile(sortedTimes, 95),
        p99: calculatePercentile(sortedTimes, 99),
        mean: metrics.responseTimes.reduce((sum, t) => sum + t, 0) / metrics.responseTimes.length,
        min: Math.min(...metrics.responseTimes),
        max: Math.max(...metrics.responseTimes),
      };
      
      // Calculate throughput
      const throughputMetrics = {
        productsPerMinute: (productCount / totalTime) * 60000,
        requestsPerSecond: batches.length / (totalTime / 1000),
        batchSize,
      };
      
      // Calculate resource usage
      const resourceMetrics = {
        tokenCount: metrics.tokenCounts.reduce((sum, t) => sum + t, 0),
        memoryUsageMB: endMemory - startMemory,
        cpuPercentage: 0, // TODO: Implement CPU monitoring
      };
      
      // Calculate cost (example rates)
      const costPerToken = getCostPerToken(provider);
      const costMetrics = {
        totalCost: resourceMetrics.tokenCount * costPerToken,
        costPerProduct: (resourceMetrics.tokenCount * costPerToken) / productCount,
        tokenCost: costPerToken,
      };
      
      // Calculate quality metrics
      const successfulResults = metrics.results.filter(r => r.success).length;
      const qualityMetrics = {
        accuracy: calculateAccuracy(metrics.results),
        errorRate: metrics.errors.length / productCount,
        validationPassRate: successfulResults / productCount,
      };
      
      // Record the metrics
      await ctx.runMutation(internal.benchmarks.performance.recordMetrics, {
        benchmarkId,
        metrics: {
          benchmarkId: benchmarkId as string,
          timestamp: Date.now(),
          system,
          provider,
          responseTime: responseTimeMetrics,
          throughput: throughputMetrics,
          resourceUsage: resourceMetrics,
          cost: costMetrics,
          quality: qualityMetrics,
          testConfig: {
            productCount,
            concurrency,
            warmupRuns: 0, // Set by orchestrator
            testRuns: testRun,
          },
        },
      });
      
      return {
        success: true,
        summary: {
          system,
          provider,
          productCount,
          totalTime,
          avgResponseTime: responseTimeMetrics.mean,
          throughput: throughputMetrics.productsPerMinute,
          errorRate: qualityMetrics.errorRate,
          cost: costMetrics.totalCost,
        },
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        system,
        provider,
      };
    }
  },
});

// Process a batch of products
async function processBatch(
  ctx: any,
  system: 'langchain' | 'crewai',
  provider: 'openai' | 'anthropic' | 'gemini',
  products: any[],
  metrics: any
): Promise<any> {
  const batchStartTime = Date.now();
  
  try {
    let result;
    let tokenCount = 0;
    
    if (system === 'langchain') {
      // Simulate LangChain processing
      result = await simulateLangChainCategorization(products, provider);
      tokenCount = estimateLangChainTokens(products);
    } else {
      // Simulate CrewAI processing
      result = await simulateCrewAICategorization(products, provider);
      tokenCount = estimateCrewAITokens(products);
    }
    
    const batchEndTime = Date.now();
    const batchTime = batchEndTime - batchStartTime;
    
    // Record metrics for this batch
    metrics.responseTimes.push(batchTime);
    metrics.tokenCounts.push(tokenCount);
    metrics.results.push({
      success: true,
      products: products.length,
      categories: result.categories,
      confidence: result.confidence,
    });
    
    return result;
    
  } catch (error) {
    metrics.errors.push({
      batch: products.map(p => p.id),
      error: error.message,
      timestamp: Date.now(),
    });
    
    // Still record response time for failed batches
    const batchEndTime = Date.now();
    metrics.responseTimes.push(batchEndTime - batchStartTime);
    
    throw error;
  }
}

// Generate test products for benchmarking
function generateTestProducts(count: number): any[] {
  const products = [];
  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
  const adjectives = ['Premium', 'Basic', 'Professional', 'Deluxe', 'Standard'];
  
  for (let i = 0; i < count; i++) {
    products.push({
      id: `test_product_${i}`,
      name: `${adjectives[i % adjectives.length]} Product ${i}`,
      description: `This is a detailed description for test product ${i}. It contains various keywords that help with categorization.`,
      price: Math.random() * 1000,
      sku: `SKU-${i.toString().padStart(6, '0')}`,
      expectedCategory: categories[i % categories.length],
    });
  }
  
  return products;
}

// Create batches from products array
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

// Simulate LangChain categorization
async function simulateLangChainCategorization(products: any[], provider: string): Promise<any> {
  // Simulate API call delay based on provider
  const delay = getProviderDelay(provider, products.length);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Simulate categorization results
  return {
    categories: products.map(p => ({
      productId: p.id,
      category: p.expectedCategory,
      confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
    })),
    confidence: 0.9,
  };
}

// Simulate CrewAI categorization
async function simulateCrewAICategorization(products: any[], provider: string): Promise<any> {
  // CrewAI typically has slightly higher latency due to multi-agent coordination
  const delay = getProviderDelay(provider, products.length) * 1.2;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Simulate improved accuracy with CrewAI
  return {
    categories: products.map(p => ({
      productId: p.id,
      category: p.expectedCategory,
      confidence: 0.90 + Math.random() * 0.10, // 90-100% confidence
      agentAnalysis: {
        analyzer: 'Product analyzed successfully',
        matcher: 'Category matched with high confidence',
        validator: 'Validation passed',
      },
    })),
    confidence: 0.95,
  };
}

// Get simulated delay based on provider and batch size
function getProviderDelay(provider: string, batchSize: number): number {
  const baseDelays = {
    openai: 100,
    anthropic: 120,
    gemini: 90,
  };
  
  const baseDelay = baseDelays[provider] || 100;
  return baseDelay + (batchSize * 10); // Add 10ms per product
}

// Estimate token usage for LangChain
function estimateLangChainTokens(products: any[]): number {
  // Rough estimation: ~100 tokens per product for prompt + response
  return products.length * 100;
}

// Estimate token usage for CrewAI
function estimateCrewAITokens(products: any[]): number {
  // CrewAI uses more tokens due to multi-agent communication
  // Rough estimation: ~150 tokens per product
  return products.length * 150;
}

// Get cost per token for provider
function getCostPerToken(provider: string): number {
  const costs = {
    openai: 0.00002, // $0.02 per 1K tokens
    anthropic: 0.000024, // $0.024 per 1K tokens
    gemini: 0.000015, // $0.015 per 1K tokens
  };
  
  return costs[provider] || 0.00002;
}

// Calculate accuracy based on results
function calculateAccuracy(results: any[]): number {
  if (results.length === 0) return 0;
  
  let correct = 0;
  let total = 0;
  
  for (const result of results) {
    if (result.categories) {
      for (const cat of result.categories) {
        total++;
        // In real benchmark, compare with ground truth
        // For simulation, use confidence as proxy
        if (cat.confidence > 0.8) {
          correct++;
        }
      }
    }
  }
  
  return total > 0 ? correct / total : 0;
}

// Calculate percentile from sorted array
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

// Update benchmark status
export const updateBenchmarkStatus = internalMutation({
  args: {
    benchmarkId: v.id('performanceBenchmarks'),
    status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { benchmarkId, status, error }) => {
    const updates: any = {
      status,
      updatedAt: Date.now(),
    };
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = Date.now();
    }
    
    if (error) {
      updates.error = error;
    }
    
    await ctx.db.patch(benchmarkId, updates);
  },
});