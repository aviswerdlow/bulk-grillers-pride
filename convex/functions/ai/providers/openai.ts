/**
 * OpenAI Provider Implementation
 */

import { ChatOpenAI } from '@langchain/openai';
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

export class OpenAIProvider implements IProvider {
  name = 'openai' as const;
  config: ProviderConfig;
  private client: ChatOpenAI | null = null;
  private metrics: ProviderMetrics;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.metrics = {
      provider: 'openai',
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
    const requestId = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initialize client if needed
      if (!this.client || this.client.modelName !== request.model) {
        this.client = new ChatOpenAI({
          openAIApiKey: this.config.apiKey,
          modelName: request.model,
          temperature: request.temperature ?? 0.3,
          maxTokens: request.maxTokens,
          topP: request.topP,
          frequencyPenalty: request.frequencyPenalty,
          presencePenalty: request.presencePenalty,
          stop: request.stop,
          timeout: this.config.timeout ?? 30000,
          maxRetries: this.config.maxRetries ?? 3,
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
        if (response.response_metadata?.tokenUsage) {
          const tokenUsage = response.response_metadata.tokenUsage;
          usage = {
            inputTokens: tokenUsage.promptTokens || 0,
            outputTokens: tokenUsage.completionTokens || 0,
            totalTokens: tokenUsage.totalTokens || 0
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
        provider: 'openai',
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
        error.message || 'OpenAI request failed',
        'openai',
        error.status || error.statusCode,
        isRetryable
      );
    }
  }

  async *stream(request: ProviderRequest): AsyncGenerator<ProviderResponse> {
    // Implementation for streaming responses
    throw new Error('Streaming not yet implemented for OpenAI provider');
  }

  async checkHealth(): Promise<ProviderStatus> {
    try {
      // Simple health check - try to get model list
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
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
    // In production, could fetch from OpenAI API
    return [
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
      }
    ];
  }

  async getModel(modelId: string): Promise<ModelConfig | null> {
    const models = await this.listModels();
    return models.find(m => m.modelId === modelId) || null;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number) {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
    };

    const rates = pricing[model] || pricing['gpt-3.5-turbo'];
    
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
    
    return false;
  }
}