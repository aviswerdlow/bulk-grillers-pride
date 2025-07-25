# Turbo v2 Optimization Guide

This document outlines the optimizations made to our Turbo v2 configuration for improved build performance and cache utilization.

## Key Optimizations

### 1. Enabled Turbo Daemon
- **What**: Background daemon process for improved performance
- **Why**: Reduces startup time and improves cache operations
- **How**: Set `"daemon": true` in turbo.json
- **Command**: `npx turbo daemon start`

### 2. Strict Environment Mode
- **What**: Explicit environment variable declaration
- **Why**: Better cache hits by preventing unexpected invalidations
- **How**: Set `"envMode": "strict"` and declare all env vars
- **Migration**: Use `--env-mode=loose` temporarily if needed

### 3. Optimized Task Configuration

#### Build Task
- Added `.turbo/**` to outputs for better incremental builds
- Excluded test files from inputs to prevent unnecessary rebuilds
- Added `VERCEL_*` env vars for deployment consistency

#### Test Tasks
- Added `junit.xml` and `test-results/**` to outputs
- Separate `test` and `test:ci` configurations
- Proper environment variable handling for CI

#### Type Checking
- Added `*.tsbuildinfo` outputs for incremental TypeScript builds
- Removed dependency on build task to run in parallel

### 4. Output Logging Strategy
- `new-only`: For development tasks (build, lint, test)
- `errors-only`: For CI tasks to reduce noise
- `full`: Available for debugging when needed

### 5. Cache Analysis Script
Created `scripts/turbo-cache-analysis.js` to monitor:
- Cache size and utilization
- Configuration issues
- Optimization recommendations

## Usage

### Development
```bash
# Start daemon for better performance
npx turbo daemon start

# Run with optimized concurrency
npx turbo run build --concurrency=50%

# Check what would be cached
npx turbo run build --dry-run
```

### CI/CD
```bash
# Use affected detection
npx turbo run build test lint --affected

# Force specific concurrency
npx turbo run build --concurrency=4
```

### Cache Management
```bash
# Analyze cache performance
node scripts/turbo-cache-analysis.js

# Clear cache if needed
npx turbo run clean

# Force rebuild without cache
npx turbo run build --force
```

## Performance Metrics

### Before Optimization
- Cache size: 232 KB (underutilized)
- No daemon running
- Loose environment mode
- Missing outputs for some tasks

### After Optimization
- Daemon enabled for faster operations
- Strict environment mode for better caching
- All tasks properly configured with inputs/outputs
- Incremental TypeScript compilation enabled

## Best Practices

1. **Always run with daemon** in development for best performance
2. **Use `--affected` in CI** to only build changed packages
3. **Monitor cache size** regularly with the analysis script
4. **Be specific with inputs** to maximize cache hits
5. **Use remote caching** for team-wide benefits (configure TURBO_TOKEN)

## Troubleshooting

### Cache Misses
1. Run `npx turbo run build --dry-run` to see why cache misses occur
2. Check environment variables aren't changing unexpectedly
3. Ensure inputs are specific and not overly broad

### Daemon Issues
```bash
# Check status
npx turbo daemon status

# Restart if needed
npx turbo daemon restart

# View logs
npx turbo daemon logs
```

### Performance Issues
1. Check concurrency settings match your hardware
2. Ensure daemon is running
3. Review cache analysis for optimization opportunities