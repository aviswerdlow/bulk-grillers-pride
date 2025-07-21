import { internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { Doc } from '../_generated/dataModel';

/**
 * Consistency Validator for Cascade Deletion System
 * 
 * Author: backend-agent
 * Issue: #67 - Implement Transactional Cascade Deletion
 * 
 * This module validates data consistency across the cascade deletion system,
 * ensuring referential integrity and identifying orphaned records.
 */

/**
 * Validate consistency of category assignments trash
 */
export const validateCategoryAssignmentsTrash = internalQuery({
  handler: async (ctx) => {
    const issues = [];
    
    // Get all trash entries
    const trashEntries = await ctx.db
      .query('categoryAssignmentsTrash')
      .filter((q) => q.eq(q.field('recoverable'), true))
      .collect();
    
    for (const entry of trashEntries) {
      // Check if product still exists
      const product = await ctx.db.get(entry.productId);
      if (!product) {
        issues.push({
          type: 'orphaned_assignment_trash',
          severity: 'warning',
          trashId: entry._id,
          productId: entry.productId,
          message: 'Assignment trash entry for non-existent product',
        });
      }
      
      // Check if category still exists
      const category = await ctx.db.get(entry.categoryId);
      if (!category) {
        issues.push({
          type: 'missing_category',
          severity: 'warning',
          trashId: entry._id,
          categoryId: entry.categoryId,
          message: 'Assignment trash entry references non-existent category',
        });
      }
      
      // Check for duplicate active assignments
      if (product && category) {
        const activeAssignment = await ctx.db
          .query('categoryProductAssignments')
          .withIndex('by_product', (q: any) => q.eq('productId', entry.productId))
          .filter((q: any) => 
            q.and(
              q.eq(q.field('categoryId'), entry.categoryId),
              q.eq(q.field('status'), 'active')
            )
          )
          .first();
        
        if (activeAssignment) {
          issues.push({
            type: 'duplicate_assignment',
            severity: 'info',
            trashId: entry._id,
            activeAssignmentId: activeAssignment._id,
            message: 'Assignment already active, trash entry can be marked non-recoverable',
          });
        }
      }
    }
    
    return issues;
  },
});

/**
 * Validate consistency of product trash
 */
export const validateProductTrash = internalQuery({
  handler: async (ctx) => {
    const issues = [];
    
    // Get all trash entries
    const trashEntries = await ctx.db
      .query('productTrash')
      .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'))
      .collect();
    
    for (const entry of trashEntries) {
      // Check if product still exists
      const product = await ctx.db.get(entry.productId);
      
      if (!product) {
        issues.push({
          type: 'missing_product',
          severity: 'critical',
          trashId: entry._id,
          productId: entry.productId,
          message: 'Trash entry for non-existent product - data loss risk',
        });
      } else {
        // Validate product status
        if (product.status !== 'archived') {
          issues.push({
            type: 'status_mismatch',
            severity: 'warning',
            trashId: entry._id,
            productId: entry.productId,
            expectedStatus: 'archived',
            actualStatus: product.status,
            message: 'Product in trash but not archived',
          });
        }
        
        // Check variants consistency
        for (const variantId of entry.relatedData.variantIds) {
          const variant = await ctx.db.get(variantId);
          if (!variant) {
            issues.push({
              type: 'missing_variant',
              severity: 'warning',
              trashId: entry._id,
              variantId,
              message: 'Referenced variant no longer exists',
            });
          }
        }
      }
      
      // Check if related assignments are properly preserved
      const preservedAssignments = await ctx.db
        .query('categoryAssignmentsTrash')
        .withIndex('by_product', (q: any) => q.eq('productId', entry.productId))
        .filter((q: any) => q.eq(q.field('cascadeTransactionId'), entry.cascadeTransactionId || ''))
        .collect();
      
      if (entry.relatedData.categoryAssignmentIds.length !== preservedAssignments.length) {
        issues.push({
          type: 'assignment_count_mismatch',
          severity: 'warning',
          trashId: entry._id,
          expectedCount: entry.relatedData.categoryAssignmentIds.length,
          actualCount: preservedAssignments.length,
          message: 'Mismatch in preserved category assignments',
        });
      }
    }
    
    return issues;
  },
});

/**
 * Validate distributed locks consistency
 */
export const validateDistributedLocks = internalQuery({
  handler: async (ctx) => {
    const issues = [];
    const now = Date.now();
    
    // Get all active locks
    const activeLocks = await ctx.db
      .query('distributedLocks')
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();
    
    for (const lock of activeLocks) {
      // Check for expired locks that should be released
      if (lock.expiresAt < now) {
        issues.push({
          type: 'expired_lock',
          severity: 'warning',
          lockId: lock._id,
          lockIdentifier: lock.lockId,
          expiredSince: now - lock.expiresAt,
          message: 'Lock is expired but still marked as active',
        });
      }
      
      // Check for orphaned locks (resource no longer exists)
      if (lock.resourceType === 'product') {
        const product = await ctx.db.get(lock.resourceId as any);
        if (!product) {
          issues.push({
            type: 'orphaned_lock',
            severity: 'warning',
            lockId: lock._id,
            resourceId: lock.resourceId,
            message: 'Lock for non-existent resource',
          });
        }
      }
      
      // Check for locks that have been held too long
      const lockDuration = now - lock.acquiredAt;
      const maxDuration = 5 * 60 * 1000; // 5 minutes
      if (lockDuration > maxDuration) {
        issues.push({
          type: 'long_held_lock',
          severity: 'info',
          lockId: lock._id,
          lockIdentifier: lock.lockId,
          heldForMs: lockDuration,
          message: 'Lock held for unusually long time',
        });
      }
    }
    
    return issues;
  },
});

/**
 * Validate image cleanup queue consistency
 */
export const validateImageCleanupQueue = internalQuery({
  handler: async (ctx) => {
    const issues = [];
    const now = Date.now();
    
    // Get pending items
    const pendingItems = await ctx.db
      .query('imageCleanupQueue')
      .withIndex('by_status', (q: any) => q.eq('status', 'pending'))
      .collect();
    
    for (const item of pendingItems) {
      // Check if retention period has passed
      if (item.retainUntil < now && !item.permanentRetention) {
        issues.push({
          type: 'overdue_cleanup',
          severity: 'info',
          queueId: item._id,
          overdueSince: now - item.retainUntil,
          message: 'Image cleanup is overdue',
        });
      }
      
      // Check for stuck processing items
      if (item.status === 'processing' && item.processingStartedAt) {
        const processingTime = now - item.processingStartedAt;
        const maxProcessingTime = 5 * 60 * 1000; // 5 minutes
        if (processingTime > maxProcessingTime) {
          issues.push({
            type: 'stuck_processing',
            severity: 'warning',
            queueId: item._id,
            processingForMs: processingTime,
            message: 'Image cleanup stuck in processing',
          });
        }
      }
      
      // Check for items that exceeded max attempts
      if (item.attempts >= item.maxAttempts && item.status === 'failed') {
        issues.push({
          type: 'max_attempts_exceeded',
          severity: 'warning',
          queueId: item._id,
          attempts: item.attempts,
          lastError: item.lastError?.message,
          message: 'Image cleanup failed after max attempts',
        });
      }
    }
    
    return issues;
  },
});

/**
 * Main consistency validator that runs all checks
 */
export const runConsistencyValidation = internalMutation({
  args: {
    fix: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const results = {
      timestamp: Date.now(),
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0,
      info: 0,
      fixed: 0,
      checks: {} as Record<string, any>,
    };
    
    // Run all validation checks
    const [
      assignmentIssues,
      trashIssues,
      lockIssues,
      queueIssues,
    ] = await Promise.all([
      validateCategoryAssignmentsTrash(ctx, {}),
      validateProductTrash(ctx, {}),
      validateDistributedLocks(ctx, {}),
      validateImageCleanupQueue(ctx, {}),
    ]);
    
    // Aggregate results
    const allIssues = [
      ...assignmentIssues,
      ...trashIssues,
      ...lockIssues,
      ...queueIssues,
    ];
    
    results.totalIssues = allIssues.length;
    results.criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    results.warnings = allIssues.filter(i => i.severity === 'warning').length;
    results.info = allIssues.filter(i => i.severity === 'info').length;
    
    results.checks = {
      categoryAssignmentsTrash: assignmentIssues,
      productTrash: trashIssues,
      distributedLocks: lockIssues,
      imageCleanupQueue: queueIssues,
    };
    
    // Apply fixes if requested
    if (args.fix) {
      let fixedCount = 0;
      
      // Fix expired locks
      for (const issue of lockIssues) {
        if (issue.type === 'expired_lock') {
          await ctx.db.patch(issue.lockId as any, { status: 'expired' });
          fixedCount++;
        } else if (issue.type === 'orphaned_lock') {
          await ctx.db.patch(issue.lockId as any, { status: 'released' });
          fixedCount++;
        }
      }
      
      // Mark non-recoverable duplicate assignments
      for (const issue of assignmentIssues) {
        if (issue.type === 'duplicate_assignment') {
          await ctx.db.patch(issue.trashId as any, { recoverable: false });
          fixedCount++;
        }
      }
      
      results.fixed = fixedCount;
    }
    
    // Log results
    console.log('Consistency validation completed:', results);
    
    return results;
  },
});

/**
 * Generate consistency report
 */
export const generateConsistencyReport = internalQuery({
  handler: async (ctx) => {
    const results = await runConsistencyValidation(ctx, { fix: false });
    
    const report = {
      timestamp: results.timestamp,
      summary: {
        totalIssues: results.totalIssues,
        criticalIssues: results.criticalIssues,
        warnings: results.warnings,
        info: results.info,
        healthScore: calculateHealthScore(results),
      },
      recommendations: generateRecommendations(results),
      details: results.checks,
    };
    
    return report;
  },
});

/**
 * Calculate system health score based on issues
 */
function calculateHealthScore(results: any): number {
  const criticalWeight = 10;
  const warningWeight = 3;
  const infoWeight = 1;
  
  const totalWeight = 
    results.criticalIssues * criticalWeight +
    results.warnings * warningWeight +
    results.info * infoWeight;
  
  // Score from 0-100, where 100 is perfect health
  const maxExpectedWeight = 50; // Threshold for concerning issues
  const score = Math.max(0, 100 - (totalWeight / maxExpectedWeight * 100));
  
  return Math.round(score);
}

/**
 * Generate recommendations based on issues found
 */
function generateRecommendations(results: any): string[] {
  const recommendations = [];
  
  if (results.criticalIssues > 0) {
    recommendations.push('CRITICAL: Address critical issues immediately to prevent data loss');
  }
  
  if (results.checks.distributedLocks?.some((i: any) => i.type === 'expired_lock')) {
    recommendations.push('Run consistency validator with fix=true to clean up expired locks');
  }
  
  if (results.checks.productTrash?.some((i: any) => i.type === 'status_mismatch')) {
    recommendations.push('Review product status mismatches - some products may not be properly archived');
  }
  
  if (results.checks.imageCleanupQueue?.some((i: any) => i.type === 'stuck_processing')) {
    recommendations.push('Check image cleanup cron job - some items are stuck in processing');
  }
  
  if (results.totalIssues === 0) {
    recommendations.push('System is healthy - no issues detected');
  }
  
  return recommendations;
}