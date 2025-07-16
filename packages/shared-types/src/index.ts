// Export all types from sub-modules
export * from './auth';
export * from './status';
export * from './audit';

// Common response types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Common field types
export type Timestamp = number;
export type UUID = string;
export type Email = string;
export type URL = string;

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Common sort options
export interface SortOptions {
  field: string;
  direction: SortDirection;
}
