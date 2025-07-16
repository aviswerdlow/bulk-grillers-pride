#!/bin/bash
# Force deploy Convex functions

# Change to parent directory
cd ..

# Export the deployment key
export CONVEX_DEPLOYMENT="dev:greedy-canary-910"

# Run the deployment with auto-yes and typecheck disabled
echo "Deploying Convex functions to dev deployment..."
npx convex deploy --yes --typecheck=disable

echo "Deployment complete!"