/**
 * Type definitions for CrewAI concurrent processing system
 * 
 * Defines interfaces for agents, tasks, crews, and concurrent processing
 */

import { Id } from "../../../_generated/dataModel";
import { Doc } from "../../../_generated/dataModel";

export type AgentRole = 'analyzer' | 'matcher' | 'validator';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CrewProcessType = 'sequential' | 'hierarchical' | 'concurrent';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface Agent {
  id: string;
  role: AgentRole;
  goal: string;
  backstory: string;
  llmConfig?: LLMConfig;
  maxConcurrentTasks: number;
  memory: boolean;
  verbose?: boolean;
  maxIter?: number;
}

export interface TaskContext {
  productId: string;
  productData: Doc<'products'>;
  categories: Doc<'categories'>[];
  previousResults?: Record<string, any>;
}

export interface Task {
  id: string;
  description: string;
  agentRole: AgentRole;
  context: TaskContext;
  expectedOutput: string;
  dependencies?: string[]; // Task IDs this task depends on
  status: ProcessingStatus;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
  retryCount: number;
  memoryKeys?: string[];
}

export interface CrewConfig {
  id: string;
  organizationId: Id<'organizations'>;
  agents: Agent[];
  process: CrewProcessType;
  maxConcurrentTasks: number;
  memoryEnabled: boolean;
  cacheEnabled: boolean;
  memoryLimit: number; // bytes
  timeout: number; // ms
}

export interface CrewInstance {
  id: string;
  configId: string;
  sessionId: string;
  status: ProcessingStatus;
  startedAt: number;
  completedAt?: number;
  currentMemoryUsage: number;
  taskQueue: Task[];
  processingTasks: Map<string, Task>;
  completedTasks: Map<string, Task>;
  failedTasks: Map<string, Task>;
  metrics: CrewMetrics;
}

export interface CrewMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  tokensUsed: number;
  estimatedCost: number;
  throughput: number; // tasks per minute
  memoryPeakUsage: number;
}

export interface WorkerPoolConfig {
  maxWorkers: number;
  workerTimeout: number;
  queueSize: number;
  retryLimit: number;
  retryDelay: number;
}

export interface WorkerStatus {
  id: string;
  agentRole: AgentRole;
  status: 'idle' | 'busy' | 'error';
  currentTaskId?: string;
  lastActiveAt: number;
  tasksCompleted: number;
  errorCount: number;
}

export interface ConcurrentProcessingResult {
  crewId: string;
  sessionId: string;
  products: Array<{
    productId: string;
    analysisResult?: any;
    matchingResult?: any;
    validationResult?: any;
    error?: string;
    processingTime: number;
  }>;
  totalProcessingTime: number;
  metrics: CrewMetrics;
}

export interface MemoryLock {
  memoryId: Id<'agentMemory'>;
  lockId: string;
  ownerId: string; // worker ID
  acquiredAt: number;
  expiresAt: number;
}

// Agent-specific result types
export interface AnalyzerResult {
  productId: string;
  features: string[];
  characteristics: Record<string, any>;
  keyAttributes: string[];
  confidence: number;
}

export interface MatcherResult {
  productId: string;
  suggestedCategories: Array<{
    categoryId: Id<'categories'>;
    confidence: number;
    reasoning: string;
  }>;
  newCategoryRecommendations?: string[];
}

export interface ValidatorResult {
  productId: string;
  isValid: boolean;
  validationErrors?: string[];
  finalCategory?: Id<'categories'>;
  confidence: number;
  qualityScore: number;
}