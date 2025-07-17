# Turbo Remote Caching Configuration

This guide explains how to set up and use Turbo's remote caching feature to improve build performance across your team and CI/CD pipelines.

## Overview

Turbo's remote caching allows you to share build artifacts between team members and CI runs, dramatically reducing build times by reusing previously computed results.

## Benefits

- **40-60% faster builds** with Turbo v2's Rust-based core
- **Shared cache** across team members and CI/CD runs
- **Reduced CI costs** by avoiding redundant computations
- **Improved developer experience** with instant cache hits

## Setup Instructions

### 1. Local Development Setup

To use remote caching locally, you need to authenticate with Vercel:

```bash
# Login to Vercel (one-time setup)
npx turbo login

# Link your repository to enable remote caching
npx turbo link
```

This will create a `.turbo/config.json` file with your authentication token. This file is gitignored and should not be committed.

### 2. CI/CD Configuration

For GitHub Actions, the following environment variables are already configured in `.github/workflows/ci.yml`:

- `TURBO_TOKEN`: Authentication token for remote caching
- `TURBO_TEAM`: Your team identifier

These secrets need to be added to your GitHub repository settings:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `TURBO_TOKEN`: Get this from your Vercel dashboard or by running `npx turbo login` locally
   - `TURBO_TEAM`: Your Vercel team slug (e.g., "avi-swerdlow")

### 3. Configuration Details

The remote caching is configured in `turbo.json`:

```json
{
  "remoteCache": {
    "signature": true
  }
}
```

The `signature: true` option ensures cache artifacts are signed for security.

## Usage

Once configured, remote caching works automatically:

```bash
# First run - cache miss, uploads artifacts
npm run build

# Second run (by you or teammate) - cache hit, downloads artifacts
npm run build
```

You'll see output like:

```
• Remote caching enabled
...
web#build: cache hit, replaying logs 61cdc2ddb9e63a47
```

## Monitoring Cache Performance

View cache statistics:

```bash
# See cache hit/miss statistics
npx turbo run build --summarize

# Generate detailed performance report
npx turbo run build --profile
```

## Best Practices

1. **Ensure proper outputs configuration**: Make sure all build outputs are properly configured in `turbo.json`
2. **Use consistent environments**: Node.js versions and dependencies should match across environments
3. **Monitor cache size**: Large outputs can slow down cache uploads/downloads
4. **Security**: Never commit `.turbo/config.json` or expose your `TURBO_TOKEN`

## Troubleshooting

### Cache Misses

If you're experiencing unexpected cache misses:

1. Check that environment variables match between environments
2. Ensure Node.js versions are consistent
3. Verify that `globalDependencies` in `turbo.json` includes all relevant files
4. Run with `--verbose` to see detailed cache key information:
   ```bash
   npm run build -- --verbose
   ```

### Authentication Issues

If you see authentication errors:

1. Re-run `npx turbo login`
2. Verify `TURBO_TOKEN` is set correctly in CI
3. Check that `TURBO_TEAM` matches your Vercel team

### Performance Issues

If remote caching is slower than expected:

1. Check your internet connection speed
2. Consider reducing output sizes by excluding unnecessary files
3. Use `.turbo/turbo-<task>.log` files to analyze what's being cached

## Advanced Configuration

### Custom Cache Server

For enterprise setups, you can use a custom cache server:

```json
{
  "remoteCache": {
    "signature": true,
    "enabled": true,
    "apiUrl": "https://your-cache-server.com"
  }
}
```

### Selective Caching

Disable caching for specific tasks:

```json
{
  "tasks": {
    "dev": {
      "cache": false
    }
  }
}
```

## Security Considerations

1. **Access Control**: Only team members with access to your Vercel team can read/write cache
2. **Artifact Signing**: With `signature: true`, artifacts are cryptographically signed
3. **Token Rotation**: Regularly rotate your `TURBO_TOKEN` for security
4. **Audit Logs**: Monitor cache access through Vercel dashboard

## Related Documentation

- [Turbo Remote Caching Docs](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [CI/CD Setup Guide](./CI_CD.md)
- [Performance Optimization](./PERFORMANCE.md)
