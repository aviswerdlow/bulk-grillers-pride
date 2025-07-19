# AI Categorization Quick Win Optimizations

## 1. Batch Progress Update Optimization (1 hour implementation)

### Current Problem
- Database write after EVERY batch (10 products)
- Growing document size with accumulated results
- Unnecessary network overhead

### Solution
```typescript
// In convex/functions/ai/categorization.ts - processCategorizationJob

// Add these constants at the top
const PROGRESS_UPDATE_FREQUENCY = 5; // Update every 5 batches
const PROGRESS_UPDATE_TIME_MS = 5000; // Or every 5 seconds

// Add state tracking
let pendingResults: any[] = [];
let lastProgressUpdate = Date.now();
let batchesSinceUpdate = 0;

// Replace the current update logic (around line 440)
// Instead of updating after every batch:
const shouldUpdateProgress = 
  batchesSinceUpdate >= PROGRESS_UPDATE_FREQUENCY ||
  Date.now() - lastProgressUpdate >= PROGRESS_UPDATE_TIME_MS ||
  i + batchSize >= products.length; // Always update on last batch

if (shouldUpdateProgress) {
  await ctx.runMutation(internal.functions.ai.categorization.updateJobProgressInternal, {
    jobId,
    progress: {
      total: products.length,
      processed: totalProcessed,
      successful: totalSuccessful,
      failed: totalFailed,
      skipped: totalSkipped,
    },
    results: pendingResults,
  });
  
  pendingResults = [];
  lastProgressUpdate = Date.now();
  batchesSinceUpdate = 0;
} else {
  pendingResults.push(...batchResults);
  batchesSinceUpdate++;
}
```

### Expected Impact
- 80% reduction in database writes
- Faster batch processing
- Lower Convex bandwidth usage

## 2. Smart Batch Size Configuration (30 minutes)

### Current Problem
- Fixed batch size of 10 for all providers
- Not optimized for different model capabilities
- Suboptimal API usage

### Solution
```typescript
// In convex/functions/ai/categorization.ts

// Add provider-specific batch size configuration
const OPTIMAL_BATCH_SIZES: Record<string, number> = {
  'openai:o3-mini': 8,
  'openai:o3': 5,
  'anthropic:claude-opus-4': 15,
  'anthropic:claude-sonnet-4': 20,
  'gemini:gemini-1.5-flash': 25,
  'gemini:gemini-1.5-pro': 15,
};

// Update batch size selection (line 337)
const batchSize = OPTIMAL_BATCH_SIZES[`${job.aiProvider}:${job.aiModel}`] || 
                  job.batchSize || 
                  10;

// Also update the default in createCategorizationJob (line 188)
batchSize: args.batchSize || 
           OPTIMAL_BATCH_SIZES[`${args.aiProvider}:${args.aiModel}`] ||
           aiSettings.categorization.batchSize,
```

### Expected Impact
- 30-50% fewer API calls
- Better token utilization
- Faster overall processing

## 3. Category Context Optimization (45 minutes)

### Current Problem
- Sends ALL categories for every batch
- Massive token waste for large category trees
- Irrelevant categories increase noise

### Solution
```typescript
// In convex/functions/ai/langchain.ts

// Add smart category filtering
export function filterRelevantCategories(
  categories: CategoryContext[],
  products: Doc<'products'>[],
  maxCategories: number = 30
): CategoryContext[] {
  // Extract keywords from products
  const keywords = new Set<string>();
  
  products.forEach(product => {
    // Add product type
    if (product.productType) {
      keywords.add(product.productType.toLowerCase());
    }
    
    // Add tags
    product.tags.forEach(tag => keywords.add(tag.toLowerCase()));
    
    // Extract key words from title (simple approach)
    const titleWords = product.title.toLowerCase().split(/\s+/);
    titleWords.forEach(word => {
      if (word.length > 3) { // Skip short words
        keywords.add(word);
      }
    });
    
    // Add vendor
    if (product.vendor) {
      keywords.add(product.vendor.toLowerCase());
    }
  });
  
  // Score categories by relevance
  const scoredCategories = categories.map(cat => {
    let score = 0;
    
    // Check category name
    const catWords = cat.name.toLowerCase().split(/\s+/);
    catWords.forEach(word => {
      if (keywords.has(word)) score += 3;
    });
    
    // Check handle
    if (keywords.has(cat.handle.toLowerCase())) score += 2;
    
    // Check path segments
    const pathSegments = cat.path.split('/').filter(Boolean);
    pathSegments.forEach(segment => {
      if (keywords.has(segment.toLowerCase())) score += 1;
    });
    
    // Check description
    if (cat.description) {
      const descWords = cat.description.toLowerCase().split(/\s+/);
      descWords.forEach(word => {
        if (keywords.has(word) && word.length > 3) score += 0.5;
      });
    }
    
    return { category: cat, score };
  });
  
  // Sort by score and return top N
  return scoredCategories
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCategories)
    .map(item => item.category);
}

// Update formatCategoriesForPrompt to use filtered categories
export function formatCategoriesForPrompt(
  categories: CategoryContext[],
  products?: Doc<'products'>[]
): string {
  // If products provided, filter categories
  const relevantCategories = products 
    ? filterRelevantCategories(categories, products)
    : categories;
    
  // ... rest of existing formatting logic
}

// Update processBatchWithLangChain to pass products
const input = {
  products: formatProductsForPrompt(products),
  categories: formatCategoriesForPrompt(categories, products), // Pass products
  custom_prompt: customPrompt || 'Focus on accuracy and provide detailed rationale.',
  format_instructions: parser.getFormatInstructions(),
};
```

### Expected Impact
- 50-70% reduction in category context tokens
- More relevant suggestions
- Lower API costs

## 4. Remove Artificial Rate Limiting (15 minutes)

### Current Problem
- Hardcoded 1-second delay between batches
- Unnecessary for providers with high rate limits
- Significantly slows down large jobs

### Solution
```typescript
// In convex/functions/ai/categorization.ts

// Replace the fixed delay (line 456-461) with dynamic rate limiting
const PROVIDER_RATE_LIMITS: Record<string, number> = {
  'openai': 200,      // 200ms between batches
  'anthropic': 100,   // 100ms between batches  
  'gemini': 50,       // 50ms between batches (very high limits)
};

// Update the rate limiting logic
const minBatchTime = PROVIDER_RATE_LIMITS[job.aiProvider] || 500;
if (batchDuration < minBatchTime && i + batchSize < products.length) {
  await new Promise((resolve) => setTimeout(resolve, minBatchTime - batchDuration));
}
```

### Expected Impact
- 5-20x faster processing for Gemini
- 5x faster for Anthropic
- 2.5x faster for OpenAI

## 5. Add Performance Metrics (30 minutes)

### Current Problem
- No visibility into actual performance
- Can't identify bottlenecks
- No data for optimization decisions

### Solution
```typescript
// In convex/functions/ai/categorization.ts

// Add performance tracking
interface JobMetrics {
  totalDuration: number;
  apiCallDuration: number;
  databaseDuration: number;
  avgBatchDuration: number;
  avgTokensPerProduct: number;
  cacheHitRate: number;
}

// Track metrics during processing
const metrics: JobMetrics = {
  totalDuration: 0,
  apiCallDuration: 0,
  databaseDuration: 0,
  avgBatchDuration: 0,
  avgTokensPerProduct: 0,
  cacheHitRate: totalSkipped / products.length,
};

// Add timing around key operations
const dbStart = Date.now();
const products = await ctx.runQuery(...);
metrics.databaseDuration += Date.now() - dbStart;

// Store metrics with job completion
await ctx.runMutation(internal.functions.ai.categorization.completeJobInternal, {
  jobId,
  status: 'completed',
  completedAt: Date.now(),
  executionTime,
  metadata: { metrics }, // Add metrics here
});
```

### Expected Impact
- Visibility into performance bottlenecks
- Data-driven optimization decisions
- Ability to track improvements

## Implementation Checklist

- [ ] 1. Implement batch progress updates (est. 1 hour)
- [ ] 2. Add smart batch sizing (est. 30 mins)
- [ ] 3. Implement category filtering (est. 45 mins)
- [ ] 4. Update rate limiting (est. 15 mins)
- [ ] 5. Add performance metrics (est. 30 mins)

**Total estimated time: 3-4 hours**

## Testing Plan

1. **Unit Tests**
   - Test category filtering logic
   - Test batch size selection
   - Test progress update batching

2. **Integration Tests**
   - Run small job (10 products)
   - Run medium job (100 products)
   - Run large job (1000 products)
   - Compare metrics before/after

3. **Performance Validation**
   - Measure API call reduction
   - Track token usage decrease
   - Verify cost savings
   - Monitor user experience improvements

## Rollout Strategy

1. **Phase 1**: Deploy to development environment
2. **Phase 2**: Test with small subset of users
3. **Phase 3**: Monitor metrics for 24 hours
4. **Phase 4**: Full production rollout

## Expected Results

After implementing these quick wins:
- **50-70% faster** job completion times
- **40-60% lower** API costs
- **Better user experience** with smoother progress updates
- **Actionable metrics** for future optimizations

These optimizations require minimal code changes but deliver significant performance improvements.