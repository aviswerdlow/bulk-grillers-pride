// Role types
export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

// Permission definitions
export const PERMISSIONS = {
  // Organization management
  MANAGE_ORGANIZATION: 'organization:manage',
  VIEW_ORGANIZATION: 'organization:view',
  UPDATE_ORGANIZATION_SETTINGS: 'organization:settings:update',

  // User management
  INVITE_USERS: 'users:invite',
  REMOVE_USERS: 'users:remove',
  UPDATE_USER_ROLES: 'users:roles:update',
  VIEW_USERS: 'users:view',

  // Project management
  CREATE_PROJECTS: 'projects:create',
  UPDATE_PROJECTS: 'projects:update',
  DELETE_PROJECTS: 'projects:delete',
  VIEW_PROJECTS: 'projects:view',

  // Product management
  CREATE_PRODUCTS: 'products:create',
  UPDATE_PRODUCTS: 'products:update',
  DELETE_PRODUCTS: 'products:delete',
  VIEW_PRODUCTS: 'products:view',
  IMPORT_PRODUCTS: 'products:import',
  EXPORT_PRODUCTS: 'products:export',

  // Category management
  CREATE_CATEGORIES: 'categories:create',
  UPDATE_CATEGORIES: 'categories:update',
  DELETE_CATEGORIES: 'categories:delete',
  VIEW_CATEGORIES: 'categories:view',
  ASSIGN_CATEGORIES: 'categories:assign',

  // AI operations
  USE_AI_CATEGORIZATION: 'ai:categorization:use',
  CONFIGURE_AI_SETTINGS: 'ai:settings:configure',
  VIEW_AI_JOBS: 'ai:jobs:view',

  // Import/Export
  IMPORT_DATA: 'data:import',
  EXPORT_DATA: 'data:export',

  // Audit logs
  VIEW_AUDIT_LOGS: 'audit:view',
} as const;

// Extract permission type from PERMISSIONS object
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role-based permission mappings
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  owner: ['*'], // All permissions
  admin: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.UPDATE_ORGANIZATION_SETTINGS,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.REMOVE_USERS,
    PERMISSIONS.UPDATE_USER_ROLES,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.UPDATE_PROJECTS,
    PERMISSIONS.DELETE_PROJECTS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.UPDATE_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.IMPORT_PRODUCTS,
    PERMISSIONS.EXPORT_PRODUCTS,
    PERMISSIONS.CREATE_CATEGORIES,
    PERMISSIONS.UPDATE_CATEGORIES,
    PERMISSIONS.DELETE_CATEGORIES,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.ASSIGN_CATEGORIES,
    PERMISSIONS.USE_AI_CATEGORIZATION,
    PERMISSIONS.CONFIGURE_AI_SETTINGS,
    PERMISSIONS.VIEW_AI_JOBS,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  editor: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.UPDATE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.IMPORT_PRODUCTS,
    PERMISSIONS.CREATE_CATEGORIES,
    PERMISSIONS.UPDATE_CATEGORIES,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.ASSIGN_CATEGORIES,
    PERMISSIONS.USE_AI_CATEGORIZATION,
    PERMISSIONS.VIEW_AI_JOBS,
    PERMISSIONS.IMPORT_DATA,
  ],
  viewer: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.VIEW_AI_JOBS,
  ],
} as const;

// Helper type to check if a role has a specific permission
export type RoleHasPermission<R extends Role, P extends Permission> = R extends 'owner'
  ? true
  : P extends (typeof ROLE_PERMISSIONS)[R][number]
    ? true
    : false;
