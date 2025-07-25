/**
 * Gemini Provider Implementation
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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

export class GeminiProvider implements IProvider {
  name = 'gemini' as const;
  config: ProviderConfig;
  private client: ChatGoogleGenerativeAI | null = null;
  private metrics: ProviderMetrics;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.metrics = {
      provider: 'gemini',
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
    const requestId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initialize client if needed
      if (!this.client || this.client.modelName !== request.model) {
        this.client = new ChatGoogleGenerativeAI({
          apiKey: this.config.apiKey,
          modelName: request.model,
          temperature: request.temperature ?? 0.3,
          maxOutputTokens: request.maxTokens ?? 4096,
          topP: request.topP,
          stopSequences: request.stop,
          timeout: this.config.timeout ?? 30000,
          maxRetries: this.config.maxRetries ?? 3,
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
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
            inputTokens: tokenUsage.promptTokenCount || 0,
            outputTokens: tokenUsage.candidatesTokenCount || 0,
            totalTokens: tokenUsage.totalTokenCount || 0
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
        provider: 'gemini',
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
        error.message || 'Gemini request failed',
        'gemini',
        error.status || error.statusCode,
        isRetryable
      );
    }
  }

  async *stream(request: ProviderRequest): AsyncGenerator<ProviderResponse> {
    // Implementation for streaming responses
    throw new Error('Streaming not yet implemented for Gemini provider');
  }

  async checkHealth(): Promise<ProviderStatus> {
    try {
      // Simple health check - try to list models
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${this.config.apiKey}`, {
        method: 'GET',
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
      },
      {
        provider: 'gemini',
        modelId: 'gemini-1.0-pro',
        displayName: 'Gemini 1.0 Pro',
        capabilities: ['text-generation', 'structured-output'],
        contextWindow: 32000,
        maxOutputTokens: 2048,
        costPer1kInputTokens: 0.0005,
        costPer1kOutputTokens: 0.0015,
        latencyMs: 700,
        successRate: 0.96,
        tier: 'balanced'
      }
    ];
  }

  async getModel(modelId: string): Promise<ModelConfig | null> {
    const models = await this.listModels();
    return models.find(m => m.modelId === modelId) || null;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number) {
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
      'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
    };

    const rates = pricing[model] || pricing['gemini-1.0-pro'];
    
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
    
    // Gemini-specific quota errors
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) return true;
    
    return false;
  }
}