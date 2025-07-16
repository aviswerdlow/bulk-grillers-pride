// Audit log event types
export type AuditEventType =
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

// Entity types that can be audited
export type AuditEntityType =
  | 'organization'
  | 'user'
  | 'product'
  | 'category'
  | 'permission'
  | 'role'
  | 'import_job'
  | 'ai_job';

// Audit log entry structure
export interface AuditLogEntry {
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

// Audit event descriptions for UI
export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
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

// Helper to format audit log messages
export function formatAuditMessage(entry: AuditLogEntry): string {
  const action = AUDIT_EVENT_LABELS[entry.event];
  return `${action} ${entry.entityType} ${entry.entityId}`;
}
