import { v } from 'convex/values';
import { mutation, internalMutation, query } from '../../_generated/server';
import { Doc, Id } from '../../_generated/dataModel';
import { authenticateAndAuthorize, requireRole } from '../../lib/auth';

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
  deletionType: 'manual' | 'bulk' | 'cascade' | 'cleanup' = 'manual'
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
async function handleCascadeDeletion(ctx: any, product: Doc<'products'>) {
  // Soft delete variants
  const variants = await ctx.db
    .query('productVariants')
    .withIndex('by_product', (q: any) => q.eq('productId', product._id))
    .collect();

  for (const variant of variants) {
    await ctx.db.patch(variant._id, {
      status: 'archived',
    });
  }

  // Remove category assignments (not soft delete, just remove associations)
  const categoryAssignments = await ctx.db
    .query('categoryProductAssignments')
    .withIndex('by_product', (q: any) => q.eq('productId', product._id))
    .collect();

  for (const assignment of categoryAssignments) {
    await ctx.db.delete(assignment._id);
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
  } = {}
) {
  try {
    const product = await ctx.db.get(productId);
    if (!product) {
      return { success: false, productId, error: 'Product not found' };
    }

    // Create trash entry
    const trashId = await createTrashEntry(
      ctx,
      product,
      user,
      options.reason,
      options.bulkOperationId,
      options.deletionType || 'manual'
    );

    // Soft delete product
    await ctx.db.patch(productId, {
      status: 'archived' as const,
      archivedAt: Date.now(),
      archivedBy: user._id,
    });

    // Handle cascades
    await handleCascadeDeletion(ctx, product);

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

    // Create trash entry
    const trashEntry = await createTrashEntry(ctx, product, user, args.reason);

    // Soft delete product
    await ctx.db.patch(args.productId, {
      status: 'archived' as const,
      archivedAt: Date.now(),
      archivedBy: user._id,
    });

    // Handle cascades
    await handleCascadeDeletion(ctx, product);

    // Create audit log
    await createDeletionAuditLog(ctx, 'soft_delete', [product], user);

    return { success: true, trashId: trashEntry };
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
async function restoreRelatedData(ctx: any, trashEntry: Doc<'productTrash'>) {
  // Restore variants
  for (const variantId of trashEntry.relatedData.variantIds) {
    const variant = await ctx.db.get(variantId);
    if (variant && variant.status === 'archived') {
      await ctx.db.patch(variantId, {
        status: 'active' as const,
      });
    }
  }

  // Note: Category assignments were deleted, not archived, so they can't be restored
  // This is a design decision - categories may have changed while product was in trash
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
      await restoreRelatedData(ctx, trashEntry);

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
 * Get trash items with pagination
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

    let query = ctx.db
      .query('productTrash')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'));

    if (args.projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    // Apply sorting by using order on the index
    // Note: Convex doesn't support dynamic sorting, so we'll fetch and sort in memory
    // For production, you might want to create specific indexes for each sort option
    const allItems = await query.collect();

    // Sort items based on sortBy parameter
    let sortedItems = [...allItems];
    if (args.sortBy === 'deletedAt') {
      sortedItems.sort((a, b) => b.deletedAt - a.deletedAt);
    } else if (args.sortBy === 'expiresAt') {
      sortedItems.sort((a, b) => a.expiresAt - b.expiresAt);
    } else if (args.sortBy === 'title') {
      sortedItems.sort((a, b) => {
        const titleA = (a.productData as any).title || '';
        const titleB = (b.productData as any).title || '';
        return titleA.localeCompare(titleB);
      });
    } else {
      // Default sort by deletedAt (most recent first)
      sortedItems.sort((a, b) => b.deletedAt - a.deletedAt);
    }

    // Implement pagination
    const limit = args.limit || 50;
    const cursorIndex = args.cursor ? parseInt(args.cursor, 10) : 0;
    const paginatedItems = sortedItems.slice(cursorIndex, cursorIndex + limit);
    const hasMore = cursorIndex + limit < sortedItems.length;
    const nextCursor = hasMore ? (cursorIndex + limit).toString() : null;

    // Enrich with countdown and additional info
    const enrichedItems = await Promise.all(
      paginatedItems.map(async (item) => {
        const deletedByUser = await ctx.db.get(item.deletedBy);
        return {
          ...item,
          daysRemaining: calculateDaysRemaining(item.expiresAt),
          isExpiringSoon: item.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000,
          deletedByName: deletedByUser ? `${deletedByUser.firstName} ${deletedByUser.lastName}` : 'Unknown',
        };
      })
    );

    return {
      items: enrichedItems,
      continueCursor: nextCursor,
      isDone: !hasMore,
      totalCount: sortedItems.length,
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
 * Search trash items
 */
export const searchTrashItems = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticateAndAuthorize(ctx, args.organizationId);

    let query = ctx.db
      .query('productTrash')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .filter((q) => q.eq(q.field('recoveryStatus'), 'recoverable'));

    if (args.projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    const allItems = await query.collect();

    // Search in product data
    const searchLower = args.searchTerm.toLowerCase();
    const matchingItems = allItems.filter(item => {
      const productData = item.productData as any;
      return (
        productData.title?.toLowerCase().includes(searchLower) ||
        productData.sku?.toLowerCase().includes(searchLower) ||
        productData.vendor?.toLowerCase().includes(searchLower) ||
        productData.description?.toLowerCase().includes(searchLower)
      );
    });

    // Enrich results
    const enrichedItems = await Promise.all(
      matchingItems.map(async (item) => {
        const deletedByUser = await ctx.db.get(item.deletedBy);
        return {
          ...item,
          daysRemaining: calculateDaysRemaining(item.expiresAt),
          isExpiringSoon: item.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000,
          deletedByName: deletedByUser ? `${deletedByUser.firstName} ${deletedByUser.lastName}` : 'Unknown',
        };
      })
    );

    return enrichedItems;
  },
});