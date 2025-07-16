#!/usr/bin/env node

const { execSync } = require('child_process');

console.log(`
================================================================================
🔐 Clerk + Convex Setup Instructions
================================================================================

Your app is running at http://localhost:3000 but authentication is not yet fully configured.

To complete the setup, you need to:

1. CLERK WEBHOOK SETUP
   - Go to: https://dashboard.clerk.com
   - Select your application (guiding-cub-75)
   - Navigate to: Webhooks → Create Endpoint
   - Endpoint URL: https://greedy-canary-910.convex.cloud/api/webhooks/clerk
   - Select events:
     ✓ user.created
     ✓ user.updated
     ✓ organizationMembership.created
     ✓ organizationMembership.updated
     ✓ organization.created
     ✓ organization.updated
   - Copy the "Signing Secret"
   - Run: CONVEX_URL=https://greedy-canary-910.convex.cloud npx convex env set CLERK_WEBHOOK_SECRET <your-secret>

2. CLERK JWT TEMPLATE
   - In Clerk Dashboard, go to: JWT Templates
   - Create new template named: convex
   - Issuer URL: https://greedy-canary-910.convex.cloud
   - Claims:
     {
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}",
       "given_name": "{{user.first_name}}",
       "family_name": "{{user.last_name}}",
       "picture": "{{user.image_url}}"
     }
   - Save the template

3. TEST THE SETUP
   - Sign out and sign in again at http://localhost:3000
   - You should be redirected to the dashboard after authentication

4. TROUBLESHOOTING
   - Check Convex logs: https://dashboard.convex.dev/d/greedy-canary-910/logs
   - Verify environment variables:
     - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (in apps/web/.env.local)
     - CLERK_SECRET_KEY (in apps/web/.env.local)
     - NEXT_PUBLIC_CONVEX_URL (should be https://greedy-canary-910.convex.cloud)
     - CLERK_ISSUER_URL (should be https://guiding-cub-75.clerk.accounts.dev)

================================================================================
`);

// Check current environment
console.log('Current Configuration:');
console.log(
  '- Convex URL:',
  process.env.NEXT_PUBLIC_CONVEX_URL || 'https://greedy-canary-910.convex.cloud'
);
console.log(
  '- Clerk Domain:',
  process.env.CLERK_ISSUER_URL || 'https://guiding-cub-75.clerk.accounts.dev'
);
console.log('- App URL: http://localhost:3000');
