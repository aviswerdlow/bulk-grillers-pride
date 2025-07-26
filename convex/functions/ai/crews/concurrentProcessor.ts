/**
 * Concurrent Processor for CrewAI
 * 
 * Implements parallel processing of products through analyzer, matcher, and validator agents
 * with memory management, locking, and throughput optimization
 */

import { v } from "convex/values";
import { Id } from "../../../_generated/dataModel";
import { ActionCtx } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { ConvexError } from "convex/values";
import { MemoryManager } from "../memory/memoryManager";
import {
  Agent,
  Task,
  CrewConfig,
  CrewInstance,
  CrewMetrics,
  WorkerPoolConfig,
  WorkerStatus,
  ProcessingStatus,
  ConcurrentProcessingResult,
  TaskContext,
  AgentRole,
} from "./types";
import { ErrorHandler, RateLimiter, ExponentialBackoff } from "./errorHandler";

const MAX_MEMORY_PER_CREW = 512 * 1024 * 1024; // 512MB
const TARGET_THROUGHPUT = 750; // products per minute
const WORKER_TIMEOUT = 30000; // 30 seconds
const LOCK_RETRY_DELAY = 100; // ms
const MAX_LOCK_RETRIES = 50;

export class ConcurrentProcessor {
  private ctx: ActionCtx;
  private config: CrewConfig;
  private instance: CrewInstance;
  private memoryManager: MemoryManager;
  private workers: Map<string, WorkerStatus>;
  private taskQueue: Task[];
  private processingTasks: Map<string, Task>;
  private completedTasks: Map<string, Task>;
  private failedTasks: Map<string, Task>;
  private memoryLocks: Map<string, { lockId: string; expiresAt: number }>;
  private startTime: number;
  private errorHandler: ErrorHandler;
  private rateLimiter: RateLimiter;

  constructor(ctx: ActionCtx, config: CrewConfig) {
    this.ctx = ctx;
    this.config = config;
    this.startTime = Date.now();
    
    // Initialize crew instance
    this.instance = {
      id: `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configId: config.id,
      sessionId: `session_${Date.now()}`,
      status: 'pending',
      startedAt: this.startTime,
      currentMemoryUsage: 0,
      taskQueue: [],
      processingTasks: new Map(),
      completedTasks: new Map(),
      failedTasks: new Map(),
      metrics: this.initializeMetrics(),
    };

    // Initialize memory manager
    this.memoryManager = new MemoryManager(ctx, config.organizationId, {
      crewId: this.instance.id,
      sessionId: this.instance.sessionId,
    });

    // Initialize collections
    this.workers = new Map();
    this.taskQueue = [];
    this.processingTasks = new Map();
    this.completedTasks = new Map();
    this.failedTasks = new Map();
    this.memoryLocks = new Map();

    // Initialize error handling and rate limiting
    this.errorHandler = new ErrorHandler(this.instance.id);
    this.rateLimiter = new RateLimiter(10, 2); // 10 tokens, 2 per second

    // Initialize workers
    this.initializeWorkers();
  }

  private initializeMetrics(): CrewMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0,
      tokensUsed: 0,
      estimatedCost: 0,
      throughput: 0,
      memoryPeakUsage: 0,
    };
  }

  private initializeWorkers(): void {
    // Create workers for each agent type based on config
    const workerCounts = this.calculateOptimalWorkerCounts();
    
    for (const agent of this.config.agents) {
      const workerCount = workerCounts[agent.role];
      for (let i = 0; i < workerCount; i++) {
        const workerId = `${agent.role}_worker_${i}`;
        this.workers.set(workerId, {
          id: workerId,
          agentRole: agent.role,
          status: 'idle',
          lastActiveAt: Date.now(),
          tasksCompleted: 0,
          errorCount: 0,
        });
      }
    }
  }

  private calculateOptimalWorkerCounts(): Record<AgentRole, number> {
    // Calculate optimal worker distribution based on target throughput
    // Analyzer: 40% of workers (most compute intensive)
    // Matcher: 35% of workers
    // Validator: 25% of workers
    const totalWorkers = this.config.maxConcurrentTasks;
    
    return {
      analyzer: Math.max(1, Math.floor(totalWorkers * 0.4)),
      matcher: Math.max(1, Math.floor(totalWorkers * 0.35)),
      validator: Math.max(1, Math.ceil(totalWorkers * 0.25)),
    };
  }

  async processBatch(contexts: TaskContext[]): Promise<ConcurrentProcessingResult> {
    this.instance.status = 'processing';
    
    try {
      // Check memory limit before starting
      await this.checkMemoryLimit();
      
      // Create tasks for all products
      const tasks = this.createTasksForBatch(contexts);
      this.taskQueue.push(...tasks);
      this.instance.metrics.totalTasks = tasks.length;
      
      // Start concurrent processing
      await this.startProcessing();
      
      // Wait for all tasks to complete or timeout
      await this.waitForCompletion();
      
      // Collect and return results
      return this.collectResults(contexts);
    } catch (error) {
      this.instance.status = 'failed';
      throw new ConvexError(`Crew processing failed: ${error.message}`);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  private createTasksForBatch(contexts: TaskContext[]): Task[] {
    const tasks: Task[] = [];
    
    for (const context of contexts) {
      // Create analyzer task
      const analyzerTask: Task = {
        id: `analyze_${context.productId}_${Date.now()}`,
        description: `Analyze product ${context.productId}`,
        agentRole: 'analyzer',
        context,
        expectedOutput: 'Product features and characteristics',
        status: 'pending',
        retryCount: 0,
        memoryKeys: [`analysis.${context.productId}`],
      };
      tasks.push(analyzerTask);
      
      // Create matcher task (depends on analyzer)
      const matcherTask: Task = {
        id: `match_${context.productId}_${Date.now()}`,
        description: `Match categories for product ${context.productId}`,
        agentRole: 'matcher',
        context,
        expectedOutput: 'Category suggestions with confidence scores',
        dependencies: [analyzerTask.id],
        status: 'pending',
        retryCount: 0,
        memoryKeys: [`match.${context.productId}`],
      };
      tasks.push(matcherTask);
      
      // Create validator task (depends on matcher)
      const validatorTask: Task = {
        id: `validate_${context.productId}_${Date.now()}`,
        description: `Validate categorization for product ${context.productId}`,
        agentRole: 'validator',
        context,
        expectedOutput: 'Validation result with final category',
        dependencies: [matcherTask.id],
        status: 'pending',
        retryCount: 0,
        memoryKeys: [`validation.${context.productId}`],
      };
      tasks.push(validatorTask);
    }
    
    return tasks;
  }

  private async startProcessing(): Promise<void> {
    // Start worker loops
    const workerPromises: Promise<void>[] = [];
    
    for (const [workerId, worker] of this.workers) {
      workerPromises.push(this.runWorker(workerId));
    }
    
    // Monitor throughput and adjust workers if needed
    this.startThroughputMonitor();
  }

  private async runWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId)!;
    
    while (this.instance.status === 'processing') {
      try {
        // Get next available task for this worker's role
        const task = this.getNextTask(worker.agentRole);
        
        if (!task) {
          // No tasks available, wait briefly
          await this.sleep(100);
          continue;
        }
        
        // Update worker status
        worker.status = 'busy';
        worker.currentTaskId = task.id;
        worker.lastActiveAt = Date.now();
        
        // Move task to processing
        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
        this.processingTasks.set(task.id, task);
        task.status = 'processing';
        task.startedAt = Date.now();
        
        // Process the task
        await this.processTask(task, worker);
        
        // Update metrics
        worker.tasksCompleted++;
        worker.status = 'idle';
        worker.currentTaskId = undefined;
        
      } catch (error) {
        console.error(`Worker ${workerId} error:`, error);
        worker.errorCount++;
        worker.status = 'error';
        
        // Reset worker after error
        await this.sleep(1000);
        worker.status = 'idle';
      }
    }
  }

  private async processTask(task: Task, worker: WorkerStatus): Promise<void> {
    try {
      // Acquire memory locks for task
      await this.errorHandler.executeWithRetry(
        () => this.acquireMemoryLocks(task),
        { taskId: task.id, workerId: worker.id, operation: 'memory_lock' }
      );
      
      // Load dependencies from memory if needed
      const dependencies = await this.loadTaskDependencies(task);
      task.context.previousResults = dependencies;
      
      // Execute task based on agent role with rate limiting
      await this.rateLimiter.acquire();
      const result = await this.errorHandler.executeWithRetry(
        () => this.executeAgentTask(task, worker),
        { taskId: task.id, workerId: worker.id, operation: 'llm_api' }
      );
      
      // Store result in memory
      await this.errorHandler.executeWithRetry(
        () => this.storeTaskResult(task, result),
        { taskId: task.id, workerId: worker.id, operation: 'memory_write' }
      );
      
      // Mark task as completed
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      
      this.processingTasks.delete(task.id);
      this.completedTasks.set(task.id, task);
      this.instance.metrics.completedTasks++;
      
      // Update average duration
      const duration = task.completedAt - task.startedAt!;
      this.updateAverageTaskDuration(duration);
      
    } catch (error) {
      // Handle task failure with error classification
      const crewError = this.errorHandler.handleError(error, {
        taskId: task.id,
        workerId: worker.id,
      });
      await this.handleTaskFailure(task, crewError);
    } finally {
      // Release memory locks
      await this.releaseMemoryLocks(task);
    }
  }

  private async executeAgentTask(task: Task, worker: WorkerStatus): Promise<any> {
    const agent = this.config.agents.find(a => a.role === task.agentRole);
    if (!agent) {
      throw new Error(`Agent not found for role: ${task.agentRole}`);
    }
    
    // Simulate agent execution with timeout
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Task timeout')), WORKER_TIMEOUT)
    );
    
    const execution = this.runAgentLogic(task, agent);
    
    return Promise.race([execution, timeout]);
  }

  private async runAgentLogic(task: Task, agent: Agent): Promise<any> {
    console.log(`🤖 [CREW] Running agent logic for ${agent.role} on product ${task.context.productId}`);
    
    // Import agent implementations
    const { ProductAnalyzerAgent, CategoryMatcherAgent, QualityValidatorAgent } = await import('./agents');
    
    switch (agent.role) {
      case 'analyzer':
        const analyzer = new ProductAnalyzerAgent();
        if (agent.llmConfig) {
          analyzer.llmConfig = agent.llmConfig;
        }
        const analysisResult = await analyzer.analyze(
          this.ctx,
          task.context.productData,
          this.config.organizationId
        );
        return {
          productId: task.context.productId,
          ...analysisResult,
        };
        
      case 'matcher':
        const matcher = new CategoryMatcherAgent();
        if (agent.llmConfig) {
          matcher.llmConfig = agent.llmConfig;
        }
        const matchingResult = await matcher.match(
          this.ctx,
          task.context.productData,
          task.context.categories,
          task.context.previousResults?.analyzer || {},
          this.config.organizationId
        );
        return {
          productId: task.context.productId,
          ...matchingResult,
        };
        
      case 'validator':
        const validator = new QualityValidatorAgent();
        if (agent.llmConfig) {
          validator.llmConfig = agent.llmConfig;
        }
        const validationResult = await validator.validate(
          this.ctx,
          task.context.productData,
          task.context.previousResults?.matcher || {},
          task.context.previousResults?.analyzer || {},
          this.config.organizationId
        );
        return {
          productId: task.context.productId,
          ...validationResult,
        };
        
      default:
        throw new Error(`Unknown agent role: ${agent.role}`);
    }
  }

  private getNextTask(agentRole: AgentRole): Task | null {
    // Find next available task for the agent role
    for (const task of this.taskQueue) {
      if (task.agentRole !== agentRole) continue;
      
      // Check if dependencies are met
      if (task.dependencies && task.dependencies.length > 0) {
        const allDependenciesMet = task.dependencies.every(depId => 
          this.completedTasks.has(depId)
        );
        
        if (!allDependenciesMet) continue;
      }
      
      return task;
    }
    
    return null;
  }

  private async acquireMemoryLocks(task: Task): Promise<void> {
    if (!task.memoryKeys || task.memoryKeys.length === 0) return;
    
    for (const key of task.memoryKeys) {
      let retries = 0;
      while (retries < MAX_LOCK_RETRIES) {
        try {
          // Try to acquire lock
          const lockId = `${task.id}_${key}_${Date.now()}`;
          const memory = await this.memoryManager.retrieve([key]);
          
          if (memory) {
            await this.memoryManager.lock(memory._id, WORKER_TIMEOUT);
            this.memoryLocks.set(key, {
              lockId,
              expiresAt: Date.now() + WORKER_TIMEOUT,
            });
          }
          
          break;
        } catch (error) {
          if (error.message.includes('locked')) {
            retries++;
            await this.sleep(LOCK_RETRY_DELAY);
          } else {
            throw error;
          }
        }
      }
    }
  }

  private async releaseMemoryLocks(task: Task): Promise<void> {
    if (!task.memoryKeys || task.memoryKeys.length === 0) return;
    
    for (const key of task.memoryKeys) {
      const lock = this.memoryLocks.get(key);
      if (lock) {
        try {
          const memory = await this.memoryManager.retrieve([key]);
          if (memory) {
            await this.memoryManager.unlock(memory._id);
          }
        } catch (error) {
          console.error(`Failed to release lock for ${key}:`, error);
        }
        this.memoryLocks.delete(key);
      }
    }
  }

  private async loadTaskDependencies(task: Task): Promise<Record<string, any>> {
    const dependencies: Record<string, any> = {};
    
    if (!task.dependencies || task.dependencies.length === 0) {
      return dependencies;
    }
    
    for (const depId of task.dependencies) {
      const depTask = this.completedTasks.get(depId);
      if (depTask && depTask.result) {
        dependencies[depTask.agentRole] = depTask.result;
      }
    }
    
    return dependencies;
  }

  private async storeTaskResult(task: Task, result: any): Promise<void> {
    if (!task.memoryKeys || task.memoryKeys.length === 0) return;
    
    for (const key of task.memoryKeys) {
      await this.memoryManager.store(
        key.split('.'),
        result,
        'semantic',
        { importance: 0.8 }
      );
    }
    
    // Update memory usage
    await this.updateMemoryUsage();
  }

  private async handleTaskFailure(task: Task, error: any): Promise<void> {
    const errorMessage = error.message || error.error || String(error);
    task.error = errorMessage;
    task.retryCount++;
    
    // Get recovery strategy from error handler
    const strategy = this.errorHandler.getRecoveryStrategy(error);
    
    if (strategy.type === 'retry' && task.retryCount < (strategy.retryConfig?.maxRetries || 3)) {
      // Retry the task
      task.status = 'pending';
      this.processingTasks.delete(task.id);
      this.taskQueue.push(task);
      
      console.log(`Retrying task ${task.id} (attempt ${task.retryCount})`);
    } else if (strategy.type === 'skip') {
      // Skip this task but don't fail the entire batch
      task.status = 'failed';
      task.completedAt = Date.now();
      this.processingTasks.delete(task.id);
      this.failedTasks.set(task.id, task);
      this.instance.metrics.failedTasks++;
      
      console.log(`Skipping task ${task.id}: ${errorMessage}`);
    } else {
      // Mark as failed
      task.status = 'failed';
      task.completedAt = Date.now();
      this.processingTasks.delete(task.id);
      this.failedTasks.set(task.id, task);
      this.instance.metrics.failedTasks++;
      
      // Log failure details
      console.error(`Task ${task.id} failed after ${task.retryCount} retries:`, errorMessage);
    }
  }

  private async checkMemoryLimit(): Promise<void> {
    const stats = await this.memoryManager.getStats();
    this.instance.currentMemoryUsage = stats.totalSizeBytes;
    
    if (stats.totalSizeBytes > MAX_MEMORY_PER_CREW) {
      // Trigger memory cleanup
      await this.memoryManager.summarize(100, 0.3);
    }
  }

  private async updateMemoryUsage(): Promise<void> {
    const stats = await this.memoryManager.getStats();
    this.instance.currentMemoryUsage = stats.totalSizeBytes;
    
    if (stats.totalSizeBytes > this.instance.metrics.memoryPeakUsage) {
      this.instance.metrics.memoryPeakUsage = stats.totalSizeBytes;
    }
  }

  private updateAverageTaskDuration(duration: number): void {
    const completed = this.instance.metrics.completedTasks;
    const currentAvg = this.instance.metrics.averageTaskDuration;
    
    this.instance.metrics.averageTaskDuration = 
      (currentAvg * (completed - 1) + duration) / completed;
  }

  private startThroughputMonitor(): void {
    const monitorInterval = setInterval(() => {
      if (this.instance.status !== 'processing') {
        clearInterval(monitorInterval);
        return;
      }
      
      // Calculate current throughput
      const elapsedMinutes = (Date.now() - this.startTime) / 60000;
      const currentThroughput = this.instance.metrics.completedTasks / elapsedMinutes;
      this.instance.metrics.throughput = currentThroughput;
      
      // Adjust workers if throughput is below target
      if (currentThroughput < TARGET_THROUGHPUT * 0.8) {
        this.optimizeWorkerDistribution();
      }
    }, 5000); // Check every 5 seconds
  }

  private optimizeWorkerDistribution(): void {
    // Analyze bottlenecks and redistribute workers
    const tasksByRole = new Map<AgentRole, number>();
    
    for (const task of this.taskQueue) {
      tasksByRole.set(task.agentRole, (tasksByRole.get(task.agentRole) || 0) + 1);
    }
    
    // Log optimization opportunity (actual redistribution would be more complex)
    console.log('Throughput optimization needed:', {
      currentThroughput: this.instance.metrics.throughput,
      targetThroughput: TARGET_THROUGHPUT,
      queuedTasks: tasksByRole,
    });
  }

  private async waitForCompletion(): Promise<void> {
    const timeout = this.config.timeout || 300000; // 5 minutes default
    const deadline = Date.now() + timeout;
    
    while (Date.now() < deadline) {
      const allTasksProcessed = 
        this.taskQueue.length === 0 && 
        this.processingTasks.size === 0;
      
      if (allTasksProcessed) {
        this.instance.status = 'completed';
        this.instance.completedAt = Date.now();
        break;
      }
      
      await this.sleep(100);
    }
    
    if (this.instance.status === 'processing') {
      // Timeout reached
      this.instance.status = 'failed';
      throw new Error('Processing timeout exceeded');
    }
  }

  private collectResults(contexts: TaskContext[]): ConcurrentProcessingResult {
    const products = contexts.map(context => {
      const productId = context.productId;
      
      // Find completed tasks for this product
      const analyzerTask = Array.from(this.completedTasks.values())
        .find(t => t.agentRole === 'analyzer' && t.context.productId === productId);
      const matcherTask = Array.from(this.completedTasks.values())
        .find(t => t.agentRole === 'matcher' && t.context.productId === productId);
      const validatorTask = Array.from(this.completedTasks.values())
        .find(t => t.agentRole === 'validator' && t.context.productId === productId);
      
      // Check if any task failed
      const failedTask = Array.from(this.failedTasks.values())
        .find(t => t.context.productId === productId);
      
      const processingTime = Math.max(
        analyzerTask?.completedAt ? analyzerTask.completedAt - analyzerTask.startedAt! : 0,
        matcherTask?.completedAt ? matcherTask.completedAt - matcherTask.startedAt! : 0,
        validatorTask?.completedAt ? validatorTask.completedAt - validatorTask.startedAt! : 0
      );
      
      return {
        productId,
        analysisResult: analyzerTask?.result,
        matchingResult: matcherTask?.result,
        validationResult: validatorTask?.result,
        error: failedTask?.error,
        processingTime,
      };
    });
    
    // Add error summary to metrics
    const errorSummary = this.errorHandler.getErrorSummary();
    const enhancedMetrics = {
      ...this.instance.metrics,
      errorSummary,
    };
    
    return {
      crewId: this.instance.id,
      sessionId: this.instance.sessionId,
      products,
      totalProcessingTime: Date.now() - this.startTime,
      metrics: enhancedMetrics,
    };
  }

  private async cleanup(): Promise<void> {
    // Release any remaining locks
    for (const [key, lock] of this.memoryLocks) {
      try {
        const memory = await this.memoryManager.retrieve([key]);
        if (memory) {
          await this.memoryManager.unlock(memory._id);
        }
      } catch (error) {
        console.error(`Cleanup: Failed to release lock for ${key}:`, error);
      }
    }
    
    // Clear collections
    this.workers.clear();
    this.taskQueue = [];
    this.processingTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.memoryLocks.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}