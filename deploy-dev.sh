#!/bin/bash
# Deploy to dev environment

# Set environment variables
export CONVEX_DEPLOYMENT="dev:greedy-canary-910"

# Deploy without prompts
echo "Deploying to dev environment..."
npx convex deploy --yes

echo "Deployment complete!"