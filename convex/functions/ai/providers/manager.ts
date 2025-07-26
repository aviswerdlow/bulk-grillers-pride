/**
 * Multi-Provider Manager
 * 
 * Orchestrates provider selection, fallback, and budget management
 */

import { 
  IProvider,
  ProviderName,
  ProviderRequest,
  ProviderResponse,
  SelectionCriteria,
  BudgetConfig,
  BudgetStatus,
  ProviderError,
  BudgetExceededError,
  ModelConfig
} from './types';
import { providerRegistry } from './registry';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

type EventListener = (event: any) => void;

export class MultiProviderManager {
  private eventListeners: EventListener[] = [];
  private providers: Map<ProviderName, IProvider> = new Map();
  private budgetConfig: BudgetConfig | null = null;
  private usage: {
    daily: Map<string, number>;
    monthly: Map<string, number>;
  } = {
    daily: new Map(),
    monthly: new Map()
  };
  private lastResetDaily: Date;
  private lastResetMonthly: Date;
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxRetryDelay: 10000
  };

  constructor() {
    this.lastResetDaily = new Date();
    this.lastResetMonthly = new Date();
    this.startUsageResetTimer();
  }
  
  private emitEvent(event: string, data: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener({ type: event, ...data });
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

  /**
   * Initialize providers with API keys
   */
  async initialize(config: {
    openai?: { apiKey: string };
    anthropic?: { apiKey: string };
    gemini?: { apiKey: string };
    budget?: BudgetConfig;
  }): Promise<void> {
    // Initialize providers
    if (config.openai?.apiKey) {
      const openai = new OpenAIProvider({
        name: 'openai',
        apiKey: config.openai.apiKey
      });
      this.providers.set('openai', openai);
      providerRegistry.registerProvider(openai);
    }

    if (config.anthropic?.apiKey) {
      const anthropic = new AnthropicProvider({
        name: 'anthropic',
        apiKey: config.anthropic.apiKey
      });
      this.providers.set('anthropic', anthropic);
      providerRegistry.registerProvider(anthropic);
    }

    if (config.gemini?.apiKey) {
      const gemini = new GeminiProvider({
        name: 'gemini',
        apiKey: config.gemini.apiKey
      });
      this.providers.set('gemini', gemini);
      providerRegistry.registerProvider(gemini);
    }

    // Set budget config
    if (config.budget) {
      this.budgetConfig = config.budget;
    }

    // Check health of all providers
    await this.checkAllProvidersHealth();
  }

  /**
   * Complete a request with automatic provider selection and fallback
   */
  async complete(
    request: ProviderRequest,
    criteria?: SelectionCriteria,
    options?: Partial<RetryOptions>
  ): Promise<ProviderResponse> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    
    // Check budget before proceeding
    await this.checkBudget(request);

    // Select primary and fallback models
    const models = providerRegistry.selectModelsWithFallback(criteria || {}, 3);
    
    if (models.length === 0) {
      throw new Error('No suitable models available for the given criteria');
    }

    // Try each model in order
    let lastError: Error | null = null;
    
    for (const model of models) {
      const provider = this.providers.get(model.provider);
      if (!provider) {
        console.warn(`Provider ${model.provider} not initialized, skipping`);
        continue;
      }

      try {
        // Attempt request with retry logic
        const response = await this.executeWithRetry(
          provider,
          { ...request, model: model.modelId },
          retryOptions
        );

        // Update usage tracking
        await this.trackUsage(response.cost.totalCost);

        // Update registry metrics
        providerRegistry.updateMetrics(
          model.provider,
          model.modelId,
          true,
          response.latencyMs,
          response.usage.totalTokens,
          response.cost.totalCost
        );

        // Emit success event
        this.emitEvent('request_success', {
          provider: model.provider,
          model: model.modelId,
          latencyMs: response.latencyMs,
          cost: response.cost.totalCost
        });

        return response;

      } catch (error: any) {
        lastError = error;
        
        // Update registry metrics for failure
        providerRegistry.updateMetrics(
          model.provider,
          model.modelId,
          false,
          0,
          0,
          0,
          error.message
        );

        // Emit failure event
        this.emitEvent('request_failure', {
          provider: model.provider,
          model: model.modelId,
          error: error.message
        });

        // If not retryable, try next provider immediately
        if (error instanceof ProviderError && !error.isRetryable) {
          console.warn(`Non-retryable error from ${model.provider}, trying next provider`);
          continue;
        }
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    provider: IProvider,
    request: ProviderRequest,
    options: RetryOptions
  ): Promise<ProviderResponse> {
    let lastError: Error | null = null;
    let delay = options.retryDelay;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await provider.complete(request);
      } catch (error: any) {
        lastError = error;

        // Don't retry if it's not retryable
        if (error instanceof ProviderError && !error.isRetryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === options.maxRetries) {
          throw error;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * options.backoffMultiplier, options.maxRetryDelay);

        console.log(`Retrying request (attempt ${attempt + 1}/${options.maxRetries}) after ${delay}ms`);
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Estimate cost before execution
   */
  async estimateCost(
    request: ProviderRequest,
    criteria?: SelectionCriteria
  ): Promise<{
    model: ModelConfig;
    estimatedCost: number;
    costRange: { min: number; max: number };
  }> {
    // Select best model
    const model = providerRegistry.selectModel(criteria || {});
    if (!model) {
      throw new Error('No suitable model available');
    }

    // Estimate tokens (rough approximation)
    const messageLength = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedInputTokens = Math.ceil(messageLength / 4);
    const estimatedOutputTokens = request.maxTokens || 1000;

    const inputCost = (estimatedInputTokens / 1000) * model.costPer1kInputTokens;
    const outputCost = (estimatedOutputTokens / 1000) * model.costPer1kOutputTokens;
    const estimatedCost = inputCost + outputCost;

    return {
      model,
      estimatedCost,
      costRange: {
        min: estimatedCost * 0.7, // 30% lower
        max: estimatedCost * 1.5  // 50% higher
      }
    };
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): BudgetStatus | null {
    if (!this.budgetConfig) return null;

    this.resetUsageIfNeeded();

    const dailySpent = this.getCurrentDailyUsage();
    const monthlySpent = this.getCurrentMonthlyUsage();

    const dailyRemaining = (this.budgetConfig.dailyLimit || Infinity) - dailySpent;
    const monthlyRemaining = (this.budgetConfig.monthlyLimit || Infinity) - monthlySpent;

    const dailyPercentage = this.budgetConfig.dailyLimit 
      ? (dailySpent / this.budgetConfig.dailyLimit) * 100 
      : 0;
    const monthlyPercentage = this.budgetConfig.monthlyLimit 
      ? (monthlySpent / this.budgetConfig.monthlyLimit) * 100 
      : 0;

    const warningThreshold = this.budgetConfig.warningThreshold || 80;
    const isNearLimit = dailyPercentage >= warningThreshold || monthlyPercentage >= warningThreshold;
    const isOverLimit = dailyRemaining < 0 || monthlyRemaining < 0;

    return {
      dailySpent,
      monthlySpent,
      dailyRemaining: Math.max(0, dailyRemaining),
      monthlyRemaining: Math.max(0, monthlyRemaining),
      isNearLimit,
      isOverLimit
    };
  }

  /**
   * Set or update budget configuration
   */
  setBudgetConfig(config: BudgetConfig): void {
    this.budgetConfig = config;
  }

  /**
   * Get provider metrics
   */
  getProviderMetrics(provider?: ProviderName) {
    if (provider) {
      return providerRegistry.getProviderModels(provider)
        .map(model => providerRegistry.getMetrics(provider, model.modelId))
        .filter(m => m !== null);
    }
    return providerRegistry.getAllMetrics();
  }

  /**
   * Check all providers health
   */
  private async checkAllProvidersHealth(): Promise<void> {
    const checks = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const status = await provider.checkHealth();
        console.log(`Provider ${name} health: ${status}`);
      } catch (error) {
        console.error(`Failed to check health for ${name}:`, error);
      }
    });

    await Promise.all(checks);
  }

  /**
   * Check budget constraints
   */
  private async checkBudget(request: ProviderRequest): Promise<void> {
    if (!this.budgetConfig) return;

    const status = this.getBudgetStatus();
    if (!status) return;

    // Emit warning if near limit
    if (status.isNearLimit) {
      const percentage = Math.max(
        this.budgetConfig.dailyLimit ? (status.dailySpent / this.budgetConfig.dailyLimit) * 100 : 0,
        this.budgetConfig.monthlyLimit ? (status.monthlySpent / this.budgetConfig.monthlyLimit) * 100 : 0
      );
      
      this.emitEvent('budget_warning', {
        spent: Math.max(status.dailySpent, status.monthlySpent),
        limit: this.budgetConfig.dailyLimit || this.budgetConfig.monthlyLimit || 0,
        percentage
      });
    }

    // Check per-request limit
    if (this.budgetConfig.perRequestLimit) {
      const estimated = await this.estimateCost(request);
      if (estimated.estimatedCost > this.budgetConfig.perRequestLimit) {
        throw new Error(
          `Estimated cost ($${estimated.estimatedCost.toFixed(2)}) exceeds per-request limit ($${this.budgetConfig.perRequestLimit})`
        );
      }
    }

    // Enforce hard limits
    if (this.budgetConfig.enforcementMode === 'hard' && status.isOverLimit) {
      const period = status.dailyRemaining < 0 ? 'daily' : 'monthly';
      const spent = period === 'daily' ? status.dailySpent : status.monthlySpent;
      const limit = period === 'daily' ? this.budgetConfig.dailyLimit! : this.budgetConfig.monthlyLimit!;
      
      throw new BudgetExceededError(spent, limit, period);
    }
  }

  /**
   * Track usage for budget management
   */
  private async trackUsage(cost: number): Promise<void> {
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Update daily usage
    const currentDaily = this.usage.daily.get(today) || 0;
    this.usage.daily.set(today, currentDaily + cost);

    // Update monthly usage
    const currentMonthly = this.usage.monthly.get(month) || 0;
    this.usage.monthly.set(month, currentMonthly + cost);
  }

  /**
   * Get current daily usage
   */
  private getCurrentDailyUsage(): number {
    const today = new Date().toDateString();
    return this.usage.daily.get(today) || 0;
  }

  /**
   * Get current monthly usage
   */
  private getCurrentMonthlyUsage(): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.usage.monthly.get(month) || 0;
  }

  /**
   * Reset usage counters if needed
   */
  private resetUsageIfNeeded(): void {
    const now = new Date();
    
    // Reset daily if it's a new day
    if (now.toDateString() !== this.lastResetDaily.toDateString()) {
      const yesterday = this.lastResetDaily.toDateString();
      // Keep yesterday's data for reporting
      if (this.usage.daily.size > 7) {
        // Keep only last 7 days
        const entries = Array.from(this.usage.daily.entries());
        entries.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
        this.usage.daily = new Map(entries.slice(0, 7));
      }
      this.lastResetDaily = now;
    }

    // Reset monthly if it's a new month
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = this.lastResetMonthly.toISOString().slice(0, 7);
    if (currentMonth !== lastMonth) {
      // Keep last 3 months
      if (this.usage.monthly.size > 3) {
        const entries = Array.from(this.usage.monthly.entries());
        entries.sort((a, b) => b[0].localeCompare(a[0]));
        this.usage.monthly = new Map(entries.slice(0, 3));
      }
      this.lastResetMonthly = now;
    }
  }

  /**
   * Start timer for usage reset
   */
  private startUsageResetTimer(): void {
    // Check every hour
    setInterval(() => {
      this.resetUsageIfNeeded();
    }, 60 * 60 * 1000);
  }
}

// Export singleton instance
export const multiProviderManager = new MultiProviderManager();