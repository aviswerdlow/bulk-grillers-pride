import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

/**
 * Hook that ensures a user record exists in Convex when they sign in
 * This replaces the webhook-based approach with an on-demand user creation
 */
export function useEnsureUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const ensureUser = useMutation(api.functions.auth.users.ensureUser);

  useEffect(() => {
    console.log('[useEnsureUser] Auth state:', { isLoaded, isSignedIn });

    // Only run when auth is loaded and user is signed in
    if (!isLoaded || !isSignedIn) {
      console.log('[useEnsureUser] Skipping - auth not ready or user not signed in');
      return;
    }

    // Create or update the user record
    console.log('[useEnsureUser] Calling ensureUser mutation...');
    ensureUser()
      .then(() => {
        console.log('[useEnsureUser] User record ensured in Convex successfully');
      })
      .catch((error) => {
        console.error('[useEnsureUser] Failed to ensure user record:', error);
        // Don't throw - this shouldn't break the app
        // The user can still use the app, they just might not have all features
      });
  }, [isSignedIn, isLoaded, ensureUser]);
}
