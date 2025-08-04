import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { 
  timestampFields,
  performanceMetricFields,
  operationStatusSchema,
  prioritySchema 
} from './common';

/**
 * Monitoring, audit, and infrastructure tables
 */

export const monitoringTables = {
  // Audit Logs
  auditLogs: defineTable({
    organizationId: v.string(),
    
    // Event Details
    eventType: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    
    // Change Details
    changes: v.array(
      v.object({
        field: v.string(),
        oldValue: v.any(),
        newValue: v.any(),
        changeType: v.string(), // 'added' | 'modified' | 'removed'
      })
    ),
    
    // Snapshots
    beforeSnapshot: v.optional(v.any()),
    afterSnapshot: v.optional(v.any()),
    
    // Context
    context: v.object({
      action: v.string(),
      source: v.string(), // 'web' | 'api' | 'import' | 'ai'
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      sessionId: v.optional(v.string()),
    }),
    
    // Actor
    performedBy: v.any(), // Union type simplified
    
    // Metadata
    metadata: v.any(),
    
    // Timestamp
    timestamp: v.number(),
    
    // Rollback Support
    isRollbackable: v.boolean(),
    rollbackData: v.optional(v.any()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_entity', ['organizationId', 'entityType', 'entityId'])
    .index('by_timestamp', ['organizationId', 'timestamp']),

  // Data Versions
  dataVersions: defineTable({
    organizationId: v.string(),
    
    // Version Details
    entityType: v.string(),
    entityId: v.string(),
    version: v.number(),
    
    // Data Snapshot
    data: v.any(),
    checksum: v.string(),
    
    // Version Metadata
    versionType: v.string(), // 'major' | 'minor' | 'patch'
    changeDescription: v.optional(v.string()),
    tags: v.array(v.string()),
    
    // Relationships
    parentVersion: v.optional(v.number()),
    childVersions: v.array(v.number()),
    
    // Audit
    createdBy: v.string(), // User ID or 'system'
    createdAt: v.number(),
    
    // Retention
    expiresAt: v.optional(v.number()),
    isArchived: v.boolean(),
  })
    .index('by_entity', ['organizationId', 'entityType', 'entityId'])
    .index('by_version', ['organizationId', 'entityType', 'entityId', 'version'])
    .index('by_created_at', ['organizationId', 'createdAt']),

  // Deletion Audit Logs
  deletionAuditLogs: defineTable({
    organizationId: v.string(),
    projectId: v.optional(v.string()),
    
    // Operation details
    operationType: v.string(), // 'soft_delete' | 'bulk_delete' | 'restore' | 'permanent_delete' | 'auto_cleanup'
    
    // Affected entities
    affectedProducts: v.array(v.object({
      productId: v.string(),
      title: v.string(),
      sku: v.optional(v.string()),
      categories: v.array(v.string()),
    })),
    
    // Operation metadata
    totalCount: v.number(),
    breakdown: v.object({
      uncategorized: v.number(),
      categorized: v.number(),
      byCategory: v.array(v.object({
        categoryId: v.string(),
        categoryName: v.string(),
        count: v.number(),
      })),
    }),
    
    // User and timestamp
    performedBy: v.string(),
    performedAt: v.number(),
    userEmail: v.string(),
    userName: v.string(),
    
    // Additional context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    confirmationMethod: v.optional(v.string()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['performedBy'])
    .index('by_timestamp', ['performedAt']),

  // Migration History
  migrationHistory: defineTable({
    organizationId: v.string(),
    projectId: v.optional(v.string()),
    
    // Migration Details
    migrationName: v.string(),
    migrationVersion: v.string(),
    migrationFile: v.string(),
    
    // Execution Details
    executionId: v.string(),
    status: v.string(), // 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'partially_completed'
    
    // Progress Tracking
    totalRecords: v.optional(v.number()),
    processedRecords: v.optional(v.number()),
    successCount: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    
    // Timing
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    
    // Results
    result: v.optional(v.any()),
    errors: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          message: v.string(),
          details: v.optional(v.any()),
        })
      )
    ),
    
    // Rollback Information
    isRollbackable: v.boolean(),
    rollbackExecutionId: v.optional(v.string()),
    rolledBackAt: v.optional(v.number()),
    
    // Audit
    executedBy: v.string(),
    executedByEmail: v.string(),
    
    // Metadata
    metadata: v.any(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_project', ['organizationId', 'projectId'])
    .index('by_name', ['organizationId', 'migrationName'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_execution', ['executionId'])
    .index('by_started_at', ['organizationId', 'startedAt']),

  // Performance Metrics
  performanceMetrics: defineTable({
    organizationId: v.string(),
    operation: v.string(),
    startTime: v.number(),
    projectId: v.optional(v.string()),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    date: v.string(),
    hour: v.number(),
    ...performanceMetricFields,
  })
    .index('by_organization_operation', ['organizationId', 'operation'])
    .index('by_timestamp', ['organizationId', 'startTime'])
    .index('by_date', ['organizationId', 'date'])
    .index('by_operation_date', ['operation', 'date'])
    .index('by_project', ['organizationId', 'projectId'])
    .index('by_user', ['organizationId', 'userId']),

  // Cache
  cache: defineTable({
    key: v.string(),
    value: v.any(),
    expiresAt: v.number(),
    createdAt: v.number(),
    hits: v.number(),
    lastAccessedAt: v.number(),
    organizationId: v.optional(v.string()),
    dataType: v.string(),
    size: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_expiry', ['expiresAt'])
    .index('by_organization', ['organizationId'])
    .index('by_type', ['dataType'])
    .index('by_access', ['lastAccessedAt']),

  // Deletion Sessions
  deletionSessions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    organizationId: v.string(),
    state: v.string(), // 'active' | 'completed' | 'cancelled'
    currentStep: v.string(),
    selectedProducts: v.array(v.string()),
    confirmationMethod: v.string(),
    focusHistory: v.array(
      v.object({
        elementId: v.string(),
        timestamp: v.number(),
        context: v.string(),
        scrollPosition: v.optional(
          v.object({
            x: v.number(),
            y: v.number(),
          })
        ),
        stepIndex: v.optional(v.number()),
      })
    ),
    confirmationAttempts: v.optional(v.array(
      v.object({
        timestamp: v.number(),
        method: v.string(),
        isValid: v.boolean(),
        errorReason: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    )),
    validNonces: v.optional(v.array(v.string())),
    rateLimitWindowStart: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    lastActivityAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_user', ['userId'])
    .index('by_organization', ['organizationId'])
    .index('by_state', ['state'])
    .index('by_activity', ['lastActivityAt']),

  // Schema Migrations
  schemaMigrations: defineTable({
    migrationId: v.string(),
    version: v.string(),
    description: v.string(),
    status: v.string(), // 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    rolledBackAt: v.optional(v.number()),
    changes: v.object({
      tablesAdded: v.array(v.string()),
      tablesModified: v.array(v.string()),
      indexesAdded: v.array(v.string()),
    }),
    error: v.optional(v.string()),
  })
    .index('by_migration_id', ['migrationId'])
    .index('by_status', ['status'])
    .index('by_version', ['version']),

  // Cascade Transactions
  cascadeTransactions: defineTable({
    transactionId: v.string(),
    organizationId: v.string(),
    operationType: v.string(),
    status: operationStatusSchema,
    primaryEntityId: v.string(),
    affectedEntities: v.object({
      products: v.array(v.string()),
      variants: v.array(v.string()),
      assignments: v.array(v.string()),
      images: v.array(v.string()),
    }),
    operations: v.array(v.object({
      stepId: v.string(),
      operation: v.string(),
      targetType: v.string(),
      targetId: v.string(),
      status: operationStatusSchema,
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    executedBy: v.string(),
    error: v.optional(v.object({
      message: v.string(),
      stack: v.optional(v.string()),
      failedOperation: v.string(),
      failedAt: v.number(),
    })),
    rollbackAt: v.optional(v.number()),
    rollbackBy: v.optional(v.string()),
    rollbackReason: v.optional(v.string()),
    rollbackStatus: v.optional(v.string()),
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

  // Image Cleanup Queue
  imageCleanupQueue: defineTable({
    storageId: v.string(),
    originalProductId: v.string(),
    organizationId: v.string(),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    queuedAt: v.number(),
    queuedBy: v.string(), // 'deletion' | 'migration' | 'manual'
    cascadeTransactionId: v.optional(v.string()),
    priority: prioritySchema,
    status: v.string(),
    processedAt: v.optional(v.number()),
    processingStartedAt: v.optional(v.number()),
    retainUntil: v.number(),
    permanentRetention: v.boolean(),
    attempts: v.number(),
    maxAttempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.object({
      message: v.string(),
      code: v.optional(v.string()),
      timestamp: v.number(),
    })),
    verifiedDeleted: v.boolean(),
    verificationMethod: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_queued_at', ['queuedAt'])
    .index('by_retain_until', ['retainUntil'])
    .index('by_priority_status', ['priority', 'status'])
    .index('by_product', ['originalProductId']),

  // Distributed Locks
  distributedLocks: defineTable({
    resourceType: v.string(),
    resourceId: v.string(),
    organizationId: v.string(),
    lockId: v.string(),
    lockType: v.string(), // 'exclusive' | 'shared'
    operation: v.string(),
    ownerId: v.string(),
    ownerType: v.string(), // 'transaction' | 'user' | 'system'
    acquiredAt: v.number(),
    expiresAt: v.number(),
    renewedAt: v.optional(v.number()),
    renewCount: v.number(),
    maxRenewals: v.number(),
    status: v.string(), // 'active' | 'expired' | 'released'
    metadata: v.optional(v.any()),
    reason: v.optional(v.string()),
  })
    .index('by_resource', ['resourceType', 'resourceId', 'status'])
    .index('by_organization', ['organizationId', 'status'])
    .index('by_owner', ['ownerId', 'status'])
    .index('by_expiry', ['expiresAt', 'status'])
    .index('by_status', ['status']),
};