/**
 * CrewAI Manager
 * 
 * High-level orchestration layer for managing CrewAI categorization workflows
 * with concurrent processing, monitoring, and error handling
 */

import { v } from "convex/values";
import { action, internalAction } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";
import { Doc, Id } from "../../../_generated/dataModel";
import { ConvexError } from "convex/values";
import { ConcurrentProcessor } from "./concurrentProcessor";
import { createAgents } from "./agents";
import {
  CrewConfig,
  TaskContext,
  ConcurrentProcessingResult,
  LLMConfig,
} from "./types";

const DEFAULT_CREW_CONFIG: Partial<CrewConfig> = {
  process: 'concurrent',
  maxConcurrentTasks: 10,
  memoryEnabled: true,
  cacheEnabled: true,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  timeout: 300000, // 5 minutes
};

export const processBatchWithCrewAI = internalAction({
  args: {
    organizationId: v.id('organizations'),
    productIds: v.array(v.id('products')),
    categoryIds: v.array(v.id('categories')),
    options: v.optional(v.object({
      provider: v.optional(v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini'))),
      model: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxConcurrentTasks: v.optional(v.number()),
      timeout: v.optional(v.number()),
      verbose: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const { organizationId, productIds, categoryIds, options = {} } = args;
    
    try {
      // Fetch products and categories
      const products = await Promise.all(
        productIds.map(id => ctx.runQuery(internal.functions.products.products.getById, { productId: id }))
      );
      const categories = await Promise.all(
        categoryIds.map(id => ctx.runQuery(internal.functions.categories.queries.getById, { categoryId: id }))
      );
      
      // Filter out any null results
      const validProducts = products.filter(p => p !== null) as Doc<'products'>[];
      const validCategories = categories.filter(c => c !== null) as Doc<'categories'>[];
      
      if (validProducts.length === 0) {
        throw new ConvexError("No valid products to process");
      }
      
      // Create crew configuration
      const crewConfig = createCrewConfig(organizationId, options);
      
      // Initialize concurrent processor
      const processor = new ConcurrentProcessor(ctx, crewConfig);
      
      // Create task contexts for each product
      const contexts: TaskContext[] = validProducts.map(product => ({
        productId: product._id,
        productData: product,
        categories: validCategories,
      }));
      
      // Start processing with monitoring
      const result = await monitoredProcessing(processor, contexts, options.verbose);
      
      // Update products with categorization results
      await updateProductsWithResults(ctx, result);
      
      // Store metrics for analysis
      await storeProcessingMetrics(ctx, organizationId, result);
      
      return {
        success: true,
        processedCount: result.products.length,
        successCount: result.products.filter(p => !p.error).length,
        failureCount: result.products.filter(p => p.error).length,
        metrics: result.metrics,
        crewId: result.crewId,
        sessionId: result.sessionId,
        products: result.products, // Include the actual product results
      };
      
    } catch (error) {
      console.error("CrewAI processing error:", error);
      throw new ConvexError(`CrewAI processing failed: ${error.message}`);
    }
  },
});

export const getCrewProcessingStatus = internalAction({
  args: {
    crewId: v.string(),
  },
  handler: async (ctx, args) => {
    // In a full implementation, this would query crew status from a persistence layer
    // For now, returning a mock status
    return {
      crewId: args.crewId,
      status: 'completed',
      progress: 100,
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        throughput: 0,
      },
    };
  },
});

export const estimateCrewProcessingCost = action({
  args: {
    organizationId: v.id('organizations'),
    productCount: v.number(),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const { productCount, provider, model } = args;
    
    // Estimate tokens per product (based on empirical data)
    const tokensPerProduct = {
      analyzer: 800,
      matcher: 600,
      validator: 400,
    };
    
    const totalTokens = productCount * (
      tokensPerProduct.analyzer +
      tokensPerProduct.matcher +
      tokensPerProduct.validator
    );
    
    // Cost per 1K tokens (approximate)
    const costPer1KTokens = getCostPer1KTokens(provider, model);
    
    const estimatedCost = (totalTokens / 1000) * costPer1KTokens;
    const estimatedTime = Math.ceil(productCount / 12.5); // ~750 products/min = 12.5/sec
    
    return {
      estimatedTokens: totalTokens,
      estimatedCost,
      estimatedTimeSeconds: estimatedTime,
      costBreakdown: {
        analyzer: (productCount * tokensPerProduct.analyzer / 1000) * costPer1KTokens,
        matcher: (productCount * tokensPerProduct.matcher / 1000) * costPer1KTokens,
        validator: (productCount * tokensPerProduct.validator / 1000) * costPer1KTokens,
      },
    };
  },
});

// Helper functions

export function createCrewConfig(
  organizationId: Id<'organizations'>,
  options: any
): CrewConfig {
  const agents = createAgents({
    analyzerConfig: options.provider ? {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
    } : undefined,
    matcherConfig: options.provider ? {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
    } : undefined,
    validatorConfig: options.provider ? {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature ? options.temperature * 0.7 : undefined, // Lower temp for validation
    } : undefined,
  });
  
  return {
    ...DEFAULT_CREW_CONFIG,
    id: `crew_config_${Date.now()}`,
    organizationId,
    agents: [agents.analyzer, agents.matcher, agents.validator],
    maxConcurrentTasks: options.maxConcurrentTasks || DEFAULT_CREW_CONFIG.maxConcurrentTasks!,
    timeout: options.timeout || DEFAULT_CREW_CONFIG.timeout!,
  } as CrewConfig;
}

async function monitoredProcessing(
  processor: ConcurrentProcessor,
  contexts: TaskContext[],
  verbose?: boolean
): Promise<ConcurrentProcessingResult> {
  const startTime = Date.now();
  
  if (verbose) {
    console.log(`Starting CrewAI processing for ${contexts.length} products`);
  }
  
  // Process with periodic status updates
  const updateInterval = verbose ? setInterval(() => {
    console.log(`Processing... Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`);
  }, 5000) : null;
  
  try {
    const result = await processor.processBatch(contexts);
    
    if (verbose) {
      console.log(`CrewAI processing completed:`, {
        duration: result.totalProcessingTime,
        throughput: result.metrics.throughput,
        success: result.products.filter(p => !p.error).length,
        failed: result.products.filter(p => p.error).length,
      });
    }
    
    return result;
  } finally {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  }
}

async function updateProductsWithResults(
  ctx: any,
  result: ConcurrentProcessingResult
): Promise<void> {
  const updates = result.products
    .filter(p => p.validationResult?.isValid && p.validationResult?.finalCategory)
    .map(p => ({
      productId: p.productId,
      categoryId: p.validationResult!.finalCategory!,
      confidence: p.validationResult!.confidence,
    }));
  
  // Batch update products
  for (const update of updates) {
    await ctx.runMutation(internal.products.updateCategorization, {
      productId: update.productId,
      categoryAssignments: [{
        categoryId: update.categoryId,
        confidence: update.confidence,
        source: 'crewai',
      }],
    });
  }
}

async function storeProcessingMetrics(
  ctx: any,
  organizationId: Id<'organizations'>,
  result: ConcurrentProcessingResult
): Promise<void> {
  // Store metrics for monitoring and optimization
  await ctx.runMutation(internal.ai.metrics.storeCrewMetrics, {
    organizationId,
    crewId: result.crewId,
    sessionId: result.sessionId,
    metrics: {
      ...result.metrics,
      timestamp: Date.now(),
      productCount: result.products.length,
      successRate: result.products.filter(p => !p.error).length / result.products.length,
    },
  });
}

function getCostPer1KTokens(provider: string, model: string): number {
  // Approximate costs per 1K tokens (input + output averaged)
  const costs: Record<string, Record<string, number>> = {
    openai: {
      'gpt-4o': 0.0075,
      'gpt-4o-mini': 0.00015,
      'gpt-4-turbo-preview': 0.015,
      'gpt-4': 0.045,
      'gpt-3.5-turbo': 0.0015,
    },
    anthropic: {
      'claude-3-5-sonnet-20241022': 0.009,
      'claude-3-5-haiku-20241022': 0.0024,
      'claude-3-opus-20240229': 0.0225,
      'claude-3-sonnet-20240229': 0.009,
      'claude-3-haiku-20240307': 0.00075,
    },
    gemini: {
      'gemini-1.5-flash': 0.00035,
      'gemini-1.5-pro': 0.00175,
      'gemini-1.0-pro': 0.0005,
    },
  };
  
  return costs[provider]?.[model] || 0.01; // Default fallback
}