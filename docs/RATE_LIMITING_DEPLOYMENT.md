# Rate Limiting Production Deployment Guide

## Overview
This document outlines the deployment process for the rate limiting feature to production.

## Pre-Deployment Checklist

### ✅ Schema Review
- [x] `rateLimits` table defined with proper indexes
- [x] `rateLimitConfigurations` table defined
- [x] `rateLimitViolations` table defined  
- [x] `apiKeys` table defined
- [x] All tables have appropriate indexes for performance

### ✅ Code Review
- [x] Rate limiting middleware implemented in `convex/lib/rateLimit.ts`
- [x] Admin functions for configuration in `convex/functions/admin/rateLimitConfiguration.ts`
- [x] Organization status endpoint in `convex/functions/organizations/rateLimitStatus.ts`
- [x] Tests written in `convex/__tests__/rateLimit.test.ts`

### ✅ Configuration
- [x] Default rate limits defined for all plans (free, starter, professional, enterprise)
- [x] Resource types configured (ai.categorization, import.products, api.products, etc.)
- [x] Proper error messages and retry-after headers

## Deployment Steps

### 1. Pre-Deployment (Current Status)
- Created deployment script at `scripts/deploy-rate-limiting.sh`
- All schema changes are backwards compatible
- No breaking changes to existing functionality

### 2. Deployment Process
```bash
# 1. Ensure you're on the correct branch
git checkout infra/deploy-rate-limiting

# 2. Run the deployment script
./scripts/deploy-rate-limiting.sh

# 3. Follow the prompts to:
#    - Deploy schema to production
#    - Initialize rate limit configurations
```

### 3. Post-Deployment Verification
- [ ] Verify tables created in Convex dashboard
- [ ] Run initialization function if not done during deployment
- [ ] Test rate limiting on a non-critical endpoint
- [ ] Monitor for any errors in the first hour

## Rollback Plan

### If Issues Occur:
1. **Disable Rate Limiting**: Set `isEnabled=false` in all configurations
2. **Remove Middleware**: Comment out rate limiting checks in affected functions
3. **Contact Support**: Convex support can help with data restoration if needed

### Commands for Emergency Disable:
```bash
# Disable all rate limit configurations
export CONVEX_DEPLOYMENT=prod:decisive-sparrow-461
npx convex run functions:admin:rateLimitConfiguration:disableAllRateLimits
```

## Testing Plan

### Staging Tests (Already Completed)
- ✅ Basic rate limiting functionality
- ✅ Token tracking for AI endpoints
- ✅ Violation logging
- ✅ Admin configuration updates

### Production Tests (Post-Deployment)
1. Test with low limits on a test organization
2. Verify rate limit headers in API responses
3. Check violation logging
4. Test burst handling
5. Verify cost tracking for AI endpoints

## Monitoring

### Key Metrics to Watch:
- Rate limit violations per hour
- API response times
- Error rates on rate-limited endpoints
- Token usage for AI endpoints

### Alert Thresholds:
- > 100 violations/hour from single organization
- > 10% increase in API errors
- Any critical severity violations

## Notes
- Rate limiting is applied at the organization level
- API keys have their own rate limits independent of user limits
- AI endpoints track both request count and token usage
- Free plan limits cannot be overridden