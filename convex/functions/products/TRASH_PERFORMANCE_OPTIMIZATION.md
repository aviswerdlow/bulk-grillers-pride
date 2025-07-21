# Trash Table Performance Optimization

This document describes the performance optimizations implemented for the trash table queries to prevent failures at >10K items.

## Problem Summary

The original implementation suffered from:
- In-memory sorting fetching ALL items then sorting in JavaScript
- Full table scans for search operations  
- Array slicing for pagination instead of cursor-based pagination
- Missing compound indexes for common query patterns

## Implemented Solutions

### 1. Index Optimization

Added composite indexes to the schema:
```typescript
.index('by_org_deleted', ['organizationId', 'deletedAt'])
.index('by_org_expires', ['organizationId', 'expiresAt'])
.searchIndex('search_trash', {
  searchField: 'productData.title',
  filterFields: ['organizationId', 'projectId', 'recoveryStatus'],
})
```

### 2. Query Refactoring

#### getTrashItems
- Uses composite indexes for efficient sorting
- Implements native Convex pagination with cursors
- Separate query paths for each sort type
- Limits result sets to prevent memory issues

#### searchTrashItems  
- Primary search uses the search index for title queries
- Fallback search for other fields (SKU, vendor, description)
- Limited scan to 500 items for non-indexed fields
- Combines results up to the requested limit

### 3. Performance Monitoring

All queries now have monitored versions that track:
- Query execution time
- Memory usage
- Success/failure rates
- Item counts

Performance thresholds:
- getTrashItems: 200ms warning, 500ms critical
- searchTrashItems: 300ms warning, 1000ms critical
- getDeletionStats: 500ms warning, 2000ms critical

### 4. Table Size Monitoring

New `monitorTrashTableSize` query provides:
- Total item count with status breakdown
- Estimated storage size in MB
- Warning thresholds for count (>10K) and size (>100MB)

## Expected Impact

- Support for 100K+ items without degradation
- Sub-200ms query response times for typical operations
- Prevention of out-of-memory errors
- Proactive monitoring and alerting

## Usage

### Direct Usage (Optimized)
```typescript
import { api } from 'convex/_generated/api';

// Use the optimized queries directly
const trashItems = await ctx.query(api.products.deletion.getTrashItems, {
  organizationId,
  limit: 50,
  sortBy: 'deletedAt',
});
```

### Monitored Usage (With Performance Tracking)
```typescript
import { api } from 'convex/_generated/api';

// Use monitored versions for production
const trashItems = await ctx.query(api.products.deletionMonitored.getTrashItems, {
  organizationId,
  limit: 50,
  sortBy: 'deletedAt',
});

// Check for performance alerts
const alerts = await ctx.query(api.products.deletionMonitored.checkPerformanceAlerts, {
  organizationId,
  timeWindowMinutes: 60,
});
```

## Deployment Notes

1. The new indexes will be created automatically when the schema is deployed
2. Initial index creation may take time for large existing datasets
3. Monitor the performance metrics after deployment
4. Adjust thresholds in `PERFORMANCE_THRESHOLDS` as needed

## Future Improvements

1. Implement archival for items older than 30 days
2. Add pre-computed statistics tables for faster aggregations
3. Consider partitioning by date for very large datasets
4. Implement cache warming for frequently accessed queries