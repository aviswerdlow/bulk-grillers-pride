import { internalMutation, query } from '../../_generated/server';
import { v } from 'convex/values';

export const trackDeletionProgress = internalMutation({
  args: {
    transactionId: v.string(),
    progress: v.object({
      phase: v.string(),
      currentOperation: v.string(),
      completedOperations: v.number(),
      totalOperations: v.number(),
      estimatedTimeRemaining: v.number(),
      currentEntityType: v.optional(v.string()),
      currentEntityName: v.optional(v.string()),
      performanceMetrics: v.optional(v.object({
        averageOperationTime: v.number(),
        operationsPerSecond: v.number(),
        memoryUsage: v.optional(v.number()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query('cascadeTransactions')
      .withIndex('by_transaction_id', q => q.eq('transactionId', args.transactionId))
      .first();
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${args.transactionId}`);
    }
    
    await ctx.db.patch(transaction._id, {
      progress: args.progress,
      updatedAt: Date.now(),
    });
    
    // Update performance metrics if available
    if (args.progress.performanceMetrics && transaction.metrics) {
      await ctx.db.patch(transaction._id, {
        metrics: {
          ...transaction.metrics,
          averageOperationTime: args.progress.performanceMetrics.averageOperationTime,
          operationsPerSecond: args.progress.performanceMetrics.operationsPerSecond,
        },
      });
    }
  },
});

export const subscribeToDeletionProgress = query({
  args: {
    transactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query('cascadeTransactions')
      .withIndex('by_transaction_id', q => q.eq('transactionId', args.transactionId))
      .first();
    
    if (!transaction) {
      return null;
    }
    
    // Calculate additional real-time metrics
    const elapsedTime = Date.now() - transaction.startedAt;
    const progress = transaction.progress || {
      phase: 'pending',
      currentOperation: 'Initializing',
      completedOperations: 0,
      totalOperations: 0,
      estimatedTimeRemaining: 0,
    };
    
    // Calculate estimated completion time based on current progress
    if (progress.completedOperations > 0 && progress.totalOperations > 0) {
      const avgTimePerOperation = elapsedTime / progress.completedOperations;
      const remainingOperations = progress.totalOperations - progress.completedOperations;
      progress.estimatedTimeRemaining = Math.round(avgTimePerOperation * remainingOperations);
    }
    
    return {
      transactionId: transaction.transactionId,
      status: transaction.status,
      progress,
      startedAt: transaction.startedAt,
      elapsedTime,
      error: transaction.error,
    };
  },
});

export const getDeletionHistory = query({
  args: {
    organizationId: v.id('organizations'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const transactions = await ctx.db
      .query('cascadeTransactions')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .order('desc')
      .take(limit);
    
    // Get user information for each transaction
    const transactionsWithUsers = await Promise.all(
      transactions.map(async (transaction) => {
        const user = await ctx.db.get(transaction.executedBy);
        return {
          ...transaction,
          executedByName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
          executedByEmail: user?.email || 'unknown@example.com',
        };
      })
    );
    
    return transactionsWithUsers;
  },
});

export const createProgressNotification = internalMutation({
  args: {
    transactionId: v.string(),
    type: v.union(
      v.literal('started'),
      v.literal('progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('warning')
    ),
    message: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query('cascadeTransactions')
      .withIndex('by_transaction_id', q => q.eq('transactionId', args.transactionId))
      .first();
    
    if (!transaction) {
      return;
    }
    
    // Here you would typically emit a real-time notification
    // For now, we'll just log it to the transaction
    const notifications = transaction.notifications || [];
    notifications.push({
      type: args.type,
      message: args.message,
      details: args.details,
      timestamp: Date.now(),
    });
    
    await ctx.db.patch(transaction._id, {
      notifications: notifications.slice(-50), // Keep last 50 notifications
    });
  },
});

export const getActiveDeleteOperations = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const activeTransactions = await ctx.db
      .query('cascadeTransactions')
      .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
      .filter(q => 
        q.or(
          q.eq(q.field('status'), 'pending'),
          q.eq(q.field('status'), 'in_progress')
        )
      )
      .collect();
    
    // Enrich with progress information
    const enrichedTransactions = await Promise.all(
      activeTransactions.map(async (transaction) => {
        const user = await ctx.db.get(transaction.executedBy);
        const progress = transaction.progress || {
          phase: 'pending',
          currentOperation: 'Waiting to start',
          completedOperations: 0,
          totalOperations: transaction.operations.length,
          estimatedTimeRemaining: 0,
        };
        
        return {
          transactionId: transaction.transactionId,
          operationType: transaction.operationType,
          status: transaction.status,
          progress,
          startedAt: transaction.startedAt,
          executedBy: {
            id: transaction.executedBy,
            name: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
            email: user?.email || 'unknown@example.com',
          },
          affectedEntities: {
            products: transaction.affectedEntities.products.length,
            variants: transaction.affectedEntities.variants.length,
            assignments: transaction.affectedEntities.assignments.length,
            images: transaction.affectedEntities.images.length,
            total: 
              transaction.affectedEntities.products.length +
              transaction.affectedEntities.variants.length +
              transaction.affectedEntities.assignments.length +
              transaction.affectedEntities.images.length,
          },
        };
      })
    );
    
    return enrichedTransactions;
  },
});