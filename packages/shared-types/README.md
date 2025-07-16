# @bulk-grillers-pride/shared-types

Shared TypeScript types for the Bulk Grillers Pride application.

## Installation

This package is part of the monorepo and is automatically available to other workspaces.

## Usage

```typescript
import {
  Role,
  Permission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  OrganizationStatus,
  AuditLogEntry,
} from '@bulk-grillers-pride/shared-types';

// Use role types
const userRole: Role = 'admin';

// Check permissions
const canEdit = ROLE_PERMISSIONS[userRole].includes(PERMISSIONS.UPDATE_PRODUCTS);

// Use status types
const orgStatus: OrganizationStatus = 'active';
```

## Available Types

### Authentication & Authorization

- `Role` - User role types (owner, admin, editor, viewer)
- `Permission` - Permission string types
- `PERMISSIONS` - Permission constants object
- `ROLE_PERMISSIONS` - Role to permissions mapping

### Status Types

- `OrganizationStatus` - Organization status states
- `MembershipStatus` - Membership status states
- `CategoryStatus` - Category status states
- `UserStatus` - User account status states
- `ProductStatus` - Product status states
- `ImportJobStatus` - Import job status states
- `AIJobStatus` - AI categorization job status states

### Audit Types

- `AuditEventType` - Types of audit events
- `AuditEntityType` - Types of entities that can be audited
- `AuditLogEntry` - Audit log entry structure

### Common Types

- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated response structure
- `SortOptions` - Sorting configuration
