# LangChain to CrewAI Migration Guide

## Overview

This document describes the backwards compatibility adapter that enables seamless migration from LangChain to CrewAI for AI-powered product categorization.

## Architecture

The migration uses an adapter pattern to maintain the existing API contract while gradually transitioning to CrewAI:

```
Frontend → Categorization API → [Feature Flag] → LangChain or CrewAI Adapter → AI Processing
```

## Feature Flag

The migration is controlled by the `ENABLE_CREWAI_MIGRATION` environment variable:

```bash
# Enable CrewAI (uses adapter)
ENABLE_CREWAI_MIGRATION=true

# Disable CrewAI (uses LangChain directly)
ENABLE_CREWAI_MIGRATION=false  # default
```

## Components

### 1. LangChainToCrewAIAdapter (`langchainToCrewAIAdapter.ts`)

The adapter maintains the exact same API as `processBatchWithLangChain` while internally using CrewAI:

```typescript
// Same API signature as before
const results = await adapter.processBatchWithLangChain(
  ctx,
  products,
  categories,
  customPrompt,
  provider,
  apiKey,
  model,
  options
);
```

### 2. Request Transformation

The adapter transforms LangChain requests to CrewAI format:

- Maps products to CrewAI task contexts
- Converts category contexts to category IDs
- Transforms provider/model settings to CrewAI LLM configs
- Passes custom prompts to agent instructions

### 3. Response Transformation

CrewAI responses are transformed back to LangChain format:

- Agent results mapped to category suggestions
- Confidence scores preserved
- Error handling maintained
- New category recommendations included

### 4. Caching

The adapter includes the same caching mechanism as LangChain:

- Cache key generation based on product attributes
- TTL-based cache expiration
- Seamless integration with existing cache

## Migration Process

### Phase 1: Development Testing
1. Deploy adapter with feature flag disabled
2. Test adapter in development environment
3. Validate response format matches LangChain exactly

### Phase 2: A/B Testing
1. Enable feature flag for small percentage of requests
2. Monitor performance metrics:
   - Categorization accuracy
   - Response times
   - Error rates
   - Cost per categorization
3. Compare CrewAI vs LangChain results

### Phase 3: Gradual Rollout
1. Increase percentage of CrewAI traffic
2. Monitor for any issues
3. Rollback capability via feature flag

### Phase 4: Full Migration
1. Enable CrewAI for 100% of traffic
2. Monitor for 2 weeks
3. Remove LangChain code and adapter

## Testing

### Unit Tests
```bash
npm test -- langchainToCrewAIAdapter.test.ts
```

### Integration Testing
1. Create test categorization job with flag enabled
2. Verify results match expected format
3. Test error scenarios

### Performance Testing
- Measure response times
- Monitor token usage
- Track costs

## Monitoring

Key metrics to track during migration:

1. **Accuracy Metrics**
   - Categorization accuracy percentage
   - Confidence score distribution
   - New category suggestion rate

2. **Performance Metrics**
   - API response time (p50, p95, p99)
   - Tokens used per product
   - Cost per categorization

3. **Error Metrics**
   - Error rate by type
   - Timeout rate
   - Retry success rate

## Rollback Plan

If issues are detected:

1. **Immediate**: Set `ENABLE_CREWAI_MIGRATION=false`
2. **Monitor**: Check that all requests use LangChain
3. **Investigate**: Review logs and metrics
4. **Fix**: Address issues in CrewAI implementation
5. **Retry**: Re-enable after fixes

## API Compatibility

The adapter ensures 100% API compatibility:

### Input Contract (Unchanged)
- Products array
- Categories array  
- Custom prompt
- Provider selection
- Model selection
- Processing options

### Output Contract (Unchanged)
- Product ID
- Suggestions array (top 3)
- Confidence scores
- Rationale for each suggestion
- New category suggestions
- Key features
- Product type
- Success/error status

## Error Handling

The adapter preserves all error handling behaviors:

1. **Network Errors**: Converted to LangChain error format
2. **Timeout Errors**: Respected with same limits
3. **Validation Errors**: Maintained with same messages
4. **Partial Failures**: Individual product errors preserved

## Cost Estimation

The adapter includes cost estimation compatible with existing billing:

```typescript
const cost = await adapter.estimateProcessingCost(
  products,
  categories,
  provider,
  model
);
```

## Future Improvements

After successful migration:

1. Remove adapter layer
2. Direct CrewAI integration
3. Optimize agent workflows
4. Enhanced multi-agent collaboration
5. Memory persistence across sessions