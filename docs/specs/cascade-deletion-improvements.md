# Cascade Deletion Improvement Specification

**Date**: July 19, 2025  
**Author**: Systems Design Agent  
**Purpose**: Technical specification for hardening cascade deletion with transactions and data integrity

## Overview

This specification addresses critical data integrity issues in the cascade deletion system by implementing true transactions, relationship preservation, and automatic cleanup mechanisms.

## Critical Issues to Address

1. **No Atomicity**: Operations can partially fail, leaving inconsistent state
2. **Data Loss**: Category assignments permanently deleted, cannot fully restore
3. **Orphaned Resources**: Images remain in storage with no cleanup
4. **Race Conditions**: Concurrent modifications can cause data loss

## Schema Updates

### 1. New Preservation Tables

```typescript
// convex/schema.ts

// Preserve category assignments during deletion
export const categoryAssignmentsTrash = defineTable({
  productId: v.id("products"),
  organizationId: v.id("organizations"),
  assignments: v.array(v.object({
    categoryId: v.id("categories"),
    categoryPath: v.array(v.string()), // Denormalized for safety
    order: v.number(),
    metadata: v.optional(v.any()),
    assignedAt: v.number(),
    assignedBy: v.id("users")
  })),
  deletedAt: v.number(),
  expiresAt: v.number()
})
  .index("by_product", ["productId"])
  .index("by_expiration", ["expiresAt"])
  .index("by_organization", ["organizationId"]);

// Queue for deferred image cleanup
export const imageCleanupQueue = defineTable({
  productId: v.id("products"),
  organizationId: v.id("organizations"),
  images: v.array(v.object({
    storageId: v.id("_storage"),
    url: v.string(),
    metadata: v.optional(v.any())
  })),
  scheduledFor: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  attempts: v.number(),
  lastError: v.optional(v.string())
})
  .index("by_schedule", ["status", "scheduledFor"])
  .index("by_product", ["productId"])
  .index("by_status", ["status"]);

// Transaction log for cascade operations
export const cascadeTransactionLog = defineTable({
  transactionId: v.string(),
  organizationId: v.id("organizations"),
  operation: v.union(
    v.literal("delete"),
    v.literal("restore"),
    v.literal("permanent_delete")
  ),
  entityType: v.string(),
  entityId: v.string(),
  status: v.union(
    v.literal("started"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("rolled_back")
  ),
  steps: v.array(v.object({
    action: v.string(),
    target: v.string(),
    status: v.string(),
    timestamp: v.number(),
    error: v.optional(v.string())
  })),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  userId: v.id("users")
})
  .index("by_transaction", ["transactionId"])
  .index("by_status", ["status", "startedAt"])
  .index("by_entity", ["entityType", "entityId"]);
```

### 2. Update Product Table

```typescript
// Add optimistic locking
products: defineTable({
  // ... existing fields ...
  version: v.number(), // For optimistic locking
  lockToken: v.optional(v.string()), // For operation locking
  lockedAt: v.optional(v.number()),
  lockedBy: v.optional(v.id("users"))
})
  // ... existing indexes ...
  .index("by_lock", ["lockToken"]);
```

## Transactional Deletion Implementation

### 1. Core Transaction Wrapper

```typescript
// convex/lib/transactions.ts
export class CascadeTransaction {
  private steps: TransactionStep[] = [];
  private rollbackHandlers: Map<string, () => Promise<void>> = new Map();
  
  constructor(
    private ctx: MutationCtx,
    private transactionId: string,
    private organizationId: Id<"organizations">,
    private userId: Id<"users">
  ) {}
  
  async execute<T>(
    operation: string,
    handler: () => Promise<T>,
    rollback?: () => Promise<void>
  ): Promise<T> {
    const stepId = `${operation}_${Date.now()}`;
    
    try {
      // Log step start
      await this.logStep(stepId, "started");
      
      // Execute operation
      const result = await handler();
      
      // Register rollback if provided
      if (rollback) {
        this.rollbackHandlers.set(stepId, rollback);
      }
      
      // Log step completion
      await this.logStep(stepId, "completed");
      
      return result;
    } catch (error) {
      // Log step failure
      await this.logStep(stepId, "failed", error.message);
      
      // Trigger rollback
      await this.rollback();
      
      throw error;
    }
  }
  
  async rollback() {
    // Execute rollback handlers in reverse order
    const handlers = Array.from(this.rollbackHandlers.entries()).reverse();
    
    for (const [stepId, handler] of handlers) {
      try {
        await handler();
        await this.logStep(`rollback_${stepId}`, "completed");
      } catch (error) {
        await this.logStep(`rollback_${stepId}`, "failed", error.message);
      }
    }
    
    // Update transaction status
    await this.updateTransactionStatus("rolled_back");
  }
  
  private async logStep(action: string, status: string, error?: string) {
    // Implementation details...
  }
  
  private async updateTransactionStatus(status: string) {
    // Implementation details...
  }
}
```

### 2. Transactional Delete Product

```typescript
// convex/products/mutations.ts
export const deleteProductTransactional = mutation({
  args: {
    productId: v.id("products"),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { user, membership } = await authenticateAndAuthorize(ctx, args.organizationId);
    
    const transactionId = generateTransactionId();
    const transaction = new CascadeTransaction(ctx, transactionId, membership.organizationId, user._id);
    
    // Start transaction log
    await ctx.db.insert("cascadeTransactionLog", {
      transactionId,
      organizationId: membership.organizationId,
      operation: "delete",
      entityType: "product",
      entityId: args.productId,
      status: "started",
      steps: [],
      startedAt: Date.now(),
      userId: user._id
    });
    
    try {
      // 1. Acquire lock on product
      const product = await transaction.execute(
        "acquire_lock",
        async () => {
          const lockToken = generateLockToken();
          const product = await ctx.db.get(args.productId);
          
          if (!product) throw new Error("Product not found");
          if (product.lockToken) throw new Error("Product is locked by another operation");
          
          await ctx.db.patch(product._id, {
            lockToken,
            lockedAt: Date.now(),
            lockedBy: user._id,
            version: (product.version || 0) + 1
          });
          
          return product;
        },
        async () => {
          // Rollback: Release lock
          await ctx.db.patch(args.productId, {
            lockToken: undefined,
            lockedAt: undefined,
            lockedBy: undefined
          });
        }
      );
      
      // 2. Fetch all related data
      const relatedData = await transaction.execute(
        "fetch_related",
        async () => {
          const [variants, categoryAssignments, priceHistory] = await Promise.all([
            ctx.db.query("variants")
              .withIndex("by_product", q => q.eq("productId", product._id))
              .collect(),
            ctx.db.query("productCategoryAssignments")
              .withIndex("by_product", q => q.eq("productId", product._id))
              .collect(),
            ctx.db.query("priceHistory")
              .withIndex("by_product", q => q.eq("productId", product._id))
              .collect()
          ]);
          
          return { variants, categoryAssignments, priceHistory };
        }
      );
      
      // 3. Create trash entry
      const trashEntry = await transaction.execute(
        "create_trash",
        async () => {
          return await ctx.db.insert("productTrash", {
            organizationId: product.organizationId,
            projectId: product.projectId,
            productData: product,
            deletedAt: Date.now(),
            deletedBy: user._id,
            reason: args.reason,
            expiresAt: Date.now() + RECOVERY_PERIOD,
            recoveryStatus: "recoverable",
            relatedData: {
              variants: relatedData.variants,
              categoryIds: relatedData.categoryAssignments.map(a => a.categoryId),
              imageIds: product.images || []
            },
            transactionId
          });
        },
        async (trashId) => {
          // Rollback: Delete trash entry
          await ctx.db.delete(trashId);
        }
      );
      
      // 4. Preserve category assignments
      if (relatedData.categoryAssignments.length > 0) {
        await transaction.execute(
          "preserve_categories",
          async () => {
            // Fetch category details for denormalization
            const categories = await Promise.all(
              relatedData.categoryAssignments.map(a => 
                ctx.db.get(a.categoryId)
              )
            );
            
            await ctx.db.insert("categoryAssignmentsTrash", {
              productId: product._id,
              organizationId: product.organizationId,
              assignments: relatedData.categoryAssignments.map((a, i) => ({
                categoryId: a.categoryId,
                categoryPath: categories[i]?.path || [],
                order: a.order || i,
                metadata: a.metadata,
                assignedAt: a.createdAt,
                assignedBy: a.createdBy
              })),
              deletedAt: Date.now(),
              expiresAt: Date.now() + RECOVERY_PERIOD
            });
          },
          async () => {
            // Rollback: Remove preserved assignments
            const preserved = await ctx.db.query("categoryAssignmentsTrash")
              .withIndex("by_product", q => q.eq("productId", product._id))
              .first();
            if (preserved) {
              await ctx.db.delete(preserved._id);
            }
          }
        );
      }
      
      // 5. Queue image cleanup
      if (product.images && product.images.length > 0) {
        await transaction.execute(
          "queue_images",
          async () => {
            await ctx.db.insert("imageCleanupQueue", {
              productId: product._id,
              organizationId: product.organizationId,
              images: product.images.map(id => ({
                storageId: id,
                url: product.imageUrls?.[id] || "",
                metadata: product.imageMetadata?.[id]
              })),
              scheduledFor: Date.now() + RECOVERY_PERIOD + 86400000, // +1 day buffer
              status: "pending",
              attempts: 0
            });
          },
          async () => {
            // Rollback: Cancel image cleanup
            const queued = await ctx.db.query("imageCleanupQueue")
              .withIndex("by_product", q => q.eq("productId", product._id))
              .first();
            if (queued) {
              await ctx.db.patch(queued._id, { status: "cancelled" });
            }
          }
        );
      }
      
      // 6. Delete category assignments
      await transaction.execute(
        "delete_assignments",
        async () => {
          const deleted = [];
          for (const assignment of relatedData.categoryAssignments) {
            await ctx.db.delete(assignment._id);
            deleted.push(assignment._id);
          }
          return deleted;
        },
        async (deletedIds) => {
          // Rollback: Restore assignments
          // Note: This requires storing full assignment data
        }
      );
      
      // 7. Delete variants
      await transaction.execute(
        "delete_variants",
        async () => {
          const deleted = [];
          for (const variant of relatedData.variants) {
            await ctx.db.delete(variant._id);
            deleted.push(variant._id);
          }
          return deleted;
        }
      );
      
      // 8. Delete product
      await transaction.execute(
        "delete_product",
        async () => {
          await ctx.db.delete(product._id);
        }
      );
      
      // 9. Create audit log
      await transaction.execute(
        "audit_log",
        async () => {
          await ctx.db.insert("deletionAuditLogs", {
            organizationId: product.organizationId,
            projectId: product.projectId,
            entityType: "product",
            entityId: product._id,
            action: "soft_delete",
            performedBy: user._id,
            performedAt: Date.now(),
            reason: args.reason,
            metadata: {
              productTitle: product.title,
              productSku: product.sku,
              variantCount: relatedData.variants.length,
              categoryCount: relatedData.categoryAssignments.length,
              transactionId
            }
          });
        }
      );
      
      // Complete transaction
      await ctx.db.patch(
        await ctx.db.query("cascadeTransactionLog")
          .withIndex("by_transaction", q => q.eq("transactionId", transactionId))
          .first()
          ._id,
        {
          status: "completed",
          completedAt: Date.now()
        }
      );
      
      return {
        success: true,
        trashEntryId: trashEntry,
        transactionId
      };
      
    } catch (error) {
      // Transaction will auto-rollback
      throw error;
    }
  }
});
```

### 3. Bulk Delete with Atomicity

```typescript
export const bulkDeleteProductsAtomic = mutation({
  args: {
    productIds: v.array(v.id("products")),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Validate all products exist and are deletable
    const products = await Promise.all(
      args.productIds.map(id => ctx.db.get(id))
    );
    
    if (products.some(p => !p)) {
      throw new Error("One or more products not found");
    }
    
    if (products.some(p => p.lockToken)) {
      throw new Error("One or more products are locked");
    }
    
    // Execute as single transaction
    const transactionId = generateTransactionId();
    const results = [];
    
    try {
      for (const productId of args.productIds) {
        const result = await deleteProductTransactional(ctx, {
          productId,
          reason: args.reason
        });
        results.push(result);
      }
      
      return {
        success: true,
        transactionId,
        results
      };
    } catch (error) {
      // All operations rolled back automatically
      throw error;
    }
  }
});
```

## Recovery Implementation

### 1. Enhanced Restore with Full Relationships

```typescript
export const restoreProductWithRelationships = mutation({
  args: {
    productId: v.id("products")
  },
  handler: async (ctx, args) => {
    const trashEntry = await ctx.db.query("productTrash")
      .withIndex("by_product", q => q.eq("productData._id", args.productId))
      .first();
    
    if (!trashEntry) {
      throw new Error("Product not found in trash");
    }
    
    if (trashEntry.recoveryStatus !== "recoverable") {
      throw new Error("Product is no longer recoverable");
    }
    
    const transactionId = generateTransactionId();
    const transaction = new CascadeTransaction(ctx, transactionId, trashEntry.organizationId, user._id);
    
    try {
      // 1. Check for conflicts (e.g., SKU already exists)
      await transaction.execute("check_conflicts", async () => {
        const existingBySku = await ctx.db.query("products")
          .withIndex("by_sku", q => 
            q.eq("organizationId", trashEntry.organizationId)
             .eq("sku", trashEntry.productData.sku)
          )
          .first();
        
        if (existingBySku) {
          throw new Error(`Product with SKU ${trashEntry.productData.sku} already exists`);
        }
      });
      
      // 2. Restore product
      const restoredProductId = await transaction.execute(
        "restore_product",
        async () => {
          // Remove system fields from trash data
          const { _id, _creationTime, ...productData } = trashEntry.productData;
          
          return await ctx.db.insert("products", {
            ...productData,
            version: 0,
            restoredAt: Date.now(),
            restoredFrom: trashEntry._id
          });
        }
      );
      
      // 3. Restore variants
      await transaction.execute("restore_variants", async () => {
        for (const variantData of trashEntry.relatedData.variants) {
          const { _id, _creationTime, ...data } = variantData;
          await ctx.db.insert("variants", {
            ...data,
            productId: restoredProductId
          });
        }
      });
      
      // 4. Restore category assignments
      const preservedAssignments = await ctx.db.query("categoryAssignmentsTrash")
        .withIndex("by_product", q => q.eq("productId", args.productId))
        .first();
      
      if (preservedAssignments) {
        await transaction.execute("restore_categories", async () => {
          for (const assignment of preservedAssignments.assignments) {
            // Verify category still exists
            const category = await ctx.db.get(assignment.categoryId);
            if (category) {
              await ctx.db.insert("productCategoryAssignments", {
                productId: restoredProductId,
                categoryId: assignment.categoryId,
                order: assignment.order,
                metadata: assignment.metadata,
                createdAt: Date.now(),
                createdBy: user._id
              });
            }
          }
        });
        
        // Clean up preserved data
        await ctx.db.delete(preservedAssignments._id);
      }
      
      // 5. Cancel image cleanup
      const imageCleanup = await ctx.db.query("imageCleanupQueue")
        .withIndex("by_product", q => q.eq("productId", args.productId))
        .filter(q => q.eq(q.field("status"), "pending"))
        .first();
      
      if (imageCleanup) {
        await ctx.db.patch(imageCleanup._id, { status: "cancelled" });
      }
      
      // 6. Delete trash entry
      await ctx.db.delete(trashEntry._id);
      
      // 7. Create audit log
      await ctx.db.insert("deletionAuditLogs", {
        organizationId: trashEntry.organizationId,
        projectId: trashEntry.projectId,
        entityType: "product",
        entityId: restoredProductId,
        action: "restore",
        performedBy: user._id,
        performedAt: Date.now(),
        metadata: {
          originalProductId: args.productId,
          transactionId
        }
      });
      
      return {
        success: true,
        productId: restoredProductId,
        transactionId
      };
      
    } catch (error) {
      // Auto-rollback on failure
      throw error;
    }
  }
});
```

## Cleanup Services

### 1. Image Cleanup Cron Job

```typescript
export const processImageCleanup = cronJobs.daily(
  "imageCleanup",
  { hourUTC: 3, minuteUTC: 0 }, // 3 AM UTC
  async (ctx) => {
    const pending = await ctx.db.query("imageCleanupQueue")
      .withIndex("by_schedule", q => 
        q.eq("status", "pending")
         .lte("scheduledFor", Date.now())
      )
      .take(100);
    
    for (const job of pending) {
      try {
        // Update status
        await ctx.db.patch(job._id, {
          status: "processing",
          attempts: job.attempts + 1
        });
        
        // Verify product not restored
        const product = await ctx.db.query("products")
          .withIndex("by_id", q => q.eq("_id", job.productId))
          .first();
        
        if (product) {
          // Product was restored, cancel cleanup
          await ctx.db.patch(job._id, { status: "cancelled" });
          continue;
        }
        
        // Delete images from storage
        for (const image of job.images) {
          try {
            await ctx.storage.delete(image.storageId);
          } catch (error) {
            console.error(`Failed to delete image ${image.storageId}:`, error);
          }
        }
        
        // Mark complete
        await ctx.db.patch(job._id, { status: "completed" });
        
      } catch (error) {
        // Log error and retry later
        await ctx.db.patch(job._id, {
          status: "pending",
          lastError: error.message,
          scheduledFor: Date.now() + 3600000 // Retry in 1 hour
        });
        
        if (job.attempts >= 3) {
          // Max retries reached
          await ctx.db.patch(job._id, {
            status: "failed",
            lastError: `Max retries exceeded: ${error.message}`
          });
        }
      }
    }
  }
);
```

### 2. Consistency Validator

```typescript
export const validateCascadeConsistency = cronJobs.daily(
  "cascadeConsistencyCheck",
  { hourUTC: 4, minuteUTC: 0 },
  async (ctx) => {
    const issues = [];
    
    // Check for orphaned variants
    const variants = await ctx.db.query("variants").take(1000);
    for (const variant of variants) {
      const product = await ctx.db.get(variant.productId);
      if (!product) {
        issues.push({
          type: "orphaned_variant",
          variantId: variant._id,
          productId: variant.productId
        });
      }
    }
    
    // Check for orphaned category assignments
    const assignments = await ctx.db.query("productCategoryAssignments").take(1000);
    for (const assignment of assignments) {
      const product = await ctx.db.get(assignment.productId);
      if (!product) {
        issues.push({
          type: "orphaned_assignment",
          assignmentId: assignment._id,
          productId: assignment.productId
        });
      }
    }
    
    // Check for stuck transactions
    const stuckTransactions = await ctx.db.query("cascadeTransactionLog")
      .withIndex("by_status", q => 
        q.eq("status", "started")
         .lte("startedAt", Date.now() - 3600000) // 1 hour old
      )
      .collect();
    
    for (const transaction of stuckTransactions) {
      issues.push({
        type: "stuck_transaction",
        transactionId: transaction.transactionId,
        age: Date.now() - transaction.startedAt
      });
    }
    
    if (issues.length > 0) {
      // Send alert
      await ctx.scheduler.runAfter(0, internal.alerts.sendConsistencyAlert, {
        issues,
        timestamp: Date.now()
      });
    }
    
    return issues;
  }
);
```

## Testing Strategy

### 1. Unit Tests

```typescript
describe("Transactional Cascade Deletion", () => {
  it("should atomically delete product and all relations", async () => {
    const { product, variants, categories } = await setupTestProduct();
    
    await deleteProductTransactional({ productId: product._id });
    
    // Verify atomicity
    expect(await db.get(product._id)).toBeNull();
    expect(await db.query("variants").withProductId(product._id)).toHaveLength(0);
    expect(await db.query("productTrash").withProductId(product._id)).toBeDefined();
  });
  
  it("should rollback on failure", async () => {
    const product = await createTestProduct();
    
    // Force failure
    jest.spyOn(db, 'delete').mockRejectedValueOnce(new Error("DB Error"));
    
    await expect(
      deleteProductTransactional({ productId: product._id })
    ).rejects.toThrow();
    
    // Verify rollback
    expect(await db.get(product._id)).toBeDefined();
    expect(await db.query("productTrash").withProductId(product._id)).toBeNull();
  });
});
```

### 2. Integration Tests

```typescript
describe("Cascade Deletion Integration", () => {
  it("should handle concurrent operations correctly", async () => {
    const product = await createTestProduct();
    
    // Attempt concurrent delete and update
    const [deleteResult, updateResult] = await Promise.allSettled([
      deleteProductTransactional({ productId: product._id }),
      updateProduct({ productId: product._id, title: "Updated" })
    ]);
    
    // One should succeed, one should fail
    const succeeded = [deleteResult, updateResult].filter(r => r.status === 'fulfilled');
    const failed = [deleteResult, updateResult].filter(r => r.status === 'rejected');
    
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason.message).toContain("locked");
  });
});
```

## Migration Strategy

### Phase 1: Deploy Schema (Day 1)
1. Add new tables (non-breaking)
2. Add version field to products
3. Deploy transaction infrastructure

### Phase 2: Parallel Implementation (Day 2-3)
1. Deploy new transactional mutations
2. Keep old mutations with deprecation warning
3. Monitor both paths

### Phase 3: Migration (Day 4-5)
1. Update UI to use new mutations
2. Monitor for issues
3. Fix any edge cases

### Phase 4: Cleanup (Day 6-7)
1. Remove old mutations
2. Run consistency validator
3. Clean up any orphaned data

## Success Criteria

1. **Zero partial failures** in deletion operations
2. **100% restoration success** for valid recovery attempts
3. **No orphaned resources** after 30-day period
4. **<500ms deletion time** for products with <100 variants
5. **Automatic cleanup** of all related resources