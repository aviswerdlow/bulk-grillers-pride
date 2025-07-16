# Troubleshooting Dashboard Errors

This guide helps diagnose and fix common dashboard-related errors in the Bulk Grillers Pride application.

## Common Issues

### 1. Sentry 403 Error

**Error**: `POST https://o4508644988534784.ingest.us.sentry.io/.../envelope/ 403 (Forbidden)`

**Cause**: This error typically comes from browser extensions or third-party scripts trying to send telemetry data to Sentry. The application itself does not have Sentry installed.

**Solutions**:

1. **Disable browser extensions** in development (especially monitoring/debugging extensions)
2. **Use incognito mode** for testing without extensions
3. **Check for third-party scripts** that might be injecting Sentry
4. **Clear browser cache** to remove any persisted scripts

**Prevention**:

- The application includes error monitoring utilities that detect and log these errors
- See `/apps/web/src/utils/error-monitoring.ts` for the detection implementation

### 2. Missing Convex Function Error

**Error**: `Function functions.dashboard.getDashboardStats not found`

**Possible Causes**:

1. Convex functions not deployed
2. Function file not properly exported
3. API types not regenerated after adding new functions
4. Development server not syncing properly

**Solutions**:

1. **Deploy Convex functions**:

   ```bash
   cd convex
   npx convex deploy
   ```

2. **Check function exports**:

   - Verify `/convex/functions/dashboard.ts` exists
   - Ensure functions are exported correctly
   - Check that the file is imported in the generated API

3. **Regenerate API types**:

   ```bash
   npx convex dev
   ```

4. **Restart development server**:

   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

5. **Force redeploy** (if issues persist):
   ```bash
   cd convex
   ./force-deploy.sh
   ```

### 3. Development Warnings

Common warnings and their solutions:

**Warning**: `Each child in a list should have a unique "key" prop`

- Add unique `key` props to list items in React components

**Warning**: `Extra attributes from the server`

- This is typically from Next.js hydration - ensure server and client render the same content

## Debugging Tools

### 1. Enhanced Dashboard with Logging

Use the enhanced dashboard component for debugging:

```typescript
// Replace the import in your layout/page
import OrganizationDashboard from './page-with-logging';
```

This version includes:

- Detailed query logging
- Error state handling
- Performance metrics
- Sentry error detection

### 2. Error Monitoring Utilities

Use the error monitoring utilities in your components:

```typescript
import {
  createLogger,
  setupGlobalErrorHandling,
  PerformanceMonitor,
} from '@/utils/error-monitoring';

// Create a logger for your component
const logger = createLogger('MyComponent');

// Set up global error handling
useEffect(() => {
  setupGlobalErrorHandling(logger);
}, []);

// Log events
logger.info('Component mounted', { props });
logger.error('Query failed', error);

// Monitor performance
const perfMonitor = new PerformanceMonitor(logger);
perfMonitor.start('dataFetch');
// ... perform operation
perfMonitor.end('dataFetch');
```

### 3. Convex Function Logging

The dashboard functions include comprehensive logging:

```typescript
// Check Convex logs
npx convex logs

// Filter for dashboard logs
npx convex logs | grep DASHBOARD
```

## Testing

### Running Tests

1. **Frontend Tests**:

   ```bash
   npm run test apps/web/src/app/(dashboard)/[orgSlug]/dashboard/__tests__/page.test.tsx
   ```

2. **Utility Tests**:

   ```bash
   npm run test apps/web/src/utils/__tests__/error-monitoring.test.ts
   ```

3. **Convex Function Tests**:
   ```bash
   cd convex
   npm test __tests__/dashboard.test.ts
   ```

### Test Coverage

The test suite covers:

- Loading states and error handling
- Empty states and data rendering
- Query failures and recovery
- Performance monitoring
- Error detection and logging

## Best Practices

### 1. Error Handling

Always wrap Convex queries in try-catch blocks:

```typescript
try {
  const data = useQuery(api.functions.dashboard.getDashboardStats, {
    organizationId,
  });
} catch (error) {
  logger.error('Dashboard stats query failed', error);
  // Show fallback UI
}
```

### 2. Loading States

Always handle undefined states from Convex:

```typescript
if (data === undefined) {
  return <LoadingSpinner />;
}

if (data === null) {
  return <NotFound />;
}
```

### 3. Performance Monitoring

Track key operations:

```typescript
const perfMonitor = new PerformanceMonitor(logger);

perfMonitor.start('dashboard-load');
// ... load dashboard data
const loadTime = perfMonitor.end('dashboard-load');

if (loadTime > 1000) {
  logger.warn('Slow dashboard load', { loadTime });
}
```

## Monitoring in Production

While Sentry is not currently installed, you can:

1. **Use browser console logs** with structured logging
2. **Monitor Convex logs** for server-side errors
3. **Set up alerts** on Convex function failures
4. **Track performance** using the built-in utilities

## Quick Fixes Checklist

- [ ] Clear browser cache and cookies
- [ ] Disable browser extensions
- [ ] Restart development servers (Next.js and Convex)
- [ ] Redeploy Convex functions
- [ ] Regenerate TypeScript types
- [ ] Check network tab for failed requests
- [ ] Review console logs for detailed errors
- [ ] Verify environment variables are set
- [ ] Ensure database indexes are created
- [ ] Check for circular dependencies

## Getting Help

If issues persist:

1. Check the Convex logs: `npx convex logs`
2. Review browser console with enhanced logging enabled
3. Run the test suite to identify specific failures
4. Check the network tab for API errors
5. Review the generated API types in `convex/_generated/`
