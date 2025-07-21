# Cascade Deletion Migration - Rollback Procedures

**Migration**: 001_cascade_deletion  
**Author**: migration-agent  
**Risk Level**: HIGH - Data integrity critical  
**Last Updated**: 2024-01-20  

## Overview

This document provides step-by-step rollback procedures for each phase of the cascade deletion migration. Each procedure includes validation steps, recovery procedures, and success criteria.

## Quick Reference

| Phase | Risk | Rollback Time | Data Loss Risk | Procedure |
|-------|------|---------------|----------------|-----------|
| Phase 1 | Low | 5 minutes | None | Remove schema tables |
| Phase 2 | Medium | 15 minutes | None | Disable feature flags |
| Phase 3 | Low | N/A | None | Stop validation |
| Phase 4 | High | 30-60 minutes | Possible | Feature flag + recovery |

## Phase 1: Schema Addition Rollback

### When to Rollback
- TypeScript compilation errors preventing deployment
- Database performance degradation after schema addition
- Unexpected conflicts with existing tables

### Rollback Steps

1. **Stop All Services**
   ```bash
   # Stop Convex dev server
   pkill -f "convex dev"
   ```

2. **Remove Schema Tables**
   - Edit `/convex/schema.ts`
   - Remove lines 1158-1368 (the new table definitions)
   - Save the file

3. **Clear Local State**
   ```bash
   # Clear any cached schema
   rm -rf .convex/
   npx convex dev --clear-cache
   ```

4. **Verify Rollback**
   ```bash
   # Test that old schema works
   npx convex dev --typecheck=disable
   ```

### Success Criteria
- [ ] Convex dev server starts without errors
- [ ] No cascade deletion tables visible in dashboard
- [ ] Existing functionality unaffected

### Recovery Time: 5 minutes

---

## Phase 2: Dual-Write Implementation Rollback

### When to Rollback
- Transaction failures causing data loss
- Performance degradation > 20%
- Rollback mechanism failures
- Data integrity violations detected

### Rollback Steps

1. **Disable Feature Flags Immediately**
   ```typescript
   // Run in Convex dashboard or create emergency script
   await updateFeatureFlags(ctx, {
     flags: {
       USE_TRANSACTIONAL_DELETION: false,
       PRESERVE_CATEGORY_ASSIGNMENTS: false,
       USE_IMAGE_CLEANUP_QUEUE: false,
       LOG_CASCADE_TRANSACTIONS: false,
       ENABLE_TRANSACTION_ROLLBACK: false,
     },
     rolloutPercentage: 0,
     targetOrganizations: [],
   });
   ```

2. **Stop Image Cleanup Cron**
   - Comment out cron job registrations in `imageCleanupCron.ts`
   - Deploy changes

3. **Verify Existing Deletion Logic**
   ```typescript
   // Test that old deletion path works
   const testProduct = await ctx.db.query('products').first();
   await deleteProduct(ctx, { productId: testProduct._id });
   ```

4. **Clean Up Partial Transactions**
   ```typescript
   // Mark all in-progress transactions as failed
   const inProgress = await ctx.db
     .query('cascadeTransactions')
     .withIndex('by_status', q => q.eq('status', 'in_progress'))
     .collect();
   
   for (const txn of inProgress) {
     await ctx.db.patch(txn._id, {
       status: 'failed',
       error: {
         message: 'Rollback initiated',
         failedOperation: 'rollback',
         failedAt: Date.now(),
       },
     });
   }
   ```

5. **Restore Category Assignments (if needed)**
   ```typescript
   // If any assignments were moved to trash incorrectly
   const trashEntries = await ctx.db
     .query('categoryAssignmentsTrash')
     .filter(q => q.eq(q.field('recoverable'), true))
     .collect();
   
   for (const entry of trashEntries) {
     // Restore to original table
     await ctx.db.insert('categoryProductAssignments', {
       organizationId: entry.organizationId,
       projectId: entry.projectId,
       categoryId: entry.categoryId,
       productId: entry.productId,
       assignedBy: entry.assignedBy,
       confidence: entry.confidence,
       rationale: entry.rationale,
       status: entry.status,
       assignedByUser: entry.assignedByUser,
       createdAt: entry.assignedAt,
       updatedAt: Date.now(),
     });
   }
   ```

### Success Criteria
- [ ] All feature flags disabled
- [ ] No new transactions being created
- [ ] Existing deletion logic functional
- [ ] No data loss confirmed
- [ ] Performance returned to baseline

### Recovery Time: 15-30 minutes

---

## Phase 3: Validation & Testing Rollback

### When to Rollback
- Validation revealing critical data integrity issues
- Test failures indicating systemic problems
- Performance benchmarks failing

### Rollback Steps

1. **Stop Validation Processes**
   ```bash
   # Cancel any running validation scripts
   pkill -f "validateMigration"
   ```

2. **Document Issues Found**
   - Create detailed report of validation failures
   - Identify root causes
   - Plan remediation steps

3. **Revert to Phase 2 State**
   - Keep feature flags disabled
   - Continue using old deletion logic
   - Plan fixes for identified issues

### Success Criteria
- [ ] Validation processes stopped
- [ ] Issues documented
- [ ] System stable with old logic

### Recovery Time: < 5 minutes

---

## Phase 4: Production Cutover Rollback

### When to Rollback
- Widespread deletion failures
- Data corruption detected
- Performance degradation > 50%
- User-reported data loss

### Emergency Rollback Steps

1. **🚨 IMMEDIATE: Disable All Deletion Operations**
   ```typescript
   // Emergency flag - implement in deletion.ts
   const EMERGENCY_DELETION_DISABLED = true;
   
   if (EMERGENCY_DELETION_DISABLED) {
     throw new Error('Deletion temporarily disabled for maintenance');
   }
   ```

2. **Disable Feature Flags Organization-Wide**
   ```typescript
   // Set rollout to 0% immediately
   await updateFeatureFlags(ctx, {
     rolloutPercentage: 0,
     targetOrganizations: [],
     flags: {
       USE_TRANSACTIONAL_DELETION: false,
       PRESERVE_CATEGORY_ASSIGNMENTS: false,
       USE_IMAGE_CLEANUP_QUEUE: false,
       LOG_CASCADE_TRANSACTIONS: false,
       ENABLE_TRANSACTION_ROLLBACK: false,
     },
   });
   ```

3. **Assess Damage**
   ```typescript
   // Count affected transactions
   const failedTxns = await ctx.db
     .query('cascadeTransactions')
     .withIndex('by_status')
     .filter(q => 
       q.or(
         q.eq(q.field('status'), 'failed'),
         q.eq(q.field('rollbackStatus'), 'failed')
       )
     )
     .collect();
   
   console.log(`Found ${failedTxns.length} failed transactions`);
   ```

4. **Run Recovery Script**
   ```typescript
   // For each failed transaction, attempt recovery
   for (const txn of failedTxns) {
     // 1. Check what was actually deleted
     const deletedProducts = txn.affectedEntities.products;
     
     // 2. Check if in trash
     const inTrash = await ctx.db
       .query('productTrash')
       .filter(q => q.eq(q.field('productId'), deletedProducts[0]))
       .first();
     
     if (inTrash && inTrash.recoveryStatus === 'recoverable') {
       // Attempt recovery
       await recoverProduct(ctx, { 
         productId: inTrash.productId,
         includeRelationships: true 
       });
     }
   }
   ```

5. **Re-enable Safe Deletion**
   ```typescript
   // After recovery, re-enable with old logic only
   const EMERGENCY_DELETION_DISABLED = false;
   ```

6. **Post-Mortem Data Collection**
   ```typescript
   // Collect all data for analysis
   const report = {
     timestamp: Date.now(),
     failedTransactions: failedTxns.length,
     affectedProducts: /* count */,
     recoveredProducts: /* count */,
     unrecoverableData: /* list */,
   };
   
   await ctx.db.insert('migrationHistory', {
     migrationName: 'cascade_deletion_rollback',
     status: 'completed',
     result: report,
     // ... other fields
   });
   ```

### Data Recovery Procedures

#### Recovering Deleted Products
```typescript
async function recoverDeletedProduct(
  ctx: MutationCtx, 
  productId: Id<'products'>
) {
  // 1. Find in trash
  const trashEntry = await ctx.db
    .query('productTrash')
    .withIndex('by_product', q => q.eq('productId', productId))
    .first();
  
  if (!trashEntry) {
    throw new Error('Product not found in trash');
  }
  
  // 2. Restore product
  const restoredId = await ctx.db.insert('products', trashEntry.productData);
  
  // 3. Restore category assignments from trash
  const assignments = await ctx.db
    .query('categoryAssignmentsTrash')
    .withIndex('by_product', q => q.eq('productId', productId))
    .collect();
  
  for (const assignment of assignments) {
    if (assignment.recoverable) {
      await ctx.db.insert('categoryProductAssignments', {
        // ... restore fields
      });
    }
  }
  
  // 4. Update trash entry
  await ctx.db.patch(trashEntry._id, {
    recoveryStatus: 'recovered',
    recoveredAt: Date.now(),
  });
  
  return restoredId;
}
```

### Success Criteria
- [ ] All deletion operations using old logic
- [ ] No new failed transactions
- [ ] All recoverable data restored
- [ ] Performance returned to normal
- [ ] User confidence restored

### Recovery Time: 30-60 minutes (depending on data volume)

---

## Monitoring During Rollback

### Key Metrics to Watch
1. **Error Rate**: Should drop to < 0.1% after rollback
2. **Transaction Status**: No new 'in_progress' transactions
3. **Deletion Success Rate**: Should return to 99.9%+
4. **Performance**: Response times < 200ms
5. **User Reports**: Monitor for data loss reports

### Alerting Thresholds
- Error rate > 1%: Immediate investigation
- Failed transaction count increasing: Emergency rollback
- Performance degradation > 20%: Consider rollback
- Any data loss report: Immediate response

---

## Post-Rollback Actions

1. **Incident Report**
   - Document what triggered rollback
   - Analyze root cause
   - Plan remediation

2. **Data Audit**
   - Verify all data integrity
   - Check for orphaned records
   - Validate relationships

3. **Communication**
   - Notify affected users
   - Update status page
   - Internal post-mortem

4. **Fix and Retry Plan**
   - Address identified issues
   - Enhanced testing plan
   - Gradual rollout strategy

---

## Emergency Contacts

- **On-Call Engineer**: Check PagerDuty
- **Database Admin**: #database-emergencies Slack
- **Product Owner**: Notify of user impact
- **Security Team**: If data exposure suspected

## Rollback Checklist

- [ ] Feature flags disabled
- [ ] Cron jobs stopped
- [ ] Failed transactions marked
- [ ] Data recovery attempted
- [ ] Monitoring verified
- [ ] Users notified
- [ ] Post-mortem scheduled