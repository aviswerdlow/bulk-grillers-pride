# Multi-Layer Caching Implementation Guide

## Overview

This document provides implementation details for issue #68: Multi-Layer Caching Strategy. The caching system is designed to achieve 50-70% database load reduction and 3-5x faster response times.

## Architecture

```
┌─────────────────┐
│ Browser Cache   │ Layer 1: HTTP headers, ETag support
├─────────────────┤
│ CDN Cache       │ Layer 2: Edge caching (future)
├─────────────────┤
│ Convex Cache    │ Layer 3: Application data cache
├─────────────────┤
│ Database        │ Layer 4: Source of truth
└─────────────────┘
```

## Implementation Status

### ✅ Completed Components

1. **Cache Schema**
   - Added `cache` table to `/convex/schema.ts`
   - Indexes for efficient queries by key, expiry, organization, and type
   - Automatic TTL management and access statistics

2. **Cache Infrastructure** (`/convex/functions/cache/`)
   - **config.ts**: TTL settings, cache key generation, warming configuration
   - **service.ts**: Core cache operations (get, set, invalidate, stats)
   - **patterns.ts**: Cache-aside pattern implementation with helpers
   - **invalidation.ts**: Event-driven cache invalidation rules
   - **examples.ts**: Integration examples for common use cases
   - **index.ts**: Module exports and documentation

3. **Cache Features**
   - Automatic TTL management based on data type
   - Event-driven invalidation with pattern matching
   - Performance monitoring integration
   - Cache warming capabilities
   - Statistics and monitoring

## Integration Guide

### Step 1: Basic Cache Integration

```typescript
import { withCache, getCachedCategories } from '../cache';

// Simple caching for a query
export const listCategories = query({
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    
    // Use pre-built helper
    return getCachedCategories(ctx, organizationId, args.projectId);
  }
});
```

### Step 2: Custom Cache Configuration

```typescript
// Cache with custom TTL and key
const result = await withCache(
  ctx,
  'productSearch',  // data type from config
  ['search', query, JSON.stringify(filters)], // cache key parts
  async () => {
    // Your expensive operation here
    return await searchProducts(ctx, query, filters);
  },
  { 
    organizationId,
    ttl: 120, // Override default TTL (2 minutes)
    force: false // Set true to bypass cache
  }
);
```

### Step 3: Add Cache Invalidation to Mutations

```typescript
import { createInvalidationHook } from '../cache';

export const updateProduct = mutation({
  handler: async (ctx, args) => {
    // Update product
    await ctx.db.patch(args.productId, updates);
    
    // Trigger cache invalidation
    await createInvalidationHook('product.updated')(ctx, {
      organizationId,
      productId: args.productId,
      projectId: product.projectId
    });
    
    return { success: true };
  }
});
```

### Step 4: Monitor Cache Performance

```typescript
// Get cache statistics
const stats = await ctx.runQuery(internal.cache.service.getStats, {
  organizationId
});

console.log(`Cache hit rate: ${stats.avgHitsPerEntry}`);
console.log(`Cache size: ${stats.sizeInMB} MB`);
```

## Cache Configuration Reference

### Data Types and TTLs

| Data Type | TTL | Invalidation Events |
|-----------|-----|-------------------|
| categories | 1 hour | category.created/updated/deleted |
| organizationSettings | 30 min | settings.updated |
| productCounts | 5 min | product.created/deleted/restored |
| productSearch | 2 min | product.created/updated/deleted |
| dashboardStats | 1 min | multiple events |
| aiSuggestions | 1 hour | product.updated, category.changed |

### Cache Key Patterns

```
org:{orgId}:categories:all
org:{orgId}:project:{projectId}:products:count
org:{orgId}:search:products:{query}:{filters}
user:{userId}:org:{orgId}:permissions
```

## Best Practices

### 1. Cache Key Design
- Include organization/project IDs for tenant isolation
- Use consistent naming patterns
- Include relevant parameters in key

### 2. TTL Selection
- Static data: 30-60 minutes
- User data: 5-15 minutes  
- Search results: 1-2 minutes
- Real-time data: 30-60 seconds

### 3. Invalidation Strategy
- Use event hooks for automatic invalidation
- Invalidate related caches together
- Consider using patterns for bulk invalidation

### 4. Performance Monitoring
- Track cache hit rates (target >80%)
- Monitor cache size and evictions
- Measure response time improvements

## Implementation Priorities

### Phase 1: Core Queries (Week 1)
1. ✅ Categories and category trees
2. ✅ Organization settings
3. ✅ Product counts and stats
4. ⏳ Dashboard queries
5. ⏳ Search results

### Phase 2: Extended Coverage (Week 2)
1. User permissions and preferences
2. AI categorization results
3. Activity logs
4. Trash queries

### Phase 3: Optimization (Week 3)
1. Cache warming on startup
2. Predictive cache warming
3. Browser cache headers
4. CDN integration

### Phase 4: Advanced Features (Week 4)
1. Redis integration (if needed)
2. Distributed cache invalidation
3. Cache analytics dashboard
4. Performance reporting

## Migration Checklist

For each existing query:

- [ ] Identify cache strategy (TTL, invalidation events)
- [ ] Wrap with `withCache` or use helper functions
- [ ] Add invalidation hooks to related mutations
- [ ] Test cache hit/miss scenarios
- [ ] Monitor performance improvements

## Expected Results

### Performance Improvements
- **Database Load**: 50-70% reduction
- **Response Times**: 3-5x faster for cached data
- **User Experience**: Instant data loading
- **Cost Savings**: Lower database costs

### Metrics to Track
1. Cache hit rate (target >80%)
2. Average response time reduction
3. Database query reduction
4. Memory usage and eviction rate

## Troubleshooting

### Common Issues

1. **Low Cache Hit Rate**
   - Check TTL settings (too short?)
   - Verify cache keys are consistent
   - Look for unnecessary invalidations

2. **Stale Data**
   - Ensure invalidation hooks are in place
   - Check event names match configuration
   - Verify pattern matching in invalidation rules

3. **Memory Issues**
   - Monitor cache size with `getStats`
   - Implement cache size limits if needed
   - Schedule regular cleanup of expired entries

## Next Steps

1. **Immediate**: Integrate caching into high-traffic queries
2. **Week 1**: Complete Phase 1 core queries
3. **Week 2**: Extend to user and AI data
4. **Week 3**: Add browser caching and monitoring
5. **Week 4**: Evaluate need for Redis layer

## Related Issues

- **Issue #69**: Performance Monitoring - Track cache effectiveness
- **Issue #70**: Data Archival - Reduce data volume needing caching

## Conclusion

The caching infrastructure is now in place and ready for integration. The modular design allows for gradual adoption with immediate benefits. Start with high-traffic queries and expand coverage based on performance metrics.