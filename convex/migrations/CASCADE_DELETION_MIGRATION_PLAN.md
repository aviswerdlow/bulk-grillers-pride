# Cascade Deletion Transaction Migration Plan

**Migration Agent**: migration-agent  
**Issue**: #67 - Implement Transactional Cascade Deletion  
**Risk Level**: HIGH - Data integrity critical  
**Coordination**: backend-agent notified of schema changes

## Overview

This migration implements transactional cascade deletion to ensure data integrity during product deletion operations. The current implementation has critical flaws that can lead to partial failures and data corruption.

## Migration Phases

### Phase 1: Schema Addition (Non-Breaking)
**Duration**: 1 day  
**Risk**: Low  
**Rollback**: Simple - Remove new tables

1. Add new tables to schema.ts:
   - `categoryAssignmentsTrash` - Preserve deleted assignments
   - `cascadeTransactions` - Track deletion operations
   - `imageCleanupQueue` - Queue orphaned images for cleanup

2. Deploy schema changes without modifying existing code
3. Verify new tables are created in production

### Phase 2: Dual-Write Implementation  
**Duration**: 3 days  
**Risk**: Medium  
**Rollback**: Feature flag disable

1. Implement `CascadeTransaction` class with:
   - Transaction ID generation
   - Operation logging
   - Rollback capability
   - State management

2. Add feature flag: `USE_TRANSACTIONAL_DELETION`
3. Modify deletion.ts to:
   - Write to both old and new systems when flag enabled
   - Log all operations to cascadeTransactions table
   - Preserve category assignments in trash

### Phase 3: Validation & Testing
**Duration**: 2 days  
**Risk**: Low  
**Rollback**: N/A - Testing only

1. Run parallel validation:
   - Compare old vs new deletion results
   - Verify data integrity
   - Test rollback scenarios
   - Load test with bulk operations

2. Monitor metrics:
   - Operation success rate
   - Performance impact
   - Rollback frequency

### Phase 4: Cutover
**Duration**: 1 day  
**Risk**: High  
**Rollback**: Feature flag + data recovery

1. Enable feature flag in production
2. Monitor for 24 hours
3. If stable, remove old code paths
4. Archive migration code

## New Schema Tables

```typescript
// categoryAssignmentsTrash - Preserve deleted assignments
categoryAssignmentsTrash: defineTable({
  // Original assignment data
  originalAssignmentId: v.id('categoryProductAssignments'),
  organizationId: v.id('organizations'),
  projectId: v.id('projects'),
  categoryId: v.id('categories'),
  productId: v.id('products'),
  
  // Assignment metadata
  assignedBy: v.union(v.literal('manual'), v.literal('ai'), v.literal('import')),
  confidence: v.optional(v.number()),
  rationale: v.optional(v.string()),
  
  // Deletion tracking
  deletedAt: v.number(),
  deletedBy: v.id('users'),
  cascadeTransactionId: v.string(),
  
  // Recovery
  recoverable: v.boolean(),
  recoveredAt: v.optional(v.number()),
})
  .index('by_product', ['productId'])
  .index('by_transaction', ['cascadeTransactionId'])
  .index('by_deleted_at', ['deletedAt']),

// cascadeTransactions - Transaction log
cascadeTransactions: defineTable({
  transactionId: v.string(),
  organizationId: v.id('organizations'),
  
  // Operation details
  operationType: v.union(
    v.literal('single_delete'),
    v.literal('bulk_delete'),
    v.literal('cascade_delete')
  ),
  status: v.union(
    v.literal('pending'),
    v.literal('in_progress'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('rolled_back')
  ),
  
  // Affected entities
  primaryEntityId: v.id('products'),
  affectedEntities: v.object({
    products: v.array(v.id('products')),
    variants: v.array(v.id('productVariants')),
    assignments: v.array(v.id('categoryProductAssignments')),
    images: v.array(v.string()),
  }),
  
  // Execution tracking
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  executedBy: v.id('users'),
  
  // Error handling
  error: v.optional(v.object({
    message: v.string(),
    stack: v.optional(v.string()),
    failedOperation: v.string(),
  })),
  
  // Rollback info
  rollbackAt: v.optional(v.number()),
  rollbackBy: v.optional(v.id('users')),
  rollbackReason: v.optional(v.string()),
})
  .index('by_transaction_id', ['transactionId'])
  .index('by_status', ['status'])
  .index('by_started_at', ['startedAt']),

// imageCleanupQueue - Deferred image cleanup
imageCleanupQueue: defineTable({
  storageId: v.string(),
  originalProductId: v.id('products'),
  organizationId: v.id('organizations'),
  
  // Queue metadata
  queuedAt: v.number(),
  queuedBy: v.union(v.literal('deletion'), v.literal('migration'), v.literal('manual')),
  cascadeTransactionId: v.optional(v.string()),
  
  // Processing status
  status: v.union(
    v.literal('pending'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('skipped')
  ),
  processedAt: v.optional(v.number()),
  
  // Retention policy
  retainUntil: v.number(), // 90 days after queuing
  
  // Error tracking
  attempts: v.number(),
  lastError: v.optional(v.string()),
})
  .index('by_status', ['status'])
  .index('by_queued_at', ['queuedAt'])
  .index('by_retain_until', ['retainUntil']),
```

## Implementation Details

### CascadeTransaction Class

```typescript
class CascadeTransaction {
  private ctx: GenericMutationCtx<DataModel>;
  private transactionId: string;
  private operations: Operation[] = [];
  
  async execute<T>(
    operation: () => Promise<T>, 
    rollback: () => Promise<void>,
    description: string
  ): Promise<T> {
    try {
      const result = await operation();
      this.operations.push({ 
        description, 
        status: 'completed',
        rollback 
      });
      return result;
    } catch (error) {
      await this.rollbackAll();
      throw error;
    }
  }
  
  private async rollbackAll() {
    for (const op of this.operations.reverse()) {
      if (op.status === 'completed') {
        await op.rollback();
      }
    }
  }
}
```

## Backwards Compatibility

1. **No Breaking Changes**: New tables don't affect existing functionality
2. **Feature Flag Control**: Gradual rollout with instant rollback
3. **Data Preservation**: All existing data remains intact
4. **API Compatibility**: External APIs unchanged

## Rollback Strategy

### Phase 1 Rollback
- Drop new tables (no data loss)
- Revert schema.ts changes

### Phase 2 Rollback
- Disable feature flag
- Stop dual writes
- Archive transaction logs

### Phase 3 Rollback
- Restore from transaction logs
- Reconcile any inconsistencies
- Alert on data integrity issues

## Monitoring & Alerts

1. **Success Metrics**
   - Transaction completion rate > 99.9%
   - Rollback rate < 0.1%
   - Performance impact < 10%

2. **Alert Triggers**
   - Transaction failure rate > 1%
   - Rollback spike detected
   - Performance degradation > 20%

3. **Dashboard Metrics**
   - Active transactions
   - Failed operations
   - Rollback frequency
   - Queue depth

## Testing Checklist

- [ ] Unit tests for CascadeTransaction class
- [ ] Integration tests for each deletion type
- [ ] Concurrent operation tests
- [ ] Failure injection tests
- [ ] Performance benchmarks
- [ ] Data integrity validation
- [ ] Rollback verification
- [ ] Feature flag toggle tests

## Coordination Notes

**Files Modified by migration-agent**:
- `/convex/schema.ts` - Adding new tables only
- `/convex/migrations/cascadeTransaction.ts` - New file
- `/convex/migrations/implementCascadeDeletion.ts` - New file

**Files to be modified by backend-agent**:
- `/convex/functions/products/deletion.ts` - Core logic changes
- `/convex/functions/products/deletion-monitored.ts` - Monitoring updates

**Handoff Points**:
1. Schema changes deployed by migration-agent
2. Backend-agent implements business logic using new tables
3. Migration-agent validates data integrity
4. Joint testing and validation

## Success Criteria

1. Zero partial deletion failures
2. 100% recovery success rate with relationships
3. Automated image cleanup
4. Transaction history for audit
5. Performance within 10% of current