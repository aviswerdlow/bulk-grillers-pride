import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { 
  jobStatusSchema,
  timestampFields,
  costTrackingFields,
  fileMetadataFields 
} from './common';

/**
 * AI workflow, job management, and import/export tables
 */

export const aiTables = {
  // AI Categorization Feedback
  aiCategorizationFeedback: defineTable({
    organizationId: v.string(),
    projectId: v.string(),
    productId: v.string(),
    jobId: v.string(),
    suggestedCategoryId: v.string(),
    feedback: v.string(), // 'accepted' | 'rejected' | 'corrected'
    correctedCategoryId: v.optional(v.string()),
    reason: v.optional(v.string()),
    confidence: v.number(),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_product', ['productId'])
    .index('by_job', ['jobId'])
    .index('by_category', ['suggestedCategoryId'])
    .index('by_user', ['userId']),

  // AI Categorization Jobs
  aiCategorizationJobs: defineTable({
    organizationId: v.string(),
    projectId: v.string(),
    
    // Job Configuration
    jobType: v.string(), // 'bulk_categorization' | 'single_product' | 'validation'
    batchSize: v.number(),
    aiProvider: v.string(),
    aiModel: v.string(),
    prompt: v.string(),
    
    // Target Products
    productIds: v.array(v.string()),
    categoryContext: v.any(),
    
    // Job Status
    status: jobStatusSchema,
    progress: v.object({
      total: v.number(),
      processed: v.number(),
      successful: v.number(),
      failed: v.number(),
      skipped: v.number(),
    }),
    
    // Results
    results: v.array(
      v.object({
        productId: v.string(),
        suggestions: v.array(
          v.object({
            categoryId: v.string(),
            confidence: v.number(),
            rationale: v.string(),
          })
        ),
        newCategorySuggestions: v.array(
          v.object({
            name: v.string(),
            parentId: v.optional(v.string()),
            rationale: v.string(),
            confidence: v.number(),
          })
        ),
        status: v.string(), // 'success' | 'error' | 'skipped'
        error: v.optional(v.string()),
      })
    ),
    
    // Execution Details
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    executionTime: v.optional(v.number()),
    
    // Cost Tracking
    ...costTrackingFields,
    
    // Real-time Progress Tracking
    currentBatch: v.optional(v.number()),
    lastProcessedProduct: v.optional(
      v.object({
        productId: v.string(),
        title: v.string(),
        timestamp: v.number(),
      })
    ),
    aiThoughts: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          thought: v.string(),
          productId: v.optional(v.string()),
          confidence: v.optional(v.number()),
        })
      )
    ),
    
    // Error Handling
    errors: v.array(
      v.object({
        type: v.string(),
        message: v.string(),
        productId: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
    
    // Notifications
    notifications: v.object({
      email: v.boolean(),
      dashboard: v.boolean(),
      recipients: v.array(v.string()),
    }),
    notificationsSent: v.boolean(),
    
    // Audit
    createdBy: v.string(),
    ...timestampFields,
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_created_by', ['createdBy']),

  // Import Jobs
  importJobs: defineTable({
    organizationId: v.string(),
    projectId: v.string(),
    
    // Import Configuration
    importType: v.string(), // 'products' | 'categories' | 'variants'
    ...fileMetadataFields,
    
    // Mapping Configuration
    fieldMapping: v.object({
      mappings: v.any(),
      options: v.object({
        hasHeaders: v.boolean(),
        delimiter: v.string(),
        skipEmptyRows: v.boolean(),
        duplicateHandling: v.string(),
        createMissingCategories: v.optional(v.boolean()),
        defaultStatus: v.optional(v.string()),
      }),
    }),
    
    // Validation Rules
    validationRules: v.array(
      v.object({
        field: v.string(),
        type: v.string(),
        required: v.boolean(),
        pattern: v.optional(v.string()),
        minLength: v.optional(v.number()),
        maxLength: v.optional(v.number()),
        allowedValues: v.optional(v.array(v.string())),
      })
    ),
    
    // Processing Status
    status: v.string(), // 'uploaded' | 'validating' | 'importing' | 'completed' | 'failed'
    progress: v.object({
      totalRows: v.number(),
      processedRows: v.number(),
      validRows: v.number(),
      invalidRows: v.number(),
      importedRows: v.number(),
      skippedRows: v.number(),
    }),
    
    // Results & Errors
    validationErrors: v.array(
      v.object({
        row: v.number(),
        column: v.string(),
        value: v.any(),
        error: v.string(),
        severity: v.string(), // 'error' | 'warning'
      })
    ),
    
    importResults: v.object({
      createdRecords: v.array(v.string()),
      updatedRecords: v.array(v.string()),
      skippedRecords: v.array(
        v.object({
          row: v.number(),
          reason: v.string(),
          data: v.any(),
        })
      ),
    }),
    
    // Execution Details
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    // Audit
    createdBy: v.string(),
    ...timestampFields,
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_type', ['organizationId', 'importType']),

  // File Storage Entries
  fileStorageEntries: defineTable({
    organizationId: v.string(),
    
    // File Details
    originalName: v.string(),
    ...fileMetadataFields,
    url: v.string(),
    
    // File Type & Purpose
    fileType: v.string(), // 'product_image' | 'category_image' | 'csv_import' | 'export_file' | 'avatar'
    purpose: v.string(),
    
    // Associated Records
    linkedRecords: v.array(
      v.object({
        recordType: v.string(),
        recordId: v.string(),
      })
    ),
    
    // Access Control
    isPublic: v.boolean(),
    allowedUsers: v.array(v.string()),
    
    // Lifecycle
    expiresAt: v.optional(v.number()),
    isTemporary: v.boolean(),
    
    // Audit
    uploadedBy: v.string(),
    createdAt: v.number(),
    lastAccessed: v.optional(v.number()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_storage_id', ['storageId'])
    .index('by_file_type', ['organizationId', 'fileType'])
    .index('by_uploaded_by', ['uploadedBy']),

  // Workflow States (for LangGraph)
  workflowStates: defineTable({
    organizationId: v.string(),
    workflowId: v.string(),
    jobId: v.string(),
    
    // Workflow State
    currentNode: v.string(),
    state: v.any(),
    
    // Execution History
    nodeHistory: v.array(
      v.object({
        node: v.string(),
        enteredAt: v.number(),
        exitedAt: v.optional(v.number()),
        output: v.any(),
        error: v.optional(v.string()),
      })
    ),
    
    // Status
    status: v.string(), // 'running' | 'paused' | 'completed' | 'failed'
    
    // Human-in-the-loop
    awaitingHumanReview: v.boolean(),
    reviewData: v.optional(v.any()),
    
    ...timestampFields,
  })
    .index('by_workflow_id', ['workflowId'])
    .index('by_job_id', ['jobId'])
    .index('by_organization', ['organizationId']),
};