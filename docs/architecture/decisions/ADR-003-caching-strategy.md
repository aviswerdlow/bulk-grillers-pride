# ADR-003: Multi-Layer Caching Strategy

**Date**: July 19, 2025  
**Status**: Proposed  
**Author**: Systems Design Agent

## Context

The Bulk Grillers Pride application currently relies solely on Convex's built-in query caching, which provides limited control over cache invalidation and TTL. As the system scales, we're observing:

- Repeated fetching of static data (categories, organization settings)
- High database load from frequent queries
- Slow response times for complex aggregations
- Unnecessary re-computation of expensive operations

A comprehensive caching strategy is needed to improve performance and reduce infrastructure costs.

## Decision

Implement a multi-layer caching architecture with appropriate cache strategies for different data types:

### Cache Architecture

```
┌─────────────────┐
│ Browser Cache   │ Layer 1: Static assets, API responses
├─────────────────┤
│ CDN Cache       │ Layer 2: Edge caching for global distribution
├─────────────────┤
│ Redis Cache     │ Layer 3: Application data cache
├─────────────────┤
│ Convex Cache    │ Layer 4: Query result cache
└─────────────────┘
```

### Cache Strategy by Data Type

```typescript
interface CacheStrategy {
  // Frequently accessed, rarely changed
  staticData: {
    categories: { ttl: "1 hour", invalidateOn: ["category.write"] };
    organizationSettings: { ttl: "30 minutes", invalidateOn: ["settings.update"] };
    aiProviderConfigs: { ttl: "10 minutes", invalidateOn: ["config.change"] };
  };
  
  // User-specific data
  userData: {
    permissions: { ttl: "5 minutes", invalidateOn: ["membership.change"] };
    preferences: { ttl: "15 minutes", invalidateOn: ["preference.update"] };
  };
  
  // Computed/aggregated data
  computedData: {
    productCounts: { ttl: "5 minutes", invalidateOn: ["product.write"] };
    categoryTrees: { ttl: "30 minutes", invalidateOn: ["category.write"] };
    dashboardStats: { ttl: "1 minute", refreshInterval: "30 seconds" };
  };
  
  // Search and filter results
  searchResults: {
    productSearch: { ttl: "2 minutes", maxSize: "100 results" };
    categoryFilter: { ttl: "5 minutes", keyBy: ["org", "filters"] };
  };
}
```

## Implementation Details

### 1. Redis Integration

```typescript
// Redis cache service
class CacheService {
  private redis: RedisClient;
  private keyPrefix = "bgp:";
  
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.keyPrefix + key);
    return data ? JSON.parse(data) : null;
  }
  
  async set<T>(
    key: string, 
    value: T, 
    ttlSeconds: number
  ): Promise<void> {
    await this.redis.setex(
      this.keyPrefix + key,
      ttlSeconds,
      JSON.stringify(value)
    );
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(this.keyPrefix + pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 2. Cache-Aside Pattern Implementation

```typescript
// Generic cache-aside helper
async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch from source
  const data = await fetchFn();
  
  // Cache for next time
  await cache.set(key, data, ttl);
  
  return data;
}

// Usage example
const categories = await withCache(
  `categories:${organizationId}`,
  3600, // 1 hour
  () => ctx.db.query("categories")
    .withIndex("by_organization", q => q.eq("organizationId", organizationId))
    .collect()
);
```

### 3. Cache Invalidation Strategy

```typescript
// Event-driven invalidation
class CacheInvalidator {
  private rules: InvalidationRule[] = [
    {
      event: "category.created",
      invalidate: ["categories:*", "categoryTree:*"]
    },
    {
      event: "product.updated", 
      invalidate: ["productCounts:*", "search:products:*"]
    },
    {
      event: "membership.changed",
      invalidate: ["permissions:${userId}:*"]
    }
  ];
  
  async handleEvent(event: string, context: any) {
    const rules = this.rules.filter(r => r.event === event);
    for (const rule of rules) {
      const patterns = rule.invalidate.map(p => 
        this.interpolate(p, context)
      );
      await Promise.all(
        patterns.map(pattern => cache.invalidate(pattern))
      );
    }
  }
}
```

### 4. Browser Caching Strategy

```typescript
// API response caching headers
export function setCacheHeaders(
  response: Response, 
  cacheStrategy: CacheStrategy
) {
  const { maxAge, sMaxAge, staleWhileRevalidate } = cacheStrategy;
  
  response.headers.set(
    "Cache-Control",
    `max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  
  // Add ETag for conditional requests
  const etag = generateETag(response.body);
  response.headers.set("ETag", etag);
}
```

## Consequences

### Positive
- **50-70% Reduction in Database Load**: Cached queries reduce database hits
- **3-5x Faster Response Times**: Serving from cache vs computing
- **Better User Experience**: Snappier UI with instant data
- **Cost Reduction**: Lower database and compute costs
- **Scalability**: Can handle more users with same infrastructure

### Negative
- **Increased Complexity**: Cache invalidation logic and debugging
- **Additional Infrastructure**: Redis cluster management
- **Consistency Challenges**: Potential for stale data
- **Memory Overhead**: Additional memory requirements for caching
- **Development Effort**: 3-4 weeks to implement comprehensively

## Monitoring and Metrics

### Key Metrics
```typescript
interface CacheMetrics {
  hitRate: "Target > 80%";
  missRate: "Target < 20%";
  evictionRate: "Monitor for memory pressure";
  latency: {
    redis: "Target < 5ms";
    cdn: "Target < 50ms";
  };
  memoryUsage: "Target < 80% of allocated";
  invalidationLag: "Target < 100ms";
}
```

### Monitoring Dashboard
- Cache hit/miss rates by data type
- Response time improvements
- Memory usage trends
- Invalidation event tracking
- Cost savings analysis

## Alternatives Considered

### 1. Convex-Only Caching
Rely solely on Convex's built-in caching.
- **Pros**: No additional infrastructure
- **Cons**: Limited control, no cross-query caching

### 2. In-Memory Application Cache
Use Node.js process memory for caching.
- **Pros**: Fastest access, no network overhead
- **Cons**: Not shared across instances, memory limits

### 3. Database Materialized Views
Pre-compute and store aggregations in database.
- **Pros**: Consistency guaranteed
- **Cons**: Storage overhead, update complexity

## Migration Plan

### Phase 1: Redis Setup (Week 1)
1. Deploy Redis cluster
2. Implement cache service
3. Add monitoring and metrics
4. Test failover scenarios

### Phase 2: Static Data Caching (Week 2)
1. Cache categories and settings
2. Implement invalidation rules
3. Monitor hit rates
4. Optimize TTLs based on data

### Phase 3: Dynamic Data Caching (Week 3)
1. Add search result caching
2. Cache computed aggregations
3. Implement cache warming
4. Add cache debugging tools

### Phase 4: Edge Caching (Week 4)
1. Configure CDN caching rules
2. Implement cache headers
3. Add cache purge API
4. Monitor global performance

## Security Considerations

1. **Cache Key Design**: Include tenant ID to prevent cross-tenant data leaks
2. **Encryption**: Encrypt sensitive data in Redis
3. **Access Control**: Restrict Redis access to application only
4. **PII Handling**: Don't cache personally identifiable information
5. **Audit Trail**: Log cache access for sensitive data

## References
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Cache-Aside Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Web Caching Best Practices](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)