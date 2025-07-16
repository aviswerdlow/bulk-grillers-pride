// Organization status
export type OrganizationStatus = 'active' | 'suspended' | 'trial';

// Membership status
export type MembershipStatus = 'active' | 'pending' | 'revoked';

// Category status
export type CategoryStatus = 'active' | 'hidden' | 'archived';

// User status
export type UserStatus = 'active' | 'invited' | 'suspended';

// Product status
export type ProductStatus = 'active' | 'draft' | 'archived';

// Import job status
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// AI categorization job status
export type AIJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Generic status type for common patterns
export type GenericStatus = 'active' | 'inactive' | 'pending' | 'archived';

// Status display helpers
export const STATUS_LABELS = {
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
} as const;

// Status color helpers for UI consistency
export const STATUS_COLORS = {
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
} as const;
