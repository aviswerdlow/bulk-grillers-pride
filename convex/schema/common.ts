import { v } from 'convex/values';

/**
 * Common field types used across multiple tables
 * Extracted to reduce type complexity and duplication
 */

// Status types - simplified to strings with runtime validation
export const activeStatusSchema = v.string(); // 'active' | 'draft' | 'archived'
export const entityStatusSchema = v.string(); // 'active' | 'suspended' | 'trial'
export const jobStatusSchema = v.string(); // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Common audit fields used in most tables
export const auditFields = {
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
};

// User audit fields
export const userAuditFields = {
  ...auditFields,
  createdBy: v.string(), // Will be validated as user ID in mutations
  lastModifiedBy: v.string(), // Will be validated as user ID in mutations
};

// Assignment types
export const assignmentTypeSchema = v.string(); // 'manual' | 'ai' | 'import'
export const assignmentStatusSchema = v.string(); // 'active' | 'pending' | 'rejected'

// Operation types
export const operationTypeSchema = v.string(); // Various operation types
export const operationStatusSchema = v.string(); // 'pending' | 'completed' | 'failed'

// Priority levels
export const prioritySchema = v.string(); // 'low' | 'normal' | 'high'

// Common metadata field
export const metadataSchema = v.any(); // Flexible JSON storage

// Image schema used in products and categories
export const imageSchema = v.object({
  id: v.string(),
  url: v.string(),
  alt: v.optional(v.string()),
  position: v.number(),
  storageId: v.string(),
});

// SEO fields
export const seoFields = {
  seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()),
};

// Timestamps
export const timestampFields = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

// Soft delete fields
export const softDeleteFields = {
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.string()),
  isDeleted: v.optional(v.boolean()),
};

// Performance metric fields
export const performanceMetricFields = {
  duration: v.number(),
  itemCount: v.optional(v.number()),
  success: v.boolean(),
  error: v.optional(v.string()),
};

// Cost tracking fields
export const costTrackingFields = {
  totalCost: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  costPerItem: v.optional(v.number()),
};

// File metadata
export const fileMetadataFields = {
  fileName: v.string(),
  fileSize: v.number(),
  mimeType: v.string(),
  storageId: v.string(),
};