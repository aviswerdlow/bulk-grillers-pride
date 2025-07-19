import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ================================
  // TENANT/ORGANIZATION MANAGEMENT
  // ================================
  organizations: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    domain: v.optional(v.string()), // Custom domain support
    status: v.union(v.literal('active'), v.literal('suspended'), v.literal('trial')),
    subscription: v.object({
      plan: v.string(),
      status: v.string(),
      trialEnds: v.optional(v.number()),
      seats: v.number(),
      features: v.array(v.string()),
    }),
    settings: v.object({
      // AI Configuration
      aiProvider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
      aiModel: v.string(),
      apiKeys: v.object({
        openai: v.optional(v.string()),
        anthropic: v.optional(v.string()),
        gemini: v.optional(v.string()),
      }),
      // Categorization Settings
      categorization: v.object({
        batchSize: v.number(), // Products per AI batch
        prompt: v.string(), // Custom categorization prompt
        autoApprove: v.boolean(), // Auto-approve AI suggestions
        confidenceThreshold: v.number(), // Minimum confidence for auto-approval
      }),
      // File Upload Limits
      storage: v.object({
        maxFileSize: v.number(), // Bytes
        totalStorageLimit: v.number(), // Bytes
        allowedFileTypes: v.array(v.string()),
      }),
      // Schema versioning
      schemaVersion: v.optional(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_domain', ['domain']),

  // User Management with Multi-Tenant Roles
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    avatar: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('invited'), v.literal('suspended')),
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  // Organization Memberships with Roles
  organizationMemberships: defineTable({
    organizationId: v.id('organizations'),
    userId: v.id('users'),
    role: v.union(v.literal('owner'), v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    permissions: v.array(v.string()), // Granular permissions
    invitedBy: v.optional(v.id('users')),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('revoked')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_organization_user', ['organizationId', 'userId']),

  // Project Management
  projects: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    description: v.optional(v.string()),
    slug: v.string(), // URL-friendly identifier
    status: v.union(v.literal('active'), v.literal('archived'), v.literal('draft')),
    settings: v.object({
      defaultCurrency: v.string(),
      defaultTaxRate: v.optional(v.number()),
      importSettings: v.object({
        autoValidate: v.boolean(),
        duplicateHandling: v.union(v.literal('skip'), v.literal('update'), v.literal('create')),
        requiredFields: v.array(v.string()),
      }),
    }),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_organization_slug', ['organizationId', 'slug']),

  // ================================
  // PRODUCT & VARIANT MANAGEMENT
  // ================================
  products: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),

    // Core Product Information
    title: v.string(),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    productType: v.optional(v.string()),
    handle: v.string(), // URL slug
    sku: v.optional(v.string()), // Primary SKU for simple products
    status: v.union(v.literal('active'), v.literal('draft'), v.literal('archived')),

    // SEO & Marketing
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    tags: v.array(v.string()),

    // Categorization
    categories: v.array(v.id('categories')), // Assigned categories
    aiCategorization: v.optional(
      v.object({
        suggestions: v.array(
          v.object({
            categoryId: v.id('categories'),
            confidence: v.number(),
            rationale: v.string(),
            status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('rejected')),
          })
        ),
        lastProcessed: v.number(),
        batchId: v.optional(v.string()),
      })
    ),

    // Images
    images: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        alt: v.optional(v.string()),
        position: v.number(),
        storageId: v.string(), // Convex storage ID
      })
    ),

    // Flexible Metadata (JSON)
    metadata: v.any(), // Custom fields per product

    // Versioning & Audit
    version: v.number(),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.id('users'),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_handle', ['organizationId', 'projectId', 'handle'])
    .index('by_status', ['organizationId', 'projectId', 'status'])
    .index('by_categories', ['categories'])
    .index('by_sku', ['organizationId', 'sku'])
    .searchIndex('search_products', {
      searchField: 'title',
      filterFields: ['organizationId', 'projectId', 'status', 'productType'],
    }),

  // Product Variants
  productVariants: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    productId: v.id('products'),

    // Variant Information
    title: v.optional(v.string()),
    sku: v.string(),
    barcode: v.optional(v.string()),

    // Pricing
    price: v.number(),
    compareAtPrice: v.optional(v.number()), // MSRP
    costPrice: v.optional(v.number()),

    // Inventory
    inventoryQuantity: v.optional(v.number()),
    inventoryPolicy: v.union(v.literal('deny'), v.literal('continue')), // Out of stock behavior
    trackQuantity: v.boolean(),

    // Physical Properties
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.string()),
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
        unit: v.string(),
      })
    ),

    // Variant Options (size, color, etc.)
    options: v.array(
      v.object({
        name: v.string(),
        value: v.string(),
      })
    ),

    // Images specific to variant
    images: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        alt: v.optional(v.string()),
        position: v.number(),
        storageId: v.string(),
      })
    ),

    // Flexible Metadata
    metadata: v.any(),

    // Status
    status: v.union(v.literal('active'), v.literal('draft'), v.literal('archived')),

    // Versioning
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.id('users'),
  })
    .index('by_product', ['productId'])
    .index('by_sku', ['organizationId', 'sku'])
    .index('by_organization_project', ['organizationId', 'projectId']),

  // ================================
  // HIERARCHICAL CATEGORY MANAGEMENT
  // ================================

  // Category Level Definitions (per project)
  categoryLevelDefinitions: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),

    // Level Configuration
    level: v.number(), // 0 = root, 1 = first level, etc.
    friendlyName: v.string(), // e.g., "Aisle", "Product Type", "Master Category"
    description: v.optional(v.string()),

    // Display Properties
    icon: v.optional(v.string()), // Icon for this level
    color: v.optional(v.string()), // Color coding for this level

    // Validation Rules
    isRequired: v.boolean(), // Must every product have a category at this level?
    maxCategories: v.optional(v.number()), // Max categories allowed at this level

    // Ordering
    sortOrder: v.number(),

    // Status
    isActive: v.boolean(),

    // Metadata
    metadata: v.any(), // Custom properties per level

    // Versioning
    version: v.number(),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.id('users'),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_project_level', ['projectId', 'level'])
    .index('by_project_order', ['projectId', 'sortOrder']),

  categories: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),

    // Category Information
    name: v.string(),
    description: v.optional(v.string()),
    handle: v.string(), // URL-friendly slug
    externalId: v.optional(v.string()), // For import mapping (e.g., from JSON import)

    // Hierarchy Management
    parentId: v.optional(v.id('categories')), // Self-referencing for hierarchy
    level: v.number(), // 0 = root, 1 = first level, etc.
    path: v.string(), // Full path for efficient queries (e.g., "/electronics/computers/laptops")
    sortOrder: v.number(), // Manual ordering within level

    // Display Properties
    color: v.optional(v.string()), // Category color
    icon: v.optional(v.string()), // Category icon
    image: v.optional(
      v.object({
        url: v.string(),
        alt: v.optional(v.string()),
        storageId: v.string(),
      })
    ),

    // SEO
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),

    // Status & Visibility
    status: v.union(v.literal('active'), v.literal('hidden'), v.literal('archived')),
    isVisible: v.boolean(),

    // Metadata
    metadata: v.any(), // Custom properties per category

    // AI Suggestions
    aiSuggestions: v.optional(
      v.object({
        suggestedBy: v.string(), // AI model that suggested this
        rationale: v.string(),
        confidence: v.number(),
        approvedBy: v.optional(v.id('users')),
        approvedAt: v.optional(v.number()),
      })
    ),

    // Versioning
    version: v.number(),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.id('users'),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_parent', ['organizationId', 'projectId', 'parentId'])
    .index('by_level', ['organizationId', 'projectId', 'level'])
    .index('by_path', ['organizationId', 'projectId', 'path'])
    .index('by_handle', ['organizationId', 'projectId', 'handle'])
    .index('by_external_id', ['organizationId', 'projectId', 'externalId'])
    .searchIndex('search_categories', {
      searchField: 'name',
      filterFields: ['organizationId', 'projectId', 'level', 'status'],
    }),

  // Category Product Assignments (Many-to-Many)
  categoryProductAssignments: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    categoryId: v.id('categories'),
    productId: v.id('products'),

    // Assignment Details
    assignedBy: v.union(v.literal('manual'), v.literal('ai'), v.literal('import')),
    confidence: v.optional(v.number()), // For AI assignments
    rationale: v.optional(v.string()), // Why this assignment was made

    // Status
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('rejected')),

    // Audit
    assignedByUser: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_category', ['categoryId'])
    .index('by_product', ['productId'])
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'projectId', 'status']),

  // ================================
  // AI WORKFLOW & JOB MANAGEMENT
  // ================================
  // AI Categorization Feedback for improving accuracy
  aiCategorizationFeedback: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    productId: v.id('products'),
    jobId: v.id('aiCategorizationJobs'),
    suggestedCategoryId: v.id('categories'),
    feedback: v.union(v.literal('accepted'), v.literal('rejected'), v.literal('corrected')),
    correctedCategoryId: v.optional(v.id('categories')),
    reason: v.optional(v.string()),
    confidence: v.number(),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_product', ['productId'])
    .index('by_job', ['jobId'])
    .index('by_category', ['suggestedCategoryId'])
    .index('by_user', ['userId']),

  aiCategorizationJobs: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),

    // Job Configuration
    jobType: v.union(
      v.literal('bulk_categorization'),
      v.literal('single_product'),
      v.literal('validation')
    ),
    batchSize: v.number(),
    aiProvider: v.string(),
    aiModel: v.string(),
    prompt: v.string(),

    // Target Products
    productIds: v.array(v.id('products')), // Products to process
    categoryContext: v.any(), // JSON of available categories

    // Job Status
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
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
        productId: v.id('products'),
        suggestions: v.array(
          v.object({
            categoryId: v.id('categories'),
            confidence: v.number(),
            rationale: v.string(),
          })
        ),
        newCategorySuggestions: v.array(
          v.object({
            name: v.string(),
            parentId: v.optional(v.id('categories')),
            rationale: v.string(),
            confidence: v.number(),
          })
        ),
        status: v.union(v.literal('success'), v.literal('error'), v.literal('skipped')),
        error: v.optional(v.string()),
      })
    ),

    // Execution Details
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    executionTime: v.optional(v.number()), // milliseconds

    // Real-time Progress Tracking
    currentBatch: v.optional(v.number()), // Current batch being processed
    lastProcessedProduct: v.optional(
      v.object({
        productId: v.id('products'),
        title: v.string(),
        timestamp: v.number(),
      })
    ),
    aiThoughts: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          thought: v.string(),
          productId: v.optional(v.id('products')),
          confidence: v.optional(v.number()),
        })
      )
    ),

    // Error Handling
    errors: v.array(
      v.object({
        type: v.string(),
        message: v.string(),
        productId: v.optional(v.id('products')),
        timestamp: v.number(),
      })
    ),

    // Notifications
    notifications: v.object({
      email: v.boolean(),
      dashboard: v.boolean(),
      recipients: v.array(v.string()), // Email addresses
    }),
    notificationsSent: v.boolean(),

    // Audit
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_created_by', ['createdBy']),

  // LangGraph Workflow State
  workflowStates: defineTable({
    organizationId: v.id('organizations'),
    workflowId: v.string(), // LangGraph workflow ID
    jobId: v.id('aiCategorizationJobs'),

    // Workflow State
    currentNode: v.string(),
    state: v.any(), // LangGraph state object

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
    status: v.union(
      v.literal('running'),
      v.literal('paused'),
      v.literal('completed'),
      v.literal('failed')
    ),

    // Human-in-the-loop
    awaitingHumanReview: v.boolean(),
    reviewData: v.optional(v.any()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_workflow_id', ['workflowId'])
    .index('by_job_id', ['jobId'])
    .index('by_organization', ['organizationId']),

  // ================================
  // IMPORT/EXPORT & FILE MANAGEMENT
  // ================================
  importJobs: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),

    // Import Configuration
    importType: v.union(v.literal('products'), v.literal('categories'), v.literal('variants')),
    fileName: v.string(),
    fileSize: v.number(),
    fileStorageId: v.string(), // Convex storage ID

    // Mapping Configuration
    fieldMapping: v.object({
      mappings: v.any(), // Column to field mappings
      options: v.object({
        hasHeaders: v.boolean(),
        delimiter: v.string(),
        skipEmptyRows: v.boolean(),
        duplicateHandling: v.union(v.literal('skip'), v.literal('update'), v.literal('create')),
        createMissingCategories: v.optional(v.boolean()),
        defaultStatus: v.optional(
          v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))
        ),
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
    status: v.union(
      v.literal('uploaded'),
      v.literal('validating'),
      v.literal('importing'),
      v.literal('completed'),
      v.literal('failed')
    ),
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
        severity: v.union(v.literal('error'), v.literal('warning')),
      })
    ),

    importResults: v.object({
      createdRecords: v.array(v.string()), // IDs of created records
      updatedRecords: v.array(v.string()), // IDs of updated records
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
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_type', ['organizationId', 'importType']),

  // File Storage Tracking
  fileStorageEntries: defineTable({
    organizationId: v.id('organizations'),

    // File Details
    fileName: v.string(),
    originalName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    storageId: v.string(), // Convex storage ID
    url: v.string(),

    // File Type & Purpose
    fileType: v.union(
      v.literal('product_image'),
      v.literal('category_image'),
      v.literal('csv_import'),
      v.literal('export_file'),
      v.literal('avatar')
    ),
    purpose: v.string(), // Description of file purpose

    // Associated Records
    linkedRecords: v.array(
      v.object({
        recordType: v.string(),
        recordId: v.string(),
      })
    ),

    // Access Control
    isPublic: v.boolean(),
    allowedUsers: v.array(v.id('users')),

    // Lifecycle
    expiresAt: v.optional(v.number()),
    isTemporary: v.boolean(),

    // Audit
    uploadedBy: v.id('users'),
    createdAt: v.number(),
    lastAccessed: v.optional(v.number()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_storage_id', ['storageId'])
    .index('by_file_type', ['organizationId', 'fileType'])
    .index('by_uploaded_by', ['uploadedBy']),

  // ================================
  // AUDIT TRAIL & VERSIONING SYSTEM
  // ================================
  auditLogs: defineTable({
    organizationId: v.id('organizations'),

    // Event Details
    eventType: v.string(), // CREATE, UPDATE, DELETE, etc.
    entityType: v.string(), // products, categories, users, etc.
    entityId: v.string(),

    // Change Details
    changes: v.array(
      v.object({
        field: v.string(),
        oldValue: v.any(),
        newValue: v.any(),
        changeType: v.union(v.literal('added'), v.literal('modified'), v.literal('removed')),
      })
    ),

    // Full Data Snapshots (for critical entities)
    beforeSnapshot: v.optional(v.any()),
    afterSnapshot: v.optional(v.any()),

    // Context
    context: v.object({
      action: v.string(), // User action that triggered the change
      source: v.union(v.literal('web'), v.literal('api'), v.literal('import'), v.literal('ai')),
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      sessionId: v.optional(v.string()),
    }),

    // Actor
    performedBy: v.union(
      v.object({
        type: v.literal('user'),
        userId: v.id('users'),
        userEmail: v.string(),
      }),
      v.object({
        type: v.literal('system'),
        service: v.string(),
      }),
      v.object({
        type: v.literal('ai'),
        model: v.string(),
        jobId: v.optional(v.string()),
      })
    ),

    // Metadata
    metadata: v.any(), // Additional context-specific data

    // Timestamp
    timestamp: v.number(),

    // Rollback Support
    isRollbackable: v.boolean(),
    rollbackData: v.optional(v.any()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_entity', ['organizationId', 'entityType', 'entityId'])
    .index('by_timestamp', ['organizationId', 'timestamp']),

  // Data Versions for Critical Entities
  dataVersions: defineTable({
    organizationId: v.id('organizations'),

    // Version Details
    entityType: v.string(),
    entityId: v.string(),
    version: v.number(),

    // Data Snapshot
    data: v.any(), // Complete entity data at this version
    checksum: v.string(), // Data integrity verification

    // Version Metadata
    versionType: v.union(v.literal('major'), v.literal('minor'), v.literal('patch')),
    changeDescription: v.optional(v.string()),
    tags: v.array(v.string()), // Version tags (e.g., "stable", "backup")

    // Relationships
    parentVersion: v.optional(v.number()),
    childVersions: v.array(v.number()),

    // Audit
    createdBy: v.union(v.id('users'), v.literal('system')),
    createdAt: v.number(),

    // Retention
    expiresAt: v.optional(v.number()),
    isArchived: v.boolean(),
  })
    .index('by_entity', ['organizationId', 'entityType', 'entityId'])
    .index('by_version', ['organizationId', 'entityType', 'entityId', 'version'])
    .index('by_created_at', ['organizationId', 'createdAt']),

  // ================================
  // MIGRATION TRACKING
  // ================================
  migrationHistory: defineTable({
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')), // Some migrations may be org-level

    // Migration Details
    migrationName: v.string(), // e.g., "importLegacyCategories", "addProductVariants"
    migrationVersion: v.string(), // Semantic version e.g., "1.0.0"
    migrationFile: v.string(), // File path for reference

    // Execution Details
    executionId: v.string(), // Unique ID for this execution
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('rolled_back'),
      v.literal('partially_completed')
    ),

    // Progress Tracking
    totalRecords: v.optional(v.number()),
    processedRecords: v.optional(v.number()),
    successCount: v.optional(v.number()),
    errorCount: v.optional(v.number()),

    // Timing
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()), // milliseconds

    // Results
    result: v.optional(v.any()), // Migration-specific result data
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
    executedBy: v.id('users'),
    executedByEmail: v.string(),

    // Metadata
    metadata: v.any(), // Migration-specific metadata
  })
    .index('by_organization', ['organizationId'])
    .index('by_project', ['organizationId', 'projectId'])
    .index('by_name', ['organizationId', 'migrationName'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_execution', ['executionId'])
    .index('by_started_at', ['organizationId', 'startedAt']),
});
