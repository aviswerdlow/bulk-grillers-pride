/**
 * Tests for Provider Registry
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { t } from '../../../../test.setup';
import { ProviderRegistry } from '../registry';
import { SelectionCriteria, ModelConfig } from '../types';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('Model Catalog', () => {
    it('should have models from all three providers', () => {
      const allModels = registry.getAllModels();
      
      const providers = new Set(allModels.map(m => m.provider));
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('gemini')).toBe(true);
    });

    it('should have models with different tiers', () => {
      const allModels = registry.getAllModels();
      
      const tiers = new Set(allModels.map(m => m.tier));
      expect(tiers.has('economy')).toBe(true);
      expect(tiers.has('balanced')).toBe(true);
      expect(tiers.has('performance')).toBe(true);
      expect(tiers.has('premium')).toBe(true);
    });
  });

  describe('selectModel', () => {
    it('should select cheapest model when no criteria specified', () => {
      const model = registry.selectModel({});
      
      expect(model).toBeDefined();
      expect(model?.provider).toBe('gemini');
      expect(model?.modelId).toBe('gemini-1.5-flash');
    });

    it('should respect cost constraints', () => {
      const criteria: SelectionCriteria = {
        maxCostPer1kTokens: 0.001
      };
      
      const model = registry.selectModel(criteria);
      
      expect(model).toBeDefined();
      const maxCost = Math.max(
        model!.costPer1kInputTokens,
        model!.costPer1kOutputTokens
      );
      expect(maxCost).toBeLessThanOrEqual(0.001);
    });

    it('should respect latency constraints', () => {
      const criteria: SelectionCriteria = {
        maxLatencyMs: 500
      };
      
      const model = registry.selectModel(criteria);
      
      expect(model).toBeDefined();
      expect(model!.latencyMs).toBeLessThanOrEqual(500);
    });

    it('should respect capability requirements', () => {
      const criteria: SelectionCriteria = {
        requiredCapabilities: ['vision', 'code-generation']
      };
      
      const model = registry.selectModel(criteria);
      
      expect(model).toBeDefined();
      expect(model!.capabilities).toContain('vision');
      expect(model!.capabilities).toContain('code-generation');
    });

    it('should exclude specified providers', () => {
      const criteria: SelectionCriteria = {
        excludeProviders: ['openai', 'anthropic']
      };
      
      const model = registry.selectModel(criteria);
      
      expect(model).toBeDefined();
      expect(model!.provider).toBe('gemini');
    });

    it('should prefer specified tier', () => {
      const criteria: SelectionCriteria = {
        preferredTier: 'premium'
      };
      
      const model = registry.selectModel(criteria);
      
      expect(model).toBeDefined();
      expect(model!.tier).toBe('premium');
    });

    it('should return null when no models match criteria', () => {
      const criteria: SelectionCriteria = {
        maxCostPer1kTokens: 0.00001, // Impossibly low
        requiredCapabilities: ['vision', 'code-generation', 'embeddings']
      };
      
      const model = registry.selectModel(criteria);
      
      expect(model).toBeNull();
    });
  });

  describe('selectModelsWithFallback', () => {
    it('should return multiple models sorted by score', () => {
      const models = registry.selectModelsWithFallback({}, 3);
      
      expect(models).toHaveLength(3);
      // Should be sorted by score (cost-effectiveness for empty criteria)
      expect(models[0].provider).toBe('gemini');
      expect(models[0].modelId).toBe('gemini-1.5-flash');
    });

    it('should return all matching models when count exceeds available', () => {
      const criteria: SelectionCriteria = {
        requiredCapabilities: ['vision'],
        excludeProviders: ['anthropic']
      };
      
      const models = registry.selectModelsWithFallback(criteria, 10);
      
      expect(models.length).toBeGreaterThan(0);
      expect(models.length).toBeLessThan(10);
      models.forEach(m => {
        expect(m.capabilities).toContain('vision');
        expect(m.provider).not.toBe('anthropic');
      });
    });
  });

  describe('Metrics tracking', () => {
    it('should update metrics correctly', () => {
      const provider = 'openai';
      const model = 'gpt-4o-mini';
      
      // Record successful request
      registry.updateMetrics(provider, model, true, 500, 1000, 0.5);
      
      const metrics = registry.getMetrics(provider, model);
      expect(metrics).toBeDefined();
      expect(metrics!.requestCount).toBe(1);
      expect(metrics!.successCount).toBe(1);
      expect(metrics!.failureCount).toBe(0);
      expect(metrics!.totalTokens).toBe(1000);
      expect(metrics!.totalCost).toBe(0.5);
      expect(metrics!.averageLatencyMs).toBe(500);
    });

    it('should track errors', () => {
      const provider = 'openai';
      const model = 'gpt-4o';
      
      // Record failed request
      registry.updateMetrics(provider, model, false, 0, 0, 0, 'API key invalid');
      
      const metrics = registry.getMetrics(provider, model);
      expect(metrics).toBeDefined();
      expect(metrics!.failureCount).toBe(1);
      expect(metrics!.errors).toHaveLength(1);
      expect(metrics!.errors[0].error).toBe('API key invalid');
    });

    it('should update model success rate after sufficient requests', () => {
      const provider = 'gemini';
      const model = 'gemini-1.5-flash';
      
      // Record 100 requests with 90% success rate
      for (let i = 0; i < 100; i++) {
        const success = i < 90;
        registry.updateMetrics(provider, model, success, 400, 500, 0.1);
      }
      
      const updatedModel = registry.getAllModels().find(
        m => m.provider === provider && m.modelId === model
      );
      
      // Success rate should be updated to actual rate
      expect(updatedModel?.successRate).toBeCloseTo(0.9, 2);
    });
  });

  describe('Provider health tracking', () => {
    it('should initialize all health statuses as available', () => {
      // This would need mock providers registered
      // For now, just verify the method exists
      expect(registry.registerProvider).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should clean up old metrics', () => {
      const provider = 'openai';
      const model = 'gpt-3.5-turbo';
      
      // Add metrics
      registry.updateMetrics(provider, model, true, 500, 1000, 0.5);
      
      // Verify metrics exist
      expect(registry.getMetrics(provider, model)).toBeDefined();
      
      // Clean up with 0 max age (remove all)
      registry.cleanupMetrics(0);
      
      // Metrics should be gone
      expect(registry.getMetrics(provider, model)).toBeNull();
    });
  });
});