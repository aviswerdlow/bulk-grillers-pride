import { internalMutation, query } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Migration Validation Scripts for Phase 3
 * 
 * Validates data integrity and migration success for cascade deletion
 * 
 * Author: migration-agent
 * Issue: #67
 */

// Validate schema deployment
export const validateSchemaDeployment = query({
  handler: async (ctx) => {
    const validation = {
      passed: true,
      checks: {
        schemaMigrations: false,
        categoryAssignmentsTrash: false,
        cascadeTransactions: false,
        imageCleanupQueue: false,
      },
      errors: [] as string[],
    };

    // Check each table exists and is queryable
    const tables = [
      'schemaMigrations',
      'categoryAssignmentsTrash',
      'cascadeTransactions',
      'imageCleanupQueue',
    ] as const;

    for (const table of tables) {
      try {
        await ctx.db.query(table).take(1);
        validation.checks[table] = true;
      } catch (error: any) {
        validation.passed = false;
        validation.errors.push(`Table ${table} not found: ${error.message}`);
      }
    }

    return validation;
  },
});

// Validate transaction integrity
export const validateTransactionIntegrity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const validation = {
      passed: true,
      totalTransactions: 0,
      issues: [] as Array<{
        transactionId: string;
        issue: string;
        severity: 'error' | 'warning';
      }>,
      stats: {
        completed: 0,
        failed: 0,
        rolledBack: 0,
        inProgress: 0,
        orphaned: 0,
      },
    };

    try {
      // Get recent transactions
      const transactions = await ctx.db
        .query('cascadeTransactions')
        .order('desc')
        .take(limit);

      validation.totalTransactions = transactions.length;

      for (const txn of transactions) {
        // Count by status
        validation.stats[txn.status === 'rolled_back' ? 'rolledBack' : txn.status]++;

        // Check for integrity issues
        
        // 1. Check for orphaned in-progress transactions
        if (txn.status === 'in_progress') {
          const age = Date.now() - txn.startedAt;
          if (age > 300000) { // 5 minutes
            validation.issues.push({
              transactionId: txn.transactionId,
              issue: `Transaction stuck in progress for ${Math.round(age / 60000)} minutes`,
              severity: 'error',
            });
            validation.stats.orphaned++;
            validation.passed = false;
          }
        }

        // 2. Check for incomplete operations
        const incompleteOps = txn.operations.filter(op => op.status === 'pending');
        if (txn.status === 'completed' && incompleteOps.length > 0) {
          validation.issues.push({
            transactionId: txn.transactionId,
            issue: `Completed transaction has ${incompleteOps.length} pending operations`,
            severity: 'error',
          });
          validation.passed = false;
        }

        // 3. Check for rollback completeness
        if (txn.rollbackStatus === 'failed') {
          validation.issues.push({
            transactionId: txn.transactionId,
            issue: 'Rollback failed - data may be inconsistent',
            severity: 'error',
          });
          validation.passed = false;
        }

        // 4. Validate affected entities
        const entityCounts = {
          products: txn.affectedEntities.products.length,
          variants: txn.affectedEntities.variants.length,
          assignments: txn.affectedEntities.assignments.length,
          images: txn.affectedEntities.images.length,
        };

        if (txn.status === 'completed' && Object.values(entityCounts).every(count => count === 0)) {
          validation.issues.push({
            transactionId: txn.transactionId,
            issue: 'Completed transaction with no affected entities',
            severity: 'warning',
          });
        }
      }

      return validation;
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        totalTransactions: 0,
        issues: [],
        stats: validation.stats,
      };
    }
  },
});

// Validate category assignment preservation
export const validateCategoryAssignmentPreservation = query({
  args: {
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sampleSize = args.sampleSize || 50;
    const validation = {
      passed: true,
      totalInTrash: 0,
      recoverableCount: 0,
      issues: [] as Array<{
        assignmentId: string;
        issue: string;
        severity: 'error' | 'warning';
      }>,
      integrityChecks: {
        allFieldsPreserved: true,
        validReferences: true,
        transactionTracking: true,
      },
    };

    try {
      // Get sample of trash entries
      const trashEntries = await ctx.db
        .query('categoryAssignmentsTrash')
        .order('desc')
        .take(sampleSize);

      validation.totalInTrash = trashEntries.length;
      validation.recoverableCount = trashEntries.filter(e => e.recoverable).length;

      for (const entry of trashEntries) {
        // Check if all required fields are preserved
        const requiredFields = [
          'originalAssignmentId',
          'organizationId',
          'projectId',
          'categoryId',
          'productId',
          'assignedBy',
          'status',
          'deletedAt',
          'deletedBy',
          'cascadeTransactionId',
        ];

        for (const field of requiredFields) {
          if (entry[field as keyof typeof entry] === undefined) {
            validation.issues.push({
              assignmentId: entry._id,
              issue: `Missing required field: ${field}`,
              severity: 'error',
            });
            validation.integrityChecks.allFieldsPreserved = false;
            validation.passed = false;
          }
        }

        // Verify transaction exists
        const transaction = await ctx.db
          .query('cascadeTransactions')
          .withIndex('by_transaction_id', (q) => 
            q.eq('transactionId', entry.cascadeTransactionId)
          )
          .first();

        if (!transaction) {
          validation.issues.push({
            assignmentId: entry._id,
            issue: `Referenced transaction ${entry.cascadeTransactionId} not found`,
            severity: 'error',
          });
          validation.integrityChecks.transactionTracking = false;
          validation.passed = false;
        }

        // Check if category still exists (for recoverable entries)
        if (entry.recoverable) {
          const category = await ctx.db.get(entry.categoryId);
          if (!category) {
            validation.issues.push({
              assignmentId: entry._id,
              issue: 'Category no longer exists for recoverable assignment',
              severity: 'warning',
            });
            validation.integrityChecks.validReferences = false;
          }
        }
      }

      return validation;
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        totalInTrash: 0,
        recoverableCount: 0,
        issues: [],
        integrityChecks: validation.integrityChecks,
      };
    }
  },
});

// Validate image cleanup queue
export const validateImageCleanupQueue = query({
  handler: async (ctx) => {
    const validation = {
      passed: true,
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        overdue: 0,
        permanentRetention: 0,
      },
      issues: [] as Array<{
        storageId: string;
        issue: string;
        severity: 'error' | 'warning';
      }>,
    };

    try {
      const now = Date.now();
      const allEntries = await ctx.db.query('imageCleanupQueue').collect();
      
      validation.stats.total = allEntries.length;

      for (const entry of allEntries) {
        // Count by status
        validation.stats[entry.status]++;

        if (entry.permanentRetention) {
          validation.stats.permanentRetention++;
        }

        // Check for issues
        
        // 1. Stuck in processing
        if (entry.status === 'processing' && entry.processingStartedAt) {
          const processingTime = now - entry.processingStartedAt;
          if (processingTime > 300000) { // 5 minutes
            validation.issues.push({
              storageId: entry.storageId,
              issue: `Stuck in processing for ${Math.round(processingTime / 60000)} minutes`,
              severity: 'error',
            });
            validation.passed = false;
          }
        }

        // 2. Overdue for processing
        if (entry.status === 'pending' && entry.retainUntil < now && !entry.permanentRetention) {
          validation.stats.overdue++;
          const overdueTime = now - entry.retainUntil;
          if (overdueTime > 86400000) { // 24 hours
            validation.issues.push({
              storageId: entry.storageId,
              issue: `Overdue for cleanup by ${Math.round(overdueTime / 86400000)} days`,
              severity: 'warning',
            });
          }
        }

        // 3. Failed after max attempts
        if (entry.status === 'failed' && entry.attempts >= entry.maxAttempts) {
          validation.issues.push({
            storageId: entry.storageId,
            issue: `Failed after ${entry.attempts} attempts: ${entry.lastError?.message || 'Unknown error'}`,
            severity: 'error',
          });
          validation.passed = false;
        }

        // 4. Missing metadata
        if (!entry.originalProductId) {
          validation.issues.push({
            storageId: entry.storageId,
            issue: 'Missing original product reference',
            severity: 'warning',
          });
        }
      }

      return validation;
    } catch (error: any) {
      return {
        passed: false,
        error: error.message,
        stats: validation.stats,
        issues: [],
      };
    }
  },
});

// Run all validations
export const runFullValidation = internalMutation({
  handler: async (ctx) => {
    const timestamp = Date.now();
    const results = {
      timestamp,
      passed: true,
      validations: {
        schema: { passed: false, error: null as string | null },
        transactions: { passed: false, error: null as string | null },
        categoryAssignments: { passed: false, error: null as string | null },
        imageQueue: { passed: false, error: null as string | null },
      },
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        warnings: 0,
      },
    };

    // Run schema validation
    try {
      const schemaValidation = await validateSchemaDeployment(ctx, {});
      results.validations.schema.passed = schemaValidation.passed;
      if (!schemaValidation.passed) {
        results.passed = false;
        results.summary.criticalIssues += schemaValidation.errors.length;
      }
    } catch (error: any) {
      results.validations.schema.error = error.message;
      results.passed = false;
      results.summary.criticalIssues++;
    }

    // Run transaction validation
    try {
      const txnValidation = await validateTransactionIntegrity(ctx, { limit: 100 });
      results.validations.transactions.passed = txnValidation.passed;
      if (!txnValidation.passed) {
        results.passed = false;
        const errors = txnValidation.issues.filter(i => i.severity === 'error').length;
        const warnings = txnValidation.issues.filter(i => i.severity === 'warning').length;
        results.summary.criticalIssues += errors;
        results.summary.warnings += warnings;
      }
    } catch (error: any) {
      results.validations.transactions.error = error.message;
      results.passed = false;
      results.summary.criticalIssues++;
    }

    // Run category assignment validation
    try {
      const assignmentValidation = await validateCategoryAssignmentPreservation(ctx, { sampleSize: 50 });
      results.validations.categoryAssignments.passed = assignmentValidation.passed;
      if (!assignmentValidation.passed) {
        results.passed = false;
        const errors = assignmentValidation.issues.filter(i => i.severity === 'error').length;
        const warnings = assignmentValidation.issues.filter(i => i.severity === 'warning').length;
        results.summary.criticalIssues += errors;
        results.summary.warnings += warnings;
      }
    } catch (error: any) {
      results.validations.categoryAssignments.error = error.message;
      results.passed = false;
      results.summary.criticalIssues++;
    }

    // Run image queue validation
    try {
      const queueValidation = await validateImageCleanupQueue(ctx, {});
      results.validations.imageQueue.passed = queueValidation.passed;
      if (!queueValidation.passed) {
        results.passed = false;
        const errors = queueValidation.issues.filter(i => i.severity === 'error').length;
        const warnings = queueValidation.issues.filter(i => i.severity === 'warning').length;
        results.summary.criticalIssues += errors;
        results.summary.warnings += warnings;
      }
    } catch (error: any) {
      results.validations.imageQueue.error = error.message;
      results.passed = false;
      results.summary.criticalIssues++;
    }

    results.summary.totalIssues = results.summary.criticalIssues + results.summary.warnings;

    // Log validation results
    console.log('Migration validation completed:', {
      passed: results.passed,
      summary: results.summary,
    });

    return results;
  },
});