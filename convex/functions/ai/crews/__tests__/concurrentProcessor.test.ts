/**
 * Tests for CrewAI Concurrent Processor
 */

import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../../../t.setup';
import { ConcurrentProcessor } from '../concurrentProcessor';
import { createAgents } from '../agents';
import { ErrorHandler, CircuitBreaker, RateLimiter } from '../errorHandler';
import {
  CrewConfig,
  TaskContext,
  ConcurrentProcessingResult,
  Agent,
} from '../types';

describe('ConcurrentProcessor', () => {
  let ctx: any;
  let processor: ConcurrentProcessor;
  let config: CrewConfig;
  
  beforeEach(async () => {
    // Create test context
    ctx = await convexTest({
      modules: {},
    });
    
    // Create test configuration
    const agents = createAgents();
    config = {
      id: 'test_crew_config',
      organizationId: 'org_test123' as any,
      agents: [agents.analyzer, agents.matcher, agents.validator],
      process: 'concurrent',
      maxConcurrentTasks: 5,
      memoryEnabled: true,
      cacheEnabled: true,
      memoryLimit: 512 * 1024 * 1024,
      timeout: 60000,
    };
  });
  
  afterEach(async () => {
    await ctx.close();
  });
  
  describe('Initialization', () => {
    test('should initialize with correct worker distribution', () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      // Check internal state
      expect(processor['config']).toEqual(config);
      expect(processor['instance'].status).toBe('pending');
      expect(processor['workers'].size).toBeGreaterThan(0);
      
      // Verify worker distribution
      let analyzerWorkers = 0;
      let matcherWorkers = 0;
      let validatorWorkers = 0;
      
      processor['workers'].forEach(worker => {
        if (worker.agentRole === 'analyzer') analyzerWorkers++;
        if (worker.agentRole === 'matcher') matcherWorkers++;
        if (worker.agentRole === 'validator') validatorWorkers++;
      });
      
      expect(analyzerWorkers).toBeGreaterThan(0);
      expect(matcherWorkers).toBeGreaterThan(0);
      expect(validatorWorkers).toBeGreaterThan(0);
    });
    
    test('should initialize error handler and rate limiter', () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      expect(processor['errorHandler']).toBeInstanceOf(ErrorHandler);
      expect(processor['rateLimiter']).toBeInstanceOf(RateLimiter);
    });
  });
  
  describe('Task Creation', () => {
    test('should create tasks for each product with dependencies', () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      const contexts: TaskContext[] = [
        {
          productId: 'prod_1' as any,
          productData: { _id: 'prod_1', name: 'Test Product 1' } as any,
          categories: [{ _id: 'cat_1', name: 'Category 1' } as any],
        },
        {
          productId: 'prod_2' as any,
          productData: { _id: 'prod_2', name: 'Test Product 2' } as any,
          categories: [{ _id: 'cat_1', name: 'Category 1' } as any],
        },
      ];
      
      const tasks = processor['createTasksForBatch'](contexts);
      
      // Should create 3 tasks per product
      expect(tasks.length).toBe(6);
      
      // Check task dependencies
      const prod1Tasks = tasks.filter(t => t.context.productId === 'prod_1');
      const analyzerTask = prod1Tasks.find(t => t.agentRole === 'analyzer');
      const matcherTask = prod1Tasks.find(t => t.agentRole === 'matcher');
      const validatorTask = prod1Tasks.find(t => t.agentRole === 'validator');
      
      expect(analyzerTask?.dependencies).toBeUndefined();
      expect(matcherTask?.dependencies).toContain(analyzerTask?.id);
      expect(validatorTask?.dependencies).toContain(matcherTask?.id);
    });
  });
  
  describe('Worker Pool Management', () => {
    test('should get next task respecting dependencies', () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      const analyzerTask = {
        id: 'task_1',
        agentRole: 'analyzer' as const,
        status: 'pending' as const,
        dependencies: undefined,
      } as any;
      
      const matcherTask = {
        id: 'task_2',
        agentRole: 'matcher' as const,
        status: 'pending' as const,
        dependencies: ['task_1'],
      } as any;
      
      processor['taskQueue'] = [analyzerTask, matcherTask];
      
      // Should get analyzer task first
      const nextTask = processor['getNextTask']('analyzer');
      expect(nextTask?.id).toBe('task_1');
      
      // Matcher task should not be available yet
      const noTask = processor['getNextTask']('matcher');
      expect(noTask).toBeNull();
      
      // After completing analyzer task
      processor['completedTasks'].set('task_1', analyzerTask);
      const matcherReady = processor['getNextTask']('matcher');
      expect(matcherReady?.id).toBe('task_2');
    });
  });
  
  describe('Error Handling', () => {
    test('should retry tasks on recoverable errors', async () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      const task = {
        id: 'task_1',
        agentRole: 'analyzer' as const,
        status: 'processing' as const,
        retryCount: 0,
        context: {
          productId: 'prod_1' as any,
          productData: { _id: 'prod_1' } as any,
          categories: [],
        },
      } as any;
      
      const timeoutError = { 
        type: 'WORKER_TIMEOUT',
        message: 'Task timeout',
        retryable: true,
      };
      
      await processor['handleTaskFailure'](task, timeoutError);
      
      expect(task.retryCount).toBe(1);
      expect(task.status).toBe('pending');
      expect(processor['taskQueue']).toContain(task);
    });
    
    test('should fail task after max retries', async () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      const task = {
        id: 'task_1',
        agentRole: 'analyzer' as const,
        status: 'processing' as const,
        retryCount: 3,
        context: {
          productId: 'prod_1' as any,
          productData: { _id: 'prod_1' } as any,
          categories: [],
        },
      } as any;
      
      const error = { 
        type: 'LLM_API_ERROR',
        message: 'API error',
        retryable: true,
      };
      
      await processor['handleTaskFailure'](task, error);
      
      expect(task.status).toBe('failed');
      expect(processor['failedTasks'].has('task_1')).toBe(true);
    });
  });
  
  describe('Memory Management', () => {
    test('should check and enforce memory limits', async () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      // Mock memory stats
      const mockStats = {
        totalSizeBytes: 600 * 1024 * 1024, // 600MB (over limit)
      };
      
      processor['memoryManager'].getStats = jest.fn().mockResolvedValue(mockStats);
      processor['memoryManager'].summarize = jest.fn().mockResolvedValue({ 
        summarized: 5, 
        deleted: 50 
      });
      
      await processor['checkMemoryLimit']();
      
      expect(processor['memoryManager'].summarize).toHaveBeenCalledWith(100, 0.3);
    });
    
    test('should update memory usage tracking', async () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      const mockStats = {
        totalSizeBytes: 100 * 1024 * 1024, // 100MB
      };
      
      processor['memoryManager'].getStats = jest.fn().mockResolvedValue(mockStats);
      
      await processor['updateMemoryUsage']();
      
      expect(processor['instance'].currentMemoryUsage).toBe(mockStats.totalSizeBytes);
      expect(processor['instance'].metrics.memoryPeakUsage).toBeGreaterThanOrEqual(mockStats.totalSizeBytes);
    });
  });
  
  describe('Throughput Monitoring', () => {
    test('should calculate and update throughput metrics', () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      // Simulate completed tasks
      processor['instance'].metrics.completedTasks = 750;
      processor['startTime'] = Date.now() - 60000; // 1 minute ago
      
      // Update throughput
      const elapsedMinutes = (Date.now() - processor['startTime']) / 60000;
      const throughput = processor['instance'].metrics.completedTasks / elapsedMinutes;
      processor['instance'].metrics.throughput = throughput;
      
      expect(processor['instance'].metrics.throughput).toBeCloseTo(750, 1);
    });
  });
  
  describe('Result Collection', () => {
    test('should collect results from all agents', () => {
      processor = new ConcurrentProcessor(ctx, config);
      
      const contexts: TaskContext[] = [
        {
          productId: 'prod_1' as any,
          productData: { _id: 'prod_1' } as any,
          categories: [],
        },
      ];
      
      // Mock completed tasks
      const analyzerTask = {
        id: 'analyze_prod_1',
        agentRole: 'analyzer',
        context: contexts[0],
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        result: { features: ['test'] },
      };
      
      const matcherTask = {
        id: 'match_prod_1',
        agentRole: 'matcher',
        context: contexts[0],
        status: 'completed',
        startedAt: Date.now() - 800,
        completedAt: Date.now(),
        result: { suggestedCategories: [] },
      };
      
      const validatorTask = {
        id: 'validate_prod_1',
        agentRole: 'validator',
        context: contexts[0],
        status: 'completed',
        startedAt: Date.now() - 600,
        completedAt: Date.now(),
        result: { isValid: true },
      };
      
      processor['completedTasks'].set(analyzerTask.id, analyzerTask as any);
      processor['completedTasks'].set(matcherTask.id, matcherTask as any);
      processor['completedTasks'].set(validatorTask.id, validatorTask as any);
      
      const results = processor['collectResults'](contexts);
      
      expect(results.products.length).toBe(1);
      expect(results.products[0].analysisResult).toEqual(analyzerTask.result);
      expect(results.products[0].matchingResult).toEqual(matcherTask.result);
      expect(results.products[0].validationResult).toEqual(validatorTask.result);
      expect(results.products[0].error).toBeUndefined();
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  
  beforeEach(() => {
    errorHandler = new ErrorHandler('test_crew_id');
  });
  
  describe('Error Classification', () => {
    test('should classify memory limit errors', () => {
      const error = new Error('Memory limit exceeded: 512MB');
      const crewError = errorHandler.handleError(error, { taskId: 'task_1' });
      
      expect(crewError.type).toBe('MEMORY_LIMIT_EXCEEDED');
      expect(crewError.retryable).toBe(false);
    });
    
    test('should classify timeout errors', () => {
      const error = new Error('Task timeout after 30 seconds');
      const crewError = errorHandler.handleError(error, { taskId: 'task_1' });
      
      expect(crewError.type).toBe('WORKER_TIMEOUT');
      expect(crewError.retryable).toBe(true);
    });
    
    test('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded (429)');
      const crewError = errorHandler.handleError(error, { taskId: 'task_1' });
      
      expect(crewError.type).toBe('RATE_LIMIT');
      expect(crewError.retryable).toBe(true);
    });
  });
  
  describe('Recovery Strategies', () => {
    test('should provide retry strategy for timeouts', () => {
      const error = {
        type: 'WORKER_TIMEOUT' as const,
        message: 'Timeout',
        timestamp: Date.now(),
        retryable: true,
      };
      
      const strategy = errorHandler.getRecoveryStrategy(error);
      
      expect(strategy.type).toBe('retry');
      expect(strategy.retryConfig?.maxRetries).toBe(3);
      expect(strategy.retryConfig?.backoffMs).toBe(1000);
    });
    
    test('should provide abort strategy for memory errors', () => {
      const error = {
        type: 'MEMORY_LIMIT_EXCEEDED' as const,
        message: 'Memory exceeded',
        timestamp: Date.now(),
        retryable: false,
      };
      
      const strategy = errorHandler.getRecoveryStrategy(error);
      
      expect(strategy.type).toBe('abort');
    });
  });
  
  describe('Circuit Breaker', () => {
    test('should open circuit after threshold failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000,
        halfOpenRequests: 1,
      });
      
      const failingOperation = async () => {
        throw new Error('Test failure');
      };
      
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingOperation);
        } catch (e) {
          // Expected
        }
      }
      
      expect(breaker.getState()).toBe('open');
      
      // Should throw immediately when open
      await expect(breaker.execute(failingOperation))
        .rejects.toThrow('Circuit breaker is open');
    });
  });
  
  describe('Rate Limiter', () => {
    test('should limit request rate', async () => {
      const limiter = new RateLimiter(2, 1); // 2 tokens, 1 per second
      
      const start = Date.now();
      
      // Should consume tokens immediately
      await limiter.acquire();
      await limiter.acquire();
      
      // Third request should wait
      await limiter.acquire();
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(900); // ~1 second wait
    });
  });
});