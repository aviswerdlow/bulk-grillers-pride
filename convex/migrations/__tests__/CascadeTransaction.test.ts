import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { t } from '../../t.setup';
import { CascadeTransaction, withTransaction } from '../CascadeTransaction';
import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../../_generated/dataModel';

// Mock the feature flags
jest.mock('../001_cascade_deletion_schema', () => ({
  CASCADE_DELETION_FLAGS: {
    LOG_CASCADE_TRANSACTIONS: true,
    ENABLE_TRANSACTION_ROLLBACK: true,
  },
  MIGRATION_CONFIG: {
    TRANSACTION_TIMEOUT_MS: 30000,
    MAX_PARALLEL_OPERATIONS: 10,
  },
}));

describe('CascadeTransaction', () => {
  let mockCtx: jest.Mocked<GenericMutationCtx<DataModel>>;
  let transaction: CascadeTransaction;
  const mockOrganizationId = 'org123' as Id<'organizations'>;
  const mockUserId = 'user123' as Id<'users'>;
  const mockProductId = 'prod123' as Id<'products'>;
  const mockTransactionRecordId = 'txn123' as Id<'cascadeTransactions'>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock context
    mockCtx = {
      db: {
        insert: jest.fn().mockResolvedValue(mockTransactionRecordId),
        patch: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          _id: mockTransactionRecordId,
          transactionId: 'txn_test_123',
          affectedEntities: {
            products: [],
            variants: [],
            assignments: [],
            images: [],
          },
        }),
      },
    } as any;

    transaction = new CascadeTransaction(
      mockCtx,
      mockOrganizationId,
      mockUserId,
      'single_delete'
    );
  });

  describe('Transaction Initialization', () => {
    it('should generate unique transaction ID', async () => {
      const txn1 = new CascadeTransaction(mockCtx, mockOrganizationId, mockUserId, 'single_delete');
      const txn2 = new CascadeTransaction(mockCtx, mockOrganizationId, mockUserId, 'single_delete');
      
      expect(txn1.getTransactionId()).not.toBe(txn2.getTransactionId());
      expect(txn1.getTransactionId()).toMatch(/^txn_\d+_[a-z0-9]+$/);
    });

    it('should initialize transaction record in database', async () => {
      await transaction.initialize(mockProductId);

      expect(mockCtx.db.insert).toHaveBeenCalledWith('cascadeTransactions', {
        transactionId: expect.stringMatching(/^txn_\d+_[a-z0-9]+$/),
        organizationId: mockOrganizationId,
        operationType: 'single_delete',
        status: 'in_progress',
        primaryEntityId: mockProductId,
        affectedEntities: {
          products: [],
          variants: [],
          assignments: [],
          images: [],
        },
        operations: [],
        startedAt: expect.any(Number),
        executedBy: mockUserId,
      });
    });

    it('should skip initialization when logging is disabled', async () => {
      const { CASCADE_DELETION_FLAGS } = require('../001_cascade_deletion_schema');
      CASCADE_DELETION_FLAGS.LOG_CASCADE_TRANSACTIONS = false;

      await transaction.initialize(mockProductId);
      
      expect(mockCtx.db.insert).not.toHaveBeenCalled();
      
      // Restore flag
      CASCADE_DELETION_FLAGS.LOG_CASCADE_TRANSACTIONS = true;
    });
  });

  describe('Operation Execution', () => {
    beforeEach(async () => {
      await transaction.initialize(mockProductId);
    });

    it('should execute operation successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockRollback = jest.fn();

      const result = await transaction.execute(
        mockOperation,
        mockRollback,
        'Test operation',
        'test',
        'test123'
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
      expect(mockRollback).not.toHaveBeenCalled();
      expect(mockCtx.db.patch).toHaveBeenCalled();
    });

    it('should handle operation failure and trigger rollback', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const mockRollback = jest.fn().mockResolvedValue(undefined);

      await expect(
        transaction.execute(
          mockOperation,
          mockRollback,
          'Failing operation',
          'test',
          'test123'
        )
      ).rejects.toThrow('Transaction failed: Operation failed');

      expect(mockOperation).toHaveBeenCalled();
      expect(mockRollback).toHaveBeenCalled();
    });

    it('should detect transaction timeout', async () => {
      // Mock a long-running operation
      const { MIGRATION_CONFIG } = require('../001_cascade_deletion_schema');
      MIGRATION_CONFIG.TRANSACTION_TIMEOUT_MS = 100; // Set very short timeout

      // Create new transaction to reset start time
      const timeoutTxn = new CascadeTransaction(mockCtx, mockOrganizationId, mockUserId, 'single_delete');
      await timeoutTxn.initialize(mockProductId);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockRollback = jest.fn();

      await expect(
        timeoutTxn.execute(
          mockOperation,
          mockRollback,
          'Timeout operation',
          'test',
          'test123'
        )
      ).rejects.toThrow('Transaction failed: Transaction timeout exceeded');

      // Restore original timeout
      MIGRATION_CONFIG.TRANSACTION_TIMEOUT_MS = 30000;
    });
  });

  describe('Parallel Execution', () => {
    beforeEach(async () => {
      await transaction.initialize(mockProductId);
    });

    it('should execute multiple operations in parallel batches', async () => {
      const operations = Array.from({ length: 25 }, (_, i) => ({
        operation: jest.fn().mockResolvedValue(`result${i}`),
        rollback: jest.fn(),
        description: `Operation ${i}`,
        targetType: 'test',
        targetId: `test${i}`,
      }));

      const results = await transaction.executeParallel(operations);

      expect(results).toHaveLength(25);
      results.forEach((result, i) => {
        expect(result).toBe(`result${i}`);
      });

      // Verify operations were called
      operations.forEach(op => {
        expect(op.operation).toHaveBeenCalled();
        expect(op.rollback).not.toHaveBeenCalled();
      });
    });

    it('should handle mixed success and failure in parallel operations', async () => {
      const operations = [
        {
          operation: jest.fn().mockResolvedValue('success1'),
          rollback: jest.fn(),
          description: 'Success op',
          targetType: 'test',
          targetId: 'test1',
        },
        {
          operation: jest.fn().mockRejectedValue(new Error('Failed op')),
          rollback: jest.fn(),
          description: 'Failing op',
          targetType: 'test',
          targetId: 'test2',
        },
      ];

      await expect(
        transaction.executeParallel(operations)
      ).rejects.toThrow('Transaction failed: Failed op');

      // First operation's rollback should be called due to second's failure
      expect(operations[0].rollback).toHaveBeenCalled();
    });
  });

  describe('Rollback Functionality', () => {
    beforeEach(async () => {
      await transaction.initialize(mockProductId);
    });

    it('should rollback completed operations in reverse order', async () => {
      const rollbackOrder: string[] = [];
      
      // Execute some successful operations
      await transaction.execute(
        async () => 'op1',
        async () => { rollbackOrder.push('rollback1'); },
        'Operation 1',
        'test',
        'test1'
      );

      await transaction.execute(
        async () => 'op2',
        async () => { rollbackOrder.push('rollback2'); },
        'Operation 2',
        'test',
        'test2'
      );

      // Now fail an operation to trigger rollback
      await expect(
        transaction.execute(
          async () => { throw new Error('Failed'); },
          async () => { rollbackOrder.push('rollback3'); },
          'Operation 3',
          'test',
          'test3'
        )
      ).rejects.toThrow();

      // Verify rollback order is reversed
      expect(rollbackOrder).toEqual(['rollback2', 'rollback1']);
    });

    it('should handle rollback failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await transaction.execute(
        async () => 'success',
        async () => { throw new Error('Rollback failed'); },
        'Operation with failing rollback',
        'test',
        'test1'
      );

      // Trigger rollback
      await expect(
        transaction.execute(
          async () => { throw new Error('Trigger rollback'); },
          async () => {},
          'Failing operation',
          'test',
          'test2'
        )
      ).rejects.toThrow('Transaction failed: Trigger rollback');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rollback failed for operation'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should skip rollback when feature flag is disabled', async () => {
      const { CASCADE_DELETION_FLAGS } = require('../001_cascade_deletion_schema');
      CASCADE_DELETION_FLAGS.ENABLE_TRANSACTION_ROLLBACK = false;

      const mockRollback = jest.fn();
      
      await transaction.execute(
        async () => 'success',
        mockRollback,
        'Success operation',
        'test',
        'test1'
      );

      await expect(
        transaction.execute(
          async () => { throw new Error('Failed'); },
          jest.fn(),
          'Failing operation',
          'test',
          'test2'
        )
      ).rejects.toThrow();

      expect(mockRollback).not.toHaveBeenCalled();

      // Restore flag
      CASCADE_DELETION_FLAGS.ENABLE_TRANSACTION_ROLLBACK = true;
    });
  });

  describe('Transaction Completion', () => {
    beforeEach(async () => {
      await transaction.initialize(mockProductId);
    });

    it('should mark transaction as completed', async () => {
      await transaction.complete();

      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        mockTransactionRecordId,
        {
          status: 'completed',
          completedAt: expect.any(Number),
          metrics: {
            totalDuration: expect.any(Number),
            operationCount: 0,
          },
        }
      );
    });
  });

  describe('Affected Entity Tracking', () => {
    beforeEach(async () => {
      await transaction.initialize(mockProductId);
    });

    it('should track affected products', async () => {
      await transaction.trackAffectedEntity('products', 'prod456');

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockTransactionRecordId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        mockTransactionRecordId,
        {
          affectedEntities: {
            products: ['prod456'],
            variants: [],
            assignments: [],
            images: [],
          },
        }
      );
    });

    it('should track multiple entity types', async () => {
      // Mock get to return current state
      mockCtx.db.get.mockResolvedValueOnce({
        _id: mockTransactionRecordId,
        affectedEntities: {
          products: ['prod456'],
          variants: [],
          assignments: [],
          images: [],
        },
      });

      await transaction.trackAffectedEntity('variants', 'var789');

      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        mockTransactionRecordId,
        {
          affectedEntities: {
            products: ['prod456'],
            variants: ['var789'],
            assignments: [],
            images: [],
          },
        }
      );
    });
  });

  describe('withTransaction Helper', () => {
    it('should create and manage transaction lifecycle', async () => {
      const mockHandler = jest.fn().mockResolvedValue('handler result');

      const result = await withTransaction(
        mockCtx,
        mockOrganizationId,
        mockUserId,
        'bulk_delete',
        mockProductId,
        mockHandler
      );

      expect(result).toBe('handler result');
      expect(mockHandler).toHaveBeenCalledWith(expect.any(CascadeTransaction));
      
      // Verify transaction was initialized and completed
      expect(mockCtx.db.insert).toHaveBeenCalled(); // initialization
      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        mockTransactionRecordId,
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should propagate handler errors', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));

      await expect(
        withTransaction(
          mockCtx,
          mockOrganizationId,
          mockUserId,
          'single_delete',
          mockProductId,
          mockHandler
        )
      ).rejects.toThrow('Handler failed');

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing transaction record gracefully', async () => {
      mockCtx.db.get.mockResolvedValueOnce(null);

      await transaction.initialize(mockProductId);
      
      // This should not throw
      await transaction.trackAffectedEntity('products', 'prod123');
      
      // Should not attempt to patch non-existent record
      expect(mockCtx.db.patch).not.toHaveBeenCalledWith(
        mockTransactionRecordId,
        expect.objectContaining({ affectedEntities: expect.anything() })
      );
    });

    it('should handle concurrent operations within limits', async () => {
      const { MIGRATION_CONFIG } = require('../001_cascade_deletion_schema');
      const originalMax = MIGRATION_CONFIG.MAX_PARALLEL_OPERATIONS;
      MIGRATION_CONFIG.MAX_PARALLEL_OPERATIONS = 3;

      await transaction.initialize(mockProductId);

      const startTimes: number[] = [];
      const operations = Array.from({ length: 9 }, (_, i) => ({
        operation: async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 50));
          return `result${i}`;
        },
        rollback: jest.fn(),
        description: `Op ${i}`,
        targetType: 'test',
        targetId: `test${i}`,
      }));

      await transaction.executeParallel(operations);

      // Verify batching by checking start times
      // Should have 3 batches of 3 operations each
      for (let batch = 0; batch < 3; batch++) {
        const batchStart = startTimes[batch * 3];
        const batchEnd = startTimes[batch * 3 + 2];
        
        // Operations in same batch should start within 10ms
        expect(batchEnd - batchStart).toBeLessThan(10);
        
        // Next batch should start after previous batch
        if (batch < 2) {
          const nextBatchStart = startTimes[(batch + 1) * 3];
          expect(nextBatchStart - batchEnd).toBeGreaterThan(40);
        }
      }

      MIGRATION_CONFIG.MAX_PARALLEL_OPERATIONS = originalMax;
    });
  });
});