# Multi-Provider Abstraction Layer Migration Guide

## Overview

The Multi-Provider Abstraction Layer provides a unified interface for working with multiple LLM providers (OpenAI, Anthropic, Gemini) with automatic fallback, cost optimization, and budget management.

## Key Features

- ✅ **Unified Interface**: Single API for all providers
- ✅ **Automatic Fallback**: Seamless switching on failures
- ✅ **Cost Optimization**: Smart model selection based on cost/performance
- ✅ **Budget Management**: Daily/monthly limits with enforcement
- ✅ **Performance Metrics**: Track success rates, latency, and costs
- ✅ **Retry Logic**: Exponential backoff with configurable retries
- ✅ **Model Registry**: Centralized model capabilities and pricing

## Quick Start

### 1. Initialize the System

```typescript
import { initializeProviders, multiProviderManager } from '@/convex/functions/ai/providers';

// Initialize with API keys from environment
await initializeProviders({
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  dailyBudget: 100,      // $100 daily limit
  monthlyBudget: 1000,   // $1000 monthly limit
  warningThreshold: 80   // Warn at 80% usage
});
```

### 2. Make Requests with Automatic Provider Selection

```typescript
import { multiProviderManager } from '@/convex/functions/ai/providers';

// Let the system choose the best provider
const response = await multiProviderManager.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Analyze this product...' }
  ],
  model: 'auto',  // Let system choose
  temperature: 0.3,
  maxTokens: 1000
});

console.log(`Used ${response.provider} (${response.model})`);
console.log(`Cost: $${response.cost.totalCost.toFixed(4)}`);
console.log(`Latency: ${response.latencyMs}ms`);
```

### 3. Specify Selection Criteria

```typescript
// Request a fast, cheap model
const response = await multiProviderManager.complete(
  {
    messages: [...],
    model: 'auto',
    maxTokens: 500
  },
  {
    maxCostPer1kTokens: 0.001,     // Max $0.001 per 1k tokens
    maxLatencyMs: 1000,            // Max 1 second latency
    preferredTier: 'economy',      // Prefer economy tier
    excludeProviders: ['anthropic'] // Don't use Anthropic
  }
);

// Request a high-quality model with specific capabilities
const response = await multiProviderManager.complete(
  {
    messages: [...],
    model: 'auto',
    structuredOutput: ProductAnalysisSchema // Zod schema
  },
  {
    requiredCapabilities: ['structured-output', 'code-generation'],
    preferredTier: 'performance',
    minSuccessRate: 0.95
  }
);
```

## Migration from Direct LangChain

### Before (Direct LangChain):
```typescript
const llm = initializeLLM('openai', apiKey, 'gpt-4o-mini', { temperature: 0.3 });
const result = await chain.invoke(input);
```

### After (Multi-Provider):
```typescript
const response = await multiProviderManager.complete({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  model: 'gpt-4o-mini', // Or 'auto' for automatic selection
  temperature: 0.3,
  structuredOutput: outputSchema // Optional Zod schema
});

const result = response.structuredData || JSON.parse(response.content);
```

## Integration with CrewAI Agents

The ProductAnalyzerAgent has been updated to use the multi-provider system:

```typescript
// In agents.ts
const response = await multiProviderManager.complete(
  {
    messages: [...],
    model: this.llmConfig.model,
    temperature: this.llmConfig.temperature,
    maxTokens: this.llmConfig.maxTokens,
    structuredOutput: ProductAnalysisSchema
  },
  {
    requiredCapabilities: ['text-generation', 'structured-output'],
    maxLatencyMs: this.llmConfig.timeout || 20000,
    preferredTier: 'balanced',
    preferCached: true
  }
);
```

## Cost Estimation

Estimate costs before making requests:

```typescript
const estimate = await multiProviderManager.estimateCost(
  {
    messages: [...],
    model: 'auto',
    maxTokens: 1000
  },
  {
    maxCostPer1kTokens: 0.01,
    preferredTier: 'balanced'
  }
);

console.log(`Estimated cost: $${estimate.estimatedCost.toFixed(4)}`);
console.log(`Range: $${estimate.costRange.min.toFixed(4)} - $${estimate.costRange.max.toFixed(4)}`);
console.log(`Selected model: ${estimate.model.provider}/${estimate.model.modelId}`);
```

## Budget Management

### Check Budget Status
```typescript
const status = multiProviderManager.getBudgetStatus();
console.log(`Daily spent: $${status.dailySpent.toFixed(2)}`);
console.log(`Monthly spent: $${status.monthlySpent.toFixed(2)}`);
console.log(`Near limit: ${status.isNearLimit}`);
```

### Handle Budget Events
```typescript
multiProviderManager.on('budget_warning', (event) => {
  console.warn(`Budget warning: ${event.percentage}% of ${event.limit} spent`);
});

multiProviderManager.on('budget_exceeded', (event) => {
  console.error(`Budget exceeded: $${event.spent} > $${event.limit}`);
});
```

## Provider Metrics

Track provider performance:

```typescript
// Get all metrics
const allMetrics = multiProviderManager.getProviderMetrics();

// Get metrics for specific provider
const openaiMetrics = multiProviderManager.getProviderMetrics('openai');

// Example metrics
metrics.forEach(m => {
  console.log(`${m.provider}/${m.model}:`);
  console.log(`  Requests: ${m.requestCount}`);
  console.log(`  Success rate: ${(m.successCount / m.requestCount * 100).toFixed(1)}%`);
  console.log(`  Avg latency: ${m.averageLatencyMs}ms`);
  console.log(`  Total cost: $${m.totalCost.toFixed(2)}`);
});
```

## Error Handling

The system handles errors gracefully with automatic fallback:

```typescript
try {
  const response = await multiProviderManager.complete(request);
  // Success - response includes which provider was used
} catch (error) {
  if (error instanceof BudgetExceededError) {
    console.error('Budget exceeded:', error.message);
  } else if (error instanceof ProviderError) {
    console.error('Provider error:', error.message);
    console.error('Is retryable:', error.isRetryable);
  } else {
    console.error('All providers failed:', error.message);
  }
}
```

## Best Practices

1. **Use 'auto' model selection** when possible to let the system optimize
2. **Set appropriate selection criteria** based on your use case
3. **Monitor budget status** regularly to avoid surprises
4. **Track provider metrics** to understand performance and costs
5. **Handle errors gracefully** - the system will try fallbacks automatically
6. **Use structured output** with Zod schemas for type-safe responses
7. **Cache responses** when appropriate to reduce costs

## Configuration Reference

### Selection Criteria
- `maxCostPer1kTokens`: Maximum acceptable cost per 1000 tokens
- `maxLatencyMs`: Maximum acceptable response time
- `minSuccessRate`: Minimum required success rate (0-1)
- `requiredCapabilities`: Array of required model capabilities
- `preferredTier`: Preferred pricing tier (economy/balanced/performance/premium)
- `excludeProviders`: Array of providers to exclude
- `preferCached`: Prefer cached responses when available

### Budget Configuration
- `dailyLimit`: Daily spending limit in USD
- `monthlyLimit`: Monthly spending limit in USD
- `perRequestLimit`: Maximum cost per request
- `warningThreshold`: Percentage at which to trigger warnings (0-100)
- `enforcementMode`: 'soft' (warn only) or 'hard' (block requests)

### Retry Options
- `maxRetries`: Maximum number of retry attempts (default: 3)
- `retryDelay`: Initial retry delay in ms (default: 1000)
- `backoffMultiplier`: Exponential backoff multiplier (default: 2)
- `maxRetryDelay`: Maximum retry delay in ms (default: 10000)

## Troubleshooting

### Issue: "No suitable models available"
- Check that at least one provider is initialized with a valid API key
- Verify your selection criteria aren't too restrictive
- Check provider health status

### Issue: Budget exceeded errors
- Check current budget status with `getBudgetStatus()`
- Increase budget limits or switch to 'soft' enforcement mode
- Consider using cheaper models or reducing token usage

### Issue: High latency
- Check provider metrics to identify slow providers
- Use `maxLatencyMs` criteria to prefer faster models
- Consider excluding slow providers during peak times

### Issue: Frequent failures
- Check provider metrics for error patterns
- Verify API keys are valid and have sufficient quota
- Consider increasing retry limits or delays