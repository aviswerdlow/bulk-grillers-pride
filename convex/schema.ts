import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { agentRegistry, agentMemory, agentTasks, crewSessions } from './schema/crewai';

export default defineSchema({
  // ================================
  // TENANT/ORGANIZATION MANAGEMENT
  // ================================
  organizations: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    domain: v.optional(v.string()), // Custom domain support
    status: v.string() /* active | suspended | trial */,
    subscription: v.object({
      plan: v.string(),
      status: v.string(),
      trialEnds: v.optional(v.number()),
      seats: v.number(),
      features: v.array(v.string()),
    }),
    settings: v.object({
      // AI Configuration
      aiProvider: v.string() /* openai | anthropic | gemini */,
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
    status: v.string() /* active | invited | suspended */,
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  // Organization Memberships with Roles
  organizationMemberships: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    userId: v.string() /* ID reference to users */,
    role: v.string() /* owner | admin | editor | viewer */,
    permissions: v.array(v.string()), // Granular permissions
    invitedBy: v.optional(v.string() /* ID reference to users */),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    status: v.string() /* active | pending | revoked */,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_organization_user', ['organizationId', 'userId']),

  // Project Management
  projects: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    name: v.string(),
    description: v.optional(v.string()),
    slug: v.string(), // URL-friendly identifier
    status: v.string() /* active | archived | draft */,
    settings: v.object({
      defaultCurrency: v.string(),
      defaultTaxRate: v.optional(v.number()),
      importSettings: v.object({
        autoValidate: v.boolean(),
        duplicateHandling: v.string() /* skip | update | create */,
        requiredFields: v.array(v.string()),
      }),
    }),
    createdBy: v.string() /* ID reference to users */,
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
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,

    // Core Product Information
    title: v.string(),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    productType: v.optional(v.string()),
    handle: v.string(), // URL slug
    sku: v.optional(v.string()), // Primary SKU for simple products
    status: v.string() /* active | draft | archived */,

    // SEO & Marketing
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    tags: v.array(v.string()),

    // Categorization
    categories: v.array(v.string() /* ID reference to categories */), // Assigned categories
    aiCategorization: v.optional(
      v.object({
        suggestions: v.array(
          v.object({
            categoryId: v.string() /* ID reference to categories */,
            confidence: v.number(),
            rationale: v.string(),
            status: v.string() /* pending | accepted | rejected */,
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
    createdBy: v.string() /* ID reference to users */,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.string() /* ID reference to users */,
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
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,
    productId: v.string() /* ID reference to products */,

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
    inventoryPolicy: v.string() /* deny | continue */, // Out of stock behavior
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
    status: v.string() /* active | draft | archived */,

    // Versioning
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.string() /* ID reference to users */,
  })
    .index('by_product', ['productId'])
    .index('by_sku', ['organizationId', 'sku'])
    .index('by_organization_project', ['organizationId', 'projectId']),

  // ================================
  // HIERARCHICAL CATEGORY MANAGEMENT
  // ================================

  // Category Level Definitions (per project)
  categoryLevelDefinitions: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,

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
    createdBy: v.string() /* ID reference to users */,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.string() /* ID reference to users */,
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_project_level', ['projectId', 'level'])
    .index('by_project_order', ['projectId', 'sortOrder']),

  categories: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,

    // Category Information
    name: v.string(),
    description: v.optional(v.string()),
    handle: v.string(), // URL-friendly slug
    externalId: v.optional(v.string()), // For import mapping (e.g., from JSON import)

    // Hierarchy Management
    parentId: v.optional(v.string() /* ID reference to categories */), // Self-referencing for hierarchy
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
    status: v.string() /* active | hidden | archived */,
    isVisible: v.boolean(),

    // Metadata
    metadata: v.any(), // Custom properties per category

    // AI Suggestions
    aiSuggestions: v.optional(
      v.object({
        suggestedBy: v.string(), // AI model that suggested this
        rationale: v.string(),
        confidence: v.number(),
        approvedBy: v.optional(v.string() /* ID reference to users */),
        approvedAt: v.optional(v.number()),
      })
    ),

    // Versioning
    version: v.number(),
    createdBy: v.string() /* ID reference to users */,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastModifiedBy: v.string() /* ID reference to users */,
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
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,
    categoryId: v.string() /* ID reference to categories */,
    productId: v.string() /* ID reference to products */,

    // Assignment Details
    assignedBy: v.string() /* manual | ai | import */,
    confidence: v.optional(v.number()), // For AI assignments
    rationale: v.optional(v.string()), // Why this assignment was made

    // Status
    status: v.string() /* active | pending | rejected */,

    // Audit
    assignedByUser: v.optional(v.string() /* ID reference to users */),
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
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,
    productId: v.string() /* ID reference to products */,
    jobId: v.string() /* ID reference to aiCategorizationJobs */,
    suggestedCategoryId: v.string() /* ID reference to categories */,
    feedback: v.string() /* accepted | rejected | corrected */,
    correctedCategoryId: v.optional(v.string() /* ID reference to categories */),
    reason: v.optional(v.string()),
    confidence: v.number(),
    userId: v.string() /* ID reference to users */,
    createdAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_product', ['productId'])
    .index('by_job', ['jobId'])
    .index('by_category', ['suggestedCategoryId'])
    .index('by_user', ['userId']),

  aiCategorizationJobs: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,

    // Job Configuration
    jobType: v.string() /* bulk_categorization | single_product | validation */,
    batchSize: v.number(),
    aiProvider: v.string(),
    aiModel: v.string(),
    prompt: v.string(),

    // Target Products
    productIds: v.array(v.string() /* ID reference to products */), // Products to process
    categoryContext: v.any(), // JSON of available categories

    // Job Status
    status: v.string() /* pending | running | completed | failed | cancelled */,
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
        productId: v.string() /* ID reference to products */,
        suggestions: v.array(
          v.object({
            categoryId: v.string() /* ID reference to categories */,
            confidence: v.number(),
            rationale: v.string(),
          })
        ),
        newCategorySuggestions: v.array(
          v.object({
            name: v.string(),
            parentId: v.optional(v.string() /* ID reference to categories */),
            rationale: v.string(),
            confidence: v.number(),
          })
        ),
        status: v.string() /* success | error | skipped */,
        error: v.optional(v.string()),
      })
    ),

    // Execution Details
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    executionTime: v.optional(v.number()), // milliseconds
    
    // Cost Tracking
    totalCost: v.optional(v.number()), // Total cost in USD
    totalTokens: v.optional(v.number()), // Total tokens used

    // Real-time Progress Tracking
    currentBatch: v.optional(v.number()), // Current batch being processed
    lastProcessedProduct: v.optional(
      v.object({
        productId: v.string() /* ID reference to products */,
        title: v.string(),
        timestamp: v.number(),
      })
    ),
    aiThoughts: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          thought: v.string(),
          productId: v.optional(v.string() /* ID reference to products */),
          confidence: v.optional(v.number()),
        })
      )
    ),

    // Error Handling
    errors: v.array(
      v.object({
        type: v.string(),
        message: v.string(),
        productId: v.optional(v.string() /* ID reference to products */),
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
    createdBy: v.string() /* ID reference to users */,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_created_by', ['createdBy']),

  // LangGraph Workflow State
  workflowStates: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    workflowId: v.string(), // LangGraph workflow ID
    jobId: v.string() /* ID reference to aiCategorizationJobs */,

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
    status: v.string() /* running | paused | completed | failed */,

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
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,

    // Import Configuration
    importType: v.string() /* products | categories | variants */,
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
        duplicateHandling: v.string() /* skip | update | create */,
        createMissingCategories: v.optional(v.boolean()),
        defaultStatus: v.optional(
          v.string() /* active | draft | archived */
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
    status: v.string() /* uploaded | validating | importing | completed | failed */,
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
        severity: v.string() /* error | warning */,
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
    createdBy: v.string() /* ID reference to users */,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'status'])
    .index('by_type', ['organizationId', 'importType']),

  // File Storage Tracking
  fileStorageEntries: defineTable({
    organizationId: v.string() /* ID reference to organizations */,

    // File Details
    fileName: v.string(),
    originalName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    storageId: v.string(), // Convex storage ID
    url: v.string(),

    // File Type & Purpose
    fileType: v.string() /* product_image | category_image | csv_import | export_file | avatar */,
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
    allowedUsers: v.array(v.string() /* ID reference to users */),

    // Lifecycle
    expiresAt: v.optional(v.number()),
    isTemporary: v.boolean(),

    // Audit
    uploadedBy: v.string() /* ID reference to users */,
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
    organizationId: v.string() /* ID reference to organizations */,

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
        changeType: v.string() /* added | modified | removed */,
      })
    ),

    // Full Data Snapshots (for critical entities)
    beforeSnapshot: v.optional(v.any()),
    afterSnapshot: v.optional(v.any()),

    // Context
    context: v.object({
      action: v.string(), // User action that triggered the change
      source: v.string() /* web | api | import | ai */,
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      sessionId: v.optional(v.string()),
    }),

    // Actor
    performedBy: v.union(
      v.object({
        type: v.literal('user'),
        userId: v.string() /* ID reference to users */,
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
    organizationId: v.string() /* ID reference to organizations */,

    // Version Details
    entityType: v.string(),
    entityId: v.string(),
    version: v.number(),

    // Data Snapshot
    data: v.any(), // Complete entity data at this version
    checksum: v.string(), // Data integrity verification

    // Version Metadata
    versionType: v.string() /* major | minor | patch */,
    changeDescription: v.optional(v.string()),
    tags: v.array(v.string()), // Version tags (e.g., "stable", "backup")

    // Relationships
    parentVersion: v.optional(v.number()),
    childVersions: v.array(v.number()),

    // Audit
    createdBy: v.union(v.string() /* ID reference to users */, v.literal('system')),
    createdAt: v.number(),

    // Retention
    expiresAt: v.optional(v.number()),
    isArchived: v.boolean(),
  })
    .index('by_entity', ['organizationId', 'entityType', 'entityId'])
    .index('by_version', ['organizationId', 'entityType', 'entityId', 'version'])
    .index('by_created_at', ['organizationId', 'createdAt']),

  // ================================
  // PRODUCT DELETION & TRASH MANAGEMENT
  // ================================
  productTrash: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,
    
    // Original product data
    productId: v.string() /* ID reference to products */,
    productData: v.any(), // Full snapshot at deletion time
    
    // Deletion metadata
    deletedAt: v.number(),
    deletedBy: v.string() /* ID reference to users */,
    deletionReason: v.optional(v.string()),
    deletionType: v.string() /* manual | bulk | cascade | cleanup */,
    
    // Recovery period
    expiresAt: v.number(), // deletedAt + 30 days
    permanentlyDeletedAt: v.optional(v.number()),
    
    // Bulk operation tracking
    bulkOperationId: v.optional(v.string()),
    
    // Related data tracking
    relatedData: v.object({
      variantIds: v.array(v.string() /* ID reference to productVariants */),
      categoryAssignmentIds: v.array(v.string() /* ID reference to categoryProductAssignments */),
      aiJobIds: v.array(v.string() /* ID reference to aiCategorizationJobs */),
      imageStorageIds: v.array(v.string()),
    }),
    
    // Recovery status
    recoveryStatus: v.string() /* recoverable | recovering | recovered | expired | permanently_deleted */,
    recoveredAt: v.optional(v.number()),
    recoveredBy: v.optional(v.string() /* ID reference to users */),
  })
    .index('by_organization', ['organizationId'])
    .index('by_expiration', ['expiresAt', 'recoveryStatus'])
    .index('by_product', ['productId'])
    .index('by_bulk_operation', ['bulkOperationId'])
    // New composite indexes for performance optimization
    .index('by_org_deleted', ['organizationId', 'deletedAt'])
    .index('by_org_expires', ['organizationId', 'expiresAt'])
    .searchIndex('search_trash', {
      searchField: 'productData.title',
      filterFields: ['organizationId', 'projectId', 'recoveryStatus'],
    }),

  // Enhanced deletion audit logs
  deletionAuditLogs: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.optional(v.string() /* ID reference to projects */),
    
    // Operation details
    operationType: v.string() /* soft_delete | bulk_delete | restore | permanent_delete | auto_cleanup */,
    
    // Affected entities
    affectedProducts: v.array(v.object({
      productId: v.string() /* ID reference to products */,
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
        categoryId: v.string() /* ID reference to categories */,
        categoryName: v.string(),
        count: v.number(),
      })),
    }),
    
    // User and timestamp
    performedBy: v.string() /* ID reference to users */,
    performedAt: v.number(),
    userEmail: v.string(),
    userName: v.string(),
    
    // Additional context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    confirmationMethod: v.optional(v.string()), // e.g., "typed DELETE 45"
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['performedBy'])
    .index('by_timestamp', ['performedAt']),

  // ================================
  // MIGRATION TRACKING
  // ================================
  migrationHistory: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.optional(v.string() /* ID reference to projects */), // Some migrations may be org-level

    // Migration Details
    migrationName: v.string(), // e.g., "importLegacyCategories", "addProductVariants"
    migrationVersion: v.string(), // Semantic version e.g., "1.0.0"
    migrationFile: v.string(), // File path for reference

    // Execution Details
    executionId: v.string(), // Unique ID for this execution
    status: v.string() /* pending | running | completed | failed | rolled_back | partially_completed */,

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
    executedBy: v.string() /* ID reference to users */,
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

  // ================================
  // PERFORMANCE MONITORING
  // ================================
  performanceMetrics: defineTable({
    // Organization scope
    organizationId: v.string() /* ID reference to organizations */,
    
    // Operation identification
    operation: v.string(), // e.g., "trash.query.list", "dashboard.load", "ai.categorization"
    
    // Timing metrics
    startTime: v.number(), // Unix timestamp
    duration: v.number(), // milliseconds
    
    // Resource metrics
    itemCount: v.optional(v.number()), // Number of items processed
    memoryUsed: v.optional(v.number()), // bytes (if available)
    
    // Context
    projectId: v.optional(v.string() /* ID reference to projects */),
    userId: v.optional(v.string() /* ID reference to users */),
    
    // Status
    success: v.boolean(),
    error: v.optional(v.string()),
    
    // Additional metadata
    metadata: v.optional(v.any()), // Operation-specific data (e.g., query parameters)
    
    // Aggregation helpers
    date: v.string(), // YYYY-MM-DD for daily aggregation
    hour: v.number(), // 0-23 for hourly aggregation
  })
    .index('by_organization_operation', ['organizationId', 'operation'])
    .index('by_timestamp', ['organizationId', 'startTime'])
    .index('by_date', ['organizationId', 'date'])
    .index('by_operation_date', ['operation', 'date'])
    .index('by_project', ['organizationId', 'projectId'])
    .index('by_user', ['organizationId', 'userId']),

  // ================================
  // CACHING LAYER
  // ================================
  cache: defineTable({
    // Cache key (unique identifier)
    key: v.string(),
    
    // Cached value (any JSON-serializable data)
    value: v.any(),
    
    // TTL management
    expiresAt: v.number(), // Unix timestamp when entry expires
    createdAt: v.number(), // Unix timestamp when entry was created
    
    // Access statistics
    hits: v.number(), // Number of times accessed
    lastAccessedAt: v.number(), // Unix timestamp of last access
    
    // Organization scope (optional)
    organizationId: v.optional(v.string() /* ID reference to organizations */),
    
    // Metadata
    dataType: v.string(), // Type of data cached (e.g., 'categories', 'products')
    size: v.number(), // Approximate size in bytes
  })
    .index('by_key', ['key'])
    .index('by_expiry', ['expiresAt'])
    .index('by_organization', ['organizationId'])
    .index('by_type', ['dataType'])
    .index('by_access', ['lastAccessedAt']),

  // ================================
  // ACCESSIBILITY MANAGEMENT
  // ================================
  accessibilityPreferences: defineTable({
    // User association
    userId: v.string() /* ID reference to users */,
    
    // User preferences
    preferences: v.object({
      reducedMotion: v.boolean(),
      highContrast: v.boolean(),
      screenReaderActive: v.boolean(),
      keyboardNavigation: v.boolean(),
      preferredConfirmationMethod: v.string() /* standard_click | hold_to_confirm | type_to_confirm | biometric | voice | pattern_draw */,
      focusIndicatorStyle: v.string() /* default | high-visibility | custom */,
      announcementVerbosity: v.string() /* minimal | standard | verbose */,
    }),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId']),

  // Deletion session state management
  deletionSessions: defineTable({
    // Session identification
    sessionId: v.string(), // Unique session identifier
    userId: v.string() /* ID reference to users */,
    organizationId: v.string() /* ID reference to organizations */,
    
    // Session state
    state: v.string() /* active | completed | cancelled */,
    currentStep: v.string() /* review_consequences | select_options | confirm | processing | complete */,
    
    // Deletion data
    selectedProducts: v.array(v.string() /* ID reference to products */),
    confirmationMethod: v.string() /* standard_click | hold_to_confirm | type_to_confirm | biometric | voice | pattern_draw */,
    
    // Focus history for accessibility
    focusHistory: v.array(
      v.object({
        elementId: v.string(),
        timestamp: v.number(),
        context: v.string() /* modal | wizard | table | form */,
        scrollPosition: v.optional(
          v.object({
            x: v.number(),
            y: v.number(),
          })
        ),
        stepIndex: v.optional(v.number()),
      })
    ),
    
    // Security tracking
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
    validNonces: v.optional(v.array(v.string())), // For CSRF protection
    rateLimitWindowStart: v.optional(v.number()), // For rate limiting
    
    // Timestamps
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    lastActivityAt: v.number(), // For session timeout (30 minutes)
  })
    .index('by_session', ['sessionId'])
    .index('by_user', ['userId'])
    .index('by_organization', ['organizationId'])
    .index('by_state', ['state'])
    .index('by_activity', ['lastActivityAt']),

  // ================================
  // MIGRATION MANAGEMENT
  // ================================
  // Track schema migrations for version control
  schemaMigrations: defineTable({
    migrationId: v.string(), // Unique identifier like "001_cascade_deletion"
    version: v.string(), // Semantic version
    description: v.string(),
    
    // Status tracking
    status: v.string() /* pending | in_progress | completed | failed | rolled_back */,
    
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
    originalAssignmentId: v.string() /* ID reference to categoryProductAssignments */,
    organizationId: v.string() /* ID reference to organizations */,
    projectId: v.string() /* ID reference to projects */,
    categoryId: v.string() /* ID reference to categories */,
    productId: v.string() /* ID reference to products */,
    
    // Assignment metadata (preserved from original)
    assignedBy: v.string() /* manual | ai | import */,
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
    status: v.string() /* active | pending | rejected */,
    
    // Assignment audit (preserved)
    assignedByUser: v.optional(v.string() /* ID reference to users */),
    assignedAt: v.number(),
    verifiedBy: v.optional(v.string() /* ID reference to users */),
    verifiedAt: v.optional(v.number()),
    
    // Deletion tracking
    deletedAt: v.number(),
    deletedBy: v.string() /* ID reference to users */,
    cascadeTransactionId: v.string(),
    
    // Recovery
    recoverable: v.boolean(),
    recoveredAt: v.optional(v.number()),
    recoveredBy: v.optional(v.string() /* ID reference to users */),
  })
    .index('by_product', ['productId'])
    .index('by_transaction', ['cascadeTransactionId'])
    .index('by_deleted_at', ['deletedAt'])
    .index('by_category', ['categoryId']),

  // Track cascade deletion transactions for atomicity
  cascadeTransactions: defineTable({
    transactionId: v.string(), // Unique transaction identifier
    organizationId: v.string() /* ID reference to organizations */,
    
    // Operation details
    operationType: v.string() /* single_delete | bulk_delete | cascade_delete | restore | permanent_delete */,
    status: v.string() /* pending | in_progress | completed | failed | rolled_back */,
    
    // Affected entities
    primaryEntityId: v.string() /* ID reference to products */,
    affectedEntities: v.object({
      products: v.array(v.string() /* ID reference to products */),
      variants: v.array(v.string() /* ID reference to productVariants */),
      assignments: v.array(v.string() /* ID reference to categoryProductAssignments */),
      images: v.array(v.string()),
    }),
    
    // Operation steps for rollback
    operations: v.array(v.object({
      stepId: v.string(),
      operation: v.string(),
      targetType: v.string(),
      targetId: v.string(),
      status: v.string() /* pending | completed | failed */,
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })),
    
    // Execution tracking
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    executedBy: v.string() /* ID reference to users */,
    
    // Error handling
    error: v.optional(v.object({
      message: v.string(),
      stack: v.optional(v.string()),
      failedOperation: v.string(),
      failedAt: v.number(),
    })),
    
    // Rollback info
    rollbackAt: v.optional(v.number()),
    rollbackBy: v.optional(v.string() /* ID reference to users */),
    rollbackReason: v.optional(v.string()),
    rollbackStatus: v.optional(v.string() /* in_progress | completed | failed */),
    
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
    originalProductId: v.string() /* ID reference to products */,
    organizationId: v.string() /* ID reference to organizations */,
    
    // File metadata
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    
    // Queue metadata
    queuedAt: v.number(),
    queuedBy: v.string() /* deletion | migration | manual */,
    cascadeTransactionId: v.optional(v.string()),
    priority: v.string() /* low | normal | high */,
    
    // Processing status
    status: v.string() /* pending | processing | completed | failed | skipped | cancelled */,
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
    verificationMethod: v.optional(v.string() /* storage_api | manual | automated_scan */),
  })
    .index('by_status', ['status'])
    .index('by_queued_at', ['queuedAt'])
    .index('by_retain_until', ['retainUntil'])
    .index('by_priority_status', ['priority', 'status'])
    .index('by_product', ['originalProductId']),
  
  // Distributed locks for preventing concurrent operations
  distributedLocks: defineTable({
    // Lock identification
    resourceType: v.string(), // e.g., 'product', 'category', 'bulk_operation'
    resourceId: v.string(), // e.g., product ID, operation ID
    organizationId: v.string() /* ID reference to organizations */,
    
    // Lock metadata
    lockId: v.string(), // Unique lock identifier
    lockType: v.union(
      v.literal('exclusive'), // Only one operation allowed
      v.literal('shared') // Multiple read operations allowed
    ),
    operation: v.string(), // e.g., 'delete', 'update', 'restore'
    
    // Lock ownership
    ownerId: v.string(), // Transaction ID or user ID
    ownerType: v.string() /* transaction | user | system */,
    
    // Timing
    acquiredAt: v.number(),
    expiresAt: v.number(), // Auto-release after timeout
    renewedAt: v.optional(v.number()),
    renewCount: v.number(),
    maxRenewals: v.number(), // Prevent infinite locks
    
    // Status
    status: v.string() /* active | expired | released */,
    
    // Additional context
    metadata: v.optional(v.any()), // Additional lock-specific data
    reason: v.optional(v.string()), // Why the lock was acquired
  })
    .index('by_resource', ['resourceType', 'resourceId', 'status'])
    .index('by_organization', ['organizationId', 'status'])
    .index('by_owner', ['ownerId', 'status'])
    .index('by_expiry', ['expiresAt', 'status'])
    .index('by_status', ['status']),

  // ================================
  // CREWAI INTEGRATION
  // ================================
  agentRegistry,
  agentMemory,
  agentTasks,
  crewSessions,
  
  // ================================
  // PERFORMANCE BENCHMARKING
  // ================================
  performanceBenchmarks: defineTable({
    name: v.string(),
    description: v.string(),
    status: v.string() /* pending | running | completed | failed */,
    systems: v.array(v.string() /* langchain | crewai */),
    providers: v.array(v.string() /* openai | anthropic | gemini */),
    
    testParams: v.object({
      productCounts: v.array(v.number()),
      batchSizes: v.array(v.number()),
      concurrencyLevels: v.array(v.number()),
      warmupRuns: v.number(),
      testRuns: v.number(),
      timeoutMs: v.number(),
    }),
    
    successCriteria: v.object({
      maxResponseTimeP95: v.number(),
      minThroughput: v.number(),
      maxErrorRate: v.number(),
      maxCostPerProduct: v.number(),
    }),
    
    results: v.array(v.string() /* ID reference to benchmarkMetrics */),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_createdAt', ['createdAt']),
  
  benchmarkMetrics: defineTable({
    benchmarkId: v.string() /* ID reference to performanceBenchmarks */,
    timestamp: v.number(),
    system: v.string() /* langchain | crewai */,
    provider: v.string() /* openai | anthropic | gemini */,
    
    responseTime: v.object({
      p50: v.number(),
      p95: v.number(),
      p99: v.number(),
      mean: v.number(),
      min: v.number(),
      max: v.number(),
    }),
    
    throughput: v.object({
      productsPerMinute: v.number(),
      requestsPerSecond: v.number(),
      batchSize: v.number(),
    }),
    
    resourceUsage: v.object({
      tokenCount: v.number(),
      memoryUsageMB: v.number(),
      cpuPercentage: v.number(),
    }),
    
    cost: v.object({
      totalCost: v.number(),
      costPerProduct: v.number(),
      tokenCost: v.number(),
    }),
    
    quality: v.object({
      accuracy: v.number(),
      errorRate: v.number(),
      validationPassRate: v.number(),
    }),
    
    testConfig: v.object({
      productCount: v.number(),
      concurrency: v.number(),
      warmupRuns: v.number(),
      testRuns: v.number(),
    }),
    
    createdAt: v.number(),
  })
    .index('by_benchmarkId', ['benchmarkId'])
    .index('by_system_provider', ['system', 'provider'])
    .index('by_timestamp', ['timestamp']),

  // CrewAI Monitoring Tables
  crewAIMetrics: defineTable({
    jobId: v.string() /* ID reference to aiCategorizationJobs */,
    organizationId: v.string() /* ID reference to organizations */,
    timestamp: v.number(),
    metricType: v.string(),
    metricName: v.string(),
    value: v.number(),
    unit: v.string(),
    tags: v.any(),
    metadata: v.optional(v.any()),
  })
    .index('by_job', ['jobId'])
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_metric_name', ['metricName', 'timestamp']),

  crewAIAggregatedMetrics: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    period: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    metricName: v.string(),
    count: v.number(),
    sum: v.number(),
    min: v.number(),
    max: v.number(),
    avg: v.number(),
    p50: v.number(),
    p95: v.number(),
    p99: v.number(),
    tags: v.any(),
  })
    .index('by_organization_time', ['organizationId', 'startTime'])
    .index('by_metric_period', ['metricName', 'period', 'startTime']),

  crewAIAlerts: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    jobId: v.optional(v.string() /* ID reference to aiCategorizationJobs */),
    severity: v.string(),
    type: v.string(),
    message: v.string(),
    metric: v.string(),
    threshold: v.number(),
    actualValue: v.number(),
    timestamp: v.number(),
    acknowledged: v.boolean(),
    acknowledgedBy: v.optional(v.string() /* ID reference to users */),
    acknowledgedAt: v.optional(v.number()),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string() /* ID reference to users */),
    resolution: v.optional(v.string()),
    actions: v.array(v.string()),
    correlationId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    notes: v.optional(v.string()),
    occurrenceCount: v.optional(v.number()),
    lastOccurrence: v.optional(v.number()),
    remediationAttempts: v.optional(v.number()),
    lastRemediationAt: v.optional(v.number()),
    lastRemediationSuccess: v.optional(v.boolean()),
  })
    .index('by_organization_status', ['organizationId', 'resolved'])
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_organization_type', ['organizationId', 'type'])
    .index('by_job', ['jobId']),

  crewAIAlertHistory: defineTable({
    alertId: v.string() /* ID reference to crewAIAlerts */,
    action: v.string(),
    userId: v.string() /* ID reference to users */,
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_alert', ['alertId', 'timestamp']),

  crewAIOptimizations: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    type: v.string(),
    priority: v.string(),
    title: v.string(),
    description: v.string(),
    expectedImpact: v.object({
      metric: v.string(),
      currentValue: v.number(),
      expectedValue: v.number(),
      improvementPercent: v.number(),
    }),
    implementation: v.object({
      effort: v.string(),
      risk: v.string(),
      steps: v.array(v.string()),
      duration: v.optional(v.number()),
    }),
    status: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    implementationStarted: v.optional(v.number()),
    implementationNotes: v.optional(v.string()),
    actualImpact: v.optional(v.any()),
    successMetrics: v.optional(v.any()),
    resultsUpdatedAt: v.optional(v.number()),
    estimatedValue: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    estimatedROI: v.optional(v.number()),
    paybackPeriod: v.optional(v.number()),
    targetMetric: v.optional(v.string()),
    relevanceScore: v.optional(v.number()),
    expectedGapReduction: v.optional(v.number()),
    tactics: v.optional(v.array(v.string())),
  })
    .index('by_organization_status', ['organizationId', 'status'])
    .index('by_organization_priority', ['organizationId', 'priority'])
    .index('by_type', ['type', 'status']),

  crewAICostTracking: defineTable({
    jobId: v.string() /* ID reference to aiCategorizationJobs */,
    organizationId: v.string() /* ID reference to organizations */,
    timestamp: v.number(),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    inputCost: v.number(),
    outputCost: v.number(),
    totalCost: v.number(),
    productCount: v.number(),
    costPerCategorization: v.number(),
    cacheHits: v.optional(v.number()),
  })
    .index('by_job', ['jobId'])
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_provider_model', ['provider', 'model', 'timestamp']),

  crewAIMonthlyReports: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    month: v.number(),
    year: v.number(),
    stats: v.any(),
    comparison: v.any(),
    trends: v.any(),
    insights: v.any(),
    createdAt: v.number(),
  })
    .index('by_organization_period', ['organizationId', 'year', 'month']),

  crewAIABTests: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    optimizationId: v.string() /* ID reference to crewAIOptimizations */,
    config: v.any(),
    status: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    results: v.optional(v.any()),
  })
    .index('by_organization_status', ['organizationId', 'status'])
    .index('by_optimization', ['optimizationId']),

  crewAILearnings: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    optimizationType: v.string(),
    learnings: v.any(),
    createdAt: v.number(),
  })
    .index('by_organization_type', ['organizationId', 'optimizationType']),

  crewAIRemediationLog: defineTable({
    alertId: v.string() /* ID reference to crewAIAlerts */,
    action: v.string(),
    success: v.boolean(),
    result: v.string(),
    timestamp: v.number(),
  })
    .index('by_alert', ['alertId', 'timestamp']),

  // ================================
  // A/B TESTING INFRASTRUCTURE
  // ================================
  
  // A/B Test Configuration
  abTestConfigurations: defineTable({
    testName: v.string(),
    enabled: v.boolean(),
    
    // Traffic configuration
    trafficPercentage: v.object({
      crewAI: v.number(), // 0-100
      langchain: v.number(), // 0-100
    }),
    
    // Progressive rollout schedule
    rolloutSchedule: v.array(v.object({
      date: v.number(), // timestamp
      crewAIPercentage: v.number(),
      langchainPercentage: v.number(),
      applied: v.boolean(),
    })),
    
    // Component-level flags
    componentFlags: v.object({
      productAnalyzer: v.boolean(),
      categoryMatcher: v.boolean(),
      qualityValidator: v.boolean(),
      memorySystem: v.boolean(),
      caching: v.boolean(),
      monitoring: v.boolean(),
    }),
    
    // User targeting
    userTargeting: v.object({
      enabled: v.boolean(),
      targetedOrganizations: v.array(v.string() /* ID reference to organizations */),
      excludedOrganizations: v.array(v.string() /* ID reference to organizations */),
      betaUsers: v.array(v.string() /* ID reference to users */),
    }),
    
    // Performance thresholds for auto-rollback
    performanceThresholds: v.object({
      maxResponseTime: v.number(), // milliseconds
      minAccuracy: v.number(), // percentage
      maxErrorRate: v.number(), // percentage
      maxCostIncrease: v.number(), // percentage
    }),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string() /* ID reference to users */,
    lastRollbackAt: v.optional(v.number()),
    rollbackReason: v.optional(v.string()),
  })
    .index('by_testName', ['testName'])
    .index('by_enabled', ['enabled']),

  // A/B Test Metrics
  abTestMetrics: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    system: v.string() /* crewai | langchain */,
    
    // Performance metrics
    responseTime: v.number(),
    accuracy: v.number(),
    errorRate: v.number(),
    tokenUsage: v.number(),
    cost: v.number(),
    
    // Operational metrics
    batchSize: v.number(),
    categoryCount: v.number(),
    cacheHitRate: v.number(),
    
    // Context
    timestamp: v.number(),
    productIds: v.array(v.string() /* ID reference to products */),
    jobId: v.string() /* ID reference to aiCategorizationJobs */,
  })
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_system_time', ['system', 'timestamp'])
    .index('by_job', ['jobId']),

  // A/B Test Alerts
  abTestAlerts: defineTable({
    timestamp: v.number(),
    system: v.string() /* crewai | langchain */,
    organizationId: v.string() /* ID reference to organizations */,
    violations: v.array(v.string()),
    metrics: v.object({
      responseTime: v.number(),
      accuracy: v.number(),
      errorRate: v.number(),
      tokenUsage: v.number(),
      cost: v.number(),
      batchSize: v.number(),
      categoryCount: v.number(),
      cacheHitRate: v.number(),
    }),
    severity: v.string() /* warning | critical */,
  })
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_severity', ['severity'])
    .index('by_system', ['system']),

  // A/B Test Audit Log
  abTestAuditLog: defineTable({
    action: v.string(),
    userId: v.union(v.string() /* ID reference to users */, v.literal('system')),
    timestamp: v.number(),
    changes: v.optional(v.any()),
    previousConfig: v.optional(v.any()),
    reason: v.optional(v.string()),
  })
    .index('by_user_time', ['userId', 'timestamp'])
    .index('by_action', ['action']),

  // ================================
  // RATE LIMITING INFRASTRUCTURE
  // ================================
  
  // Rate limit tracking per user/organization
  rateLimits: defineTable({
    // Identification
    organizationId: v.string() /* ID reference to organizations */,
    userId: v.optional(v.string() /* ID reference to users */), // Optional for API key-based requests
    identifier: v.string(), // Could be userId, API key, IP address, etc.
    
    // Rate limit configuration
    resource: v.string(), // e.g., 'ai.categorization', 'import.products', 'api.products'
    
    // Window tracking
    windowStart: v.number(), // Unix timestamp for current window start
    windowDuration: v.number(), // Duration in seconds (e.g., 60 for 1 minute)
    
    // Request tracking
    requestCount: v.number(), // Requests in current window
    limit: v.number(), // Max requests allowed in window
    
    // Token/resource tracking (for AI endpoints)
    tokensUsed: v.optional(v.number()), // For AI endpoints
    tokenLimit: v.optional(v.number()), // Max tokens per window
    
    // Burst allowance
    burstLimit: v.optional(v.number()), // Short-term burst allowance
    burstRemaining: v.optional(v.number()), // Remaining burst capacity
    
    // Status
    isBlocked: v.boolean(), // Currently rate limited
    blockedUntil: v.optional(v.number()), // When the block expires
    
    // Metadata
    lastRequest: v.number(), // Timestamp of last request
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_identifier_resource', ['identifier', 'resource'])
    .index('by_organization_resource', ['organizationId', 'resource'])
    .index('by_window_start', ['windowStart'])
    .index('by_blocked', ['isBlocked', 'blockedUntil']),

  // Rate limit configuration per resource/plan
  rateLimitConfigurations: defineTable({
    // Resource configuration
    resource: v.string(), // e.g., 'ai.categorization', 'import.products'
    plan: v.string(), // e.g., 'free', 'starter', 'professional', 'enterprise'
    
    // Limits
    requestsPerMinute: v.optional(v.number()),
    requestsPerHour: v.optional(v.number()),
    requestsPerDay: v.optional(v.number()),
    
    // AI-specific limits
    tokensPerMinute: v.optional(v.number()),
    tokensPerHour: v.optional(v.number()),
    tokensPerDay: v.optional(v.number()),
    
    // Burst configuration
    burstMultiplier: v.number(), // e.g., 2x for short bursts
    burstDuration: v.number(), // Seconds burst is allowed
    
    // Cost-based limits
    costPerRequest: v.optional(v.number()), // USD cents
    maxCostPerDay: v.optional(v.number()), // USD
    
    // Response configuration
    retryAfter: v.number(), // Seconds to wait before retry
    errorMessage: v.string(), // Custom error message
    
    // Flags
    isEnabled: v.boolean(),
    allowOverride: v.boolean(), // Can be overridden per organization
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string() /* ID reference to users */,
  })
    .index('by_resource_plan', ['resource', 'plan'])
    .index('by_enabled', ['isEnabled']),

  // Rate limit violations for monitoring
  rateLimitViolations: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    userId: v.optional(v.string() /* ID reference to users */),
    identifier: v.string(),
    
    // Violation details
    resource: v.string(),
    timestamp: v.number(),
    requestCount: v.number(),
    limit: v.number(),
    
    // Request context
    endpoint: v.string(),
    method: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    
    // Response
    statusCode: v.number(), // 429
    retryAfter: v.number(), // Seconds
    
    // Severity
    severity: v.union(
      v.literal('low'), // Under 2x limit
      v.literal('medium'), // 2-5x limit
      v.literal('high'), // 5-10x limit
      v.literal('critical') // >10x limit or repeated violations
    ),
    
    // Pattern detection
    violationCount24h: v.number(), // Violations in last 24 hours
    isRepeatOffender: v.boolean(),
  })
    .index('by_organization_time', ['organizationId', 'timestamp'])
    .index('by_identifier_time', ['identifier', 'timestamp'])
    .index('by_resource', ['resource', 'timestamp'])
    .index('by_severity', ['severity', 'timestamp']),

  // API key management with rate limits
  apiKeys: defineTable({
    organizationId: v.string() /* ID reference to organizations */,
    
    // Key details
    name: v.string(),
    keyHash: v.string(), // Hashed API key
    keyPrefix: v.string(), // First 8 chars for identification
    
    // Permissions
    scopes: v.array(v.string()), // e.g., ['read:products', 'write:products']
    allowedResources: v.array(v.string()), // Specific resources this key can access
    
    // Rate limit overrides
    rateLimitOverrides: v.optional(v.object({
      requestsPerMinute: v.optional(v.number()),
      requestsPerHour: v.optional(v.number()),
      requestsPerDay: v.optional(v.number()),
      tokensPerDay: v.optional(v.number()),
    })),
    
    // Usage tracking
    lastUsedAt: v.optional(v.number()),
    usageCount: v.number(),
    
    // Status
    status: v.string() /* active | revoked | expired */,
    expiresAt: v.optional(v.number()),
    
    // Audit
    createdBy: v.string() /* ID reference to users */,
    createdAt: v.number(),
    revokedBy: v.optional(v.string() /* ID reference to users */),
    revokedAt: v.optional(v.number()),
    revokeReason: v.optional(v.string()),
  })
    .index('by_organization', ['organizationId', 'status'])
    .index('by_key_prefix', ['keyPrefix'])
    .index('by_status', ['status'])
    .index('by_expires', ['expiresAt', 'status']),
});
