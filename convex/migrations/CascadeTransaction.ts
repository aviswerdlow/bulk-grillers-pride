import { GenericMutationCtx } from 'convex/server';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { CASCADE_DELETION_FLAGS, MIGRATION_CONFIG } from './001_cascade_deletion_schema';

/**
 * CascadeTransaction: Ensures atomic cascade deletion operations
 * 
 * This class provides transaction-like behavior for Convex mutations,
 * tracking all operations and enabling rollback on failure.
 * 
 * Author: migration-agent
 * Issue: #67
 */

interface Operation {
  stepId: string;
  operation: string;
  targetType: string;
  targetId: string;
  status: 'pending' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  error?: string;
  rollback?: () => Promise<void>;
}

export class CascadeTransaction {
  private ctx: GenericMutationCtx<DataModel>;
  private transactionId: string;
  private operations: Operation[] = [];
  private transactionRecord?: Id<'cascadeTransactions'>;
  private startTime: number;
  private organizationId: Id<'organizations'>;
  private userId: Id<'users'>;
  private operationType: 'single_delete' | 'bulk_delete' | 'cascade_delete' | 'restore' | 'permanent_delete';

  constructor(
    ctx: GenericMutationCtx<DataModel>,
    organizationId: Id<'organizations'>,
    userId: Id<'users'>,
    operationType: 'single_delete' | 'bulk_delete' | 'cascade_delete' | 'restore' | 'permanent_delete'
  ) {
    this.ctx = ctx;
    this.transactionId = this.generateTransactionId();
    this.startTime = Date.now();
    this.organizationId = organizationId;
    this.userId = userId;
    this.operationType = operationType;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async initialize(primaryEntityId: Id<'products'>) {
    if (!CASCADE_DELETION_FLAGS.LOG_CASCADE_TRANSACTIONS) {
      return;
    }

    this.transactionRecord = await this.ctx.db.insert('cascadeTransactions', {
      transactionId: this.transactionId,
      organizationId: this.organizationId,
      operationType: this.operationType,
      status: 'in_progress',
      primaryEntityId,
      affectedEntities: {
        products: [],
        variants: [],
        assignments: [],
        images: [],
      },
      operations: [],
      startedAt: this.startTime,
      executedBy: this.userId,
    });
  }

  /**
   * Execute an operation within the transaction
   */
  async execute<T>(
    operation: () => Promise<T>,
    rollback: () => Promise<void>,
    description: string,
    targetType: string,
    targetId: string
  ): Promise<T> {
    const stepId = `step_${this.operations.length + 1}`;
    const startedAt = Date.now();

    const op: Operation = {
      stepId,
      operation: description,
      targetType,
      targetId,
      status: 'pending',
      startedAt,
      rollback,
    };

    this.operations.push(op);

    try {
      // Check timeout
      if (Date.now() - this.startTime > MIGRATION_CONFIG.TRANSACTION_TIMEOUT_MS) {
        throw new Error('Transaction timeout exceeded');
      }

      // Execute the operation
      const result = await operation();

      // Mark as completed
      op.status = 'completed';
      op.completedAt = Date.now();

      // Update transaction record
      await this.updateTransactionRecord();

      return result;
    } catch (error: any) {
      // Mark as failed
      op.status = 'failed';
      op.error = error.message;

      // Initiate rollback
      await this.rollbackAll(error.message);
      
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Execute multiple operations in parallel
   */
  async executeParallel<T>(
    operations: Array<{
      operation: () => Promise<T>;
      rollback: () => Promise<void>;
      description: string;
      targetType: string;
      targetId: string;
    }>
  ): Promise<T[]> {
    // Batch operations for efficiency
    const batchSize = Math.min(operations.length, MIGRATION_CONFIG.MAX_PARALLEL_OPERATIONS);
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchPromises = batch.map((op) =>
        this.execute(
          op.operation,
          op.rollback,
          op.description,
          op.targetType,
          op.targetId
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Rollback all completed operations
   */
  private async rollbackAll(reason: string) {
    if (!CASCADE_DELETION_FLAGS.ENABLE_TRANSACTION_ROLLBACK) {
      // Log rollback attempt but don't execute
      console.error(`Rollback requested but disabled: ${reason}`);
      await this.markTransactionFailed(reason);
      return;
    }

    const rollbackStartTime = Date.now();

    try {
      // Update transaction status
      if (this.transactionRecord) {
        await this.ctx.db.patch(this.transactionRecord, {
          status: 'rolled_back',
          rollbackAt: rollbackStartTime,
          rollbackBy: this.userId,
          rollbackReason: reason,
          rollbackStatus: 'in_progress',
        });
      }

      // Rollback in reverse order
      const completedOps = this.operations
        .filter((op) => op.status === 'completed')
        .reverse();

      for (const op of completedOps) {
        try {
          if (op.rollback) {
            await op.rollback();
          }
        } catch (rollbackError: any) {
          console.error(`Rollback failed for operation ${op.stepId}:`, rollbackError);
          // Continue with other rollbacks
        }
      }

      // Update final status
      if (this.transactionRecord) {
        await this.ctx.db.patch(this.transactionRecord, {
          rollbackStatus: 'completed',
          metrics: {
            totalDuration: Date.now() - this.startTime,
            operationCount: this.operations.length,
            rollbackDuration: Date.now() - rollbackStartTime,
          },
        });
      }
    } catch (error: any) {
      // Rollback failed
      if (this.transactionRecord) {
        await this.ctx.db.patch(this.transactionRecord, {
          rollbackStatus: 'failed',
          error: {
            message: `Rollback failed: ${error.message}`,
            stack: error.stack,
            failedOperation: 'rollback',
            failedAt: Date.now(),
          },
        });
      }
      throw error;
    }
  }

  /**
   * Mark transaction as failed without rollback
   */
  private async markTransactionFailed(reason: string) {
    if (this.transactionRecord) {
      await this.ctx.db.patch(this.transactionRecord, {
        status: 'failed',
        completedAt: Date.now(),
        error: {
          message: reason,
          failedOperation: this.operations[this.operations.length - 1]?.operation || 'unknown',
          failedAt: Date.now(),
        },
        metrics: {
          totalDuration: Date.now() - this.startTime,
          operationCount: this.operations.length,
        },
      });
    }
  }

  /**
   * Complete the transaction successfully
   */
  async complete() {
    if (this.transactionRecord) {
      await this.ctx.db.patch(this.transactionRecord, {
        status: 'completed',
        completedAt: Date.now(),
        metrics: {
          totalDuration: Date.now() - this.startTime,
          operationCount: this.operations.length,
        },
      });
    }
  }

  /**
   * Update transaction record with current operations
   */
  private async updateTransactionRecord() {
    if (!this.transactionRecord || !CASCADE_DELETION_FLAGS.LOG_CASCADE_TRANSACTIONS) {
      return;
    }

    await this.ctx.db.patch(this.transactionRecord, {
      operations: this.operations.map((op) => ({
        stepId: op.stepId,
        operation: op.operation,
        targetType: op.targetType,
        targetId: op.targetId,
        status: op.status,
        startedAt: op.startedAt,
        completedAt: op.completedAt,
        error: op.error,
      })),
    });
  }

  /**
   * Track affected entities for audit
   */
  async trackAffectedEntity(
    type: 'products' | 'variants' | 'assignments' | 'images',
    id: string
  ) {
    if (!this.transactionRecord) {
      return;
    }

    const currentRecord = await this.ctx.db.get(this.transactionRecord);
    if (!currentRecord) {
      return;
    }

    const affectedEntities = currentRecord.affectedEntities;
    affectedEntities[type].push(id as any);

    await this.ctx.db.patch(this.transactionRecord, {
      affectedEntities,
    });
  }

  /**
   * Get transaction ID for external reference
   */
  getTransactionId(): string {
    return this.transactionId;
  }
}

/**
 * Helper to create a transaction with proper error handling
 */
export async function withTransaction<T>(
  ctx: GenericMutationCtx<DataModel>,
  organizationId: Id<'organizations'>,
  userId: Id<'users'>,
  operationType: 'single_delete' | 'bulk_delete' | 'cascade_delete' | 'restore' | 'permanent_delete',
  primaryEntityId: Id<'products'>,
  handler: (transaction: CascadeTransaction) => Promise<T>
): Promise<T> {
  const transaction = new CascadeTransaction(ctx, organizationId, userId, operationType);
  
  try {
    await transaction.initialize(primaryEntityId);
    const result = await handler(transaction);
    await transaction.complete();
    return result;
  } catch (error) {
    // Error handling and rollback is managed by the transaction
    throw error;
  }
}