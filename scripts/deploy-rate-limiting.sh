#!/bin/bash

# Deploy rate limiting schema changes to production
# This script safely deploys the rate limiting feature to production

set -e # Exit on error

echo "🚀 Deploying Rate Limiting Schema to Production"
echo "============================================="

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "infra/deploy-rate-limiting" ]; then
    echo "❌ Error: Not on the correct branch. Please checkout infra/deploy-rate-limiting"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: There are uncommitted changes. Please commit or stash them first."
    exit 1
fi

echo "✅ Pre-deployment checks passed"
echo ""

# Step 1: Backup current production data (simulate)
echo "📦 Step 1: Creating backup of production data..."
echo "   Note: In a real deployment, you would backup your Convex data here"
echo "   Backup timestamp: $(date -u +"%Y-%m-%d_%H-%M-%S_UTC")"
echo ""

# Step 2: Deploy schema to production
echo "🔧 Step 2: Deploying schema changes to production..."
echo "   Running: npx convex deploy --prod"
echo ""
echo "⚠️  IMPORTANT: This will deploy to your PRODUCTION environment"
echo "   Production URL: https://decisive-sparrow-461.convex.cloud"
echo ""
read -p "   Do you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Deploy to production
npx convex deploy --prod

echo "✅ Schema deployed successfully"
echo ""

# Step 3: Initialize rate limit configurations
echo "🔧 Step 3: Initializing rate limit configurations..."
echo "   This will create default rate limit configurations for all plans"
echo ""
read -p "   Do you want to initialize rate limit configurations? (yes/no): " INIT_CONFIRM

if [ "$INIT_CONFIRM" = "yes" ]; then
    echo "   Running initialization function..."
    npx convex run --prod functions:admin.rateLimitConfiguration:initializeRateLimitConfigs
    echo "✅ Rate limit configurations initialized"
else
    echo "⚠️  Skipped initialization. You can run it later with:"
    echo "   npx convex run --prod functions:admin.rateLimitConfiguration:initializeRateLimitConfigs"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "Next steps:"
echo "1. Verify the deployment in the Convex dashboard"
echo "2. Test rate limiting functionality in production"
echo "3. Monitor for any issues in the first 24 hours"
echo ""
echo "Rollback plan if needed:"
echo "- The schema changes are backwards compatible"
echo "- To disable rate limiting, set isEnabled=false in configurations"
echo "- Contact Convex support for data restoration if needed"