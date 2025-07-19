/**
 * Frontend shared types for UI models
 * These types are used across components and should match the shape of data from Convex
 * but are not generated types - they are manually maintained for frontend use
 */

import { Id } from '../../../../convex/_generated/dataModel';

/**
 * Product model for UI components
 */
export interface Product {
  _id: Id<'products'>;
  title: string;
  handle: string;
  vendor?: string;
  productType?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  categories: Id<'categories'>[];
  image?: string;
  description?: string;
  price?: number;
  sku?: string;
  tags?: string[];
}

/**
 * Category model for UI components
 */
export interface Category {
  _id: Id<'categories'>;
  name: string;
  level: number;
  path: string;
  parentId?: Id<'categories'>;
  children?: Category[];
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
  isActive?: boolean;
  productCount?: number;
}

/**
 * User model for UI components
 */
export interface User {
  _id: Id<'users'>;
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  lastActiveAt?: number;
  organizationIds?: Id<'organizations'>[];
}

/**
 * Organization model for UI components
 */
export interface Organization {
  _id: Id<'organizations'>;
  name: string;
  slug: string;
  clerkOrganizationId: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  memberCount?: number;
  projectCount?: number;
}

/**
 * Project model for UI components
 */
export interface Project {
  _id: Id<'projects'>;
  organizationId: Id<'organizations'>;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Import job model for UI components
 */
export interface ImportJob {
  _id: Id<'importJobs'>;
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  type: 'categories' | 'products';
  fileUrl?: string;
  fileName?: string;
  totalItems?: number;
  processedItems?: number;
  failedItems?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * AI Categorization job model for UI components
 */
export interface CategorizationJob {
  _id: Id<'aiCategorizationJobs'>;
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalProducts?: number;
  processedProducts?: number;
  categorizedProducts?: number;
  failedProducts?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Team member model for UI components
 */
export interface TeamMember {
  _id: Id<'users'>;
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: UserRole;
  joinedAt: number;
  lastActiveAt?: number;
  isOnline?: boolean;
}

/**
 * Invitation model for UI components
 */
export interface Invitation {
  _id: string;
  organizationId: Id<'organizations'>;
  email: string;
  role: UserRole;
  invitedBy: Id<'users'>;
  invitedByName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt: number;
  expiresAt: number;
  acceptedAt?: number;
  declinedAt?: number;
  revokedAt?: number;
}

/**
 * Permission model for UI components
 */
export interface Permission {
  _id: string;
  userId: Id<'users'>;
  organizationId: Id<'organizations'>;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

/**
 * Category level definition model
 */
export interface CategoryLevel {
  _id: Id<'categoryLevelDefinitions'>;
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
  level: number;
  name: string;
  pluralName: string;
  description?: string;
}

/**
 * User roles enum
 */
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Role configuration
 */
export const roleConfig = {
  labels: {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
  } as const,

  colors: {
    owner: 'default',
    admin: 'secondary',
    editor: 'outline',
    viewer: 'outline',
  } as const,

  permissions: {
    owner: [
      'manage_organization',
      'manage_members',
      'manage_projects',
      'edit_content',
      'view_content',
    ],
    admin: ['manage_members', 'manage_projects', 'edit_content', 'view_content'],
    editor: ['edit_content', 'view_content'],
    viewer: ['view_content'],
  } as const,
} as const;

/**
 * Product status configuration
 */
export const productStatusConfig = {
  labels: {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived',
  } as const,

  colors: {
    active: 'default',
    draft: 'secondary',
    archived: 'outline',
  } as const,
} as const;

/**
 * Job status configuration
 */
export const jobStatusConfig = {
  labels: {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  } as const,

  colors: {
    pending: 'secondary',
    processing: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'outline',
  } as const,
} as const;

/**
 * Helper type for form data
 */
export type FormProduct = Omit<Product, '_id' | 'createdAt' | 'updatedAt'>;
export type FormCategory = Omit<Category, '_id' | 'createdAt' | 'updatedAt' | 'children'>;

/**
 * Helper type for selectable items
 */
export interface SelectableItem<T> {
  item: T;
  selected: boolean;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  value: string | number | boolean | string[] | number[];
}
