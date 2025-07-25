/**
 * Anthropic Provider Implementation
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import {
  IProvider,
  ProviderConfig,
  ProviderRequest,
  ProviderResponse,
  ProviderStatus,
  ProviderMetrics,
  ModelConfig,
  ProviderError
} from './types';

export class AnthropicProvider implements IProvider {
  name = 'anthropic' as const;
  config: ProviderConfig;
  private client: ChatAnthropic | null = null;
  private metrics: ProviderMetrics;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.metrics = {
      provider: 'anthropic',
      model: '',
      timestamp: Date.now(),
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
      errors: []
    };
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const startTime = Date.now();
    const requestId = `anthropic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initialize client if needed
      if (!this.client || this.client.modelName !== request.model) {
        this.client = new ChatAnthropic({
          anthropicApiKey: this.config.apiKey,
          modelName: request.model,
          temperature: request.temperature ?? 0.3,
          maxTokens: request.maxTokens ?? 4096,
          topP: request.topP,
          // Anthropic doesn't support frequency/presence penalties directly
          stopSequences: request.stop,
          clientOptions: {
            defaultHeaders: this.config.customHeaders,
            timeout: this.config.timeout ?? 30000,
            maxRetries: this.config.maxRetries ?? 3,
          }
        });
      }

      let result: any;
      let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

      // Handle structured output
      if (request.structuredOutput) {
        const parser = StructuredOutputParser.fromZodSchema(request.structuredOutput);
        const promptTemplate = ChatPromptTemplate.fromMessages(
          request.messages.map(m => [m.role, m.content] as [string, string])
        );
        
        const chain = promptTemplate.pipe(this.client).pipe(parser);
        const formatInstructions = parser.getFormatInstructions();
        
        // Add format instructions to the last user message
        const messagesWithFormat = [...request.messages];
        const lastUserIndex = messagesWithFormat.findLastIndex(m => m.role === 'user');
        if (lastUserIndex >= 0) {
          messagesWithFormat[lastUserIndex].content += `\n\n${formatInstructions}`;
        }

        const response = await chain.invoke({});
        result = {
          content: JSON.stringify(response),
          structuredData: response
        };
      } else {
        // Regular completion
        const response = await this.client.invoke(
          request.messages.map(m => [m.role, m.content] as [string, string])
        );
        
        result = {
          content: response.content.toString()
        };

        // Extract usage from response metadata if available
        if (response.response_metadata?.usage) {
          const tokenUsage = response.response_metadata.usage;
          usage = {
            inputTokens: tokenUsage.input_tokens || 0,
            outputTokens: tokenUsage.output_tokens || 0,
            totalTokens: (tokenUsage.input_tokens || 0) + (tokenUsage.output_tokens || 0)
          };
        }
      }

      const latencyMs = Date.now() - startTime;
      
      // Calculate costs
      const cost = this.calculateCost(request.model, usage.inputTokens, usage.outputTokens);

      // Update metrics
      this.updateMetrics(true, latencyMs, usage.totalTokens, cost.totalCost);

      return {
        content: result.content,
        usage,
        cost,
        latencyMs,
        provider: 'anthropic',
        model: request.model,
        structuredData: result.structuredData,
        functionCall: result.functionCall
      };

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      this.updateMetrics(false, latencyMs, 0, 0, error.message);

      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);
      
      throw new ProviderError(
        error.message || 'Anthropic request failed',
        'anthropic',
        error.status || error.statusCode,
        isRetryable
      );
    }
  }

  async *stream(request: ProviderRequest): AsyncGenerator<ProviderResponse> {
    // Implementation for streaming responses
    throw new Error('Streaming not yet implemented for Anthropic provider');
  }

  async checkHealth(): Promise<ProviderStatus> {
    try {
      // Simple health check - try to make a minimal request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return 'available';
      } else if (response.status === 429 || response.status === 503) {
        return 'degraded';
      } else {
        return 'unavailable';
      }
    } catch (error) {
      return 'unavailable';
    }
  }

  async getMetrics(): Promise<ProviderMetrics> {
    return { ...this.metrics };
  }

  async listModels(): Promise<ModelConfig[]> {
    // Return hardcoded list for now
    return [
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
      }
    ];
  }

  async getModel(modelId: string): Promise<ModelConfig | null> {
    const models = await this.listModels();
    return models.find(m => m.modelId === modelId) || null;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number) {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-opus-4': { input: 0.02, output: 0.1 },
      'claude-sonnet-4': { input: 0.01, output: 0.05 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const rates = pricing[model] || pricing['claude-3-haiku-20240307'];
    
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  private updateMetrics(
    success: boolean,
    latencyMs: number,
    tokens: number,
    cost: number,
    error?: string
  ): void {
    this.metrics.requestCount++;
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
      if (error) {
        this.metrics.errors.push({
          timestamp: Date.now(),
          error
        });
        // Keep only last 100 errors
        if (this.metrics.errors.length > 100) {
          this.metrics.errors = this.metrics.errors.slice(-100);
        }
      }
    }

    this.metrics.totalTokens += tokens;
    this.metrics.totalCost += cost;
    
    // Update average latency
    this.metrics.averageLatencyMs = 
      (this.metrics.averageLatencyMs * (this.metrics.requestCount - 1) + latencyMs) / 
      this.metrics.requestCount;
  }

  private isRetryableError(error: any): boolean {
    // Rate limit errors are retryable
    if (error.status === 429) return true;
    
    // Server errors are retryable
    if (error.status >= 500) return true;
    
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    
    // Anthropic-specific overloaded error
    if (error.error?.type === 'overloaded_error') return true;
    
    return false;
  }
}