/**
 * API-related types
 * These types are used for API responses, requests, and error handling
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  success: boolean;
  timestamp?: number;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  stack?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = unknown> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Query parameters for paginated requests
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

/**
 * Sort parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  search?: string;
  filters?: Record<string, unknown>;
  dateRange?: {
    start: Date | string;
    end: Date | string;
  };
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams {
  include?: string[];
  exclude?: string[];
}

/**
 * Batch operation request
 */
export interface BatchRequest<T = unknown> {
  operations: BatchOperation<T>[];
  transactional?: boolean;
}

/**
 * Single batch operation
 */
export interface BatchOperation<T = unknown> {
  id: string;
  action: 'create' | 'update' | 'delete';
  data?: T;
  resourceId?: string;
}

/**
 * Batch operation response
 */
export interface BatchResponse {
  results: BatchOperationResult[];
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
}

/**
 * Single batch operation result
 */
export interface BatchOperationResult {
  id: string;
  success: boolean;
  error?: ApiError;
  data?: unknown;
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  type: 'update' | 'create' | 'delete' | 'error' | 'ping' | 'pong';
  payload?: T;
  timestamp: number;
  id: string;
}

/**
 * Real-time subscription configuration
 */
export interface SubscriptionConfig {
  channel: string;
  events: string[];
  filters?: Record<string, unknown>;
  onMessage: (message: WebSocketMessage) => void;
  onError?: (error: ApiError) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: QueryParams;
  timeout?: number;
  retry?: {
    times: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
  };
}

/**
 * Export job status
 */
export interface ExportJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  expiresAt?: number;
}

/**
 * Import job result
 */
export interface ImportJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors?: ImportError[];
  warnings?: ImportWarning[];
}

/**
 * Import error detail
 */
export interface ImportError {
  row: number;
  field?: string;
  value?: unknown;
  message: string;
  code?: string;
}

/**
 * Import warning detail
 */
export interface ImportWarning {
  row: number;
  field?: string;
  message: string;
  suggestion?: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: number;
  services: {
    name: string;
    status: 'up' | 'down';
    responseTime?: number;
    error?: string;
  }[];
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * API metrics
 */
export interface ApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  error?: boolean;
}
