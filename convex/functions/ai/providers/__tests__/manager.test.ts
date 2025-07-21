/**
 * Tests for Multi-Provider Manager
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MultiProviderManager } from '../manager';
import { ProviderRequest, ProviderError, BudgetExceededError } from '../types';

// Mock providers
jest.mock('../openai');
jest.mock('../anthropic');
jest.mock('../gemini');

describe('MultiProviderManager', () => {
  let manager: MultiProviderManager;

  beforeEach(() => {
    manager = new MultiProviderManager();
  });

  describe('initialization', () => {
    it('should initialize with provider API keys', async () => {
      await manager.initialize({
        openai: { apiKey: 'test-openai-key' },
        anthropic: { apiKey: 'test-anthropic-key' },
        gemini: { apiKey: 'test-gemini-key' },
      });

      // Manager should have providers registered
      expect(manager).toBeDefined();
    });

    it('should initialize with budget configuration', async () => {
      await manager.initialize({
        openai: { apiKey: 'test-key' },
        budget: {
          dailyLimit: 100,
          monthlyLimit: 1000,
          warningThreshold: 80,
          enforcementMode: 'hard'
        }
      });

      const budgetStatus = manager.getBudgetStatus();
      expect(budgetStatus).toBeDefined();
      expect(budgetStatus?.dailyRemaining).toBe(100);
      expect(budgetStatus?.monthlyRemaining).toBe(1000);
    });
  });

  describe('estimateCost', () => {
    beforeEach(async () => {
      await manager.initialize({
        openai: { apiKey: 'test-key' },
        anthropic: { apiKey: 'test-key' },
        gemini: { apiKey: 'test-key' },
      });
    });

    it('should estimate cost for a request', async () => {
      const request: ProviderRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello, how are you?' }
        ],
        model: 'gpt-3.5-turbo',
        maxTokens: 100
      };

      const estimate = await manager.estimateCost(request);

      expect(estimate).toBeDefined();
      expect(estimate.estimatedCost).toBeGreaterThan(0);
      expect(estimate.costRange.min).toBeLessThan(estimate.estimatedCost);
      expect(estimate.costRange.max).toBeGreaterThan(estimate.estimatedCost);
      expect(estimate.model).toBeDefined();
    });

    it('should select cost-effective model when cost constraint is specified', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'auto',
        maxTokens: 50
      };

      const estimate = await manager.estimateCost(request, {
        maxCostPer1kTokens: 0.001
      });

      expect(estimate.model.provider).toBe('gemini');
      expect(estimate.model.modelId).toBe('gemini-1.5-flash');
    });
  });

  describe('budget management', () => {
    beforeEach(async () => {
      await manager.initialize({
        openai: { apiKey: 'test-key' },
        budget: {
          dailyLimit: 10,
          monthlyLimit: 100,
          perRequestLimit: 1,
          warningThreshold: 80,
          enforcementMode: 'hard'
        }
      });
    });

    it('should track budget status', () => {
      const status = manager.getBudgetStatus();
      
      expect(status).toBeDefined();
      expect(status!.dailySpent).toBe(0);
      expect(status!.monthlySpent).toBe(0);
      expect(status!.isNearLimit).toBe(false);
      expect(status!.isOverLimit).toBe(false);
    });

    it('should update budget configuration', () => {
      manager.setBudgetConfig({
        dailyLimit: 50,
        monthlyLimit: 500,
        enforcementMode: 'soft'
      });

      const status = manager.getBudgetStatus();
      expect(status?.dailyRemaining).toBe(50);
      expect(status?.monthlyRemaining).toBe(500);
    });
  });

  describe('provider metrics', () => {
    beforeEach(async () => {
      await manager.initialize({
        openai: { apiKey: 'test-key' },
      });
    });

    it('should return empty metrics initially', () => {
      const metrics = manager.getProviderMetrics();
      expect(metrics).toEqual([]);
    });

    it('should return metrics for specific provider', () => {
      const metrics = manager.getProviderMetrics('openai');
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle provider errors gracefully', async () => {
      // Test with empty manager (no providers initialized)
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'gpt-3.5-turbo'
      };

      await expect(manager.complete(request)).rejects.toThrow(
        'No suitable models available'
      );
    });
  });
});