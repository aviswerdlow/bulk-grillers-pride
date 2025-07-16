# Sentry Configuration Guide

## Current Status

Sentry is **NOT** currently installed or configured in this project. The error-boundary.tsx component has a placeholder comment for future Sentry integration.

If you're seeing 403 errors related to Sentry in development, they may be caused by:

- Browser extensions attempting to inject Sentry
- Third-party scripts or services
- CDN or network-level monitoring tools

## Resolving 403 Errors in Development

If you're experiencing Sentry-related 403 errors without having Sentry installed:

1. **Check Browser Extensions**: Disable any monitoring or development extensions
2. **Clear Browser Cache**: Sometimes cached scripts can cause issues
3. **Check Network Tab**: Look for any requests to sentry.io domains
4. **Use Incognito Mode**: Test if the errors persist in a clean browser session

## Future Sentry Integration

When ready to add Sentry for error monitoring:

### 1. Installation

```bash
# For Next.js applications
npm install --save @sentry/nextjs
```

### 2. Configuration Files

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
```

Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
```

### 3. Environment Variables

Add to `.env.local`:

```bash
# Sentry - Only set in production
# NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
# SENTRY_DSN=https://your-dsn@sentry.io/project-id
# SENTRY_ORG=your-org
# SENTRY_PROJECT=your-project
# SENTRY_AUTH_TOKEN=your-auth-token
```

### 4. Update Error Boundary

Update `apps/web/src/components/error-boundary.tsx`:

```typescript
import * as Sentry from "@sentry/nextjs";

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // Log to Sentry in production
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  // Log to console in development
  console.error("Error caught by boundary:", error, errorInfo);
}
```

### 5. Next.js Configuration

Update `next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config
};

// Only wrap with Sentry in production
const config =
  process.env.NODE_ENV === 'production'
    ? withSentryConfig(
        nextConfig,
        {
          silent: true,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
        {
          widenClientFileUpload: true,
          transpileClientSDK: true,
          hideSourceMaps: true,
          disableLogger: true,
        }
      )
    : nextConfig;

module.exports = config;
```

## Development Best Practices

1. **Disable in Development**: Always check `NODE_ENV` before initializing Sentry
2. **Use Environment Variables**: Never hardcode DSN values
3. **Separate Client/Server DSN**: Use different DSNs for security
4. **Sample Rates**: Use lower sample rates in production to control costs
5. **PII Handling**: Configure Sentry to scrub sensitive data

## Testing Sentry Integration

```typescript
// Test error handling
function testSentry() {
  try {
    throw new Error('Test Sentry error');
  } catch (error) {
    Sentry.captureException(error);
  }
}
```

## Monitoring Without Sentry

Current error monitoring approach:

- Error boundaries log to console
- Convex functions have built-in error handling
- CI/CD pipeline includes error checking
- Development uses console logging

## Troubleshooting

### Common Issues

1. **403 Errors Without Sentry**: Check browser extensions and network tools
2. **Missing Environment Variables**: Sentry should gracefully handle missing config
3. **Development Noise**: Always disable Sentry in development unless debugging
4. **Build Errors**: Ensure Sentry webpack plugin is properly configured

### Debug Checklist

- [ ] Check if `SENTRY_DSN` is set
- [ ] Verify `NODE_ENV` is correct
- [ ] Look for browser extension conflicts
- [ ] Check network tab for failed requests
- [ ] Review console for error messages

## References

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [Error Boundary Pattern](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
