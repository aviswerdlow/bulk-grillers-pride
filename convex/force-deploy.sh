#!/bin/bash
# Force deploy Convex functions

# Change to parent directory
cd ..

# Export the deployment key
export CONVEX_DEPLOYMENT="dev:greedy-canary-910"

# Run the deployment with auto-yes
echo "Deploying Convex functions to dev deployment..."
npx convex deploy --yes

echo "Deployment complete!"