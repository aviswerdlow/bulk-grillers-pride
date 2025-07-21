/**
 * Error Handling for CrewAI Concurrent Processing
 * 
 * Implements robust error handling, recovery strategies, and circuit breakers
 * for resilient concurrent operations
 */

import { ConvexError } from "convex/values";
import { Id } from "../../../_generated/dataModel";

export type ErrorType = 
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'WORKER_TIMEOUT'
  | 'LLM_API_ERROR'
  | 'RATE_LIMIT'
  | 'LOCK_TIMEOUT'
  | 'VALIDATION_FAILED'
  | 'DEPENDENCY_FAILED'
  | 'UNKNOWN';

export interface CrewError {
  type: ErrorType;
  message: string;
  taskId?: string;
  workerId?: string;
  timestamp: number;
  retryable: boolean;
  details?: any;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'skip' | 'abort';
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  fallbackProvider?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private successCount = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new ConvexError('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.config.halfOpenRequests) {
          this.state = 'closed';
          this.failureCount = 0;
        }
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

export class ErrorHandler {
  private errorLog: CrewError[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorCounts: Map<ErrorType, number> = new Map();
  
  constructor(
    private crewId: string,
    private maxErrorsPerType: number = 10
  ) {
    // Initialize circuit breakers for different services
    this.initializeCircuitBreakers();
  }
  
  private initializeCircuitBreakers(): void {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      halfOpenRequests: 3,
    };
    
    this.circuitBreakers.set('llm', new CircuitBreaker(defaultConfig));
    this.circuitBreakers.set('memory', new CircuitBreaker({
      ...defaultConfig,
      failureThreshold: 3,
      resetTimeout: 30000,
    }));
    this.circuitBreakers.set('worker', new CircuitBreaker({
      ...defaultConfig,
      failureThreshold: 10,
      resetTimeout: 120000,
    }));
  }
  
  handleError(error: any, context: {
    taskId?: string;
    workerId?: string;
    operation?: string;
  }): CrewError {
    const crewError = this.classifyError(error, context);
    this.logError(crewError);
    
    // Update error counts
    const currentCount = this.errorCounts.get(crewError.type) || 0;
    this.errorCounts.set(crewError.type, currentCount + 1);
    
    // Check if we should circuit break
    if (currentCount + 1 >= this.maxErrorsPerType) {
      throw new ConvexError(`Too many ${crewError.type} errors. Aborting crew processing.`);
    }
    
    return crewError;
  }
  
  private classifyError(error: any, context: any): CrewError {
    let type: ErrorType = 'UNKNOWN';
    let retryable = false;
    let details: any = {};
    
    const message = error.message || String(error);
    
    // Classify error based on message patterns
    if (message.includes('memory') || message.includes('512MB')) {
      type = 'MEMORY_LIMIT_EXCEEDED';
      retryable = false;
    } else if (message.includes('timeout') || message.includes('Timeout')) {
      type = 'WORKER_TIMEOUT';
      retryable = true;
    } else if (message.includes('rate limit') || message.includes('429')) {
      type = 'RATE_LIMIT';
      retryable = true;
      details.retryAfter = this.extractRateLimitRetryAfter(error);
    } else if (message.includes('API') || message.includes('model')) {
      type = 'LLM_API_ERROR';
      retryable = !message.includes('invalid key');
    } else if (message.includes('locked')) {
      type = 'LOCK_TIMEOUT';
      retryable = true;
    } else if (message.includes('validation')) {
      type = 'VALIDATION_FAILED';
      retryable = false;
    } else if (message.includes('dependency')) {
      type = 'DEPENDENCY_FAILED';
      retryable = true;
    }
    
    return {
      type,
      message,
      taskId: context.taskId,
      workerId: context.workerId,
      timestamp: Date.now(),
      retryable,
      details,
    };
  }
  
  private extractRateLimitRetryAfter(error: any): number {
    // Extract retry-after from error if available
    if (error.response?.headers?.['retry-after']) {
      return parseInt(error.response.headers['retry-after']) * 1000;
    }
    return 60000; // Default to 1 minute
  }
  
  getRecoveryStrategy(error: CrewError): ErrorRecoveryStrategy {
    switch (error.type) {
      case 'MEMORY_LIMIT_EXCEEDED':
        return { type: 'abort' };
        
      case 'WORKER_TIMEOUT':
        return {
          type: 'retry',
          retryConfig: {
            maxRetries: 3,
            backoffMs: 1000,
            backoffMultiplier: 2,
          },
        };
        
      case 'RATE_LIMIT':
        return {
          type: 'retry',
          retryConfig: {
            maxRetries: 5,
            backoffMs: error.details?.retryAfter || 60000,
            backoffMultiplier: 1,
          },
        };
        
      case 'LLM_API_ERROR':
        return error.retryable
          ? {
              type: 'fallback',
              fallbackProvider: 'alternative',
              retryConfig: {
                maxRetries: 2,
                backoffMs: 2000,
                backoffMultiplier: 1.5,
              },
            }
          : { type: 'abort' };
          
      case 'LOCK_TIMEOUT':
        return {
          type: 'retry',
          retryConfig: {
            maxRetries: 10,
            backoffMs: 100,
            backoffMultiplier: 1.2,
          },
        };
        
      case 'VALIDATION_FAILED':
        return { type: 'skip' };
        
      case 'DEPENDENCY_FAILED':
        return {
          type: 'retry',
          retryConfig: {
            maxRetries: 5,
            backoffMs: 5000,
            backoffMultiplier: 1,
          },
        };
        
      default:
        return {
          type: 'retry',
          retryConfig: {
            maxRetries: 3,
            backoffMs: 1000,
            backoffMultiplier: 2,
          },
        };
    }
  }
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { taskId?: string; workerId?: string; operation?: string }
  ): Promise<T> {
    let lastError: any;
    let retries = 0;
    
    while (true) {
      try {
        // Check circuit breaker
        const breaker = this.getCircuitBreaker(context.operation);
        if (breaker) {
          return await breaker.execute(operation);
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        const crewError = this.handleError(error, context);
        const strategy = this.getRecoveryStrategy(crewError);
        
        if (strategy.type === 'abort') {
          throw error;
        }
        
        if (strategy.type === 'skip') {
          throw new ConvexError(`Skipping task due to: ${crewError.message}`);
        }
        
        if (strategy.type === 'retry' && strategy.retryConfig) {
          if (retries >= strategy.retryConfig.maxRetries) {
            throw new ConvexError(`Max retries exceeded: ${crewError.message}`);
          }
          
          const backoff = strategy.retryConfig.backoffMs * 
            Math.pow(strategy.retryConfig.backoffMultiplier, retries);
          
          await this.sleep(backoff);
          retries++;
          continue;
        }
        
        if (strategy.type === 'fallback') {
          // Implement fallback logic
          throw new ConvexError(`Fallback required: ${crewError.message}`);
        }
      }
    }
  }
  
  private getCircuitBreaker(operation?: string): CircuitBreaker | null {
    if (!operation) return null;
    
    if (operation.includes('llm') || operation.includes('api')) {
      return this.circuitBreakers.get('llm') || null;
    }
    if (operation.includes('memory')) {
      return this.circuitBreakers.get('memory') || null;
    }
    if (operation.includes('worker')) {
      return this.circuitBreakers.get('worker') || null;
    }
    
    return null;
  }
  
  private logError(error: CrewError): void {
    this.errorLog.push(error);
    
    // Keep only recent errors
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500);
    }
    
    console.error(`[Crew ${this.crewId}] Error:`, {
      type: error.type,
      message: error.message,
      taskId: error.taskId,
      workerId: error.workerId,
    });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getErrorSummary(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recentErrors: CrewError[];
    circuitBreakerStates: Record<string, string>;
  } {
    const errorsByType: Record<ErrorType, number> = {} as any;
    
    for (const [type, count] of this.errorCounts) {
      errorsByType[type] = count;
    }
    
    const circuitBreakerStates: Record<string, string> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakerStates[name] = breaker.getState();
    }
    
    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10),
      circuitBreakerStates,
    };
  }
  
  reset(): void {
    this.errorLog = [];
    this.errorCounts.clear();
    this.circuitBreakers.forEach(breaker => breaker.reset());
  }
}

// Exponential backoff utility
export class ExponentialBackoff {
  private attempt = 0;
  
  constructor(
    private baseDelay: number = 1000,
    private maxDelay: number = 60000,
    private multiplier: number = 2,
    private jitter: boolean = true
  ) {}
  
  next(): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.multiplier, this.attempt),
      this.maxDelay
    );
    
    this.attempt++;
    
    if (this.jitter) {
      // Add random jitter (±25%)
      const jitterAmount = delay * 0.25;
      return delay + (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return delay;
  }
  
  reset(): void {
    this.attempt = 0;
  }
}

// Rate limiter for API calls
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private burstSize: number = maxTokens
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  
  async acquire(tokens: number = 1): Promise<void> {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }
    
    // Calculate wait time
    const needed = tokens - this.tokens;
    const waitMs = (needed / this.refillRate) * 1000;
    
    await this.sleep(waitMs);
    this.refill();
    this.tokens -= tokens;
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const refillAmount = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.tokens + refillAmount, this.burstSize);
    this.lastRefill = now;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}