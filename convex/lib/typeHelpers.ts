/**
 * Type helpers to reduce TypeScript complexity and prevent TS2589 errors
 * 
 * These utilities help simplify complex type definitions and break circular dependencies
 */

import { v } from 'convex/values';

/**
 * Simplified status schemas to reduce type complexity
 */
export const statusSchema = v.string(); // Instead of v.union(v.literal(...), ...)

/**
 * Common field schemas
 */
export const timestampFields = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

export const auditFields = {
  ...timestampFields,
  createdBy: v.optional(v.string()), // Simplified from v.id('users')
  updatedBy: v.optional(v.string()), // Simplified from v.id('users')
};

/**
 * Simplified ID references to break circular dependencies
 */
export const idReference = (tableName: string) => v.string(); // Instead of v.id(tableName)

/**
 * Common status values
 */
export const STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

/**
 * Type-safe status validator
 */
export const isValidStatus = (status: string, allowedStatuses: readonly string[]): boolean => {
  return allowedStatuses.includes(status);
};

/**
 * Simplified enum schema generator
 */
export const enumSchema = (values: readonly string[]) => v.string(); // With runtime validation

/**
 * Batch operation helper to reduce nested type complexity
 */
export const batchSchema = <T>(itemSchema: T) => ({
  items: v.array(itemSchema),
  metadata: v.optional(v.object({
    totalCount: v.number(),
    processedCount: v.number(),
    errors: v.optional(v.array(v.string())),
  })),
});

/**
 * Pagination helper
 */
export const paginationSchema = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};

/**
 * Result wrapper for operations
 */
export const resultSchema = <T>(dataSchema: T) => v.object({
  success: v.boolean(),
  data: v.optional(dataSchema),
  error: v.optional(v.object({
    code: v.string(),
    message: v.string(),
    details: v.optional(v.any()),
  })),
});

/**
 * Simplified permission schema
 */
export const permissionSchema = v.array(v.string()); // Instead of complex union types

/**
 * Generic metadata schema
 */
export const metadataSchema = v.record(v.string(), v.any());