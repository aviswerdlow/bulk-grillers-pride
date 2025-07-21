/**
 * LangChain to CrewAI Adapter
 * 
 * This adapter maintains backwards compatibility with the existing LangChain API
 * while using CrewAI for the underlying implementation. It handles:
 * - Request transformation from LangChain format to CrewAI format
 * - Response transformation from CrewAI format back to LangChain format
 * - Error mapping between the two systems
 * - Caching and performance optimization
 */

import { v } from "convex/values";
import { Doc, Id } from "../../_generated/dataModel";
import { ActionCtx, internalAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import {
  CategoryContext,
  AIProvider,
  BatchCategorizationResultSchema,
  ProductCategorizationResultSchema,
  ProductCategorizationErrorSchema,
  ProductCategorizationCache,
  generateCacheKey,
  estimateTokenCount,
  estimateCost,
} from "./langchain";
import {
  ConcurrentProcessingResult,
  AnalyzerResult,
  MatcherResult,
  ValidatorResult,
} from "./crews/types";
import { z } from "zod";
import { ConvexError } from "convex/values";

type ProcessingOptions = {
  maxRetries?: number;
  batchSize?: number;
  temperature?: number;
  maxTokens?: number;
};

type BatchCategorizationResult = z.infer<typeof BatchCategorizationResultSchema>;
type ProductCategorizationResult = z.infer<typeof ProductCategorizationResultSchema>;
type ProductCategorizationError = z.infer<typeof ProductCategorizationErrorSchema>;

export class LangChainToCrewAIAdapter {
  private cache: ProductCategorizationCache;
  
  constructor(cache?: ProductCategorizationCache) {
    this.cache = cache || new ProductCategorizationCache();
  }

  /**
   * Main entry point that maintains the LangChain API contract
   * while using CrewAI under the hood
   */
  async processBatchWithLangChain(
    ctx: ActionCtx,
    products: Doc<'products'>[],
    categories: CategoryContext[],
    customPrompt: string,
    provider: AIProvider,
    apiKey: string,
    model: string,
    options?: ProcessingOptions
  ): Promise<BatchCategorizationResult> {
    console.log(`🔄 [ADAPTER] Starting LangChain to CrewAI adaptation for ${products.length} products`);
    
    try {
      // Step 1: Transform LangChain request to CrewAI format
      const crewRequest = await this.transformToCrewAIRequest(
        ctx,
        products,
        categories,
        customPrompt,
        provider,
        model,
        options
      );
      
      // Step 2: Check cache for already processed products
      const { cachedResults, uncachedProducts } = this.checkCache(products);
      
      if (uncachedProducts.length === 0) {
        console.log(`✅ [ADAPTER] All ${products.length} products found in cache`);
        return cachedResults;
      }
      
      console.log(`📊 [ADAPTER] Processing ${uncachedProducts.length} uncached products, ${cachedResults.length} from cache`);
      
      // Step 3: Execute CrewAI workflow for uncached products
      const crewResponse = await this.executeCrewAI(ctx, crewRequest, uncachedProducts);
      
      // Step 4: Transform CrewAI response back to LangChain format
      const transformedResults = await this.transformToLangChainResponse(
        crewResponse,
        uncachedProducts,
        categories
      );
      
      // Step 5: Update cache with new results
      this.updateCache(transformedResults);
      
      // Step 6: Combine cached and new results
      const finalResults = [...cachedResults, ...transformedResults];
      
      // Step 7: Validate results match input products
      return this.validateAndFinalizeResults(finalResults, products);
      
    } catch (error) {
      console.error(`❌ [ADAPTER] Error in LangChain to CrewAI adaptation:`, error);
      
      // Return error results for all products if processing fails
      return this.createErrorResultsForAllProducts(products, error);
    }
  }

  /**
   * Transform LangChain request format to CrewAI format
   */
  private async transformToCrewAIRequest(
    ctx: ActionCtx,
    products: Doc<'products'>[],
    categories: CategoryContext[],
    customPrompt: string,
    provider: AIProvider,
    model: string,
    options?: ProcessingOptions
  ) {
    console.log(`🔄 [ADAPTER] Transforming request to CrewAI format`);
    
    // Get organization ID from the first product
    const firstProduct = products[0];
    const organizationId = firstProduct.organizationId;
    
    // Map category contexts to category IDs
    const categoryIds = categories.map(cat => cat.id as Id<'categories'>);
    
    // Build CrewAI options from LangChain options
    const crewOptions = {
      provider: provider,
      model: model,
      temperature: options?.temperature || 0.7,
      maxConcurrentTasks: Math.min(products.length, 10), // Limit concurrent tasks
      timeout: 300000, // 5 minutes
      verbose: false,
      customPrompt: customPrompt, // Pass through for agent instructions
    };
    
    return {
      organizationId,
      productIds: products.map(p => p._id),
      categoryIds,
      options: crewOptions,
    };
  }

  /**
   * Check cache for already processed products
   */
  private checkCache(products: Doc<'products'>[]) {
    const cachedResults: BatchCategorizationResult = [];
    const uncachedProducts: Doc<'products'>[] = [];
    
    for (const product of products) {
      const cacheKey = generateCacheKey(product);
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult) {
        // Update productId to match current product
        cachedResults.push({
          ...cachedResult,
          productId: product._id,
        });
      } else {
        uncachedProducts.push(product);
      }
    }
    
    return { cachedResults, uncachedProducts };
  }

  /**
   * Execute CrewAI processing
   */
  private async executeCrewAI(
    ctx: ActionCtx,
    crewRequest: any,
    products: Doc<'products'>[]
  ): Promise<ConcurrentProcessingResult> {
    console.log(`🚀 [ADAPTER] Executing CrewAI processing`);
    
    try {
      // Call the CrewAI internal action
      const result = await ctx.runAction(internal.functions.ai.crews.crewManager.processBatchWithCrewAI, crewRequest);
      
      // The result from the action needs to be mapped to ConcurrentProcessingResult
      return {
        crewId: result.crewId,
        sessionId: result.sessionId,
        products: products.map(product => {
          // Find the result for this product
          const productResult = result.products?.find((p: any) => p.productId === product._id);
          
          return {
            productId: product._id,
            analysisResult: productResult?.analysisResult,
            matchingResult: productResult?.matchingResult,
            validationResult: productResult?.validationResult,
            error: productResult?.error,
            processingTime: productResult?.processingTime || 0,
          };
        }),
        totalProcessingTime: result.metrics?.averageTaskDuration || 0,
        metrics: result.metrics,
      };
    } catch (error) {
      console.error(`❌ [ADAPTER] CrewAI execution failed:`, error);
      throw error;
    }
  }

  /**
   * Transform CrewAI response back to LangChain format
   */
  private async transformToLangChainResponse(
    crewResponse: ConcurrentProcessingResult,
    products: Doc<'products'>[],
    categories: CategoryContext[]
  ): Promise<BatchCategorizationResult> {
    console.log(`🔄 [ADAPTER] Transforming CrewAI response to LangChain format`);
    
    const results: BatchCategorizationResult = [];
    
    for (const productResult of crewResponse.products) {
      const product = products.find(p => p._id === productResult.productId);
      if (!product) continue;
      
      if (productResult.error) {
        // Handle error case
        results.push({
          productId: product._id,
          suggestions: [] as never[],
          newCategorySuggestions: [] as never[],
          status: 'error' as const,
          error: productResult.error,
        });
      } else {
        // Transform successful result
        const langchainResult = this.transformSingleResult(
          product,
          productResult,
          categories
        );
        results.push(langchainResult);
      }
    }
    
    return results;
  }

  /**
   * Transform a single CrewAI result to LangChain format
   */
  private transformSingleResult(
    product: Doc<'products'>,
    crewResult: ConcurrentProcessingResult['products'][0],
    categories: CategoryContext[]
  ): ProductCategorizationResult | ProductCategorizationError {
    try {
      const matcherResult = crewResult.matchingResult as MatcherResult;
      const analyzerResult = crewResult.analysisResult as AnalyzerResult;
      const validatorResult = crewResult.validationResult as ValidatorResult;
      
      // Map CrewAI suggestions to LangChain format
      const suggestions = matcherResult?.suggestedCategories?.map(suggestion => ({
        categoryId: suggestion.categoryId,
        confidence: suggestion.confidence,
        rationale: suggestion.reasoning,
      })) || [];
      
      // Extract new category suggestions
      const newCategorySuggestions = matcherResult?.newCategoryRecommendations?.map(name => ({
        name,
        parentCategoryId: undefined,
        rationale: `Suggested based on product analysis`,
      })) || [];
      
      // Extract key features from analyzer
      const keyFeatures = analyzerResult?.features || [];
      
      // Infer product type from analyzer characteristics
      const productType = analyzerResult?.characteristics?.type || 
                         analyzerResult?.characteristics?.category ||
                         product.productType;
      
      return {
        productId: product._id,
        suggestions: suggestions.slice(0, 3), // Limit to top 3
        newCategorySuggestions,
        keyFeatures,
        productType,
        status: 'success' as const,
      };
    } catch (error) {
      console.error(`❌ [ADAPTER] Error transforming single result:`, error);
      return {
        productId: product._id,
        suggestions: [] as never[],
        newCategorySuggestions: [] as never[],
        status: 'error' as const,
        error: `Failed to transform result: ${error.message}`,
      };
    }
  }

  /**
   * Update cache with new results
   */
  private updateCache(results: BatchCategorizationResult) {
    for (const result of results) {
      if (result.status === 'success') {
        // Generate cache key would need the original product, 
        // but for now we'll skip caching in the adapter
        // The main categorization.ts already handles caching
      }
    }
  }

  /**
   * Validate results match input products and add missing ones
   */
  private validateAndFinalizeResults(
    results: BatchCategorizationResult,
    originalProducts: Doc<'products'>[]
  ): BatchCategorizationResult {
    const resultProductIds = new Set(results.map(r => r.productId));
    const missingProducts = originalProducts.filter(p => !resultProductIds.has(p._id));
    
    // Add error results for any missing products
    const missingResults: ProductCategorizationError[] = missingProducts.map(p => ({
      productId: p._id,
      suggestions: [] as never[],
      newCategorySuggestions: [] as never[],
      status: 'error' as const,
      error: 'Product was not processed by CrewAI',
    }));
    
    return [...results, ...missingResults];
  }

  /**
   * Create error results for all products when processing fails
   */
  private createErrorResultsForAllProducts(
    products: Doc<'products'>[],
    error: any
  ): BatchCategorizationResult {
    return products.map(product => ({
      productId: product._id,
      suggestions: [] as never[],
      newCategorySuggestions: [] as never[],
      status: 'error' as const,
      error: error?.message || 'Failed to process with CrewAI',
    }));
  }

  /**
   * Estimate costs for CrewAI processing (for compatibility)
   */
  async estimateProcessingCost(
    products: Doc<'products'>[],
    categories: CategoryContext[],
    provider: AIProvider,
    model: string
  ): Promise<{ inputCost: number; outputCost: number; totalCost: number }> {
    // Estimate tokens based on product and category data
    let inputTokens = 0;
    let outputTokens = 0;
    
    // Input tokens: products + categories + prompts
    for (const product of products) {
      inputTokens += estimateTokenCount(product.title + (product.description || ''));
    }
    for (const category of categories) {
      inputTokens += estimateTokenCount(category.name + category.path);
    }
    
    // Add prompt overhead (agents, instructions, etc.)
    inputTokens += 2000; // Estimated overhead for CrewAI agents
    
    // Output tokens: estimated based on product count
    outputTokens = products.length * 150; // ~150 tokens per product result
    
    return estimateCost(provider, model, inputTokens, outputTokens);
  }
}

// Export a singleton instance for backwards compatibility
export const langchainToCrewAIAdapter = new LangChainToCrewAIAdapter();