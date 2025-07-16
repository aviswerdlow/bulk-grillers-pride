#!/bin/bash
# Sync Convex functions to deployment

# Change to parent directory
cd ..

# Export the deployment key
export CONVEX_DEPLOYMENT="dev:greedy-canary-910"

# Run codegen to ensure types are up to date
echo "Regenerating Convex types..."
npx convex codegen

# Push functions to dev deployment
echo "Pushing functions to dev deployment..."
npx convex deploy --yes 2>/dev/null || npx convex deploy

echo "Functions synced successfully!"