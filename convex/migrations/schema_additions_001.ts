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
    status: v.string(), // pending | in_progress | completed | failed | rolled_back
    
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
    originalAssignmentId: v.string(), // ID reference to categoryProductAssignments
    organizationId: v.string(), // ID reference to organizations
    projectId: v.string(), // ID reference to projects
    categoryId: v.string(), // ID reference to categories
    productId: v.string(), // ID reference to products
    
    // Assignment metadata (preserved from original)
    assignedBy: v.string(), // manual | ai | import
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
    status: v.string(), // active | pending | rejected
    
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
    operationType: v.string(), // single_delete | bulk_delete | cascade_delete | restore | permanent_delete
    status: v.string(), // pending | in_progress | completed | failed | rolled_back
    
    // Affected entities
    primaryEntityId: v.string(), // ID reference to products
    affectedEntities: v.object({
      products: v.array(v.string()), // ID reference to products
      variants: v.array(v.string()), // ID reference to productVariants
      assignments: v.array(v.string()), // ID reference to categoryProductAssignments
      images: v.array(v.string()),
    }),
    
    // Operation steps for rollback
    operations: v.array(v.object({
      stepId: v.string(),
      operation: v.string(),
      targetType: v.string(),
      targetId: v.string(),
      status: v.string(), // pending | completed | failed
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
    rollbackStatus: v.optional(v.string()), // in_progress | completed | failed
    
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
    queuedBy: v.string(), // deletion | migration | manual
    cascadeTransactionId: v.optional(v.string()),
    priority: v.string(), // low | normal | high
    
    // Processing status
    status: v.string(), // pending | processing | completed | failed | skipped | cancelled
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
    verificationMethod: v.optional(v.string()), // storage_api | manual | automated_scan
  })
    .index('by_status', ['status'])
    .index('by_queued_at', ['queuedAt'])
    .index('by_retain_until', ['retainUntil'])
    .index('by_priority_status', ['priority', 'status'])
    .index('by_product', ['originalProductId']),
};