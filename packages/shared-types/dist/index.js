'use strict';
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, '__esModule', { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AUDIT_EVENT_LABELS: () => AUDIT_EVENT_LABELS,
  PERMISSIONS: () => PERMISSIONS,
  ROLE_PERMISSIONS: () => ROLE_PERMISSIONS,
  STATUS_COLORS: () => STATUS_COLORS,
  STATUS_LABELS: () => STATUS_LABELS,
  formatAuditMessage: () => formatAuditMessage,
});
module.exports = __toCommonJS(index_exports);

// src/auth.ts
var PERMISSIONS = {
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
};
var ROLE_PERMISSIONS = {
  owner: ['*'],
  // All permissions
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
};

// src/status.ts
var STATUS_LABELS = {
  organization: {
    active: 'Active',
    suspended: 'Suspended',
    trial: 'Trial',
  },
  membership: {
    active: 'Active',
    pending: 'Pending',
    revoked: 'Revoked',
  },
  category: {
    active: 'Active',
    hidden: 'Hidden',
    archived: 'Archived',
  },
  user: {
    active: 'Active',
    invited: 'Invited',
    suspended: 'Suspended',
  },
  product: {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived',
  },
  importJob: {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  },
  aiJob: {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  },
};
var STATUS_COLORS = {
  active: 'green',
  pending: 'yellow',
  processing: 'blue',
  running: 'blue',
  completed: 'green',
  suspended: 'red',
  failed: 'red',
  cancelled: 'gray',
  draft: 'gray',
  hidden: 'gray',
  archived: 'gray',
  revoked: 'red',
  invited: 'yellow',
  trial: 'purple',
};

// src/audit.ts
var AUDIT_EVENT_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  export: 'Exported',
  import: 'Imported',
  login: 'Logged in',
  logout: 'Logged out',
  invite: 'Invited',
  revoke: 'Revoked',
  assign: 'Assigned',
  unassign: 'Unassigned',
};
function formatAuditMessage(entry) {
  const action = AUDIT_EVENT_LABELS[entry.event];
  return `${action} ${entry.entityType} ${entry.entityId}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    AUDIT_EVENT_LABELS,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    STATUS_COLORS,
    STATUS_LABELS,
    formatAuditMessage,
  });
