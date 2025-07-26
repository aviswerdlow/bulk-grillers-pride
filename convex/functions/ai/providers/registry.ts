/**
 * Provider Registry
 * 
 * Central registry for managing LLM providers and models
 */

import { 
  ProviderName, 
  ModelConfig, 
  IProvider, 
  ProviderConfig,
  ModelCapability,
  SelectionCriteria,
  ProviderMetrics,
  ProviderEvent,
  CostCalculator
} from './types';
interface ModelScore {
  model: ModelConfig;
  score: number;
  breakdown: {
    cost: number;
    performance: number;
    reliability: number;
    capabilities: number;
  };
}

type EventListener = (event: ProviderEvent) => void;

export class ProviderRegistry {
  private eventListeners: EventListener[] = [];
  private providers: Map<ProviderName, IProvider> = new Map();
  private models: Map<string, ModelConfig> = new Map();
  private metrics: Map<string, ProviderMetrics> = new Map();
  private healthStatus: Map<ProviderName, { status: 'available' | 'degraded' | 'unavailable'; lastCheck: number }> = new Map();
  
  // Model definitions with up-to-date pricing and capabilities
  private static readonly MODEL_CATALOG: ModelConfig[] = [
    // OpenAI Models
    {
      provider: 'openai',
      modelId: 'gpt-4o',
      displayName: 'GPT-4 Optimized',
      capabilities: ['text-generation', 'structured-output', 'function-calling', 'vision', 'code-generation'],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      costPer1kInputTokens: 0.005,
      costPer1kOutputTokens: 0.015,
      latencyMs: 1200,
      successRate: 0.98,
      tier: 'performance'
    },
    {
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      displayName: 'GPT-4 Optimized Mini',
      capabilities: ['text-generation', 'structured-output', 'function-calling', 'code-generation'],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      costPer1kInputTokens: 0.00015,
      costPer1kOutputTokens: 0.0006,
      latencyMs: 800,
      successRate: 0.97,
      tier: 'balanced'
    },
    {
      provider: 'openai',
      modelId: 'gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo',
      capabilities: ['text-generation', 'structured-output', 'function-calling'],
      contextWindow: 16384,
      maxOutputTokens: 4096,
      costPer1kInputTokens: 0.0005,
      costPer1kOutputTokens: 0.0015,
      latencyMs: 600,
      successRate: 0.96,
      tier: 'economy'
    },
    
    // Anthropic Models
    {
      provider: 'anthropic',
      modelId: 'claude-opus-4',
      displayName: 'Claude Opus 4',
      capabilities: ['text-generation', 'structured-output', 'code-generation', 'vision'],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInputTokens: 0.02,
      costPer1kOutputTokens: 0.1,
      latencyMs: 1500,
      successRate: 0.99,
      tier: 'premium'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4',
      displayName: 'Claude Sonnet 4',
      capabilities: ['text-generation', 'structured-output', 'code-generation'],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInputTokens: 0.01,
      costPer1kOutputTokens: 0.05,
      latencyMs: 1000,
      successRate: 0.98,
      tier: 'performance'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
      capabilities: ['text-generation', 'structured-output'],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInputTokens: 0.00025,
      costPer1kOutputTokens: 0.00125,
      latencyMs: 500,
      successRate: 0.97,
      tier: 'economy'
    },
    
    // Gemini Models
    {
      provider: 'gemini',
      modelId: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      capabilities: ['text-generation', 'structured-output', 'vision'],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInputTokens: 0.000075,
      costPer1kOutputTokens: 0.0003,
      latencyMs: 400,
      successRate: 0.95,
      tier: 'economy'
    },
    {
      provider: 'gemini',
      modelId: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      capabilities: ['text-generation', 'structured-output', 'vision', 'code-generation'],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInputTokens: 0.0035,
      costPer1kOutputTokens: 0.0105,
      latencyMs: 1100,
      successRate: 0.97,
      tier: 'performance'
    }
  ];

  constructor() {
    this.initializeModels();
    this.startHealthChecking();
  }
  
  private emitEvent(event: ProviderEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
  
  public addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }
  
  public removeEventListener(listener: EventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private initializeModels(): void {
    ProviderRegistry.MODEL_CATALOG.forEach(model => {
      const key = `${model.provider}:${model.modelId}`;
      this.models.set(key, model);
    });
  }

  private startHealthChecking(): void {
    // Check provider health every 30 seconds
    setInterval(() => {
      this.checkAllProviderHealth();
    }, 30000);
  }

  private async checkAllProviderHealth(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        const status = await provider.checkHealth();
        const previousStatus = this.healthStatus.get(name)?.status;
        
        this.healthStatus.set(name, { status, lastCheck: Date.now() });
        
        // Emit events on status change
        if (previousStatus !== status) {
          if (status === 'degraded') {
            this.emitEvent({
              type: 'provider_degraded',
              provider: name,
              reason: 'Health check detected degraded performance'
            });
          } else if (status === 'available' && previousStatus !== 'available') {
            this.emitEvent({
              type: 'provider_recovered',
              provider: name
            });
          }
        }
      } catch (error) {
        this.healthStatus.set(name, { status: 'unavailable', lastCheck: Date.now() });
      }
    }
  }

  /**
   * Register a provider
   */
  registerProvider(provider: IProvider): void {
    this.providers.set(provider.name, provider);
    this.healthStatus.set(provider.name, { status: 'available', lastCheck: Date.now() });
  }

  /**
   * Get a specific provider
   */
  getProvider(name: ProviderName): IProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Get all available models
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models for a specific provider
   */
  getProviderModels(provider: ProviderName): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => m.provider === provider);
  }

  /**
   * Select best model based on criteria
   */
  selectModel(criteria: SelectionCriteria = {}): ModelConfig | null {
    const availableModels = this.filterModelsByCriteria(criteria);
    
    if (availableModels.length === 0) {
      return null;
    }

    // Score and rank models
    const scoredModels = availableModels.map(model => ({
      model,
      ...this.scoreModel(model, criteria)
    }));

    // Sort by score (highest first)
    scoredModels.sort((a, b) => b.score - a.score);

    return scoredModels[0]?.model || null;
  }

  /**
   * Select models with fallback options
   */
  selectModelsWithFallback(criteria: SelectionCriteria = {}, count: number = 3): ModelConfig[] {
    const availableModels = this.filterModelsByCriteria(criteria);
    
    // Score and rank models
    const scoredModels = availableModels.map(model => ({
      model,
      ...this.scoreModel(model, criteria)
    }));

    // Sort by score and return top N
    scoredModels.sort((a, b) => b.score - a.score);
    
    return scoredModels.slice(0, count).map(s => s.model);
  }

  private filterModelsByCriteria(criteria: SelectionCriteria): ModelConfig[] {
    let models = Array.from(this.models.values());

    // Filter by provider availability
    models = models.filter(m => {
      const health = this.healthStatus.get(m.provider);
      return health?.status === 'available' || health?.status === 'degraded';
    });

    // Apply criteria filters
    if (criteria.excludeProviders?.length) {
      models = models.filter(m => !criteria.excludeProviders!.includes(m.provider));
    }

    if (criteria.requiredCapabilities?.length) {
      models = models.filter(m => 
        criteria.requiredCapabilities!.every(cap => m.capabilities.includes(cap))
      );
    }

    if (criteria.maxCostPer1kTokens !== undefined) {
      models = models.filter(m => 
        Math.max(m.costPer1kInputTokens, m.costPer1kOutputTokens) <= criteria.maxCostPer1kTokens!
      );
    }

    if (criteria.maxLatencyMs !== undefined) {
      models = models.filter(m => m.latencyMs <= criteria.maxLatencyMs!);
    }

    if (criteria.minSuccessRate !== undefined) {
      models = models.filter(m => m.successRate >= criteria.minSuccessRate!);
    }

    if (criteria.preferredTier) {
      // Don't filter, but this will affect scoring
    }

    return models;
  }

  private scoreModel(model: ModelConfig, criteria: SelectionCriteria): ModelScore {
    const breakdown = {
      cost: 0,
      performance: 0,
      reliability: 0,
      capabilities: 0
    };

    // Cost score (0-1, lower cost = higher score)
    const avgCost = (model.costPer1kInputTokens + model.costPer1kOutputTokens) / 2;
    if (avgCost <= 0.001) breakdown.cost = 1.0;
    else if (avgCost <= 0.01) breakdown.cost = 0.8;
    else if (avgCost <= 0.05) breakdown.cost = 0.6;
    else if (avgCost <= 0.1) breakdown.cost = 0.4;
    else breakdown.cost = 0.2;

    // Performance score (0-1, based on latency and tier)
    if (model.latencyMs <= 500) breakdown.performance = 1.0;
    else if (model.latencyMs <= 1000) breakdown.performance = 0.8;
    else if (model.latencyMs <= 1500) breakdown.performance = 0.6;
    else breakdown.performance = 0.4;

    // Tier bonus
    if (criteria.preferredTier === model.tier) {
      breakdown.performance += 0.2;
    }

    // Reliability score (success rate)
    breakdown.reliability = model.successRate;

    // Capabilities score
    const capabilityCount = model.capabilities.length;
    breakdown.capabilities = Math.min(capabilityCount / 5, 1.0);

    // Calculate weighted total score
    const weights = {
      cost: criteria.maxCostPer1kTokens !== undefined ? 0.4 : 0.25,
      performance: criteria.maxLatencyMs !== undefined ? 0.3 : 0.25,
      reliability: 0.35,
      capabilities: criteria.requiredCapabilities?.length ? 0.15 : 0.15
    };

    const score = 
      breakdown.cost * weights.cost +
      breakdown.performance * weights.performance +
      breakdown.reliability * weights.reliability +
      breakdown.capabilities * weights.capabilities;

    return { model, score, breakdown };
  }

  /**
   * Update metrics for a model
   */
  updateMetrics(
    provider: ProviderName,
    model: string,
    success: boolean,
    latencyMs: number,
    tokens: number,
    cost: number,
    error?: string
  ): void {
    const key = `${provider}:${model}`;
    const existing = this.metrics.get(key) || {
      provider,
      model,
      timestamp: Date.now(),
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
      errors: []
    };

    existing.requestCount++;
    if (success) {
      existing.successCount++;
    } else {
      existing.failureCount++;
      if (error) {
        existing.errors.push({
          timestamp: Date.now(),
          error
        });
        // Keep only last 100 errors
        if (existing.errors.length > 100) {
          existing.errors = existing.errors.slice(-100);
        }
      }
    }

    existing.totalTokens += tokens;
    existing.totalCost += cost;
    
    // Update average latency
    existing.averageLatencyMs = 
      (existing.averageLatencyMs * (existing.requestCount - 1) + latencyMs) / existing.requestCount;

    this.metrics.set(key, existing);

    // Update model success rate if significantly different
    const modelConfig = this.models.get(key);
    if (modelConfig && existing.requestCount >= 100) {
      const newSuccessRate = existing.successCount / existing.requestCount;
      if (Math.abs(modelConfig.successRate - newSuccessRate) > 0.05) {
        modelConfig.successRate = newSuccessRate;
      }
    }
  }

  /**
   * Get metrics for a specific model
   */
  getMetrics(provider: ProviderName, model: string): ProviderMetrics | null {
    return this.metrics.get(`${provider}:${model}`) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): ProviderMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear metrics older than specified age
   */
  cleanupMetrics(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, metrics] of this.metrics) {
      if (metrics.timestamp < cutoff) {
        this.metrics.delete(key);
      }
    }
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();