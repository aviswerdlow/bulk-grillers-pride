# CI/CD Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment (CI/CD). The pipeline automatically runs tests, linting, type checking, and deployments based on different triggers.

## Workflows

### 1. Continuous Integration (`ci.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

- **Lint**: Runs ESLint on all code
- **Type Check**: Runs TypeScript compiler checks
- **Test**: Runs Jest tests in parallel (2 shards)
- **Build**: Builds the Next.js application
- **Security**: Runs npm audit for vulnerability scanning
- **Coverage**: Aggregates test coverage reports

### 2. Deployment (`deploy.yml`)

**Triggers:**

- Push to `main` branch (production deployment)
- Manual workflow dispatch

**Jobs:**

- **Preview Deployment**: Deploys to Vercel preview environment for PRs
- **Production Deployment**: Deploys to Vercel production + Convex functions

### 3. Dependency Updates (`dependabot.yml`)

**Schedule:** Weekly on Mondays at 3:00 AM

**Updates:**

- npm dependencies (grouped by dev/prod)
- GitHub Actions versions

## Required Secrets

Configure these in GitHub repository settings:

### For CI Pipeline:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CONVEX_URL
TURBO_TOKEN (optional, for Turborepo caching)
TURBO_TEAM (optional, for Turborepo caching)
```

### For Deployment:

```
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
CONVEX_DEPLOY_KEY
```

## Local Testing

You can test the CI pipeline locally:

```bash
# Run all CI checks
npm run lint
npm run type-check
npm run test
npm run build

# Run with CI environment
npm run test:ci
```

## Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all CI checks pass locally
4. Create a pull request
5. Wait for CI checks to complete
6. Get code review approval
7. Merge to `develop` (or `main` for hotfixes)

## Deployment Process

### Preview Deployments

- Automatic for all PRs
- URL posted as PR comment
- Uses preview environment variables

### Production Deployments

- Automatic when merging to `main`
- Deploys both Vercel app and Convex functions
- Uses production environment variables

## Monitoring

### CI Status

- Check Actions tab in GitHub
- Badge in README shows current status
- Failed builds notify PR authors

### Deployment Status

- Vercel dashboard shows deployment history
- Convex dashboard shows function deployments
- GitHub Actions logs contain deployment URLs

## Troubleshooting

### Common CI Failures

**Lint errors:**

```bash
npm run lint -- --fix
```

**Type errors:**

```bash
npm run type-check
# Check the specific file mentioned in error
```

**Test failures:**

```bash
npm test -- --watch
# Run specific test file
npm test -- path/to/test.spec.ts
```

**Build failures:**

- Check environment variables
- Ensure all dependencies are installed
- Check for import errors

### Deployment Issues

**Vercel deployment fails:**

- Check VERCEL_TOKEN is valid
- Verify project ID and org ID
- Check build logs in Vercel dashboard

**Convex deployment fails:**

- Verify CONVEX_DEPLOY_KEY
- Check Convex schema changes
- Run `npm run convex:setup` locally

## Best Practices

1. **Keep CI Fast**:

   - Use test sharding
   - Cache dependencies
   - Run jobs in parallel

2. **Fail Fast**:

   - Order jobs by speed (lint → type → test → build)
   - Use continue-on-error sparingly

3. **Security First**:

   - Regular dependency updates
   - Automated security scanning
   - Secrets rotation

4. **Clear Feedback**:
   - Descriptive job names
   - Summary reports
   - PR comments for deployments

## Maintenance

### Monthly Tasks:

- Review and merge Dependabot PRs
- Check for GitHub Actions updates
- Rotate deployment secrets

### Quarterly Tasks:

- Audit CI performance
- Review test coverage trends
- Update Node.js version
