import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Migration 001: Add tables for transactional cascade deletion
 * 
 * Author: migration-agent
 * Issue: #67 - Implement Transactional Cascade Deletion
 * Date: 2024-01-20
 * 
 * This migration adds new tables to support atomic cascade deletion operations.
 * These tables ensure data integrity and enable full recovery of deleted products
 * with all their relationships intact.
 * 
 * IMPORTANT: This file contains ONLY the new table definitions.
 * The actual schema.ts modifications will be done by the migration script.
 */

export const newTables = {
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

/**
 * Feature flags for gradual rollout
 */
export const CASCADE_DELETION_FLAGS = {
  // Enable transactional deletion
  USE_TRANSACTIONAL_DELETION: false,
  
  // Enable category assignment preservation
  PRESERVE_CATEGORY_ASSIGNMENTS: false,
  
  // Enable image cleanup queue
  USE_IMAGE_CLEANUP_QUEUE: false,
  
  // Enable transaction logging
  LOG_CASCADE_TRANSACTIONS: true,
  
  // Enable rollback capability
  ENABLE_TRANSACTION_ROLLBACK: false,
  
  // Performance optimization flags
  BATCH_OPERATIONS: true,
  PARALLEL_CLEANUP: false,
};

/**
 * Migration configuration
 */
export const MIGRATION_CONFIG = {
  // Transaction settings
  TRANSACTION_TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  ROLLBACK_WINDOW_MS: 3600000, // 1 hour
  
  // Cleanup settings
  IMAGE_RETENTION_DAYS: 90,
  CLEANUP_BATCH_SIZE: 100,
  CLEANUP_INTERVAL_MS: 300000, // 5 minutes
  
  // Performance settings
  MAX_PARALLEL_OPERATIONS: 10,
  OPERATION_BATCH_SIZE: 50,
};