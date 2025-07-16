# Convex Auth Store Error Fix

## Problem

The `store` mutation in `functions/auth/users.ts` was throwing "Called store without authentication" error because it was designed to be called by a Clerk webhook that was never implemented.

## Solution

1. **Updated error handling** in the `store` mutation to provide better error messages
2. **Created `ensureUser` mutation** that handles user creation/update on-demand
3. **Created `useEnsureUser` hook** that automatically creates user records when users sign in
4. **Integrated the hook** into the dashboard layout to ensure it runs for authenticated users

## Implementation Details

### Backend Changes

- Modified `store` mutation to handle different JWT claim formats (givenName/given_name, familyName/family_name, pictureUrl/picture)
- Added `ensureUser` mutation as a more reliable alternative to the store mutation
- Improved error messages for better debugging

### Frontend Changes

- Created `/apps/web/src/hooks/use-ensure-user.ts` hook
- Integrated the hook into the dashboard layout
- The hook runs automatically when a user signs in and ensures their record exists in Convex

## How It Works

1. User signs in via Clerk
2. Dashboard layout loads and calls `useEnsureUser` hook
3. Hook checks if user is authenticated
4. If authenticated, calls `ensureUser` mutation
5. Mutation creates or updates the user record in Convex

## Benefits

- No webhook configuration required
- Works immediately when users sign in
- Handles JWT claim format variations
- Graceful error handling (doesn't break the app if it fails)
- Automatic user creation on first sign-in

## Testing

To test the fix:

1. Sign out of the application
2. Sign in with a new or existing account
3. Check the console for "User record ensured in Convex" message
4. Verify user record exists in Convex dashboard
