/**
 * Multi-Provider Abstraction Layer Types
 * 
 * Core types and interfaces for the LLM provider abstraction system
 */

import { z } from 'zod';

// Base provider types
export type ProviderName = 'openai' | 'anthropic' | 'gemini';

export type ModelCapability = 
  | 'text-generation'
  | 'structured-output'
  | 'function-calling'
  | 'vision'
  | 'code-generation'
  | 'embeddings';

export type ProviderStatus = 'available' | 'degraded' | 'unavailable';

// Provider configuration
export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  customHeaders?: Record<string, string>;
}

// Model configuration
export interface ModelConfig {
  provider: ProviderName;
  modelId: string;
  displayName: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  latencyMs: number; // Average latency
  successRate: number; // Success rate (0-1)
  tier: 'economy' | 'balanced' | 'performance' | 'premium';
}

// Request/Response types
export interface ProviderRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  structuredOutput?: z.ZodType<any>;
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  stream?: boolean;
}

export interface ProviderResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  latencyMs: number;
  provider: ProviderName;
  model: string;
  structuredData?: any;
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
  };
}

// Provider selection criteria
export interface SelectionCriteria {
  maxCostPer1kTokens?: number;
  maxLatencyMs?: number;
  minSuccessRate?: number;
  requiredCapabilities?: ModelCapability[];
  preferredTier?: ModelConfig['tier'];
  excludeProviders?: ProviderName[];
  preferCached?: boolean;
}

// Provider metrics
export interface ProviderMetrics {
  provider: ProviderName;
  model: string;
  timestamp: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  totalTokens: number;
  totalCost: number;
  averageLatencyMs: number;
  errors: Array<{
    timestamp: number;
    error: string;
    statusCode?: number;
  }>;
}

// Budget management
export interface BudgetConfig {
  dailyLimit?: number;
  monthlyLimit?: number;
  perRequestLimit?: number;
  warningThreshold?: number; // Percentage (0-100)
  enforcementMode: 'soft' | 'hard'; // soft = warn, hard = block
}

export interface BudgetStatus {
  dailySpent: number;
  monthlySpent: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

// Provider interface
export interface IProvider {
  name: ProviderName;
  config: ProviderConfig;
  
  // Core methods
  complete(request: ProviderRequest): Promise<ProviderResponse>;
  stream(request: ProviderRequest): AsyncGenerator<ProviderResponse>;
  
  // Health and status
  checkHealth(): Promise<ProviderStatus>;
  getMetrics(): Promise<ProviderMetrics>;
  
  // Model management
  listModels(): Promise<ModelConfig[]>;
  getModel(modelId: string): Promise<ModelConfig | null>;
}

// Provider events
export type ProviderEvent = 
  | { type: 'request_start'; provider: ProviderName; model: string; requestId: string }
  | { type: 'request_success'; provider: ProviderName; model: string; requestId: string; latencyMs: number; cost: number }
  | { type: 'request_failure'; provider: ProviderName; model: string; requestId: string; error: string }
  | { type: 'provider_degraded'; provider: ProviderName; reason: string }
  | { type: 'provider_recovered'; provider: ProviderName }
  | { type: 'budget_warning'; spent: number; limit: number; percentage: number }
  | { type: 'budget_exceeded'; spent: number; limit: number };

// Cost calculation
export interface CostCalculator {
  calculate(provider: ProviderName, model: string, inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  
  estimate(provider: ProviderName, model: string, estimatedInputTokens: number, estimatedOutputTokens: number): {
    estimatedCost: number;
    costRange: { min: number; max: number };
  };
}

// Error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: ProviderName,
    public statusCode?: number,
    public isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class BudgetExceededError extends Error {
  constructor(
    public spent: number,
    public limit: number,
    public period: 'daily' | 'monthly'
  ) {
    super(`Budget exceeded: $${spent.toFixed(2)} spent, $${limit.toFixed(2)} limit (${period})`);
    this.name = 'BudgetExceededError';
  }
}