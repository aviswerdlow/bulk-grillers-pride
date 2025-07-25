# Trash Table Optimization Specification

**Date**: July 19, 2025  
**Author**: Systems Design Agent  
**Purpose**: Technical specification for trash table performance optimizations

## Overview

This specification details the implementation requirements for optimizing the trash table to handle enterprise-scale usage (100K+ items) while maintaining sub-200ms query performance.

## Schema Updates

### New Indexes Required

```typescript
// convex/schema.ts
productTrash: defineTable({
  // ... existing fields ...
})
  // Existing indexes
  .index("by_organization", ["organizationId"])
  .index("by_expiration", ["expiresAt"])
  .index("by_product", ["productId"])
  .index("by_bulk_operation", ["bulkOperationId"])
  
  // NEW: Compound indexes for sorting
  .index("by_org_deleted", ["organizationId", "deletedAt"])
  .index("by_org_expires", ["organizationId", "expiresAt"])
  .index("by_org_project_status", ["organizationId", "projectId", "recoveryStatus"])
  
  // NEW: Search index
  .searchIndex("search_trash", {
    searchField: "productData.title",
    filterFields: ["organizationId", "projectId", "recoveryStatus"]
  })
```

## API Updates

### 1. Optimized List Query

```typescript
// convex/trash/queries.ts
export const getTrashItems = query({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.optional(v.id("projects")),
    sortBy: v.optional(v.union(
      v.literal("deletedAt"),
      v.literal("expiresAt"),
      v.literal("title")
    )),
    recoveryStatus: v.optional(v.union(
      v.literal("recoverable"),
      v.literal("expired")
    )),
    paginationOpts: paginationOptsValidator
  },
  handler: async (ctx, args) => {
    const { organizationId, projectId, sortBy = "deletedAt", recoveryStatus } = args;
    
    // Performance tracking wrapper
    return await withPerformanceTracking("trash.query.list", async () => {
      // Build query with appropriate index
      let query = ctx.db.query("productTrash");
      
      if (projectId && recoveryStatus) {
        // Use most specific index
        query = query.withIndex("by_org_project_status", q => 
          q.eq("organizationId", organizationId)
           .eq("projectId", projectId)
           .eq("recoveryStatus", recoveryStatus)
        );
      } else if (sortBy === "deletedAt") {
        query = query.withIndex("by_org_deleted", q => 
          q.eq("organizationId", organizationId)
        );
      } else if (sortBy === "expiresAt") {
        query = query.withIndex("by_org_expires", q => 
          q.eq("organizationId", organizationId)
        );
      } else {
        // Fallback to basic index
        query = query.withIndex("by_organization", q => 
          q.eq("organizationId", organizationId)
        );
      }
      
      // Apply additional filters
      if (projectId && !recoveryStatus) {
        query = query.filter(q => q.eq(q.field("projectId"), projectId));
      }
      if (recoveryStatus && !projectId) {
        query = query.filter(q => q.eq(q.field("recoveryStatus"), recoveryStatus));
      }
      
      // Order and paginate
      const order = sortBy === "title" ? "asc" : "desc";
      return await query.order(order).paginate(args.paginationOpts);
    });
  }
});
```

### 2. Optimized Search Query

```typescript
export const searchTrashItems = query({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.optional(v.id("projects")),
    searchTerm: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { organizationId, projectId, searchTerm, limit = 20 } = args;
    
    return await withPerformanceTracking("trash.query.search", async () => {
      let results = await ctx.db
        .query("productTrash")
        .withSearchIndex("search_trash", q => {
          let search = q.search("productData.title", searchTerm)
                        .eq("organizationId", organizationId);
          if (projectId) {
            search = search.eq("projectId", projectId);
          }
          return search;
        })
        .take(limit);
      
      // Fallback: search in SKU if no title matches
      if (results.length < limit) {
        const skuResults = await ctx.db
          .query("productTrash")
          .withIndex("by_organization", q => q.eq("organizationId", organizationId))
          .filter(q => 
            q.and(
              projectId ? q.eq(q.field("projectId"), projectId) : true,
              q.neq(q.field("productData.sku"), undefined),
              q.eq(
                q.field("productData.sku").toLowerCase().includes(searchTerm.toLowerCase()),
                true
              )
            )
          )
          .take(limit - results.length);
        
        results = [...results, ...skuResults];
      }
      
      return results;
    });
  }
});
```

### 3. Aggregation Queries with Caching

```typescript
export const getTrashStats = query({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.optional(v.id("projects"))
  },
  handler: async (ctx, args) => {
    const { organizationId, projectId } = args;
    const cacheKey = `trash:stats:${organizationId}:${projectId || 'all'}`;
    
    // Check cache first
    const cached = await ctx.cache?.get(cacheKey);
    if (cached) return cached;
    
    return await withPerformanceTracking("trash.query.stats", async () => {
      // Use indexes for counting
      const baseQuery = ctx.db
        .query("productTrash")
        .withIndex("by_org_project_status", q => {
          let idx = q.eq("organizationId", organizationId);
          if (projectId) idx = idx.eq("projectId", projectId);
          return idx;
        });
      
      const [recoverable, expired] = await Promise.all([
        baseQuery.filter(q => q.eq(q.field("recoveryStatus"), "recoverable")).collect(),
        baseQuery.filter(q => q.eq(q.field("recoveryStatus"), "expired")).collect()
      ]);
      
      const stats = {
        total: recoverable.length + expired.length,
        recoverable: recoverable.length,
        expired: expired.length,
        storageUsed: (recoverable.length + expired.length) * 5 * 1024, // Estimate 5KB per item
        oldestItem: Math.min(...[...recoverable, ...expired].map(i => i.deletedAt)),
        newestItem: Math.max(...[...recoverable, ...expired].map(i => i.deletedAt))
      };
      
      // Cache for 5 minutes
      await ctx.cache?.set(cacheKey, stats, 300);
      
      return stats;
    });
  }
});
```

## Performance Monitoring Implementation

### 1. Metrics Collection Service

```typescript
// convex/monitoring/performance.ts
export const logPerformanceMetric = internalMutation({
  args: {
    operation: v.string(),
    organizationId: v.optional(v.id("organizations")),
    duration: v.number(),
    itemCount: v.optional(v.number()),
    memoryUsed: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("performanceMetrics", {
      ...args,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    });
    
    // Check alert thresholds
    await checkAlertThresholds(ctx, args);
  }
});

// Helper wrapper
export async function withPerformanceTracking<T>(
  operation: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage?.().heapUsed;
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const memoryDelta = startMemory ? process.memoryUsage().heapUsed - startMemory : undefined;
    
    // Log async - don't block response
    ctx.scheduler.runAfter(0, internal.monitoring.performance.logPerformanceMetric, {
      operation,
      organizationId,
      duration,
      memoryUsed: memoryDelta,
      itemCount: Array.isArray(result) ? result.length : undefined
    });
    
    return result;
  } catch (error) {
    // Log error metric
    ctx.scheduler.runAfter(0, internal.monitoring.performance.logPerformanceMetric, {
      operation,
      organizationId,
      duration: Date.now() - startTime,
      error: error.message
    });
    throw error;
  }
}
```

### 2. Alert Thresholds Configuration

```typescript
// convex/monitoring/alerts.ts
const ALERT_THRESHOLDS = {
  "trash.query.list": {
    duration: { warning: 200, critical: 500 },
    memoryUsed: { warning: 50_000_000, critical: 100_000_000 } // 50MB, 100MB
  },
  "trash.query.search": {
    duration: { warning: 300, critical: 1000 },
    itemCount: { warning: 1000, critical: 5000 }
  },
  "trash.cron.cleanup": {
    duration: { warning: 300_000, critical: 600_000 }, // 5min, 10min
    error: { warning: 0.01, critical: 0.05 } // Error rate
  }
};

async function checkAlertThresholds(ctx: MutationCtx, metric: PerformanceMetric) {
  const thresholds = ALERT_THRESHOLDS[metric.operation];
  if (!thresholds) return;
  
  const alerts = [];
  
  // Check duration
  if (thresholds.duration) {
    if (metric.duration > thresholds.duration.critical) {
      alerts.push({
        severity: "critical",
        type: "duration",
        message: `${metric.operation} took ${metric.duration}ms (critical: ${thresholds.duration.critical}ms)`
      });
    } else if (metric.duration > thresholds.duration.warning) {
      alerts.push({
        severity: "warning",
        type: "duration",
        message: `${metric.operation} took ${metric.duration}ms (warning: ${thresholds.duration.warning}ms)`
      });
    }
  }
  
  // Send alerts
  for (const alert of alerts) {
    await ctx.scheduler.runAfter(0, internal.monitoring.alerts.send, alert);
  }
}
```

### 3. Dashboard Queries

```typescript
// convex/monitoring/dashboard.ts
export const getDashboardMetrics = query({
  args: {
    timeRange: v.union(
      v.literal("1h"),
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d")
    )
  },
  handler: async (ctx, args) => {
    const since = getTimestamp(args.timeRange);
    
    const metrics = await ctx.db
      .query("performanceMetrics")
      .withIndex("by_timestamp", q => q.gte("timestamp", since))
      .collect();
    
    return {
      overview: {
        totalOperations: metrics.length,
        avgResponseTime: avg(metrics.map(m => m.duration)),
        errorRate: metrics.filter(m => m.error).length / metrics.length,
        p95ResponseTime: percentile(metrics.map(m => m.duration), 0.95)
      },
      
      byOperation: groupBy(metrics, "operation").map(([op, ms]) => ({
        operation: op,
        count: ms.length,
        avgDuration: avg(ms.map(m => m.duration)),
        p95Duration: percentile(ms.map(m => m.duration), 0.95),
        errorCount: ms.filter(m => m.error).length
      })),
      
      timeSeries: generateTimeSeries(metrics, args.timeRange),
      
      topOrganizations: getTopOrganizations(metrics),
      
      alerts: await getActiveAlerts(ctx)
    };
  }
});
```

## Migration Plan

### Phase 1: Index Creation (Day 1)
1. Deploy schema changes with new indexes
2. Indexes will build in background
3. Monitor index creation progress
4. No downtime expected

### Phase 2: Query Updates (Day 2-3)
1. Deploy optimized queries behind feature flag
2. A/B test with 10% of traffic
3. Monitor performance metrics
4. Gradually increase rollout

### Phase 3: Monitoring Deployment (Day 4-5)
1. Deploy performance tracking
2. Set up monitoring dashboard
3. Configure alerts
4. Train team on dashboard

### Phase 4: Cleanup (Day 6-7)
1. Remove old query implementations
2. Archive old performance data
3. Document new patterns
4. Update runbooks

## Testing Requirements

### Performance Tests
```typescript
describe("Trash Table Performance", () => {
  it("should handle 10K items with <200ms response", async () => {
    // Generate 10K trash items
    const items = generateTrashItems(10000);
    await seedDatabase(items);
    
    // Test list query
    const start = Date.now();
    const result = await getTrashItems({
      organizationId: testOrgId,
      paginationOpts: { numItems: 20 }
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200);
    expect(result.page.length).toBe(20);
  });
  
  it("should search 10K items with <500ms response", async () => {
    // Test search performance
    const start = Date.now();
    const results = await searchTrashItems({
      organizationId: testOrgId,
      searchTerm: "test",
      limit: 20
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
});
```

### Load Tests
- Simulate 100 concurrent users
- Generate 50K trash items
- Measure p95 and p99 response times
- Verify no memory leaks
- Test cleanup job with 10K expired items

## Success Criteria

1. **Query Performance**
   - List queries: p95 < 100ms, p99 < 200ms
   - Search queries: p95 < 200ms, p99 < 500ms
   - Stats queries: p95 < 50ms with caching

2. **Scalability**
   - Handle 100K items without degradation
   - Support 100 concurrent operations
   - Memory usage < 100MB per operation

3. **Monitoring**
   - Real-time performance visibility
   - Proactive alerting for issues
   - Historical trend analysis

4. **Reliability**
   - Zero data loss
   - 99.9% query success rate
   - Graceful degradation under load