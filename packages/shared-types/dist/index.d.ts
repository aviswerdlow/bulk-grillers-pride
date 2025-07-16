type Role = 'owner' | 'admin' | 'editor' | 'viewer';
declare const PERMISSIONS: {
  readonly MANAGE_ORGANIZATION: 'organization:manage';
  readonly VIEW_ORGANIZATION: 'organization:view';
  readonly UPDATE_ORGANIZATION_SETTINGS: 'organization:settings:update';
  readonly INVITE_USERS: 'users:invite';
  readonly REMOVE_USERS: 'users:remove';
  readonly UPDATE_USER_ROLES: 'users:roles:update';
  readonly VIEW_USERS: 'users:view';
  readonly CREATE_PROJECTS: 'projects:create';
  readonly UPDATE_PROJECTS: 'projects:update';
  readonly DELETE_PROJECTS: 'projects:delete';
  readonly VIEW_PROJECTS: 'projects:view';
  readonly CREATE_PRODUCTS: 'products:create';
  readonly UPDATE_PRODUCTS: 'products:update';
  readonly DELETE_PRODUCTS: 'products:delete';
  readonly VIEW_PRODUCTS: 'products:view';
  readonly IMPORT_PRODUCTS: 'products:import';
  readonly EXPORT_PRODUCTS: 'products:export';
  readonly CREATE_CATEGORIES: 'categories:create';
  readonly UPDATE_CATEGORIES: 'categories:update';
  readonly DELETE_CATEGORIES: 'categories:delete';
  readonly VIEW_CATEGORIES: 'categories:view';
  readonly ASSIGN_CATEGORIES: 'categories:assign';
  readonly USE_AI_CATEGORIZATION: 'ai:categorization:use';
  readonly CONFIGURE_AI_SETTINGS: 'ai:settings:configure';
  readonly VIEW_AI_JOBS: 'ai:jobs:view';
  readonly IMPORT_DATA: 'data:import';
  readonly EXPORT_DATA: 'data:export';
  readonly VIEW_AUDIT_LOGS: 'audit:view';
};
type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
declare const ROLE_PERMISSIONS: Record<Role, readonly string[]>;
type RoleHasPermission<R extends Role, P extends Permission> = R extends 'owner'
  ? true
  : P extends (typeof ROLE_PERMISSIONS)[R][number]
    ? true
    : false;

type OrganizationStatus = 'active' | 'suspended' | 'trial';
type MembershipStatus = 'active' | 'pending' | 'revoked';
type CategoryStatus = 'active' | 'hidden' | 'archived';
type UserStatus = 'active' | 'invited' | 'suspended';
type ProductStatus = 'active' | 'draft' | 'archived';
type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type AIJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type GenericStatus = 'active' | 'inactive' | 'pending' | 'archived';
declare const STATUS_LABELS: {
  readonly organization: {
    readonly active: 'Active';
    readonly suspended: 'Suspended';
    readonly trial: 'Trial';
  };
  readonly membership: {
    readonly active: 'Active';
    readonly pending: 'Pending';
    readonly revoked: 'Revoked';
  };
  readonly category: {
    readonly active: 'Active';
    readonly hidden: 'Hidden';
    readonly archived: 'Archived';
  };
  readonly user: {
    readonly active: 'Active';
    readonly invited: 'Invited';
    readonly suspended: 'Suspended';
  };
  readonly product: {
    readonly active: 'Active';
    readonly draft: 'Draft';
    readonly archived: 'Archived';
  };
  readonly importJob: {
    readonly pending: 'Pending';
    readonly processing: 'Processing';
    readonly completed: 'Completed';
    readonly failed: 'Failed';
  };
  readonly aiJob: {
    readonly pending: 'Pending';
    readonly running: 'Running';
    readonly completed: 'Completed';
    readonly failed: 'Failed';
    readonly cancelled: 'Cancelled';
  };
};
declare const STATUS_COLORS: {
  readonly active: 'green';
  readonly pending: 'yellow';
  readonly processing: 'blue';
  readonly running: 'blue';
  readonly completed: 'green';
  readonly suspended: 'red';
  readonly failed: 'red';
  readonly cancelled: 'gray';
  readonly draft: 'gray';
  readonly hidden: 'gray';
  readonly archived: 'gray';
  readonly revoked: 'red';
  readonly invited: 'yellow';
  readonly trial: 'purple';
};

type AuditEventType =
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'invite'
  | 'revoke'
  | 'assign'
  | 'unassign';
type AuditEntityType =
  | 'organization'
  | 'user'
  | 'product'
  | 'category'
  | 'permission'
  | 'role'
  | 'import_job'
  | 'ai_job';
interface AuditLogEntry {
  event: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  userId: string;
  organizationId: string;
  timestamp: number;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
}
declare const AUDIT_EVENT_LABELS: Record<AuditEventType, string>;
declare function formatAuditMessage(entry: AuditLogEntry): string;

interface SuccessResponse<T = any> {
  success: true;
  data: T;
}
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}
type Timestamp = number;
type UUID = string;
type Email = string;
type URL = string;
type SortDirection = 'asc' | 'desc';
interface SortOptions {
  field: string;
  direction: SortDirection;
}

export {
  type AIJobStatus,
  AUDIT_EVENT_LABELS,
  type ApiResponse,
  type AuditEntityType,
  type AuditEventType,
  type AuditLogEntry,
  type CategoryStatus,
  type Email,
  type ErrorResponse,
  type GenericStatus,
  type ImportJobStatus,
  type MembershipStatus,
  type OrganizationStatus,
  PERMISSIONS,
  type PaginatedResponse,
  type PaginationParams,
  type Permission,
  type ProductStatus,
  ROLE_PERMISSIONS,
  type Role,
  type RoleHasPermission,
  STATUS_COLORS,
  STATUS_LABELS,
  type SortDirection,
  type SortOptions,
  type SuccessResponse,
  type Timestamp,
  type URL,
  type UUID,
  type UserStatus,
  formatAuditMessage,
};
