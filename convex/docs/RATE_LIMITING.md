# Rate Limiting Documentation

## Overview

The Bulk Grillers Pride platform implements a comprehensive rate limiting system to ensure fair usage, prevent abuse, and maintain system stability. Rate limits are applied per organization and user, with different limits based on subscription plans.

## Architecture

### Core Components

1. **Rate Limit Tracking** (`rateLimits` table)
   - Tracks request counts per resource per time window
   - Supports multiple time windows (minute, hour, day)
   - Tracks token usage for AI endpoints

2. **Rate Limit Configuration** (`rateLimitConfigurations` table)
   - Configurable limits per plan and resource
   - Supports request and token-based limits
   - Allows burst capacity and cost tracking

3. **Violation Tracking** (`rateLimitViolations` table)
   - Records all rate limit violations
   - Tracks severity and patterns
   - Identifies repeat offenders

4. **API Key Management** (`apiKeys` table)
   - Per-key rate limit overrides
   - Scoped permissions
   - Usage tracking

## Resources and Limits

### AI Endpoints

#### `ai.categorization`
- **Purpose**: Product categorization using AI
- **Limits by Plan**:
  - **Free**: 5/min, 50/hour, 200/day, 100k tokens/day
  - **Starter**: 20/min, 200/hour, 1k/day, 500k tokens/day
  - **Professional**: 50/min, 500/hour, 5k/day, 2M tokens/day
  - **Enterprise**: 200/min, 2k/hour, 20k/day, 10M tokens/day

#### `ai.validation`
- **Purpose**: AI-powered data validation
- **Limits**: Same as categorization

### Import/Export Operations

#### `import.products`
- **Purpose**: Bulk product imports
- **Limits by Plan**:
  - **Free**: 2/hour, 10/day
  - **Starter**: 10/hour, 50/day
  - **Professional**: 50/hour, 200/day
  - **Enterprise**: 200/hour, 1000/day

#### `import.categories`
- **Purpose**: Category structure imports
- **Limits**: Same as product imports

### API Endpoints

#### `api.products.write`
- **Purpose**: Product creation/update via API
- **Limits by Plan**:
  - **Free**: 10/min, 100/hour
  - **Starter**: 50/min, 500/hour
  - **Professional**: 100/min, 1000/hour
  - **Enterprise**: 500/min, 5000/hour

#### `api.products.read`
- **Purpose**: Product data retrieval
- **Limits**: 2x write limits for each plan

## Implementation Guide

### Using Rate Limiting in Mutations

#### Method 1: Using the Middleware Pattern

```typescript
import { withRateLimit, RATE_LIMIT_RESOURCES } from '../lib/rateLimit';

export const myMutation = withRateLimit(
  RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
  async (ctx, args) => {
    // Your mutation logic here
    return result;
  }
);
```

#### Method 2: Manual Rate Limiting

```typescript
import { checkRateLimit, consumeRateLimit, recordViolation } from '../lib/rateLimit';

export const myMutation = mutation({
  args: { /* your args */ },
  handler: async (ctx, args) => {
    // Check rate limit
    const rateLimitCheck = await checkRateLimit(ctx, {
      resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
      identifier: userId,
      organizationId: args.organizationId,
      userId,
      tokensUsed: estimatedTokens, // Optional for AI endpoints
    });
    
    if (!rateLimitCheck.allowed) {
      // Record violation
      await recordViolation(ctx, {
        resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
        identifier: userId,
        organizationId: args.organizationId,
        userId,
        endpoint: 'myMutation',
        method: 'MUTATION',
        requestCount: rateLimitCheck.limit + 1,
        limit: rateLimitCheck.limit,
      });
      
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter} seconds.`);
    }
    
    // Consume rate limit
    await consumeRateLimit(ctx, {
      resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
      identifier: userId,
      organizationId: args.organizationId,
      userId,
      tokensUsed: actualTokens, // Update with actual usage
    });
    
    // Your mutation logic
    return result;
  },
});
```

### Checking Rate Limit Status

```typescript
import { getUserRateLimitStatus } from './functions/organizations/rateLimitStatus';

// In a query or component
const status = await getUserRateLimitStatus({
  organizationId,
  resource: 'ai.categorization',
});

console.log(status);
// {
//   limits: { requestsPerMinute: 20, tokensPerDay: 500000, ... },
//   usage: { requestsMinute: 5, tokensDay: 50000, ... },
//   resetTimes: { minute: 1234567890, ... },
//   violations: { count24h: 0, recent: [] }
// }
```

## Configuration

### Initializing Rate Limit Configurations

Run once during system setup:

```typescript
import { initializeRateLimitConfigs } from './functions/admin/rateLimitConfiguration';

await initializeRateLimitConfigs();
```

### Updating Rate Limit Configurations

For admin users:

```typescript
import { updateRateLimitConfig } from './functions/admin/rateLimitConfiguration';

await updateRateLimitConfig({
  organizationId,
  resource: 'ai.categorization',
  plan: 'professional',
  updates: {
    requestsPerMinute: 100, // Increase limit
    tokensPerDay: 5000000, // Increase token limit
  },
});
```

## API Key Management

### Creating API Keys with Custom Limits

```typescript
const apiKey = await createApiKey({
  organizationId,
  name: 'Production API Key',
  scopes: ['read:products', 'write:products'],
  rateLimitOverrides: {
    requestsPerMinute: 200, // Custom higher limit
    requestsPerDay: 10000,
  },
});
```

## Monitoring and Alerts

### Viewing Rate Limit Violations

```typescript
import { getRateLimitViolations } from './functions/admin/rateLimitConfiguration';

const violations = await getRateLimitViolations({
  organizationId,
  limit: 100, // Last 100 violations
});
```

### Organization-Wide Summary

```typescript
import { getOrganizationRateLimitSummary } from './functions/organizations/rateLimitStatus';

const summary = await getOrganizationRateLimitSummary({
  organizationId,
});

// Returns overall health status and per-resource breakdowns
```

## Error Handling

### Rate Limit Error Response Format

When a rate limit is exceeded, the API returns:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded for ai.categorization",
  "retryAfter": 45,
  "limit": 20,
  "remaining": 0,
  "resetAt": 1234567890000
}
```

### Client-Side Handling

```typescript
try {
  await createCategorizationJob(params);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.retryAfter || 60;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Optionally implement exponential backoff
    setTimeout(() => {
      // Retry the request
    }, retryAfter * 1000);
  }
}
```

## Best Practices

1. **Estimate Token Usage**: For AI endpoints, estimate token usage before making requests
2. **Implement Retry Logic**: Use exponential backoff for rate-limited requests
3. **Monitor Usage**: Regularly check rate limit status to avoid hitting limits
4. **Use Burst Wisely**: Burst capacity is for temporary spikes, not sustained usage
5. **Cache Results**: Cache AI categorization results to reduce API calls
6. **Batch Operations**: Combine multiple operations when possible
7. **Use Appropriate Plans**: Upgrade plans based on actual usage patterns

## Troubleshooting

### Common Issues

1. **"Rate limit exceeded" errors**
   - Check current usage vs. limits
   - Verify the correct plan is active
   - Consider upgrading plan or optimizing usage

2. **Token limits hit before request limits**
   - Reduce prompt complexity
   - Use more efficient models
   - Batch smaller groups of products

3. **Repeat offender blocks**
   - After 5 violations in 24 hours, users are temporarily blocked
   - Block duration: 5 minutes
   - Contact support for persistent issues

### Debugging

Enable detailed logging:

```typescript
const rateLimitCheck = await checkRateLimit(ctx, options);
console.log('Rate limit check:', {
  allowed: rateLimitCheck.allowed,
  limit: rateLimitCheck.limit,
  remaining: rateLimitCheck.remaining,
  resetAt: new Date(rateLimitCheck.resetAt),
});
```

## Migration Notes

When migrating from unlimited to rate-limited endpoints:

1. Add rate limit checks to existing mutations
2. Update frontend to handle rate limit errors
3. Monitor initial usage to set appropriate limits
4. Communicate changes to users in advance
5. Provide grace period with warnings before enforcement