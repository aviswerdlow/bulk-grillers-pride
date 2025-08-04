import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { 
  userAuditFields, 
  seoFields,
  metadataSchema,
  assignmentTypeSchema,
  assignmentStatusSchema 
} from './common';

/**
 * Category hierarchy and assignment tables
 */

export const categoryTables = {
  // Category Level Definitions
  categoryLevelDefinitions: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    projectId: v.string(), // Will be validated as project ID
    
    // Level Configuration
    level: v.number(),
    friendlyName: v.string(),
    description: v.optional(v.string()),
    
    // Display Properties
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    
    // Validation Rules
    isRequired: v.boolean(),
    maxCategories: v.optional(v.number()),
    
    // Ordering
    sortOrder: v.number(),
    
    // Status
    isActive: v.boolean(),
    
    // Metadata
    metadata: metadataSchema,
    
    // Audit fields
    ...userAuditFields,
  })
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_project_level', ['projectId', 'level'])
    .index('by_project_order', ['projectId', 'sortOrder']),

  // Categories
  categories: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    projectId: v.string(), // Will be validated as project ID
    
    // Category Information
    name: v.string(),
    description: v.optional(v.string()),
    handle: v.string(),
    externalId: v.optional(v.string()),
    
    // Hierarchy Management - using strings to avoid circular type issues
    parentId: v.optional(v.string()), // Will be validated as category ID
    level: v.number(),
    path: v.string(),
    sortOrder: v.number(),
    
    // Display Properties
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    image: v.optional(
      v.object({
        url: v.string(),
        alt: v.optional(v.string()),
        storageId: v.string(),
      })
    ),
    
    // SEO
    ...seoFields,
    
    // Status & Visibility
    status: v.string(), // 'active' | 'hidden' | 'archived'
    isVisible: v.boolean(),
    
    // Metadata
    metadata: metadataSchema,
    
    // AI Suggestions
    aiSuggestions: v.optional(
      v.object({
        suggestedBy: v.string(),
        rationale: v.string(),
        confidence: v.number(),
        approvedBy: v.optional(v.string()),
        approvedAt: v.optional(v.number()),
      })
    ),
    
    // Audit fields
    ...userAuditFields,
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

  // Category Product Assignments
  categoryProductAssignments: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    projectId: v.string(), // Will be validated as project ID
    categoryId: v.string(), // Will be validated as category ID
    productId: v.string(), // Will be validated as product ID
    
    // Assignment Details
    assignedBy: assignmentTypeSchema, // 'manual' | 'ai' | 'import'
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
    
    // Status
    status: assignmentStatusSchema, // 'active' | 'pending' | 'rejected'
    
    // Audit
    assignedByUser: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_category', ['categoryId'])
    .index('by_product', ['productId'])
    .index('by_organization_project', ['organizationId', 'projectId'])
    .index('by_status', ['organizationId', 'projectId', 'status']),

  // Category assignments trash (for cascade deletion)
  categoryAssignmentsTrash: defineTable({
    // Original assignment data
    originalAssignmentId: v.string(),
    organizationId: v.string(),
    projectId: v.string(),
    categoryId: v.string(),
    productId: v.string(),
    
    // Assignment metadata (preserved from original)
    assignedBy: assignmentTypeSchema,
    confidence: v.optional(v.number()),
    rationale: v.optional(v.string()),
    status: assignmentStatusSchema,
    
    // Assignment audit (preserved)
    assignedByUser: v.optional(v.string()),
    assignedAt: v.number(),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    
    // Deletion tracking
    deletedAt: v.number(),
    deletedBy: v.string(),
    cascadeTransactionId: v.string(),
    
    // Recovery
    recoverable: v.boolean(),
    recoveredAt: v.optional(v.number()),
    recoveredBy: v.optional(v.string()),
  })
    .index('by_product', ['productId'])
    .index('by_transaction', ['cascadeTransactionId'])
    .index('by_deleted_at', ['deletedAt'])
    .index('by_category', ['categoryId']),
};