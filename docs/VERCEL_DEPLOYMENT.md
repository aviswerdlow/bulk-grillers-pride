# Vercel Deployment Guide

This guide covers deploying the Bulk Grillers Pride application to Vercel.

## Prerequisites

1. Vercel account
2. GitHub repository connected to Vercel
3. Clerk account with configured JWT templates
4. Convex project deployed

## Environment Variables

### Required Secrets in GitHub

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `VERCEL_TOKEN`: Your Vercel personal access token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `CONVEX_DEPLOY_KEY`: Convex deployment key

### Required Environment Variables in Vercel

Configure these in your Vercel project settings:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER_URL=https://your-app.clerk.accounts.dev

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key

# Optional AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Deployment Configuration

### vercel.json

The `vercel.json` file in the root directory configures:

- **Build Settings**: Custom build command and output directory
- **Environment Variables**: Maps Vercel environment variables to build environment
- **Function Settings**: Sets maximum duration for serverless functions
- **Regions**: Deploys to `iad1` (US East) by default
- **Security Headers**: Adds security headers to all responses

### GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy.yml`) handles:

1. **Preview Deployments**: Automatically deploy PRs to preview environments
2. **Production Deployments**: Deploy main branch to production
3. **Convex Deployment**: Automatically deploy Convex functions after Vercel deployment

## Initial Setup

### 1. Create Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel project
vercel link

# Pull environment variables
vercel env pull
```

### 2. Get Vercel Credentials

```bash
# Get your Vercel token
# https://vercel.com/account/tokens

# Get organization and project IDs
vercel project ls
```

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `CONVEX_DEPLOY_KEY`

### 4. Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all required environment variables for each environment:
   - Production
   - Preview
   - Development

## Deployment Process

### Automatic Deployments

- **Main branch**: Automatically deploys to production
- **Pull requests**: Automatically deploy to preview environments
- **Manual trigger**: Use workflow dispatch in GitHub Actions

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy Convex functions
npm run convex:deploy
```

## Monitoring and Debugging

### Vercel Dashboard

- View deployment logs
- Monitor function execution
- Check environment variables
- Review build logs

### GitHub Actions

- Check workflow runs for deployment status
- Review deployment logs
- Monitor for failed deployments

### Common Issues

1. **Build Failures**

   - Check Node.js version (should be 18.x)
   - Verify all environment variables are set
   - Check build logs for missing dependencies

2. **Function Timeouts**

   - Default timeout is 30 seconds
   - Can be adjusted in vercel.json

3. **Environment Variable Issues**

   - Ensure variables are set for the correct environment
   - Check variable naming (some need NEXT*PUBLIC* prefix)

4. **Convex Deployment Failures**
   - Verify CONVEX_DEPLOY_KEY is correct
   - Check Convex dashboard for errors
   - Ensure schema matches between environments

## Performance Optimization

### Build Optimization

- Turborepo caching is configured
- Next.js build cache is preserved
- npm cache is utilized in CI

### Runtime Optimization

- Edge functions for better performance
- Region selection (iad1 for US East)
- Security headers for better security scores

## Security Considerations

1. **Environment Variables**

   - Never commit secrets to the repository
   - Use Vercel's environment variable UI
   - Rotate keys regularly

2. **Security Headers**

   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block

3. **Access Control**
   - Limit Vercel token permissions
   - Use deployment protection rules
   - Enable 2FA on all accounts

## Rollback Process

### Via Vercel Dashboard

1. Go to your project dashboard
2. Click on "Deployments"
3. Find the previous working deployment
4. Click "..." → "Promote to Production"

### Via CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

## Troubleshooting

### Check Deployment Status

```bash
# View deployment logs
vercel logs <deployment-url>

# Check function logs
vercel logs --filter=functions
```

### Environment Variable Validation

```bash
# List all environment variables
vercel env ls

# Pull environment variables locally
vercel env pull
```

### Build Issues

1. Clear build cache in Vercel dashboard
2. Check `turbo.json` for build dependencies
3. Verify all npm packages are installed
4. Check for TypeScript errors: `npm run type-check`

## Support

- Vercel Documentation: https://vercel.com/docs
- Convex Documentation: https://docs.convex.dev
- GitHub Actions: https://docs.github.com/en/actions
