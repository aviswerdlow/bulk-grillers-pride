import { v } from 'convex/values';
import { mutation, internalMutation, query } from '../../_generated/server';
import { Doc, Id } from '../../_generated/dataModel';
import { authenticateAndAuthorize, requireRole } from '../../lib/auth';
import { withTransaction, CascadeTransaction } from '../../migrations/CascadeTransaction';
import { CASCADE_DELETION_FLAGS, MIGRATION_CONFIG } from '../../migrations/001_cascade_deletion_schema';

/**
 * Generate a unique ID for bulk operations
 */
function generateBulkOperationId(): string {
  return `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper to create a trash entry for a deleted product
 */
async function createTrashEntry(
  ctx: any,
  product: Doc<'products'>,
  user: Doc<'users'>,
  reason?: string,
  bulkOperationId?: string,
  deletionType: 'manual' | 'bulk' | 'cascade' | 'cleanup' = 'manual',
  transactionId?: string
) {
  const now = Date.now();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

  // Get related data
  const variants = await ctx.db
    .query('productVariants')
    .withIndex('by_product', (q: any) => q.eq('productId', product._id))
    .collect();

  const categoryAssignments = await ctx.db
    .query('categoryProductAssignments')
    .withIndex('by_product', (q: any) => q.eq('productId', product._id))
    .collect();

  const aiJobs = await ctx.db
    .query('aiCategorizationJobs')
    .filter((q: any) => q.eq(q.field('productIds'), product._id))
    .collect();

  const trashId = await ctx.db.insert('productTrash', {
    organizationId: product.organizationId,
    projectId: product.projectId,
    productId: product._id,
    productData: product,
    deletedAt: now,
    deletedBy: user._id,
    deletionReason: reason,
    deletionType,
    expiresAt: now + thirtyDaysInMs,
    bulkOperationId,
    relatedData: {
      variantIds: variants.map((v) => v._id),
      categoryAssignmentIds: categoryAssignments.map((ca) => ca._id),
      aiJobIds: aiJobs.map((job) => job._id),
      imageStorageIds: product.images.map((img) => img.storageId),
    },
    recoveryStatus: 'recoverable',
  });

  return trashId;
}

/**
 * Handle cascade deletion of related entities
 */
async function handleCascadeDeletion(
  ctx: any,
  product: Doc<'products'>,
  user: Doc<'users'>,
  transactionId?: string,
  transaction?: CascadeTransaction
) {
  // Soft delete variants
  const variants = await ctx.db
    .query('productVariants')
    .withIndex('by_product', (q: any) => q.eq('productId', product._id))
    .collect();

  for (const variant of variants) {
    if (transaction) {
      await transaction.execute(
        async () => ctx.db.patch(variant._id, { status: 'archived' }),
        async () => ctx.db.patch(variant._id, { status: 'active' }),
        'Archive product variant',
        'productVariants',
        variant._id
      );
      await transaction.trackAffectedEntity('variants', variant._id);
    } else {
      await ctx.db.patch(variant._id, { status: 'archived' });
    }
  }

  // Handle category assignments based on feature flag
  const categoryAssignments = await ctx.db
    .query('categoryProductAssignments')
    .withIndex('by_product', (q: any) => q.eq('productId', product._id))
    .collect();

  if (CASCADE_DELETION_FLAGS.PRESERVE_CATEGORY_ASSIGNMENTS && transactionId) {
    // Preserve assignments in trash before deletion
    for (const assignment of categoryAssignments) {
      const trashData = {
        originalAssignmentId: assignment._id,
        organizationId: assignment.organizationId,
        projectId: assignment.projectId,
        categoryId: assignment.categoryId,
        productId: assignment.productId,
        assignedBy: assignment.assignedBy,
        confidence: assignment.confidence,
        rationale: assignment.rationale,
        status: assignment.status,
        assignedByUser: assignment.assignedByUser,
        assignedAt: assignment.createdAt,
        deletedAt: Date.now(),
        deletedBy: user._id,
        cascadeTransactionId: transactionId,
        recoverable: true,
      };

      if (transaction) {
        const trashId = await transaction.execute(
          async () => ctx.db.insert('categoryAssignmentsTrash', trashData),
          async () => {
            // Rollback would delete the trash entry, but we need the ID which we don't have
            // This is a limitation - in practice we'd need to store the ID
          },
          'Preserve category assignment',
          'categoryAssignmentsTrash',
          assignment._id
        );
      } else {
        await ctx.db.insert('categoryAssignmentsTrash', trashData);
      }
    }
  }

  // Remove category assignments
  for (const assignment of categoryAssignments) {
    if (transaction) {
      await transaction.execute(
        async () => ctx.db.delete(assignment._id),
        async () => {
          // Rollback would need to restore the assignment with all its data
          // This would require storing the full assignment data
        },
        'Delete category assignment',
        'categoryProductAssignments',
        assignment._id
      );
      await transaction.trackAffectedEntity('assignments', assignment._id);
    } else {
      await ctx.db.delete(assignment._id);
    }
  }

  // Queue images for cleanup if feature is enabled
  if (CASCADE_DELETION_FLAGS.USE_IMAGE_CLEANUP_QUEUE && transactionId) {
    const now = Date.now();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
    
    for (const image of product.images) {
      const queueData = {
        storageId: image.storageId,
        originalProductId: product._id,
        organizationId: product.organizationId,
        fileUrl: image.url,
        fileName: image.id,
        queuedAt: now,
        queuedBy: 'deletion' as const,
        cascadeTransactionId: transactionId,
        priority: 'low' as const,
        status: 'pending' as const,
        retainUntil: now + ninetyDaysInMs,
        permanentRetention: false,
        attempts: 0,
        maxAttempts: 3,
        verifiedDeleted: false,
      };

      if (transaction) {
        await transaction.execute(
          async () => ctx.db.insert('imageCleanupQueue', queueData),
          async () => {
            // Rollback would delete the queue entry
          },
          'Queue image for cleanup',
          'imageCleanupQueue',
          image.storageId
        );
        await transaction.trackAffectedEntity('images', image.storageId);
      } else {
        await ctx.db.insert('imageCleanupQueue', queueData);
      }
    }
  }

  // Note: We preserve AI job references and file storage for history
}

/**
 * Create audit log for deletion operations
 */
async function createDeletionAuditLog(
  ctx: any,
  operationType: 'soft_delete' | 'bulk_delete' | 'restore' | 'permanent_delete' | 'auto_cleanup',
  products: Doc<'products'>[],
  user: Doc<'users'>,
  confirmationMethod?: string
) {
  const now = Date.now();

  // Get category information for each product
  const productsWithCategories = await Promise.all(
    products.map(async (product) => {
      const assignments = await ctx.db
        .query('categoryProductAssignments')
        .withIndex('by_product', (q: any) => q.eq('productId', product._id))
        .filter((q: any) => q.eq(q.field('status'), 'active'))
        .collect();

      const categories = await Promise.all(
        assignments.map(async (assignment: any) => {
          const category = await ctx.db.get(assignment.categoryId);
          return category?.name || 'Unknown';
        })
      );

      return {
        productId: product._id,
        title: product.title,
        sku: product.sku,
        categories,
      };
    })
  );

  // Calculate breakdown
  const categorized = productsWithCategories.filter((p) => p.categories.length > 0);
  const uncategorized = productsWithCategories.filter((p) => p.categories.length === 0);

  // Count by category
  const categoryMap = new Map<string, { id: Id<'categories'>; name: string; count: number }>();
  for (const product of productsWithCategories) {
    for (const categoryName of product.categories) {
      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.count++;
      } else {
        // This is simplified - in reality we'd need the category ID too
        categoryMap.set(categoryName, {
          id: '' as Id<'categories'>, // Would need to fetch this
          name: categoryName,
          count: 1,
        });
      }
    }
  }

  await ctx.db.insert('deletionAuditLogs', {
    organizationId: products[0].organizationId,
    projectId: products[0].projectId,
    operationType,
    affectedProducts: productsWithCategories,
    totalCount: products.length,
    breakdown: {
      uncategorized: uncategorized.length,
      categorized: categorized.length,
      byCategory: Array.from(categoryMap.values()),
    },
    performedBy: user._id,
    performedAt: now,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    confirmationMethod,
  });
}

/**
 * Process a single product deletion within a transaction
 */
async function processSingleDeletion(
  ctx: any,
  productId: Id<'products'>,
  user: Doc<'users'>,
  options: {
    bulkOperationId?: string;
    reason?: string;
    deletionType?: 'manual' | 'bulk' | 'cascade' | 'cleanup';
    transactionId?: string;
    transaction?: CascadeTransaction;
  } = {}
) {
  try {
    const product = await ctx.db.get(productId);
    if (!product) {
      return { success: false, productId, error: 'Product not found' };
    }

    // Create trash entry
    let trashId;
    if (options.transaction) {
      trashId = await options.transaction.execute(
        async () => createTrashEntry(
          ctx,
          product,
          user,
          options.reason,
          options.bulkOperationId,
          options.deletionType || 'manual',
          options.transactionId
        ),
        async () => {
          // Rollback would delete the trash entry
        },
        'Create trash entry',
        'productTrash',
        productId
      );
    } else {
      trashId = await createTrashEntry(
        ctx,
        product,
        user,
        options.reason,
        options.bulkOperationId,
        options.deletionType || 'manual',
        options.transactionId
      );
    }

    // Soft delete product
    if (options.transaction) {
      await options.transaction.execute(
        async () => ctx.db.patch(productId, {
          status: 'archived' as const,
          archivedAt: Date.now(),
          archivedBy: user._id,
        }),
        async () => ctx.db.patch(productId, {
          status: 'active' as const,
          archivedAt: undefined,
          archivedBy: undefined,
        }),
        'Archive product',
        'products',
        productId
      );
    } else {
      await ctx.db.patch(productId, {
        status: 'archived' as const,
        archivedAt: Date.now(),
        archivedBy: user._id,
      });
    }

    // Handle cascades
    await handleCascadeDeletion(ctx, product, user, options.transactionId, options.transaction);

    return { success: true, productId, trashId };
  } catch (error: any) {
    return { success: false, productId, error: error.message };
  }
}

/**
 * Single product soft delete mutation
 */
export const deleteProduct = mutation({
  args: {
    productId: v.id('products'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error('Product not found');

    const { user } = await requireRole(ctx, product.organizationId, ['owner', 'admin']);

    // Use transactional deletion if feature flag is enabled
    if (CASCADE_DELETION_FLAGS.USE_TRANSACTIONAL_DELETION) {
      const result = await withTransaction(
        ctx,
        product.organizationId,
        user._id,
        'single_delete',
        args.productId,
        async (transaction) => {
          // Create trash entry within transaction
          const trashEntry = await transaction.execute(
            async () => createTrashEntry(ctx, product, user, args.reason, undefined, 'manual', transaction.getTransactionId()),
            async () => {
              // Rollback: mark trash entry as failed
              // In real implementation, we'd delete the trash entry
            },
            'Create trash entry',
            'productTrash',
            product._id
          );

          // Soft delete product within transaction
          await transaction.execute(
            async () => ctx.db.patch(args.productId, {
              status: 'archived' as const,
              archivedAt: Date.now(),
              archivedBy: user._id,
            }),
            async () => ctx.db.patch(args.productId, {
              status: 'active' as const,
              archivedAt: undefined,
              archivedBy: undefined,
            }),
            'Archive product',
            'products',
            args.productId
          );

          // Handle cascades within transaction
          await handleCascadeDeletion(ctx, product, user, transaction.getTransactionId(), transaction);

          // Track affected entities
          await transaction.trackAffectedEntity('products', args.productId);
          
          return { trashEntry };
        }
      );

      // Create audit log
      await createDeletionAuditLog(ctx, 'soft_delete', [product], user);

      return { success: true, trashId: result.trashEntry };
    } else {
      // Legacy non-transactional deletion
      const trashEntry = await createTrashEntry(ctx, product, user, args.reason);

      await ctx.db.patch(args.productId, {
        status: 'archived' as const,
        archivedAt: Date.now(),
        archivedBy: user._id,
      });

      await handleCascadeDeletion(ctx, product, user);

      await createDeletionAuditLog(ctx, 'soft_delete', [product], user);

      return { success: true, trashId: trashEntry };
    }
  },
});

/**
 * Bulk delete products mutation
 */
export const bulkDeleteProducts = mutation({
  args: {
    productIds: v.array(v.id('products')),
    confirmationText: v.string(), // e.g., "DELETE 45"
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate confirmation
    const expectedText = `DELETE ${args.productIds.length}`;
    if (args.confirmationText !== expectedText) {
      throw new Error('Invalid confirmation text');
    }

    // Get first product to check organization
    const firstProduct = await ctx.db.get(args.productIds[0]);
    if (!firstProduct) throw new Error('Product not found');

    // Permission check
    const { user } = await requireRole(ctx, firstProduct.organizationId, ['owner', 'admin']);

    // Batch process
    const bulkOperationId = generateBulkOperationId();
    const results = [];
    const successfulProducts = [];

    if (CASCADE_DELETION_FLAGS.USE_TRANSACTIONAL_DELETION) {
      // Process each product deletion in a transaction
      for (const productId of args.productIds) {
        const product = await ctx.db.get(productId);
        if (!product) {
          results.push({ success: false, productId, error: 'Product not found' });
          continue;
        }

        try {
          const transactionResult = await withTransaction(
            ctx,
            product.organizationId,
            user._id,
            'bulk_delete',
            productId,
            async (transaction) => {
              const result = await processSingleDeletion(ctx, productId, user, {
                bulkOperationId,
                reason: args.reason,
                deletionType: 'bulk',
                transactionId: transaction.getTransactionId(),
                transaction: transaction,
              });
              
              // Track affected entities
              await transaction.trackAffectedEntity('products', productId);
              
              return result;
            }
          );
          
          results.push(transactionResult);
          if (transactionResult.success) {
            successfulProducts.push(product);
          }
        } catch (error: any) {
          results.push({ success: false, productId, error: error.message });
        }
      }
    } else {
      // Legacy non-transactional bulk deletion
      for (const productId of args.productIds) {
        const result = await processSingleDeletion(ctx, productId, user, {
          bulkOperationId,
          reason: args.reason,
          deletionType: 'bulk',
        });
        results.push(result);
        
        if (result.success) {
          const product = await ctx.db.get(productId);
          if (product) successfulProducts.push(product);
        }
      }
    }

    // Create consolidated audit log
    if (successfulProducts.length > 0) {
      await createDeletionAuditLog(
        ctx,
        'bulk_delete',
        successfulProducts,
        user,
        args.confirmationText
      );
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      deletedCount: successCount,
      failedCount,
      bulkOperationId,
      results,
    };
  },
});

/**
 * Restore related data for a product
 */
async function restoreRelatedData(ctx: any, trashEntry: Doc<'productTrash'>, user: Doc<'users'>) {
  // Restore variants
  for (const variantId of trashEntry.relatedData.variantIds) {
    const variant = await ctx.db.get(variantId);
    if (variant && variant.status === 'archived') {
      await ctx.db.patch(variantId, {
        status: 'active' as const,
      });
    }
  }

  // Restore category assignments if feature is enabled
  if (CASCADE_DELETION_FLAGS.PRESERVE_CATEGORY_ASSIGNMENTS) {
    // Find preserved assignments in trash
    const preservedAssignments = await ctx.db
      .query('categoryAssignmentsTrash')
      .withIndex('by_product', (q: any) => q.eq('productId', trashEntry.productId))
      .filter((q: any) => q.eq(q.field('recoverable'), true))
      .collect();

    for (const preserved of preservedAssignments) {
      // Check if category still exists
      const category = await ctx.db.get(preserved.categoryId);
      if (category && category.status === 'active') {
        // Recreate the assignment
        await ctx.db.insert('categoryProductAssignments', {
          organizationId: preserved.organizationId,
          projectId: preserved.projectId,
          categoryId: preserved.categoryId,
          productId: preserved.productId,
          assignedBy: preserved.assignedBy,
          confidence: preserved.confidence,
          rationale: preserved.rationale,
          status: preserved.status,
          assignedByUser: preserved.assignedByUser,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Mark as recovered
        await ctx.db.patch(preserved._id, {
          recoverable: false,
          recoveredAt: Date.now(),
          recoveredBy: user._id,
        });
      }
    }
  }
  // Note: Legacy behavior - assignments were deleted and can't be restored
}

/**
 * Restore products from trash mutation
 */
export const restoreProducts = mutation({
  args: {
    trashIds: v.array(v.id('productTrash')),
  },
  handler: async (ctx, args) => {
    const firstTrashEntry = await ctx.db.get(args.trashIds[0]);
    if (!firstTrashEntry) throw new Error('Trash entry not found');

    const { user } = await requireRole(ctx, firstTrashEntry.organizationId, ['owner', 'admin']);

    const restored = [];
    const restoredProducts = [];

    for (const trashId of args.trashIds) {
      const trashEntry = await ctx.db.get(trashId);
      if (!trashEntry || trashEntry.recoveryStatus !== 'recoverable') {
        continue;
      }

      const product = await ctx.db.get(trashEntry.productId);
      if (!product) continue;

      // Restore product
      await ctx.db.patch(trashEntry.productId, {
        status: 'active' as const,
        archivedAt: undefined,
        archivedBy: undefined,
      });

      // Restore related data
      await restoreRelatedData(ctx, trashEntry, user);

      // Update trash entry
      await ctx.db.patch(trashId, {
        recoveryStatus: 'recovered' as const,
        recoveredAt: Date.now(),
        recoveredBy: user._id,
      });

      restored.push(trashEntry.productId);
      restoredProducts.push(product);
    }

    // Audit log
    if (restoredProducts.length > 0) {
      await createDeletionAuditLog(ctx, 'restore', restoredProducts, user);
    }

    return { success: true, restoredCount: restored.length, restoredIds: restored };
  },
});

/**
 * Permanently delete a product (removes all data)
 */
async function permanentlyDeleteProduct(ctx: any, trashEntry: Doc<'productTrash'>) {
  // Delete the actual product record
  const product = await ctx.db.get(trashEntry.productId);
  if (product) {
    await ctx.db.delete(trashEntry.productId);
  }

  // Delete all variants
  for (const variantId of trashEntry.relatedData.variantIds) {
    const variant = await ctx.db.get(variantId);
    if (variant) {
      await ctx.db.delete(variantId);
    }
  }

  // Note: Category assignments are already deleted
  // File cleanup would be handled separately by a file cleanup service
}

/**
 * Permanently delete products (admin only)
 */
export const permanentlyDeleteProducts = mutation({
  args: {
    trashIds: v.array(v.id('productTrash')),
    confirmationText: v.string(), // "PERMANENTLY DELETE X"
  },
  handler: async (ctx, args) => {
    const firstTrashEntry = await ctx.db.get(args.trashIds[0]);
    if (!firstTrashEntry) throw new Error('Trash entry not found');

    const { user } = await requireRole(ctx, firstTrashEntry.organizationId, ['owner']);

    // Additional confirmation
    const expectedText = `PERMANENTLY DELETE ${args.trashIds.length}`;
    if (args.confirmationText !== expectedText) {
      throw new Error('Invalid confirmation');
    }

    const deletedProducts = [];

    for (const trashId of args.trashIds) {
      const trashEntry = await ctx.db.get(trashId);
      if (!trashEntry) continue;

      const product = await ctx.db.get(trashEntry.productId);
      if (product) {
        deletedProducts.push(product);
      }

      // Permanent deletion
      await permanentlyDeleteProduct(ctx, trashEntry);

      // Update trash entry
      await ctx.db.patch(trashId, {
        recoveryStatus: 'permanently_deleted' as const,
        permanentlyDeletedAt: Date.now(),
      });
    }

    // Audit log
    if (deletedProducts.length > 0) {
      await createDeletionAuditLog(ctx, 'permanent_delete', deletedProducts, user, args.confirmationText);
    }

    return {
      success: true,
      deletedCount: deletedProducts.length,
    };
  },
});

/**
 * Internal mutation for cron job to clean up expired trash
 */
export const cleanupExpiredTrash = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    const expired = await ctx.db
      .query('productTrash')
      .withIndex('by_expiration')
      .filter((q) =>
        q.and(
          q.lte(q.field('expiresAt'), now),
          q.eq(q.field('recoveryStatus'), 'recoverable')
        )
      )
      .collect();

    const deletedProducts = [];

    for (const item of expired) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        deletedProducts.push(product);
      }

      // Permanent deletion
      await permanentlyDeleteProduct(ctx, item);

      // Update trash entry
      await ctx.db.patch(item._id, {
        recoveryStatus: 'permanently_deleted' as const,
        permanentlyDeletedAt: now,
      });
    }

    // System audit log
    if (expired.length > 0 && deletedProducts.length > 0) {
      // For system operations, we need a system user reference
      // This is simplified - in production you'd have a system user
      await ctx.db.insert('deletionAuditLogs', {
        organizationId: expired[0].organizationId,
        projectId: expired[0].projectId,
        operationType: 'auto_cleanup' as const,
        affectedProducts: deletedProducts.map((p) => ({
          productId: p._id,
          title: p.title,
          sku: p.sku,
          categories: [],
        })),
        totalCount: deletedProducts.length,
        breakdown: {
          uncategorized: 0,
          categorized: 0,
          byCategory: [],
        },
        performedBy: '' as Id<'users'>, // System user
        performedAt: now,
        userEmail: 'system@bulkgrillerspride.com',
        userName: 'System',
      });
    }

    return { cleanedUp: expired.length };
  },
});

/**
 * Calculate days remaining until permanent deletion
 */
function calculateDaysRemaining(expiresAt: number): number {
  const now = Date.now();
  const msRemaining = expiresAt - now;
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
}

/**
 * Get trash items with pagination - Optimized version using proper indexes
 */
export const getTrashItems = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal('deletedAt'),
      v.literal('expiresAt'),
      v.literal('title')
    )),
  },
  handler: async (ctx, args) => {
    const { membership } = await authenticateAndAuthorize(ctx, args.organizationId);

    const limit = Math.min(args.limit || 50, 100); // Cap at 100 for performance
    
    // Use optimized indexes based on sort order
    let paginatedResults;
    
    if (args.sortBy === 'deletedAt' || !args.sortBy) {
      // Use the composite index for deletedAt sorting (default)
      const query = ctx.db
        .query('productTrash')
        .withIndex('by_org_deleted', (q) =>
          q.eq('organizationId', args.organizationId)
        )
        .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'));
      
      if (args.projectId) {
        query.filter((q) => q.eq(q.field('projectId'), args.projectId));
      }
      
      // Use native Convex pagination
      paginatedResults = await query
        .order('desc') // Sort by deletedAt descending (newest first)
        .paginate({
          numItems: limit,
          cursor: args.cursor || null,
        });
        
    } else if (args.sortBy === 'expiresAt') {
      // Use the composite index for expiresAt sorting
      const query = ctx.db
        .query('productTrash')
        .withIndex('by_org_expires', (q) =>
          q.eq('organizationId', args.organizationId)
        )
        .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'));
      
      if (args.projectId) {
        query.filter((q) => q.eq(q.field('projectId'), args.projectId));
      }
      
      // Use native Convex pagination
      paginatedResults = await query
        .order('asc') // Sort by expiresAt ascending (expiring soonest first)
        .paginate({
          numItems: limit,
          cursor: args.cursor || null,
        });
        
    } else if (args.sortBy === 'title') {
      // For title sorting, we'll need to use the search index in a follow-up implementation
      // For now, fallback to limited in-memory sorting with a warning
      const query = ctx.db
        .query('productTrash')
        .withIndex('by_organization', (q) =>
          q.eq('organizationId', args.organizationId)
        )
        .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'));
      
      if (args.projectId) {
        query.filter((q) => q.eq(q.field('projectId'), args.projectId));
      }
      
      // Fetch a limited set for title sorting (temporary solution)
      const items = await query.take(500); // Limit to prevent memory issues
      
      // Sort by title
      const sortedItems = items.sort((a, b) => {
        const titleA = (a.productData as any).title || '';
        const titleB = (b.productData as any).title || '';
        return titleA.localeCompare(titleB);
      });
      
      // Manual pagination for title sort
      const cursorIndex = args.cursor ? parseInt(args.cursor, 10) : 0;
      const paginatedItems = sortedItems.slice(cursorIndex, cursorIndex + limit);
      const hasMore = cursorIndex + limit < sortedItems.length;
      
      paginatedResults = {
        page: paginatedItems,
        continueCursor: hasMore ? (cursorIndex + limit).toString() : null,
        isDone: !hasMore,
      };
    }

    // Enrich items with additional information
    const enrichedItems = await Promise.all(
      paginatedResults.page.map(async (item) => {
        const deletedByUser = await ctx.db.get(item.deletedBy);
        return {
          ...item,
          daysRemaining: calculateDaysRemaining(item.expiresAt),
          isExpiringSoon: item.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000,
          deletedByName: deletedByUser 
            ? `${deletedByUser.firstName} ${deletedByUser.lastName}` 
            : 'Unknown',
        };
      })
    );

    // Get total count efficiently using index
    const totalCount = await ctx.db
      .query('productTrash')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .filter((q) => {
        let filter = q.eq(q.field('recoveryStatus'), 'recoverable');
        if (args.projectId) {
          filter = q.and(filter, q.eq(q.field('projectId'), args.projectId));
        }
        return filter;
      })
      .collect()
      .then(items => items.length);

    return {
      items: enrichedItems,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
      totalCount,
    };
  },
});

/**
 * Get deletion statistics
 */
export const getDeletionStats = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    timeRange: v.optional(v.union(
      v.literal('7d'),
      v.literal('30d'),
      v.literal('90d')
    )),
  },
  handler: async (ctx, args) => {
    await authenticateAndAuthorize(ctx, args.organizationId);

    const now = Date.now();
    const timeRanges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const timeRange = args.timeRange || '30d';
    const startTime = now - timeRanges[timeRange];

    // Get trash items
    let trashQuery = ctx.db
      .query('productTrash')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId)
      );

    if (args.projectId) {
      trashQuery = trashQuery.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    const allTrashItems = await trashQuery.collect();

    // Filter by time range
    const recentTrashItems = allTrashItems.filter(item => item.deletedAt >= startTime);

    // Calculate statistics
    const stats = {
      totalInTrash: allTrashItems.filter(item => item.recoveryStatus === 'recoverable').length,
      deletedInPeriod: recentTrashItems.length,
      restoredInPeriod: recentTrashItems.filter(item => item.recoveryStatus === 'recovered').length,
      permanentlyDeletedInPeriod: recentTrashItems.filter(item => item.recoveryStatus === 'permanently_deleted').length,
      expiringThisWeek: allTrashItems.filter(item => {
        const daysRemaining = calculateDaysRemaining(item.expiresAt);
        return item.recoveryStatus === 'recoverable' && daysRemaining <= 7 && daysRemaining > 0;
      }).length,
      byDeletionType: {
        manual: recentTrashItems.filter(item => item.deletionType === 'manual').length,
        bulk: recentTrashItems.filter(item => item.deletionType === 'bulk').length,
        cascade: recentTrashItems.filter(item => item.deletionType === 'cascade').length,
        cleanup: recentTrashItems.filter(item => item.deletionType === 'cleanup').length,
      },
      averageRecoveryTime: 0, // Would need to calculate from recovered items
    };

    // Calculate average recovery time for recovered items
    const recoveredItems = recentTrashItems.filter(item => 
      item.recoveryStatus === 'recovered' && item.recoveredAt
    );
    
    if (recoveredItems.length > 0) {
      const totalRecoveryTime = recoveredItems.reduce((sum, item) => {
        return sum + (item.recoveredAt! - item.deletedAt);
      }, 0);
      stats.averageRecoveryTime = Math.round(totalRecoveryTime / recoveredItems.length / (60 * 60 * 1000)); // in hours
    }

    return stats;
  },
});

/**
 * Get activity logs for deletion operations
 */
export const getDeletionActivityLogs = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await authenticateAndAuthorize(ctx, args.organizationId);

    let query = ctx.db
      .query('deletionAuditLogs')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId)
      );

    if (args.projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    // Sort by timestamp (most recent first)
    const logs = await query
      .order('desc')
      .paginate({ 
        numItems: args.limit || 50, 
        cursor: args.cursor as any 
      });

    // Enrich logs with user information
    const enrichedLogs = await Promise.all(
      logs.page.map(async (log) => {
        const user = await ctx.db.get(log.performedBy);
        return {
          ...log,
          performedByName: user ? `${user.firstName} ${user.lastName}` : log.userName,
        };
      })
    );

    return {
      ...logs,
      page: enrichedLogs,
    };
  },
});

/**
 * Search trash items - Optimized version using search index
 */
export const searchTrashItems = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await authenticateAndAuthorize(ctx, args.organizationId);

    const limit = Math.min(args.limit || 50, 100); // Cap at 100 for performance

    // Use the search index for efficient text search
    let searchQuery = ctx.db
      .query('productTrash')
      .withSearchIndex('search_trash', (q) => 
        q
          .search('productData.title', args.searchTerm)
          .eq('organizationId', args.organizationId)
          .eq('recoveryStatus', 'recoverable')
      );

    if (args.projectId) {
      searchQuery = searchQuery.filter((q) => 
        q.eq(q.field('projectId'), args.projectId)
      );
    }

    // Get search results with limit
    const searchResults = await searchQuery.take(limit);

    // If search index doesn't return enough results, fallback to additional field search
    let finalResults = [...searchResults];
    
    if (searchResults.length < limit) {
      // Fallback search for SKU, vendor, description (not in search index)
      const additionalQuery = ctx.db
        .query('productTrash')
        .withIndex('by_organization', (q) =>
          q.eq('organizationId', args.organizationId)
        )
        .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'));

      if (args.projectId) {
        additionalQuery.filter((q) => q.eq(q.field('projectId'), args.projectId));
      }

      // Get items not already in search results
      const existingIds = new Set(searchResults.map(item => item._id));
      const additionalItems = await additionalQuery
        .take(500) // Limit scan to prevent performance issues
        .then(items => {
          const searchLower = args.searchTerm.toLowerCase();
          return items.filter(item => {
            if (existingIds.has(item._id)) return false;
            
            const productData = item.productData as any;
            return (
              productData.sku?.toLowerCase().includes(searchLower) ||
              productData.vendor?.toLowerCase().includes(searchLower) ||
              productData.description?.toLowerCase().includes(searchLower)
            );
          });
        });

      // Combine results up to limit
      finalResults = [...searchResults, ...additionalItems].slice(0, limit);
    }

    // Enrich results with additional information
    const enrichedItems = await Promise.all(
      finalResults.map(async (item) => {
        const deletedByUser = await ctx.db.get(item.deletedBy);
        return {
          ...item,
          daysRemaining: calculateDaysRemaining(item.expiresAt),
          isExpiringSoon: item.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000,
          deletedByName: deletedByUser 
            ? `${deletedByUser.firstName} ${deletedByUser.lastName}` 
            : 'Unknown',
        };
      })
    );

    return enrichedItems;
  },
});