# Product Deletion Feature Guide

This guide explains the complete product deletion system implementation for developers working with the deletion features.

## Overview

The product deletion system implements a soft-delete pattern with a 30-day recovery period. Products are never immediately deleted; instead, they're moved to a trash system where they can be recovered or will be permanently deleted after the retention period.

## Architecture

### Database Schema

Two new tables manage the deletion system:

1. **productTrash** - Stores deleted product data with metadata
2. **deletionAuditLogs** - Tracks all deletion operations for compliance

### Deletion Flow

```
User Action → Soft Delete → Create Trash Entry → Cascade Relations → Audit Log
                                                           ↓
                                              30 days → Permanent Deletion (Cron)
```

## API Reference

### Mutations

#### `deleteProduct`
Soft deletes a single product.

```typescript
// Request
{
  productId: Id<'products'>,
  reason?: string // Optional deletion reason
}

// Response
{
  success: boolean,
  trashId: Id<'productTrash'>
}

// Example usage
const result = await ctx.runMutation(api.functions.products.deletion.deleteProduct, {
  productId: "k57nw9...",
  reason: "Discontinued product"
});
```

#### `bulkDeleteProducts`
Deletes multiple products with confirmation.

```typescript
// Request
{
  productIds: Id<'products'>[],
  confirmationText: string, // Must be "DELETE {count}"
  reason?: string
}

// Response
{
  success: boolean,
  deletedCount: number,
  failedCount: number,
  bulkOperationId: string,
  results: Array<{
    success: boolean,
    productId: Id<'products'>,
    error?: string,
    trashId?: Id<'productTrash'>
  }>
}

// Example usage
const result = await ctx.runMutation(api.functions.products.deletion.bulkDeleteProducts, {
  productIds: ["id1", "id2", "id3"],
  confirmationText: "DELETE 3",
  reason: "Bulk cleanup of test products"
});
```

#### `restoreProducts`
Restores products from trash.

```typescript
// Request
{
  trashIds: Id<'productTrash'>[]
}

// Response
{
  success: boolean,
  restoredCount: number,
  restoredIds: Id<'products'>[]
}

// Example usage
const result = await ctx.runMutation(api.functions.products.deletion.restoreProducts, {
  trashIds: ["trash1", "trash2"]
});
```

#### `permanentlyDeleteProducts`
Permanently deletes products (owner role only).

```typescript
// Request
{
  trashIds: Id<'productTrash'>[],
  confirmationText: string // Must be "PERMANENTLY DELETE {count}"
}

// Response
{
  success: boolean,
  deletedCount: number
}
```

### Queries

#### `getTrashItems`
Retrieves paginated trash items.

```typescript
// Request
{
  organizationId: Id<'organizations'>,
  projectId?: Id<'projects'>,
  limit?: number, // Default: 50
  cursor?: string,
  sortBy?: 'deletedAt' | 'expiresAt' | 'title'
}

// Response
{
  items: Array<{
    ...Doc<'productTrash'>,
    daysRemaining: number,
    isExpiringSoon: boolean,
    deletedByName: string
  }>,
  continueCursor: string | null,
  isDone: boolean,
  totalCount: number
}
```

#### `getDeletionStats`
Gets deletion statistics for a time period.

```typescript
// Request
{
  organizationId: Id<'organizations'>,
  projectId?: Id<'projects'>,
  timeRange?: '7d' | '30d' | '90d' // Default: '30d'
}

// Response
{
  totalInTrash: number,
  deletedInPeriod: number,
  restoredInPeriod: number,
  permanentlyDeletedInPeriod: number,
  expiringThisWeek: number,
  byDeletionType: {
    manual: number,
    bulk: number,
    cascade: number,
    cleanup: number
  },
  averageRecoveryTime: number // in hours
}
```

#### `searchTrashItems`
Searches trash by product title, SKU, vendor, or description.

```typescript
// Request
{
  organizationId: Id<'organizations'>,
  projectId?: Id<'projects'>,
  searchTerm: string
}

// Response
Array<{
  ...Doc<'productTrash'>,
  daysRemaining: number,
  isExpiringSoon: boolean,
  deletedByName: string
}>
```

#### `getDeletionActivityLogs`
Retrieves deletion audit logs.

```typescript
// Request
{
  organizationId: Id<'organizations'>,
  projectId?: Id<'projects'>,
  limit?: number,
  cursor?: string
}

// Response - Paginated deletion audit logs with user info
```

## Important Implementation Details

### Cascade Behavior
When a product is deleted:
- **Product Variants**: Soft deleted (status → 'archived')
- **Category Assignments**: Removed (hard delete)
- **AI Job References**: Preserved for history
- **Images**: Marked for cleanup but not immediately deleted

### Permission Requirements
- **Delete/Restore**: 'owner' or 'admin' role
- **View Trash**: 'owner', 'admin', or 'editor' role
- **Permanent Delete**: 'owner' role only

### Recovery Period
- Products remain in trash for 30 days
- After 30 days, automatic permanent deletion via cron job
- Cron runs daily at midnight UTC

### Error Handling
Common errors and their meanings:
- "Invalid confirmation text" - User didn't type the exact confirmation
- "Product not found" - Product ID doesn't exist
- "Insufficient permissions" - User lacks required role
- "Not recoverable" - Product already recovered or permanently deleted

### Real-time Updates
The trash table supports Convex subscriptions for real-time updates:
```typescript
// Subscribe to trash changes
const trashItems = useQuery(api.functions.products.deletion.getTrashItems, {
  organizationId: org._id
});
```

### Performance Considerations
- Bulk operations process items sequentially to maintain consistency
- Large bulk operations (>100 items) may take several seconds
- Sorting is done in-memory; for large datasets consider pagination
- Indexes optimize queries by organization and expiration date

### Testing Helpers
Test data is available in `/convex/__tests__/products/deletion.test.ts`

## Integration Examples

### Frontend Integration

```typescript
// Delete with confirmation dialog
const handleDelete = async (productId: string) => {
  const confirmed = await showConfirmDialog({
    title: "Delete Product?",
    message: "This product will be moved to trash for 30 days.",
    confirmText: "Delete"
  });
  
  if (confirmed) {
    const result = await deleteProduct({ productId });
    if (result.success) {
      toast.success("Product moved to trash");
    }
  }
};

// Bulk delete with typed confirmation
const handleBulkDelete = async (productIds: string[]) => {
  const confirmText = await promptUser({
    title: `Delete ${productIds.length} products?`,
    message: `Type "DELETE ${productIds.length}" to confirm`,
    placeholder: `DELETE ${productIds.length}`
  });
  
  if (confirmText === `DELETE ${productIds.length}`) {
    const result = await bulkDeleteProducts({
      productIds,
      confirmationText: confirmText
    });
    
    toast.success(`Deleted ${result.deletedCount} products`);
    if (result.failedCount > 0) {
      toast.error(`Failed to delete ${result.failedCount} products`);
    }
  }
};
```

### Error Recovery

```typescript
// Handle deletion errors gracefully
try {
  await deleteProduct({ productId });
} catch (error) {
  if (error.message.includes("permissions")) {
    toast.error("You don't have permission to delete products");
  } else if (error.message.includes("not found")) {
    toast.error("Product no longer exists");
  } else {
    toast.error("Failed to delete product");
    console.error(error);
  }
}
```

## Migration Notes

Existing products with status 'archived' are NOT automatically moved to trash. They remain in their current state. Only products deleted after this feature deployment will use the trash system.

## Security Considerations

1. All deletion operations require authentication
2. Role-based access control enforced at mutation level
3. Audit logs capture user identity and IP address
4. Confirmation text prevents accidental bulk deletions
5. Permanent deletion restricted to owners only

## Future Enhancements

Potential improvements for future iterations:
- Batch restore with conflict resolution
- Selective data restoration (e.g., restore without variants)
- Longer retention periods for premium plans
- Export trash data before permanent deletion
- Undo functionality within a time window