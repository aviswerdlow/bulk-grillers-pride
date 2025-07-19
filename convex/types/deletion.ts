import { Doc, Id } from '../_generated/dataModel';

/**
 * Type definitions for the product deletion feature
 */

// Deletion operation types
export type DeletionType = 'manual' | 'bulk' | 'cascade' | 'cleanup';
export type RecoveryStatus = 'recoverable' | 'recovering' | 'recovered' | 'expired' | 'permanently_deleted';
export type OperationType = 'soft_delete' | 'bulk_delete' | 'restore' | 'permanent_delete' | 'auto_cleanup';

// Request types for mutations
export interface DeleteProductRequest {
  productId: Id<'products'>;
  reason?: string;
}

export interface BulkDeleteProductsRequest {
  productIds: Id<'products'>[];
  confirmationText: string;
  reason?: string;
}

export interface RestoreProductsRequest {
  trashIds: Id<'productTrash'>[];
}

export interface PermanentlyDeleteProductsRequest {
  trashIds: Id<'productTrash'>[];
  confirmationText: string;
}

// Response types for mutations
export interface DeleteProductResponse {
  success: boolean;
  trashId: Id<'productTrash'>;
}

export interface BulkDeleteResult {
  success: boolean;
  productId: Id<'products'>;
  error?: string;
  trashId?: Id<'productTrash'>;
}

export interface BulkDeleteProductsResponse {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  bulkOperationId: string;
  results: BulkDeleteResult[];
}

export interface RestoreProductsResponse {
  success: boolean;
  restoredCount: number;
  restoredIds: Id<'products'>[];
}

export interface PermanentlyDeleteProductsResponse {
  success: boolean;
  deletedCount: number;
}

// Query request types
export interface GetTrashItemsRequest {
  organizationId: Id<'organizations'>;
  projectId?: Id<'projects'>;
  limit?: number;
  cursor?: string;
  sortBy?: 'deletedAt' | 'expiresAt' | 'title';
}

export interface GetDeletionStatsRequest {
  organizationId: Id<'organizations'>;
  projectId?: Id<'projects'>;
  timeRange?: '7d' | '30d' | '90d';
}

export interface SearchTrashItemsRequest {
  organizationId: Id<'organizations'>;
  projectId?: Id<'projects'>;
  searchTerm: string;
}

export interface GetDeletionActivityLogsRequest {
  organizationId: Id<'organizations'>;
  projectId?: Id<'projects'>;
  limit?: number;
  cursor?: string;
}

// Enhanced trash item type with computed fields
export interface EnrichedTrashItem extends Doc<'productTrash'> {
  daysRemaining: number;
  isExpiringSoon: boolean;
  deletedByName: string;
}

// Query response types
export interface GetTrashItemsResponse {
  items: EnrichedTrashItem[];
  continueCursor: string | null;
  isDone: boolean;
  totalCount: number;
}

export interface DeletionStats {
  totalInTrash: number;
  deletedInPeriod: number;
  restoredInPeriod: number;
  permanentlyDeletedInPeriod: number;
  expiringThisWeek: number;
  byDeletionType: {
    manual: number;
    bulk: number;
    cascade: number;
    cleanup: number;
  };
  averageRecoveryTime: number; // in hours
}

export interface DeletionActivityLog extends Doc<'deletionAuditLogs'> {
  performedByName: string;
}

export interface GetDeletionActivityLogsResponse {
  page: DeletionActivityLog[];
  continueCursor: string | null;
  isDone: boolean;
}

// Helper types for frontend components
export interface ProductDeletionModalProps {
  product: Doc<'products'>;
  onConfirm: (reason?: string) => Promise<void>;
  onCancel: () => void;
}

export interface BulkDeletionModalProps {
  products: Doc<'products'>[];
  onConfirm: (confirmationText: string, reason?: string) => Promise<void>;
  onCancel: () => void;
}

export interface TrashItemCardProps {
  item: EnrichedTrashItem;
  onRestore: () => Promise<void>;
  onPermanentDelete?: () => Promise<void>;
  canPermanentlyDelete: boolean;
}

// Error types
export class DeletionError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'INVALID_CONFIRMATION' | 'ALREADY_DELETED' | 'RESTORE_FAILED',
    public details?: any
  ) {
    super(message);
    this.name = 'DeletionError';
  }
}

// Utility type guards
export function isRecoverable(item: Doc<'productTrash'>): boolean {
  return item.recoveryStatus === 'recoverable';
}

export function isExpiringSoon(item: Doc<'productTrash'>): boolean {
  const daysRemaining = Math.ceil((item.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  return daysRemaining <= 7 && daysRemaining > 0;
}

export function canRestore(item: Doc<'productTrash'>): boolean {
  return item.recoveryStatus === 'recoverable' && item.expiresAt > Date.now();
}

// Constants
export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const EXPIRING_SOON_DAYS = 7;
export const DEFAULT_TRASH_PAGE_SIZE = 50;