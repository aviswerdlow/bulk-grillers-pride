# Bundle Size Monitoring

## Overview

Bundle size monitoring is integrated into our CI/CD pipeline to track and enforce JavaScript bundle size limits. This helps ensure optimal performance and fast page loads for users.

## Features

### 1. Automated Bundle Size Checking
- Runs automatically on every build in CI
- Checks against defined budget limits
- Fails the build if limits are exceeded

### 2. PR Comments
- Automatically comments on pull requests with bundle size report
- Updates existing comment instead of creating new ones
- Shows pass/fail status and detailed breakdown

### 3. Historical Tracking
- Stores bundle size reports as artifacts for 30 days
- Enables tracking size changes over time
- JSON format for easy parsing and analysis

### 4. GitHub Action Summary
- Displays bundle size report in workflow summary
- Quick visibility without checking logs
- Shows total size, first load JS, and route details

## Budget Limits

Current bundle size budgets (defined in `scripts/check-bundle-size.js`):
- **First Load JS**: 200 KB - Total JavaScript for initial page load
- **Route JS**: 100 KB - JavaScript per route
- **Total**: 500 KB - Total bundle size

## Usage

### Running Locally
```bash
# Standard output
npm run build && node scripts/check-bundle-size.js

# JSON output
npm run build && node scripts/check-bundle-size.js --json
```

### CI Integration
The bundle size check runs automatically in the `build` job of the CI workflow.

### Accessing Reports
1. **PR Comments**: Check the PR for the bundle size comment
2. **Workflow Summary**: View the GitHub Actions run summary
3. **Artifacts**: Download `bundle-size-report.json` from workflow artifacts

## Optimizing Bundle Size

If bundle size limits are exceeded:

1. **Analyze Large Dependencies**
   ```bash
   npm run analyze
   ```

2. **Common Optimization Strategies**
   - Use dynamic imports for large components
   - Tree-shake unused code
   - Replace large dependencies with smaller alternatives
   - Optimize images and assets

3. **Monitor Specific Routes**
   Check the JSON report to identify which routes exceed limits

## Configuration

To adjust bundle size limits, edit `scripts/check-bundle-size.js`:
```javascript
const BUDGETS = {
  'First Load JS': 200, // in KB
  'Route JS': 100,      // in KB
  'Total': 500,         // in KB
};
```

## Report Format

The JSON report includes:
```json
{
  "passed": true,
  "details": [
    "✅ First Load JS: 180.50 KB (budget: 200 KB)",
    "✅ Route /_app: 95.20 KB (budget: 100 KB)"
  ],
  "summary": {
    "totalSize": "180.50 KB",
    "firstLoadJS": "180.50 KB",
    "routes": [
      {
        "route": "/_app",
        "size": "95.20 KB",
        "passed": true
      }
    ]
  }
}
```