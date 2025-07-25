# ADR-002: AI Processing Optimization

**Date**: July 19, 2025  
**Status**: Proposed  
**Author**: Systems Design Agent

## Context

The current AI categorization system processes products sequentially with forced delays between batches, resulting in poor performance at scale. Processing 1000 products takes approximately 17 minutes due to:

- Sequential batch processing with 1-second delays
- Fetching all categories for every batch without caching
- Multiple authentication queries per operation
- Database updates after each small batch

This creates a significant bottleneck for users with large product catalogs and limits system scalability.

## Decision

Implement an event-driven, parallel AI processing architecture with the following components:

### 1. Queue-Based Processing
```typescript
interface AIProcessingQueue {
  queue: "Convex scheduled functions";
  concurrency: 5; // Parallel workers
  batchSize: 100; // Products per batch
  rateLimit: "10 requests/second to AI provider";
}
```

### 2. Intelligent Caching
```typescript
interface CachingStrategy {
  categoryCache: {
    storage: "In-memory with Redis fallback";
    ttl: "1 hour";
    invalidation: "On category CRUD operations";
  };
  authCache: {
    storage: "Request-scoped";
    ttl: "Duration of job";
  };
}
```

### 3. Batch Optimization
```typescript
interface BatchStrategy {
  preparation: "Pre-fetch all required data";
  processing: "Parallel AI API calls with rate limiting";
  updates: "Single bulk database write per batch";
  monitoring: "Real-time progress updates via WebSocket";
}
```

## Consequences

### Positive
- **10x Performance Improvement**: 1000 products in ~2 minutes vs 17 minutes
- **Better Resource Utilization**: Parallel processing with controlled concurrency
- **Improved User Experience**: Real-time progress updates and faster completion
- **Cost Optimization**: Reduced database operations and API calls
- **Scalability**: Can handle larger product catalogs efficiently

### Negative
- **Increased Complexity**: Queue management and worker coordination
- **Monitoring Requirements**: Need robust monitoring for distributed processing
- **Error Handling**: More complex error recovery with parallel operations
- **Initial Development Effort**: 2-3 weeks to implement and test

## Implementation Plan

### Phase 1: Queue Infrastructure (Week 1)
1. Implement job queue using Convex scheduled functions
2. Create worker pool management
3. Add rate limiting for AI provider APIs
4. Implement job status tracking

### Phase 2: Caching Layer (Week 2)
1. Implement category caching with Redis
2. Add request-scoped auth caching
3. Create cache invalidation strategies
4. Add cache metrics and monitoring

### Phase 3: Batch Optimization (Week 3)
1. Refactor batch processing logic
2. Implement bulk database updates
3. Add progress tracking via WebSocket
4. Optimize error handling and retry logic

## Alternatives Considered

### 1. Incremental Optimization
Keep current architecture but remove delays and add basic caching.
- **Pros**: Simpler to implement
- **Cons**: Limited performance gains, doesn't address core issues

### 2. External Processing Service
Move AI processing to separate microservice.
- **Pros**: Complete isolation, independent scaling
- **Cons**: Higher complexity, additional infrastructure

### 3. Client-Side Processing
Process in browser with Web Workers.
- **Pros**: Offload server resources
- **Cons**: Poor UX, browser limitations, security concerns

## Technical Details

### Queue Implementation
```typescript
// Job queue schema
interface AICategorizationJob {
  id: string;
  organizationId: string;
  productIds: string[];
  status: "pending" | "processing" | "completed" | "failed";
  progress: {
    total: number;
    processed: number;
    failed: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Worker implementation
async function processAIJob(job: AICategorizationJob) {
  const batches = chunk(job.productIds, BATCH_SIZE);
  const results = await Promise.all(
    batches.map(batch => processBatchWithRateLimit(batch))
  );
  await bulkUpdateProducts(results);
}
```

### Caching Implementation
```typescript
class CategoryCache {
  private cache: Map<string, Category[]>;
  private redis: RedisClient;
  
  async getCategories(organizationId: string): Promise<Category[]> {
    // Check in-memory cache first
    if (this.cache.has(organizationId)) {
      return this.cache.get(organizationId);
    }
    
    // Check Redis
    const cached = await this.redis.get(`categories:${organizationId}`);
    if (cached) {
      const categories = JSON.parse(cached);
      this.cache.set(organizationId, categories);
      return categories;
    }
    
    // Fetch from database
    const categories = await fetchCategoriesFromDB(organizationId);
    await this.redis.setex(
      `categories:${organizationId}`, 
      3600, 
      JSON.stringify(categories)
    );
    this.cache.set(organizationId, categories);
    return categories;
  }
}
```

## Monitoring and Success Metrics

### Key Metrics
- Job completion time (target: < 2 minutes for 1000 products)
- Queue depth (target: < 100 pending jobs)
- Error rate (target: < 1%)
- Cache hit rate (target: > 90%)
- API rate limit utilization (target: 80-90%)

### Monitoring Dashboard
- Real-time job status
- Performance trends
- Error tracking
- Resource utilization

## References
- [Convex Scheduled Functions Documentation](https://docs.convex.dev/scheduling/scheduled-functions)
- [Redis Caching Best Practices](https://redis.io/docs/manual/patterns/)
- [Queue-Based Load Leveling Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)