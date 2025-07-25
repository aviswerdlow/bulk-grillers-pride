import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Schema additions for Migration 001: Transactional Cascade Deletion
 * 
 * INSTRUCTIONS FOR BACKEND-AGENT:
 * 1. Copy these table definitions to the end of schema.ts (before the closing `});`)
 * 2. Do NOT modify any existing tables
 * 3. Preserve the exact formatting and comments
 * 4. Run `npx convex dev` to apply the schema changes
 * 
 * Author: migration-agent
 * Issue: #67
 */

export const schemaAdditions = {
  // ================================
  // MIGRATION MANAGEMENT
  // ================================
  // Track schema migrations for version control
  schemaMigrations: defineTable({
    migrationId: v.string(), // Unique identifier like "001_cascade_deletion"
    version: v.string(), // Semantic version
    description: v.string(),
    
    // Status tracking
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('rolled_back')
    ),
    
    // Timing
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    rolledBackAt: v.optional(v.number()),
    
    // Changes made
    changes: v.object({
      tablesAdded: v.array(v.string()),
      tablesModified: v.array(v.string()),
      indexesAdded: v.array(v.string()),
    }),
    
    // Error tracking
    error: v.optional(v.string()),
  })
    .index('by_migration_id', ['migrationId'])
    .index('by_status', ['status'])
    .index('by_version', ['version']),

  // ================================
  // CASCADE DELETION TRANSACTION SUPPORT
  // ================================
  // Preserve deleted category assignments for recovery
  categoryAssignmentsTrash: defineTable({
    // Original assignment data
    originalAssignmentId: v.id('categoryProductAssignments'),
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    categoryId: v.id('categories'),
    productId: v.id('products'),
    
    // Assignment metadata (preserved from original)
    assignedBy: v.union(v.literal('manual'), v.literal('ai'), v.literal('import')),
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('rejected')),
    
    // Assignment audit (preserved)
    assignedByUser: v.optional(v.id('users')),
    assignedAt: v.number(),
    verifiedBy: v.optional(v.id('users')),
    verifiedAt: v.optional(v.number()),
    
    // Deletion tracking
    deletedAt: v.number(),
    deletedBy: v.id('users'),
    cascadeTransactionId: v.string(),
    
    // Recovery
    recoverable: v.boolean(),
    recoveredAt: v.optional(v.number()),
    recoveredBy: v.optional(v.id('users')),
  })
    .index('by_product', ['productId'])
    .index('by_transaction', ['cascadeTransactionId'])
    .index('by_deleted_at', ['deletedAt'])
    .index('by_category', ['categoryId']),

  // Track cascade deletion transactions for atomicity
  cascadeTransactions: defineTable({
    transactionId: v.string(), // Unique transaction identifier
    organizationId: v.id('organizations'),
    
    // Operation details
    operationType: v.union(
      v.literal('single_delete'),
      v.literal('bulk_delete'),
      v.literal('cascade_delete'),
      v.literal('restore'),
      v.literal('permanent_delete')
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
    
    // Operation steps for rollback
    operations: v.array(v.object({
      stepId: v.string(),
      operation: v.string(),
      targetType: v.string(),
      targetId: v.string(),
      status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })),
    
    // Execution tracking
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    executedBy: v.id('users'),
    
    // Error handling
    error: v.optional(v.object({
      message: v.string(),
      stack: v.optional(v.string()),
      failedOperation: v.string(),
      failedAt: v.number(),
    })),
    
    // Rollback info
    rollbackAt: v.optional(v.number()),
    rollbackBy: v.optional(v.id('users')),
    rollbackReason: v.optional(v.string()),
    rollbackStatus: v.optional(v.union(
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed')
    )),
    
    // Performance metrics
    metrics: v.optional(v.object({
      totalDuration: v.number(),
      operationCount: v.number(),
      rollbackDuration: v.optional(v.number()),
    })),
  })
    .index('by_transaction_id', ['transactionId'])
    .index('by_status', ['status'])
    .index('by_started_at', ['startedAt'])
    .index('by_organization', ['organizationId']),

  // Queue for deferred image cleanup
  imageCleanupQueue: defineTable({
    storageId: v.string(),
    originalProductId: v.id('products'),
    organizationId: v.id('organizations'),
    
    // File metadata
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    
    // Queue metadata
    queuedAt: v.number(),
    queuedBy: v.union(v.literal('deletion'), v.literal('migration'), v.literal('manual')),
    cascadeTransactionId: v.optional(v.string()),
    priority: v.union(v.literal('low'), v.literal('normal'), v.literal('high')),
    
    // Processing status
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('skipped'),
      v.literal('cancelled')
    ),
    processedAt: v.optional(v.number()),
    processingStartedAt: v.optional(v.number()),
    
    // Retention policy
    retainUntil: v.number(), // 90 days after queuing by default
    permanentRetention: v.boolean(), // Override retention for legal/compliance
    
    // Error tracking
    attempts: v.number(),
    maxAttempts: v.number(), // Default 3
    lastAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.object({
      message: v.string(),
      code: v.optional(v.string()),
      timestamp: v.number(),
    })),
    
    // Cleanup verification
    verifiedDeleted: v.boolean(),
    verificationMethod: v.optional(v.union(
      v.literal('storage_api'),
      v.literal('manual'),
      v.literal('automated_scan')
    )),
  })
    .index('by_status', ['status'])
    .index('by_queued_at', ['queuedAt'])
    .index('by_retain_until', ['retainUntil'])
    .index('by_priority_status', ['priority', 'status'])
    .index('by_product', ['originalProductId']),
};