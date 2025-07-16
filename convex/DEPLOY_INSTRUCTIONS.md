# Deploy Dashboard Functions - URGENT

The dashboard functions are created but not deployed to the Convex backend. To fix the error:

```
[CONVEX Q(functions/dashboard/queries:getDashboardStats)] [Request ID: d5d26e20cfd62ab3] Server Error
Could not find public function for 'functions/dashboard/queries:getDashboardStats'.
```

## Quick Fix (From project root):

```bash
# 1. Make sure you're in the project root (bulk-grillers-pride)
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

# 2. Run Convex dev to sync functions
npx convex dev
```

This will:

1. Start the Convex dev server
2. Automatically detect the new dashboard functions
3. Push them to your dev deployment
4. The dashboard should start working immediately

## Alternative: Deploy to production

If you want to deploy to production instead:

```bash
npx convex deploy
```

When prompted, type 'yes' to confirm the deployment.

## What was added:

- `/convex/functions/dashboard/queries.ts` - Contains getDashboardStats and getRecentActivity
- `/convex/functions/dashboard/index.ts` - Exports the dashboard functions
- The functions are already in the generated API types

The functions just need to be pushed to the Convex backend.
