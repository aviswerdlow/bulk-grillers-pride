#!/bin/bash
# Deploy Convex functions

# Load environment from parent directory
source ../.env.local 2>/dev/null || true

# Export the deployment key
export CONVEX_DEPLOYMENT="dev:greedy-canary-910"

# Run the deployment
echo "Deploying Convex functions..."
npx convex deploy

echo "Deployment complete!"