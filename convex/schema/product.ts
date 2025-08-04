import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { 
  userAuditFields, 
  activeStatusSchema, 
  imageSchema, 
  seoFields,
  metadataSchema 
} from './common';

/**
 * Product and variant management tables
 */

export const productTables = {
  // Products table
  products: defineTable({
    organizationId: v.string(), // Will be validated as organization ID
    projectId: v.string(), // Will be validated as project ID
    
    // Core Product Information
    title: v.string(),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    productType: v.optional(v.string()),
    handle: v.string(),
    sku: v.optional(v.string()),
    status: activeStatusSchema, // 'active' | 'draft' | 'archived'
    
    // SEO & Marketing
    ...seoFields,
    tags: v.array(v.string()),
    
    // Categorization
    categories: v.array(v.string()), // Array of category IDs
    aiCategorization: v.optional(
      v.object({
        suggestions: v.array(
          v.object({
            categoryId: v.string(),
            confidence: v.number(),
            rationale: v.string(),
            status: v.string(), // 'pending' | 'accepted' | 'rejected'
          })
        ),
        lastProcessed: v.number(),
        batchId: v.optional(v.string()),
      })
    ),
    
    // Images
    images: v.array(imageSchema),
    
    // Flexible Metadata
    metadata: metadataSchema,
    
    // Audit fields
    ...userAuditFields,
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
    organizationId: v.string(), // Will be validated as organization ID
    projectId: v.string(), // Will be validated as project ID
    productId: v.string(), // Will be validated as product ID
    
    // Variant Information
    title: v.optional(v.string()),
    sku: v.string(),
    barcode: v.optional(v.string()),
    
    // Pricing
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    
    // Inventory
    inventoryQuantity: v.optional(v.number()),
    inventoryPolicy: v.string(), // 'deny' | 'continue'
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
    
    // Variant Options
    options: v.array(
      v.object({
        name: v.string(),
        value: v.string(),
      })
    ),
    
    // Images
    images: v.array(imageSchema),
    
    // Flexible Metadata
    metadata: metadataSchema,
    
    // Status
    status: activeStatusSchema,
    
    // Audit fields
    ...userAuditFields,
  })
    .index('by_product', ['productId'])
    .index('by_sku', ['organizationId', 'sku'])
    .index('by_organization_project', ['organizationId', 'projectId']),

  // Product trash for soft deletes
  productTrash: defineTable({
    organizationId: v.string(),
    projectId: v.string(),
    
    // Original product data
    productId: v.string(),
    productData: v.any(), // Full snapshot at deletion time
    
    // Deletion metadata
    deletedAt: v.number(),
    deletedBy: v.string(),
    deletionReason: v.optional(v.string()),
    deletionType: v.string(), // 'manual' | 'bulk' | 'cascade' | 'cleanup'
    
    // Recovery period
    expiresAt: v.number(),
    permanentlyDeletedAt: v.optional(v.number()),
    
    // Bulk operation tracking
    bulkOperationId: v.optional(v.string()),
    
    // Related data tracking
    relatedData: v.object({
      variantIds: v.array(v.string()),
      categoryAssignmentIds: v.array(v.string()),
      aiJobIds: v.array(v.string()),
      imageStorageIds: v.array(v.string()),
    }),
    
    // Recovery status
    recoveryStatus: v.string(), // 'recoverable' | 'recovering' | 'recovered' | 'expired' | 'permanently_deleted'
    recoveredAt: v.optional(v.number()),
    recoveredBy: v.optional(v.string()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_expiration', ['expiresAt', 'recoveryStatus'])
    .index('by_product', ['productId'])
    .index('by_bulk_operation', ['bulkOperationId'])
    .index('by_org_deleted', ['organizationId', 'deletedAt'])
    .index('by_org_expires', ['organizationId', 'expiresAt'])
    .searchIndex('search_trash', {
      searchField: 'productData.title',
      filterFields: ['organizationId', 'projectId', 'recoveryStatus'],
    }),
};