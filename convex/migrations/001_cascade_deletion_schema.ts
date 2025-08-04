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
    originalAssignmentId: v.string(), // ID reference to categoryProductAssignments
    organizationId: v.string(), // ID reference to organizations
    projectId: v.string(), // ID reference to projects
    categoryId: v.string(), // ID reference to categories
    productId: v.string(), // ID reference to products
    
    // Assignment metadata (preserved from original)
    assignedBy: v.string(), // 'manual' | 'ai' | 'import'
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
    status: v.string(), // 'active' | 'pending' | 'rejected'
    
    // Assignment audit (preserved)
    assignedByUser: v.optional(v.string()), // ID reference to users
    assignedAt: v.number(),
    verifiedBy: v.optional(v.string()), // ID reference to users
    verifiedAt: v.optional(v.number()),
    
    // Deletion tracking
    deletedAt: v.number(),
    deletedBy: v.string(), // ID reference to users
    cascadeTransactionId: v.string(),
    
    // Recovery
    recoverable: v.boolean(),
    recoveredAt: v.optional(v.number()),
    recoveredBy: v.optional(v.string()), // ID reference to users
  })
    .index('by_product', ['productId'])
    .index('by_transaction', ['cascadeTransactionId'])
    .index('by_deleted_at', ['deletedAt'])
    .index('by_category', ['categoryId']),

  // Track cascade deletion transactions for atomicity
  cascadeTransactions: defineTable({
    transactionId: v.string(), // Unique transaction identifier
    organizationId: v.string(), // ID reference to organizations
    
    // Operation details
    operationType: v.string(), // 'single_delete' | 'bulk_delete' | 'cascade_delete' | 'restore' | 'permanent_delete'
    status: v.string(), // 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
    
    // Affected entities
    primaryEntityId: v.string(), // ID reference to products
    affectedEntities: v.object({
      products: v.array(v.string()), // ID references to products
      variants: v.array(v.string()), // ID references to productVariants
      assignments: v.array(v.string()), // ID references to categoryProductAssignments
      images: v.array(v.string()),
    }),
    
    // Operation steps for rollback
    operations: v.array(v.object({
      stepId: v.string(),
      operation: v.string(),
      targetType: v.string(),
      targetId: v.string(),
      status: v.string(), // 'pending' | 'completed' | 'failed'
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })),
    
    // Execution tracking
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    executedBy: v.string(), // ID reference to users
    
    // Error handling
    error: v.optional(v.object({
      message: v.string(),
      stack: v.optional(v.string()),
      failedOperation: v.string(),
      failedAt: v.number(),
    })),
    
    // Rollback info
    rollbackAt: v.optional(v.number()),
    rollbackBy: v.optional(v.string()), // ID reference to users
    rollbackReason: v.optional(v.string()),
    rollbackStatus: v.optional(v.string()), // 'in_progress' | 'completed' | 'failed'
    
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
    originalProductId: v.string(), // ID reference to products
    organizationId: v.string(), // ID reference to organizations
    
    // File metadata
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    
    // Queue metadata
    queuedAt: v.number(),
    queuedBy: v.string(), // 'deletion' | 'migration' | 'manual'
    cascadeTransactionId: v.optional(v.string()),
    priority: v.string(), // 'low' | 'normal' | 'high'
    
    // Processing status
    status: v.string(), // 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'cancelled'
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
    verificationMethod: v.optional(v.string()), // 'storage_api' | 'manual' | 'automated_scan'
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
  USE_TRANSACTIONAL_DELETION: true,
  
  // Enable category assignment preservation
  PRESERVE_CATEGORY_ASSIGNMENTS: true,
  
  // Enable image cleanup queue
  USE_IMAGE_CLEANUP_QUEUE: true,
  
  // Enable transaction logging
  LOG_CASCADE_TRANSACTIONS: true,
  
  // Enable rollback capability
  ENABLE_TRANSACTION_ROLLBACK: true,
  
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